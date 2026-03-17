import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/authMiddleware';
import { automationService } from '../services/automationService';
import { analyticsService } from '../services/analyticsService';
import { instagramService } from '../services/instagramService';

export const automationController = {
  // GET /api/automation
  async getAutomations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { rows } = await pool.query(
        `SELECT a.id, a.nome, a.tipo, a.palavra_chave, a.mensagem_resposta, a.ativo, a.total_disparos, a.data_criacao,
                cs.plataforma, cs.conta_nome
         FROM automacoes a
         INNER JOIN contas_sociais cs ON cs.id = a.conta_id
         WHERE cs.usuario_id = $1
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
      const contaCheck = await pool.query(
        'SELECT id FROM contas_sociais WHERE id = $1 AND usuario_id = $2 AND ativo = true',
        [conta_id, req.userId]
      );
      if (contaCheck.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Conta não encontrada' });
        return;
      }

      const result = await pool.query(
        `INSERT INTO automacoes (conta_id, nome, tipo, palavra_chave, mensagem_resposta)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [conta_id, nome, tipo, palavra_chave || null, mensagem_resposta || null]
      );

      res.status(201).json({
        success: true,
        message: 'Automação criada com sucesso',
        data: { id: result.rows[0].id },
      });
    } catch (error) {
      console.error('Create automation error:', error);
      res.status(500).json({ success: false, message: 'Erro ao criar automação' });
    }
  },

  // PUT /api/automation/:id/toggle
  async toggleAutomation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { rows: automacoes } = await pool.query(
        `SELECT a.id, a.ativo FROM automacoes a
         INNER JOIN contas_sociais cs ON cs.id = a.conta_id
         WHERE a.id = $1 AND cs.usuario_id = $2`,
        [req.params.id, req.userId]
      );

      if (automacoes.length === 0) {
        res.status(404).json({ success: false, message: 'Automação não encontrada' });
        return;
      }

      const newStatus = !automacoes[0].ativo;
      await pool.query('UPDATE automacoes SET ativo = $1 WHERE id = $2', [newStatus, req.params.id]);

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
        `DELETE FROM automacoes
         WHERE id = $1
           AND conta_id IN (SELECT id FROM contas_sociais WHERE usuario_id = $2)`,
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
      const { rows } = await pool.query(
        `SELECT m.id, m.tipo, m.valor_meta, m.valor_atual, m.periodo,
                m.data_inicio, m.data_fim, m.concluida,
                cs.plataforma, cs.conta_nome
         FROM metas m
         INNER JOIN contas_sociais cs ON cs.id = m.conta_id
         WHERE cs.usuario_id = $1
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

      const contaCheck = await pool.query(
        'SELECT id FROM contas_sociais WHERE id = $1 AND usuario_id = $2 AND ativo = true',
        [conta_id, req.userId]
      );
      if (contaCheck.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Conta não encontrada' });
        return;
      }

      const result = await pool.query(
        `INSERT INTO metas (conta_id, tipo, valor_meta, periodo, data_inicio, data_fim)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [conta_id, tipo, valor_meta, periodo, data_inicio, data_fim]
      );

      res.status(201).json({
        success: true,
        message: 'Meta criada com sucesso',
        data: { id: result.rows[0].id },
      });
    } catch (error) {
      console.error('Create goal error:', error);
      res.status(500).json({ success: false, message: 'Erro ao criar meta' });
    }
  },

  // GET /api/automation/notifications
  async getNotifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { rows } = await pool.query(
        `SELECT id, tipo, titulo, mensagem, lida, data_criacao
         FROM notificacoes WHERE usuario_id = $1
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
    res.json({ success: true, message: 'Sincronizando posts e executando automação em background' });

    // First sync posts from Instagram, then run automation
    (async () => {
      try {
        // Sync posts for user's active accounts
        const { rows: contas } = await pool.query(
          `SELECT id, plataforma, access_token FROM contas_sociais
           WHERE usuario_id = $1 AND ativo = true`,
          [req.userId]
        );

        for (const conta of contas) {
          if (conta.plataforma === 'instagram') {
            console.log(`[RunCycle] Syncing Instagram posts for account ${conta.id}...`);
            await analyticsService.collectInstagramData(conta.id, conta.access_token);
            console.log(`[RunCycle] Sync complete for account ${conta.id}`);
          }
        }

        // Now run automation cycle
        await automationService.runAutomationCycle();
        console.log('[RunCycle] Automation cycle complete');
      } catch (error) {
        console.error('[RunCycle] Error:', error);
      }
    })();
  },

  // GET /api/automation/debug-comments - Debug endpoint to test Instagram comments API
  async debugComments(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { rows: contas } = await pool.query(
        `SELECT id, access_token, conta_id_plataforma FROM contas_sociais
         WHERE usuario_id = $1 AND plataforma = 'instagram' AND ativo = true LIMIT 1`,
        [req.userId]
      );
      if (contas.length === 0) {
        res.json({ error: 'No active Instagram account' });
        return;
      }

      const { access_token } = contas[0];

      // Check token permissions
      let permissions: any = null;
      try {
        const axios = (await import('axios')).default;
        const { data: permData } = await axios.get('https://graph.instagram.com/me', {
          params: { fields: 'id,username', access_token },
        });
        permissions = permData;
      } catch (e: any) {
        permissions = { error: e.response?.data || e.message };
      }

      // Get ALL recent media with comments_count
      const media = await instagramService.getMedia(access_token, 25);
      const results: any[] = [];

      // Check ALL posts for comments
      for (const m of media) {
        const comments = await instagramService.getComments(m.id, access_token);
        results.push({
          post_id: m.id,
          caption: (m.caption || '').substring(0, 50),
          comments_count_from_api: m.comments_count,
          comments_fetched: comments.length,
          comments: comments.slice(0, 5),
        });
      }

      res.json({
        success: true,
        account_id: contas[0].id,
        ig_user_id: contas[0].conta_id_plataforma,
        token_check: permissions,
        total_posts: media.length,
        posts_with_comments: results.filter(r => r.comments_count_from_api > 0 || r.comments_fetched > 0).length,
        posts: results,
      });
    } catch (error: any) {
      console.error('Debug comments error:', error.response?.data || error.message);
      res.status(500).json({ error: error.response?.data || error.message });
    }
  },

  // POST /api/automation/debug-cycle - Run cycle with full debug output
  async debugCycle(req: AuthRequest, res: Response): Promise<void> {
    try {
      const logs: string[] = [];
      const log = (msg: string) => { logs.push(msg); console.log(msg); };

      // 1. Check active automations
      const { rows: automacoes } = await pool.query(
        `SELECT a.id, a.nome, a.tipo, a.palavra_chave, a.mensagem_resposta, a.ativo, a.conta_id
         FROM automacoes a
         INNER JOIN contas_sociais cs ON cs.id = a.conta_id
         WHERE cs.usuario_id = $1`,
        [req.userId]
      );
      log(`Found ${automacoes.length} automations for user`);
      for (const a of automacoes) {
        log(`  - "${a.nome}" tipo=${a.tipo} keyword="${a.palavra_chave}" ativo=${a.ativo} conta_id=${a.conta_id}`);
      }

      const activeAutos = automacoes.filter((a: any) => a.ativo && a.tipo === 'comentario_keyword');
      if (activeAutos.length === 0) {
        res.json({ success: false, message: 'Nenhuma automacao ativa do tipo comentario_keyword', logs });
        return;
      }

      // 2. Get account info
      const { rows: contas } = await pool.query(
        `SELECT id, access_token, conta_id_plataforma FROM contas_sociais
         WHERE usuario_id = $1 AND ativo = true AND plataforma = 'instagram' LIMIT 1`,
        [req.userId]
      );
      if (contas.length === 0) {
        res.json({ success: false, message: 'Nenhuma conta Instagram ativa', logs });
        return;
      }
      const conta = contas[0];
      log(`Instagram account: id=${conta.id}, ig_user=${conta.conta_id_plataforma}`);

      // 3. Sync posts
      log(`Syncing Instagram posts...`);
      try {
        await analyticsService.collectInstagramData(conta.id, conta.access_token);
        log(`Sync complete`);
      } catch (e: any) {
        log(`Sync error: ${e.message}`);
      }

      // 4. Check posts in DB
      const { rows: posts } = await pool.query(
        `SELECT id, id_post_plataforma, data_postagem FROM posts
         WHERE conta_id = $1 AND data_postagem >= NOW() - INTERVAL '30 days'
         ORDER BY data_postagem DESC`,
        [conta.id]
      );
      log(`Posts in DB (last 30 days): ${posts.length}`);

      const { rows: allPosts } = await pool.query(
        'SELECT COUNT(*) as total FROM posts WHERE conta_id = $1',
        [conta.id]
      );
      log(`Total posts in DB: ${allPosts[0].total}`);

      // 5. Process each post
      let leadsCreated = 0;
      for (const post of posts) {
        const comments = await instagramService.getComments(post.id_post_plataforma, conta.access_token);
        if (comments.length > 0) {
          log(`Post ${post.id_post_plataforma} (db_id=${post.id}): ${comments.length} comments`);
        }

        for (const comment of comments) {
          for (const automacao of activeAutos) {
            const keyword = automacao.palavra_chave?.toLowerCase();
            const commentText = comment.text?.toLowerCase();
            if (keyword && commentText?.includes(keyword)) {
              log(`  MATCH! @${comment.username} said "${comment.text}" matches keyword "${automacao.palavra_chave}"`);

              const existing = await pool.query(
                'SELECT id FROM leads WHERE usuario_plataforma = $1 AND post_id = $2 AND palavra_chave = $3',
                [comment.username, post.id, automacao.palavra_chave]
              );
              if (existing.rows.length > 0) {
                log(`  Already processed, skipping`);
                continue;
              }

              await pool.query(
                `INSERT INTO leads (usuario_id, usuario_plataforma, plataforma, origem, post_id, palavra_chave, mensagem_enviada)
                 VALUES ($1, $2, 'instagram', $3, $4, $5, $6)`,
                [req.userId, comment.username, `Comentou "${automacao.palavra_chave}" no post`, post.id, automacao.palavra_chave, automacao.mensagem_resposta]
              );
              leadsCreated++;
              log(`  Lead created for @${comment.username}!`);

              if (automacao.mensagem_resposta && comment.from?.id) {
                try {
                  await instagramService.sendDirectMessage(conta.conta_id_plataforma, comment.from.id, automacao.mensagem_resposta, conta.access_token);
                  log(`  DM sent to @${comment.username}`);
                } catch (e: any) {
                  log(`  DM failed: ${e.response?.data?.error?.message || e.message}`);
                }
              }
            }
          }
        }
      }

      log(`Done! Leads created: ${leadsCreated}`);
      res.json({ success: true, leads_created: leadsCreated, logs });
    } catch (error: any) {
      console.error('Debug cycle error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // PUT /api/automation/notifications/:id/read
  async markNotificationRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      await pool.query(
        'UPDATE notificacoes SET lida = true WHERE id = $1 AND usuario_id = $2',
        [req.params.id, req.userId]
      );
      res.json({ success: true, message: 'Notificação marcada como lida' });
    } catch (error) {
      console.error('Mark read error:', error);
      res.status(500).json({ success: false, message: 'Erro ao atualizar notificação' });
    }
  },
};
