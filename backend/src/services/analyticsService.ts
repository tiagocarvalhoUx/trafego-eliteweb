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
        'INSERT INTO seguidores (conta_id, total_seguidores) VALUES ($1, $2)',
        [contaId, profile.followers_count]
      );

      // Get recent media
      const medias = await instagramService.getMedia(accessToken, 25);

      for (const media of medias) {
        // Upsert post
        await pool.query(
          `INSERT INTO posts (conta_id, id_post_plataforma, data_postagem, legenda, tipo_midia, url_permalink)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (conta_id, id_post_plataforma) DO UPDATE SET legenda = EXCLUDED.legenda`,
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
        const postResult = await pool.query(
          'SELECT id FROM posts WHERE conta_id = $1 AND id_post_plataforma = $2',
          [contaId, media.id]
        );
        const postId = postResult.rows[0]?.id;
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
           VALUES ($1, $2, $3, $4, $5, $6)`,
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
        'INSERT INTO seguidores (conta_id, total_seguidores) VALUES ($1, $2)',
        [contaId, userInfo.follower_count]
      );

      const videos = await tiktokService.getVideos(accessToken, 20);

      for (const video of videos) {
        await pool.query(
          `INSERT INTO posts (conta_id, id_post_plataforma, data_postagem, legenda, tipo_midia)
           VALUES ($1, $2, $3, $4, 'VIDEO')
           ON CONFLICT (conta_id, id_post_plataforma) DO UPDATE SET legenda = EXCLUDED.legenda`,
          [contaId, video.id, new Date(video.create_time * 1000), video.description]
        );

        const postResult = await pool.query(
          'SELECT id FROM posts WHERE conta_id = $1 AND id_post_plataforma = $2',
          [contaId, video.id]
        );
        const postId = postResult.rows[0]?.id;
        if (!postId) continue;

        const taxaEngajamento =
          userInfo.follower_count > 0
            ? (((video.like_count || 0) + (video.comment_count || 0) + (video.share_count || 0)) /
                userInfo.follower_count) *
              100
            : 0;

        await pool.query(
          `INSERT INTO engajamento (post_id, curtidas, comentarios, compartilhamentos, visualizacoes, taxa_engajamento)
           VALUES ($1, $2, $3, $4, $5, $6)`,
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
    const { rows: accounts } = await pool.query(
      'SELECT id, plataforma FROM contas_sociais WHERE usuario_id = $1 AND ativo = true',
      [usuarioId]
    );

    const accountIds = accounts.map((a: any) => a.id);
    const safeIds = accountIds.length > 0 ? accountIds : [0];

    // Total followers across all accounts
    const followerResult = await pool.query(
      `SELECT SUM(s.total_seguidores) as total
       FROM seguidores s
       INNER JOIN (
         SELECT conta_id, MAX(data_registro) as max_data
         FROM seguidores WHERE conta_id = ANY($1::int[])
         GROUP BY conta_id
       ) latest ON s.conta_id = latest.conta_id AND s.data_registro = latest.max_data`,
      [safeIds]
    );
    const totalSeguidores = followerResult.rows[0]?.total || 0;

    // Average engagement rate
    const engagResult = await pool.query(
      `SELECT AVG(e.taxa_engajamento) as media_engajamento
       FROM engajamento e
       INNER JOIN posts p ON e.post_id = p.id
       WHERE p.conta_id = ANY($1::int[])
         AND e.data_coleta >= NOW() - INTERVAL '30 days'`,
      [safeIds]
    );
    const taxaEngajamento = parseFloat(engagResult.rows[0]?.media_engajamento || 0).toFixed(2);

    // Total leads
    const leadResult = await pool.query(
      'SELECT COUNT(*) as total FROM leads WHERE usuario_id = $1',
      [usuarioId]
    );
    const totalLeads = parseInt(leadResult.rows[0]?.total || '0', 10);

    // Weekly growth (follower change)
    const weeklyResult = await pool.query(
      `SELECT
         COALESCE((
           SELECT total_seguidores FROM seguidores
           WHERE conta_id = ANY($1::int[]) ORDER BY data_registro DESC LIMIT 1
         ), 0) -
         COALESCE((
           SELECT total_seguidores FROM seguidores
           WHERE conta_id = ANY($1::int[]) AND data_registro <= NOW() - INTERVAL '7 days'
           ORDER BY data_registro DESC LIMIT 1
         ), 0) as crescimento_semanal`,
      [safeIds]
    );
    const crescimentoSemanal = weeklyResult.rows[0]?.crescimento_semanal || 0;

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
    const { rows: accountRows } = await pool.query(
      'SELECT id FROM contas_sociais WHERE usuario_id = $1 AND ativo = true',
      [usuarioId]
    );
    const accountIds = accountRows.map((a: any) => a.id);

    if (accountIds.length === 0) return [];

    const { rows } = await pool.query(
      `SELECT
         DATE(e.data_coleta) as dia,
         SUM(e.curtidas) as total_curtidas,
         SUM(e.comentarios) as total_comentarios,
         SUM(e.compartilhamentos) as total_compartilhamentos,
         SUM(e.visualizacoes) as total_visualizacoes,
         AVG(e.taxa_engajamento) as taxa_media
       FROM engajamento e
       INNER JOIN posts p ON e.post_id = p.id
       WHERE p.conta_id = ANY($1::int[])
         AND e.data_coleta >= NOW() - ($2 || ' days')::interval
       GROUP BY DATE(e.data_coleta)
       ORDER BY dia ASC`,
      [accountIds, dias]
    );
    return rows;
  },

  // Get follower growth data for charts
  async getFollowerGrowth(usuarioId: number, dias = 30) {
    const { rows: accountRows } = await pool.query(
      'SELECT id FROM contas_sociais WHERE usuario_id = $1 AND ativo = true',
      [usuarioId]
    );
    const accountIds = accountRows.map((a: any) => a.id);

    if (accountIds.length === 0) return [];

    const { rows } = await pool.query(
      `SELECT
         DATE(data_registro) as dia,
         SUM(total_seguidores) as total
       FROM seguidores
       WHERE conta_id = ANY($1::int[])
         AND data_registro >= NOW() - ($2 || ' days')::interval
       GROUP BY DATE(data_registro)
       ORDER BY dia ASC`,
      [accountIds, dias]
    );
    return rows;
  },

  // Get top performing posts
  async getTopPosts(usuarioId: number, limit = 5) {
    const { rows: accountRows } = await pool.query(
      'SELECT id FROM contas_sociais WHERE usuario_id = $1 AND ativo = true',
      [usuarioId]
    );
    const accountIds = accountRows.map((a: any) => a.id);

    if (accountIds.length === 0) return [];

    const { rows } = await pool.query(
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
       WHERE p.conta_id = ANY($1::int[])
       GROUP BY p.id, p.legenda, p.url_permalink, p.data_postagem, cs.plataforma
       ORDER BY taxa_engajamento DESC
       LIMIT $2`,
      [accountIds, limit]
    );
    return rows;
  },

  // Identify potentially viral posts (engagement above average)
  async identifyViralPosts(usuarioId: number) {
    const { rows: accountRows } = await pool.query(
      'SELECT id FROM contas_sociais WHERE usuario_id = $1 AND ativo = true',
      [usuarioId]
    );
    const accountIds = accountRows.map((a: any) => a.id);

    if (accountIds.length === 0) return [];

    const { rows } = await pool.query(
      `SELECT
         p.id,
         p.legenda,
         p.url_permalink,
         cs.plataforma,
         MAX(e.taxa_engajamento) as taxa_engajamento,
         (SELECT AVG(e2.taxa_engajamento) FROM engajamento e2
          INNER JOIN posts p2 ON e2.post_id = p2.id
          WHERE p2.conta_id = ANY($1::int[])
            AND e2.data_coleta >= NOW() - INTERVAL '7 days') as media_geral
       FROM posts p
       INNER JOIN engajamento e ON e.post_id = p.id
       INNER JOIN contas_sociais cs ON cs.id = p.conta_id
       WHERE p.conta_id = ANY($1::int[])
         AND e.data_coleta >= NOW() - INTERVAL '7 days'
       GROUP BY p.id, p.legenda, p.url_permalink, cs.plataforma
       HAVING MAX(e.taxa_engajamento) > (
         SELECT AVG(e3.taxa_engajamento) * 1.5 FROM engajamento e3
         INNER JOIN posts p3 ON e3.post_id = p3.id
         WHERE p3.conta_id = ANY($1::int[])
           AND e3.data_coleta >= NOW() - INTERVAL '7 days'
       )
       ORDER BY taxa_engajamento DESC
       LIMIT 10`,
      [accountIds]
    );
    return rows;
  },

  // Suggest best posting times based on historical engagement
  async getBestPostingTimes(usuarioId: number) {
    const { rows: accountRows } = await pool.query(
      'SELECT id FROM contas_sociais WHERE usuario_id = $1 AND ativo = true',
      [usuarioId]
    );
    const accountIds = accountRows.map((a: any) => a.id);

    if (accountIds.length === 0) return [];

    const { rows } = await pool.query(
      `SELECT
         EXTRACT(HOUR FROM p.data_postagem)::int as hora,
         (EXTRACT(DOW FROM p.data_postagem)::int + 1) as dia_semana,
         AVG(e.taxa_engajamento) as media_engajamento,
         COUNT(p.id) as total_posts
       FROM posts p
       INNER JOIN engajamento e ON e.post_id = p.id
       WHERE p.conta_id = ANY($1::int[])
         AND p.data_postagem IS NOT NULL
       GROUP BY hora, dia_semana
       HAVING COUNT(p.id) >= 2
       ORDER BY media_engajamento DESC
       LIMIT 5`,
      [accountIds]
    );
    return rows;
  },
};
