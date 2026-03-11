import { Request, Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/authMiddleware';
import { reportService } from '../services/reportService';

export const leadsController = {
  // GET /api/leads
  async getLeads(req: AuthRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const plataforma = req.query.plataforma as string;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE l.usuario_id = ?';
      const params: any[] = [req.userId];

      if (status) {
        whereClause += ' AND l.status = ?';
        params.push(status);
      }
      if (plataforma) {
        whereClause += ' AND l.plataforma = ?';
        params.push(plataforma);
      }

      const [rows] = await pool.query(
        `SELECT
           l.id, l.nome, l.usuario_plataforma, l.plataforma, l.origem,
           l.palavra_chave, l.mensagem_enviada, l.status,
           DATE_FORMAT(l.data_captura, '%d/%m/%Y %H:%i') as data_captura
         FROM leads l
         ${whereClause}
         ORDER BY l.data_captura DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const [countRows] = await pool.query(
        `SELECT COUNT(*) as total FROM leads l ${whereClause}`,
        params
      );
      const total = (countRows as any[])[0]?.total || 0;

      res.json({
        success: true,
        data: rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('Get leads error:', error);
      res.status(500).json({ success: false, message: 'Erro ao carregar leads' });
    }
  },

  // GET /api/leads/:id
  async getLead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM leads WHERE id = ? AND usuario_id = ?',
        [req.params.id, req.userId]
      );
      const leads = rows as any[];

      if (leads.length === 0) {
        res.status(404).json({ success: false, message: 'Lead não encontrado' });
        return;
      }

      res.json({ success: true, data: leads[0] });
    } catch (error) {
      console.error('Get lead error:', error);
      res.status(500).json({ success: false, message: 'Erro ao carregar lead' });
    }
  },

  // POST /api/leads
  async createLead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { nome, usuario_plataforma, plataforma, origem, palavra_chave } = req.body;

      const [result] = await pool.query(
        `INSERT INTO leads (usuario_id, nome, usuario_plataforma, plataforma, origem, palavra_chave)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.userId, nome || null, usuario_plataforma, plataforma, origem || null, palavra_chave || null]
      );

      res.status(201).json({
        success: true,
        message: 'Lead criado com sucesso',
        data: { id: (result as any).insertId },
      });
    } catch (error) {
      console.error('Create lead error:', error);
      res.status(500).json({ success: false, message: 'Erro ao criar lead' });
    }
  },

  // PUT /api/leads/:id/status
  async updateLeadStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status } = req.body;

      await pool.query(
        'UPDATE leads SET status = ? WHERE id = ? AND usuario_id = ?',
        [status, req.params.id, req.userId]
      );

      res.json({ success: true, message: 'Status atualizado com sucesso' });
    } catch (error) {
      console.error('Update lead status error:', error);
      res.status(500).json({ success: false, message: 'Erro ao atualizar status' });
    }
  },

  // DELETE /api/leads/:id
  async deleteLead(req: AuthRequest, res: Response): Promise<void> {
    try {
      await pool.query(
        'DELETE FROM leads WHERE id = ? AND usuario_id = ?',
        [req.params.id, req.userId]
      );

      res.json({ success: true, message: 'Lead removido com sucesso' });
    } catch (error) {
      console.error('Delete lead error:', error);
      res.status(500).json({ success: false, message: 'Erro ao remover lead' });
    }
  },

  // GET /api/leads/stats
  async getLeadStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const [rows] = await pool.query(
        `SELECT
           status,
           COUNT(*) as total
         FROM leads
         WHERE usuario_id = ?
         GROUP BY status`,
        [req.userId]
      );

      const [byPlatform] = await pool.query(
        `SELECT plataforma, COUNT(*) as total
         FROM leads WHERE usuario_id = ? GROUP BY plataforma`,
        [req.userId]
      );

      const [byMonth] = await pool.query(
        `SELECT
           DATE_FORMAT(data_captura, '%Y-%m') as mes,
           COUNT(*) as total
         FROM leads
         WHERE usuario_id = ? AND data_captura >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
         GROUP BY mes ORDER BY mes ASC`,
        [req.userId]
      );

      res.json({
        success: true,
        data: {
          byStatus: rows,
          byPlatform,
          byMonth,
        },
      });
    } catch (error) {
      console.error('Lead stats error:', error);
      res.status(500).json({ success: false, message: 'Erro ao carregar estatísticas' });
    }
  },

  // GET /api/leads/export/csv
  async exportCSV(req: AuthRequest, res: Response): Promise<void> {
    try {
      const csv = await reportService.generateLeadsCSV(req.userId!);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="leads-${Date.now()}.csv"`);
      res.send('\uFEFF' + csv);
    } catch (error) {
      console.error('CSV export error:', error);
      res.status(500).json({ success: false, message: 'Erro ao exportar CSV' });
    }
  },
};
