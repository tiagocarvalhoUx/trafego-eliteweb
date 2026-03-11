/**
 * Report Service
 * Generates PDF and CSV reports
 */
import PDFDocument from 'pdfkit';
import pool from '../config/database';
import { analyticsService } from './analyticsService';

// Simple CSV generator (avoids json2csv typing issues)
function toCSV(fields: { label: string; value: string }[], rows: any[]): string {
  const header = fields.map((f) => `"${f.label}"`).join(',');
  const lines = rows.map((row) =>
    fields.map((f) => {
      const val = row[f.value] ?? '';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [header, ...lines].join('\r\n');
}

export const reportService = {
  // Generate CSV report of leads
  async generateLeadsCSV(usuarioId: number): Promise<string> {
    const { rows } = await pool.query(
      `SELECT
         id, nome, usuario_plataforma as usuario, plataforma, origem,
         TO_CHAR(data_captura, 'DD/MM/YYYY HH24:MI') as data_captura,
         status, palavra_chave
       FROM leads
       WHERE usuario_id = $1
       ORDER BY data_captura DESC`,
      [usuarioId]
    );

    const fields = [
      { label: 'ID', value: 'id' },
      { label: 'Nome', value: 'nome' },
      { label: 'Usuário', value: 'usuario' },
      { label: 'Plataforma', value: 'plataforma' },
      { label: 'Origem', value: 'origem' },
      { label: 'Data de Captura', value: 'data_captura' },
      { label: 'Status', value: 'status' },
      { label: 'Palavra Chave', value: 'palavra_chave' },
    ];

    return toCSV(fields, rows);
  },

  // Generate CSV report of engagement metrics
  async generateEngagementCSV(usuarioId: number): Promise<string> {
    const data = await analyticsService.getEngagementByDay(usuarioId, 30);

    const fields = [
      { label: 'Data', value: 'dia' },
      { label: 'Curtidas', value: 'total_curtidas' },
      { label: 'Comentários', value: 'total_comentarios' },
      { label: 'Compartilhamentos', value: 'total_compartilhamentos' },
      { label: 'Visualizações', value: 'total_visualizacoes' },
      { label: 'Taxa de Engajamento (%)', value: 'taxa_media' },
    ];

    return toCSV(fields, data as any[]);
  },

  // Generate PDF report
  async generatePDFReport(usuarioId: number): Promise<Buffer> {
    const summary = await analyticsService.getDashboardSummary(usuarioId);
    const topPosts = (await analyticsService.getTopPosts(usuarioId, 5)) as any[];
    const bestTimes = (await analyticsService.getBestPostingTimes(usuarioId)) as any[];

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50 });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('Relatório Social Analytics', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });
      doc.moveDown(2);

      // Summary section
      doc.fontSize(16).font('Helvetica-Bold').text('Resumo Geral');
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');

      const summaryData = [
        ['Total de Seguidores', String(summary.totalSeguidores)],
        ['Taxa de Engajamento', `${summary.taxaEngajamento}%`],
        ['Total de Leads', String(summary.totalLeads)],
        ['Crescimento Semanal', `${summary.crescimentoSemanal > 0 ? '+' : ''}${summary.crescimentoSemanal} seguidores`],
        ['Contas Conectadas', String(summary.totalContas)],
      ];

      for (const [label, value] of summaryData) {
        doc.text(`${label}: `, { continued: true }).font('Helvetica-Bold').text(value).font('Helvetica');
      }

      doc.moveDown(2);

      // Top Posts section
      doc.fontSize(16).font('Helvetica-Bold').text('Top 5 Posts com Maior Engajamento');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');

      if (topPosts.length === 0) {
        doc.text('Nenhum post encontrado.');
      } else {
        topPosts.forEach((post, index) => {
          doc.font('Helvetica-Bold').text(`${index + 1}. ${(post.legenda || 'Sem legenda').substring(0, 60)}...`);
          doc.font('Helvetica').text(
            `   Curtidas: ${post.curtidas} | Comentários: ${post.comentarios} | Taxa: ${post.taxa_engajamento}%`
          );
          doc.moveDown(0.3);
        });
      }

      doc.moveDown(2);

      // Best posting times
      doc.fontSize(16).font('Helvetica-Bold').text('Melhores Horários para Postar');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');

      const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
      if (bestTimes.length === 0) {
        doc.text('Dados insuficientes para análise.');
      } else {
        bestTimes.forEach((time, index) => {
          const dia = diasSemana[time.dia_semana - 1] || 'N/A';
          doc.text(
            `${index + 1}. ${dia} às ${String(time.hora).padStart(2, '0')}:00 - Taxa média: ${parseFloat(time.media_engajamento).toFixed(2)}%`
          );
        });
      }

      doc.end();
    });
  },
};
