/**
 * Analytics Service
 * Processes and aggregates engagement data from all social platforms
 */
import pool from '../config/database';
import { instagramService } from './instagramService';
import { tiktokService } from './tiktokService';

export const analyticsService = {
  // Collect and store data for all active Instagram accounts
  async collectInstagramData(contaId: number, accessToken: string): Promise<void> {
    try {
      // Get profile (followers)
      const profile = await instagramService.getProfile(accessToken);

      await pool.query(
        'INSERT INTO seguidores (conta_id, total_seguidores) VALUES (?, ?)',
        [contaId, profile.followers_count]
      );

      // Get recent media
      const medias = await instagramService.getMedia(accessToken, 25);

      for (const media of medias) {
        // Upsert post
        await pool.query(
          `INSERT INTO posts (conta_id, id_post_plataforma, data_postagem, legenda, tipo_midia, url_permalink)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE legenda = VALUES(legenda)`,
          [
            contaId,
            media.id,
            new Date(media.timestamp),
            media.caption || null,
            media.media_type,
            media.permalink,
          ]
        );

        // Get post id
        const [postRows] = await pool.query(
          'SELECT id FROM posts WHERE conta_id = ? AND id_post_plataforma = ?',
          [contaId, media.id]
        );
        const postId = (postRows as any[])[0]?.id;
        if (!postId) continue;

        // Try to get insights (may fail for personal accounts)
        let insights = { impressions: 0, reach: 0, engagement: 0, saved: 0 };
        try {
          insights = await instagramService.getMediaInsights(media.id, accessToken);
        } catch {
          // Insights not available for personal accounts
        }

        const taxaEngajamento =
          profile.followers_count > 0
            ? (((media.like_count || 0) + (media.comments_count || 0)) / profile.followers_count) * 100
            : 0;

        await pool.query(
          `INSERT INTO engajamento (post_id, curtidas, comentarios, alcance, impressoes, taxa_engajamento)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            postId,
            media.like_count || 0,
            media.comments_count || 0,
            insights.reach,
            insights.impressions,
            parseFloat(taxaEngajamento.toFixed(2)),
          ]
        );
      }

      console.log(`✅ Instagram data collected for account ${contaId}`);
    } catch (error) {
      console.error(`❌ Error collecting Instagram data for account ${contaId}:`, error);
      throw error;
    }
  },

  // Collect and store data for all active TikTok accounts
  async collectTikTokData(contaId: number, accessToken: string): Promise<void> {
    try {
      const userInfo = await tiktokService.getUserInfo(accessToken);

      await pool.query(
        'INSERT INTO seguidores (conta_id, total_seguidores) VALUES (?, ?)',
        [contaId, userInfo.follower_count]
      );

      const videos = await tiktokService.getVideos(accessToken, 20);

      for (const video of videos) {
        await pool.query(
          `INSERT INTO posts (conta_id, id_post_plataforma, data_postagem, legenda, tipo_midia)
           VALUES (?, ?, ?, ?, 'VIDEO')
           ON DUPLICATE KEY UPDATE legenda = VALUES(legenda)`,
          [contaId, video.id, new Date(video.create_time * 1000), video.description]
        );

        const [postRows] = await pool.query(
          'SELECT id FROM posts WHERE conta_id = ? AND id_post_plataforma = ?',
          [contaId, video.id]
        );
        const postId = (postRows as any[])[0]?.id;
        if (!postId) continue;

        const taxaEngajamento =
          userInfo.follower_count > 0
            ? (((video.like_count || 0) + (video.comment_count || 0) + (video.share_count || 0)) /
                userInfo.follower_count) *
              100
            : 0;

        await pool.query(
          `INSERT INTO engajamento (post_id, curtidas, comentarios, compartilhamentos, visualizacoes, taxa_engajamento)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            postId,
            video.like_count,
            video.comment_count,
            video.share_count,
            video.view_count,
            parseFloat(taxaEngajamento.toFixed(2)),
          ]
        );
      }

      console.log(`✅ TikTok data collected for account ${contaId}`);
    } catch (error) {
      console.error(`❌ Error collecting TikTok data for account ${contaId}:`, error);
      throw error;
    }
  },

  // Get dashboard summary for a user
  async getDashboardSummary(usuarioId: number) {
    const [accountRows] = await pool.query(
      'SELECT id, plataforma FROM contas_sociais WHERE usuario_id = ? AND ativo = true',
      [usuarioId]
    );
    const accounts = accountRows as any[];

    // Total followers across all accounts
    const [followerRows] = await pool.query(
      `SELECT SUM(s.total_seguidores) as total
       FROM seguidores s
       INNER JOIN (
         SELECT conta_id, MAX(data_registro) as max_data
         FROM seguidores WHERE conta_id IN (?)
         GROUP BY conta_id
       ) latest ON s.conta_id = latest.conta_id AND s.data_registro = latest.max_data`,
      [accounts.map((a) => a.id).length > 0 ? accounts.map((a) => a.id) : [0]]
    );
    const totalSeguidores = (followerRows as any[])[0]?.total || 0;

    // Average engagement rate
    const [engagRows] = await pool.query(
      `SELECT AVG(e.taxa_engajamento) as media_engajamento
       FROM engajamento e
       INNER JOIN posts p ON e.post_id = p.id
       WHERE p.conta_id IN (?)
         AND e.data_coleta >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [accounts.map((a) => a.id).length > 0 ? accounts.map((a) => a.id) : [0]]
    );
    const taxaEngajamento = parseFloat((engagRows as any[])[0]?.media_engajamento || 0).toFixed(2);

    // Total leads
    const [leadRows] = await pool.query(
      'SELECT COUNT(*) as total FROM leads WHERE usuario_id = ?',
      [usuarioId]
    );
    const totalLeads = (leadRows as any[])[0]?.total || 0;

    // Weekly growth (follower change)
    const [weeklyRows] = await pool.query(
      `SELECT
         COALESCE((
           SELECT total_seguidores FROM seguidores
           WHERE conta_id IN (?) ORDER BY data_registro DESC LIMIT 1
         ), 0) -
         COALESCE((
           SELECT total_seguidores FROM seguidores
           WHERE conta_id IN (?) AND data_registro <= DATE_SUB(NOW(), INTERVAL 7 DAY)
           ORDER BY data_registro DESC LIMIT 1
         ), 0) as crescimento_semanal`,
      [
        accounts.map((a) => a.id).length > 0 ? accounts.map((a) => a.id) : [0],
        accounts.map((a) => a.id).length > 0 ? accounts.map((a) => a.id) : [0],
      ]
    );
    const crescimentoSemanal = (weeklyRows as any[])[0]?.crescimento_semanal || 0;

    return {
      totalSeguidores,
      taxaEngajamento,
      totalLeads,
      crescimentoSemanal,
      totalContas: accounts.length,
    };
  },

  // Get daily engagement data for charts (last 30 days)
  async getEngagementByDay(usuarioId: number, dias = 30) {
    const [accountRows] = await pool.query(
      'SELECT id FROM contas_sociais WHERE usuario_id = ? AND ativo = true',
      [usuarioId]
    );
    const accountIds = (accountRows as any[]).map((a) => a.id);

    if (accountIds.length === 0) return [];

    const [rows] = await pool.query(
      `SELECT
         DATE(e.data_coleta) as dia,
         SUM(e.curtidas) as total_curtidas,
         SUM(e.comentarios) as total_comentarios,
         SUM(e.compartilhamentos) as total_compartilhamentos,
         SUM(e.visualizacoes) as total_visualizacoes,
         AVG(e.taxa_engajamento) as taxa_media
       FROM engajamento e
       INNER JOIN posts p ON e.post_id = p.id
       WHERE p.conta_id IN (?)
         AND e.data_coleta >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(e.data_coleta)
       ORDER BY dia ASC`,
      [accountIds, dias]
    );
    return rows;
  },

  // Get follower growth data for charts
  async getFollowerGrowth(usuarioId: number, dias = 30) {
    const [accountRows] = await pool.query(
      'SELECT id FROM contas_sociais WHERE usuario_id = ? AND ativo = true',
      [usuarioId]
    );
    const accountIds = (accountRows as any[]).map((a) => a.id);

    if (accountIds.length === 0) return [];

    const [rows] = await pool.query(
      `SELECT
         DATE(data_registro) as dia,
         SUM(total_seguidores) as total
       FROM seguidores
       WHERE conta_id IN (?)
         AND data_registro >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(data_registro)
       ORDER BY dia ASC`,
      [accountIds, dias]
    );
    return rows;
  },

  // Get top performing posts
  async getTopPosts(usuarioId: number, limit = 5) {
    const [accountRows] = await pool.query(
      'SELECT id FROM contas_sociais WHERE usuario_id = ? AND ativo = true',
      [usuarioId]
    );
    const accountIds = (accountRows as any[]).map((a) => a.id);

    if (accountIds.length === 0) return [];

    const [rows] = await pool.query(
      `SELECT
         p.id,
         p.legenda,
         p.url_permalink,
         p.data_postagem,
         cs.plataforma,
         MAX(e.curtidas) as curtidas,
         MAX(e.comentarios) as comentarios,
         MAX(e.visualizacoes) as visualizacoes,
         MAX(e.alcance) as alcance,
         MAX(e.taxa_engajamento) as taxa_engajamento
       FROM posts p
       INNER JOIN engajamento e ON e.post_id = p.id
       INNER JOIN contas_sociais cs ON cs.id = p.conta_id
       WHERE p.conta_id IN (?)
       GROUP BY p.id
       ORDER BY taxa_engajamento DESC
       LIMIT ?`,
      [accountIds, limit]
    );
    return rows;
  },

  // Identify potentially viral posts (engagement above average)
  async identifyViralPosts(usuarioId: number) {
    const [accountRows] = await pool.query(
      'SELECT id FROM contas_sociais WHERE usuario_id = ? AND ativo = true',
      [usuarioId]
    );
    const accountIds = (accountRows as any[]).map((a) => a.id);

    if (accountIds.length === 0) return [];

    const [rows] = await pool.query(
      `SELECT
         p.id,
         p.legenda,
         p.url_permalink,
         cs.plataforma,
         MAX(e.taxa_engajamento) as taxa_engajamento,
         (SELECT AVG(e2.taxa_engajamento) FROM engajamento e2
          INNER JOIN posts p2 ON e2.post_id = p2.id
          WHERE p2.conta_id IN (?)
            AND e2.data_coleta >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as media_geral
       FROM posts p
       INNER JOIN engajamento e ON e.post_id = p.id
       INNER JOIN contas_sociais cs ON cs.id = p.conta_id
       WHERE p.conta_id IN (?)
         AND e.data_coleta >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY p.id
       HAVING taxa_engajamento > media_geral * 1.5
       ORDER BY taxa_engajamento DESC
       LIMIT 10`,
      [accountIds, accountIds]
    );
    return rows;
  },

  // Suggest best posting times based on historical engagement
  async getBestPostingTimes(usuarioId: number) {
    const [accountRows] = await pool.query(
      'SELECT id FROM contas_sociais WHERE usuario_id = ? AND ativo = true',
      [usuarioId]
    );
    const accountIds = (accountRows as any[]).map((a) => a.id);

    if (accountIds.length === 0) return [];

    const [rows] = await pool.query(
      `SELECT
         HOUR(p.data_postagem) as hora,
         DAYOFWEEK(p.data_postagem) as dia_semana,
         AVG(e.taxa_engajamento) as media_engajamento,
         COUNT(p.id) as total_posts
       FROM posts p
       INNER JOIN engajamento e ON e.post_id = p.id
       WHERE p.conta_id IN (?)
         AND p.data_postagem IS NOT NULL
       GROUP BY hora, dia_semana
       HAVING total_posts >= 2
       ORDER BY media_engajamento DESC
       LIMIT 5`,
      [accountIds]
    );
    return rows;
  },
};
