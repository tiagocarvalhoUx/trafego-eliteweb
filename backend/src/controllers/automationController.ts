import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/authMiddleware';
import { automationService } from '../services/automationService';

export const automationController = {
  // GET /api/automation
  async getAutomations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const [rows] = await pool.query(
        `SELECT a.id, a.nome, a.tipo, a.palavra_chave, a.mensagem_resposta, a.ativo, a.total_disparos, a.data_criacao,
                cs.plataforma, cs.conta_nome
         FROM automacoes a
         INNER JOIN contas_sociais cs ON cs.id = a.conta_id
         WHERE cs.usuario_id = ?
         ORDER BY a.data_criacao DESC`,
        [req.userId]
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Get automations error:', error);
      res.status(500).json({ success: false, message: 'Erro ao carregar automações' });
    }
  },

  // POST /api/automation
  async createAutomation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { conta_id, nome, tipo, palavra_chave, mensagem_resposta } = req.body;

      // Verify account belongs to user
      const [contaRows] = await pool.query(
        'SELECT id FROM contas_sociais WHERE id = ? AND usuario_id = ? AND ativo = true',
        [conta_id, req.userId]
      );
      if ((contaRows as any[]).length === 0) {
        res.status(404).json({ success: false, message: 'Conta não encontrada' });
        return;
      }

      const [result] = await pool.query(
        `INSERT INTO automacoes (conta_id, nome, tipo, palavra_chave, mensagem_resposta)
         VALUES (?, ?, ?, ?, ?)`,
        [conta_id, nome, tipo, palavra_chave || null, mensagem_resposta || null]
      );

      res.status(201).json({
        success: true,
        message: 'Automação criada com sucesso',
        data: { id: (result as any).insertId },
      });
    } catch (error) {
      console.error('Create automation error:', error);
      res.status(500).json({ success: false, message: 'Erro ao criar automação' });
    }
  },

  // PUT /api/automation/:id/toggle
  async toggleAutomation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const [rows] = await pool.query(
        `SELECT a.id, a.ativo FROM automacoes a
         INNER JOIN contas_sociais cs ON cs.id = a.conta_id
         WHERE a.id = ? AND cs.usuario_id = ?`,
        [req.params.id, req.userId]
      );
      const automacoes = rows as any[];

      if (automacoes.length === 0) {
        res.status(404).json({ success: false, message: 'Automação não encontrada' });
        return;
      }

      const newStatus = !automacoes[0].ativo;
      await pool.query('UPDATE automacoes SET ativo = ? WHERE id = ?', [newStatus, req.params.id]);

      res.json({
        success: true,
        message: `Automação ${newStatus ? 'ativada' : 'desativada'} com sucesso`,
        data: { ativo: newStatus },
      });
    } catch (error) {
      console.error('Toggle automation error:', error);
      res.status(500).json({ success: false, message: 'Erro ao alterar automação' });
    }
  },

  // DELETE /api/automation/:id
  async deleteAutomation(req: AuthRequest, res: Response): Promise<void> {
    try {
      await pool.query(
        `DELETE a FROM automacoes a
         INNER JOIN contas_sociais cs ON cs.id = a.conta_id
         WHERE a.id = ? AND cs.usuario_id = ?`,
        [req.params.id, req.userId]
      );
      res.json({ success: true, message: 'Automação removida com sucesso' });
    } catch (error) {
      console.error('Delete automation error:', error);
      res.status(500).json({ success: false, message: 'Erro ao remover automação' });
    }
  },

  // GET /api/automation/goals
  async getGoals(req: AuthRequest, res: Response): Promise<void> {
    try {
      const [rows] = await pool.query(
        `SELECT m.id, m.tipo, m.valor_meta, m.valor_atual, m.periodo,
                m.data_inicio, m.data_fim, m.concluida,
                cs.plataforma, cs.conta_nome
         FROM metas m
         INNER JOIN contas_sociais cs ON cs.id = m.conta_id
         WHERE cs.usuario_id = ?
         ORDER BY m.data_criacao DESC`,
        [req.userId]
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Get goals error:', error);
      res.status(500).json({ success: false, message: 'Erro ao carregar metas' });
    }
  },

  // POST /api/automation/goals
  async createGoal(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { conta_id, tipo, valor_meta, periodo, data_inicio, data_fim } = req.body;

      const [contaRows] = await pool.query(
        'SELECT id FROM contas_sociais WHERE id = ? AND usuario_id = ? AND ativo = true',
        [conta_id, req.userId]
      );
      if ((contaRows as any[]).length === 0) {
        res.status(404).json({ success: false, message: 'Conta não encontrada' });
        return;
      }

      const [result] = await pool.query(
        `INSERT INTO metas (conta_id, tipo, valor_meta, periodo, data_inicio, data_fim)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [conta_id, tipo, valor_meta, periodo, data_inicio, data_fim]
      );

      res.status(201).json({
        success: true,
        message: 'Meta criada com sucesso',
        data: { id: (result as any).insertId },
      });
    } catch (error) {
      console.error('Create goal error:', error);
      res.status(500).json({ success: false, message: 'Erro ao criar meta' });
    }
  },

  // GET /api/automation/notifications
  async getNotifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const [rows] = await pool.query(
        `SELECT id, tipo, titulo, mensagem, lida, data_criacao
         FROM notificacoes WHERE usuario_id = ?
         ORDER BY data_criacao DESC LIMIT 50`,
        [req.userId]
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ success: false, message: 'Erro ao carregar notificações' });
    }
  },

  // POST /api/automation/run-cycle
  async runCycle(req: AuthRequest, res: Response): Promise<void> {
    res.json({ success: true, message: 'Ciclo de automação iniciado em background' });
    automationService.runAutomationCycle().catch(console.error);
  },

  // PUT /api/automation/notifications/:id/read
  async markNotificationRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      await pool.query(
        'UPDATE notificacoes SET lida = true WHERE id = ? AND usuario_id = ?',
        [req.params.id, req.userId]
      );
      res.json({ success: true, message: 'Notificação marcada como lida' });
    } catch (error) {
      console.error('Mark read error:', error);
      res.status(500).json({ success: false, message: 'Erro ao atualizar notificação' });
    }
  },
};
