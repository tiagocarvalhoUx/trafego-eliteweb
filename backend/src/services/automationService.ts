/**
 * Automation Service
 * Handles keyword-triggered DMs, lead capture, and follow-back automation
 */
import pool from '../config/database';
import { instagramService } from './instagramService';
import { notificationService } from './notificationService';

export const automationService = {
  // Check comments on a post for keywords and trigger DM
  async processInstagramComments(contaId: number, accessToken: string, postPlataformaId: string, postId: number, igUserId: string): Promise<void> {
    // Get active automations for this account
    const { rows: automacoes } = await pool.query(
      `SELECT * FROM automacoes
       WHERE conta_id = $1 AND ativo = true AND tipo = 'comentario_keyword'`,
      [contaId]
    );
    if (automacoes.length === 0) return;

    console.log(`[Automation] Checking comments on post ${postPlataformaId} with ${automacoes.length} automations`);
    const comments = await instagramService.getComments(postPlataformaId, accessToken);
    console.log(`[Automation] Found ${comments.length} comments on post ${postPlataformaId}`);

    for (const comment of comments) {
      for (const automacao of automacoes) {
        const keyword = automacao.palavra_chave?.toLowerCase();
        const commentText = comment.text?.toLowerCase();

        if (keyword && commentText?.includes(keyword)) {
          console.log(`[Automation] Keyword "${keyword}" matched in comment by @${comment.username}`);

          // Check if this user was already processed for this automation
          const existingLead = await pool.query(
            'SELECT id FROM leads WHERE usuario_plataforma = $1 AND post_id = $2 AND palavra_chave = $3',
            [comment.username, postId, automacao.palavra_chave]
          );

          if (existingLead.rows.length > 0) {
            console.log(`[Automation] @${comment.username} already processed, skipping`);
            continue;
          }

          // Get conta's usuario_id
          const contaResult = await pool.query(
            'SELECT usuario_id FROM contas_sociais WHERE id = $1',
            [contaId]
          );
          const usuarioId = contaResult.rows[0]?.usuario_id;

          // Register lead
          const leadResult = await pool.query(
            `INSERT INTO leads (usuario_id, usuario_plataforma, plataforma, origem, post_id, palavra_chave, mensagem_enviada)
             VALUES ($1, $2, 'instagram', $3, $4, $5, $6) RETURNING id`,
            [
              usuarioId,
              comment.username,
              `Comentou "${automacao.palavra_chave}" no post`,
              postId,
              automacao.palavra_chave,
              automacao.mensagem_resposta,
            ]
          );

          // Try to send DM
          if (automacao.mensagem_resposta) {
            const recipientIgUserId = comment.from?.id;
            if (!recipientIgUserId) {
              console.warn(`[Automation] No from.id for comment by @${comment.username}, cannot send DM`);
            } else {
              try {
                await instagramService.sendDirectMessage(
                  igUserId,
                  recipientIgUserId,
                  automacao.mensagem_resposta,
                  accessToken
                );

                // Update automation dispatch count
                await pool.query(
                  'UPDATE automacoes SET total_disparos = total_disparos + 1 WHERE id = $1',
                  [automacao.id]
                );

                // Update lead status to contacted
                await pool.query(
                  "UPDATE leads SET status = 'contatado' WHERE id = $1",
                  [leadResult.rows[0].id]
                );

                // Create notification
                await notificationService.createNotification(
                  usuarioId,
                  'lead_capturado',
                  'Novo lead capturado!',
                  `@${comment.username} comentou "${automacao.palavra_chave}" e recebeu sua mensagem automática.`
                );

                console.log(`[Automation] DM sent to @${comment.username} (${recipientIgUserId})`);
              } catch (error) {
                console.error(`[Automation] Failed to send DM to @${comment.username}:`, error);
              }
            }
          }
        }
      }
    }
  },

  // Run automation check for all active accounts
  async runAutomationCycle(): Promise<void> {
    const { rows: contas } = await pool.query(
      `SELECT cs.id, cs.access_token, cs.plataforma, cs.conta_id_plataforma
       FROM contas_sociais cs
       WHERE cs.ativo = true
         AND EXISTS (
           SELECT 1 FROM automacoes a WHERE a.conta_id = cs.id AND a.ativo = true
         )`
    );
    console.log(`[Automation] Running cycle for ${contas.length} accounts`);

    for (const conta of contas) {
      if (conta.plataforma === 'instagram') {
        // Get recent posts for this account
        const { rows: posts } = await pool.query(
          `SELECT id, id_post_plataforma FROM posts
           WHERE conta_id = $1
             AND data_postagem >= NOW() - INTERVAL '7 days'`,
          [conta.id]
        );
        console.log(`[Automation] Account ${conta.id} has ${posts.length} posts in last 7 days`);

        for (const post of posts) {
          try {
            await automationService.processInstagramComments(
              conta.id,
              conta.access_token,
              post.id_post_plataforma,
              post.id,
              conta.conta_id_plataforma
            );
          } catch (error) {
            console.error(`[Automation] Cycle error for post ${post.id}:`, error);
          }
        }
      }
    }
  },
};
