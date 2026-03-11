/**
 * Cron Job: Weekly Report Generation
 * Runs every Sunday to generate weekly reports and notify users
 */
import cron from 'node-cron';
import pool from '../config/database';
import { notificationService } from '../services/notificationService';
import { analyticsService } from '../services/analyticsService';

export function startReportCron(): void {
  // Weekly summary every Sunday at 08:00
  cron.schedule('0 8 * * 0', async () => {
    console.log('⏰ [CRON] Generating weekly reports...');

    try {
      const [usuarios] = await pool.query(
        'SELECT id, nome, email FROM usuarios WHERE ativo = true'
      );

      for (const usuario of usuarios as any[]) {
        try {
          const summary = await analyticsService.getDashboardSummary(usuario.id);

          await notificationService.createNotification(
            usuario.id,
            'relatorio_semanal',
            'Relatório Semanal Disponível',
            `Resumo da semana: ${summary.totalSeguidores} seguidores totais, ` +
            `taxa de engajamento de ${summary.taxaEngajamento}%, ` +
            `crescimento de ${summary.crescimentoSemanal > 0 ? '+' : ''}${summary.crescimentoSemanal} seguidores.`
          );

          // Check and update growth goals
          await checkGoals(usuario.id);
        } catch (error) {
          console.error(`[CRON] Report failed for user ${usuario.id}:`, error);
        }
      }

      console.log('✅ [CRON] Weekly reports generated');
    } catch (error) {
      console.error('❌ [CRON] Weekly report generation failed:', error);
    }
  }, {
    timezone: 'America/Sao_Paulo',
  });

  console.log('✅ Report generation cron job scheduled');
}

async function checkGoals(usuarioId: number): Promise<void> {
  const [metas] = await pool.query(
    `SELECT m.id, m.tipo, m.valor_meta, m.conta_id, m.concluida
     FROM metas m
     INNER JOIN contas_sociais cs ON cs.id = m.conta_id
     WHERE cs.usuario_id = ? AND m.concluida = false AND m.data_fim >= CURDATE()`,
    [usuarioId]
  );

  for (const meta of metas as any[]) {
    let valorAtual = 0;

    if (meta.tipo === 'seguidores') {
      const [rows] = await pool.query(
        'SELECT total_seguidores FROM seguidores WHERE conta_id = ? ORDER BY data_registro DESC LIMIT 1',
        [meta.conta_id]
      );
      valorAtual = (rows as any[])[0]?.total_seguidores || 0;
    } else if (meta.tipo === 'leads') {
      const [rows] = await pool.query(
        `SELECT COUNT(*) as total FROM leads l
         INNER JOIN contas_sociais cs ON cs.id = meta.conta_id
         WHERE l.usuario_id = cs.usuario_id`,
        []
      );
      valorAtual = (rows as any[])[0]?.total || 0;
    }

    await pool.query('UPDATE metas SET valor_atual = ? WHERE id = ?', [valorAtual, meta.id]);

    if (valorAtual >= meta.valor_meta) {
      await pool.query('UPDATE metas SET concluida = true WHERE id = ?', [meta.id]);
      await notificationService.createNotification(
        usuarioId,
        'meta_concluida',
        'Meta Atingida!',
        `Parabéns! Você atingiu sua meta de ${meta.tipo}: ${valorAtual}/${meta.valor_meta}`
      );
    }
  }
}
