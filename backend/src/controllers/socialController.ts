import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/authMiddleware';
import { instagramService } from '../services/instagramService';
import { tiktokService } from '../services/tiktokService';
import { analyticsService } from '../services/analyticsService';
import { env } from '../config/env';

export const socialController = {
  // GET /api/social/accounts
  async getAccounts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { rows } = await pool.query(
        `SELECT id, plataforma, conta_nome, conta_id_plataforma, data_conexao, ativo
         FROM contas_sociais WHERE usuario_id = $1`,
        [req.userId]
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Get accounts error:', error);
      res.status(500).json({ success: false, message: 'Erro ao carregar contas' });
    }
  },

  // GET /api/social/instagram/auth-url
  async getInstagramAuthUrl(req: AuthRequest, res: Response): Promise<void> {
    const state = Buffer.from(JSON.stringify({ userId: req.userId })).toString('base64');
    const url = instagramService.getAuthUrl(env.instagram.appId, env.instagram.redirectUri, state);
    res.json({ success: true, data: { url } });
  },

  // GET /api/social/instagram/callback?code=xxx&state=xxx
  async instagramCallback(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { code, state } = req.query;
      let userId = req.userId;
      if (!userId && state) {
        try {
          const decoded = JSON.parse(Buffer.from(state as string, 'base64').toString());
          userId = decoded.userId;
        } catch {}
      }
      if (!code) {
        res.status(400).json({ success: false, message: 'Código de autorização não fornecido' });
        return;
      }

      // Exchange code for short-lived token, then for long-lived token
      const cleanCode = (code as string).split('#')[0];
      console.log('Instagram callback - code:', cleanCode, 'redirect_uri:', env.instagram.redirectUri);
      const shortToken = await instagramService.exchangeCode(
        cleanCode,
        env.instagram.appId,
        env.instagram.appSecret,
        env.instagram.redirectUri
      );
      const tokenData = await instagramService.exchangeToken(
        shortToken.access_token,
        env.instagram.appId,
        env.instagram.appSecret
      );

      const profile = await instagramService.getProfile(tokenData.access_token);

      // Save account to database
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      await pool.query(
        `INSERT INTO contas_sociais (usuario_id, plataforma, access_token, token_expires_at, conta_nome, conta_id_plataforma)
         VALUES ($1, 'instagram', $2, $3, $4, $5)
         ON CONFLICT (usuario_id, conta_id_plataforma) DO UPDATE SET
           access_token = EXCLUDED.access_token,
           token_expires_at = EXCLUDED.token_expires_at,
           ativo = true`,
        [userId, tokenData.access_token, expiresAt, profile.username, profile.id]
      );

      // Trigger initial data collection
      const contaResult = await pool.query(
        'SELECT id FROM contas_sociais WHERE usuario_id = $1 AND conta_id_plataforma = $2',
        [userId, profile.id]
      );
      const contaId = contaResult.rows[0]?.id;

      if (contaId) {
        analyticsService.collectInstagramData(contaId, tokenData.access_token).catch(console.error);
      }

      res.json({
        success: true,
        message: 'Instagram conectado com sucesso!',
        data: { username: profile.username, followers: profile.followers_count },
      });
    } catch (error: any) {
      const detail = error?.response?.data || error?.message || error;
      console.error('Instagram callback error:', JSON.stringify(detail));
      res.status(500).json({ success: false, message: 'Erro ao conectar Instagram', detail, debug_redirect_uri: env.instagram.redirectUri });
    }
  },

  // GET /api/social/tiktok/auth-url
  async getTikTokAuthUrl(req: AuthRequest, res: Response): Promise<void> {
    const state = `user_${req.userId}_${Date.now()}`;
    const url = tiktokService.getAuthUrl(env.tiktok.clientKey, env.tiktok.redirectUri, state);
    res.json({ success: true, data: { url } });
  },

  // GET /api/social/tiktok/callback?code=xxx
  async tiktokCallback(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { code } = req.query;
      if (!code) {
        res.status(400).json({ success: false, message: 'Código de autorização não fornecido' });
        return;
      }

      const tokenData = await tiktokService.exchangeCode(
        code as string,
        env.tiktok.clientKey,
        env.tiktok.clientSecret,
        env.tiktok.redirectUri
      );

      const userInfo = await tiktokService.getUserInfo(tokenData.access_token);

      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      await pool.query(
        `INSERT INTO contas_sociais (usuario_id, plataforma, access_token, refresh_token, token_expires_at, conta_nome, conta_id_plataforma)
         VALUES ($1, 'tiktok', $2, $3, $4, $5, $6)
         ON CONFLICT (usuario_id, conta_id_plataforma) DO UPDATE SET
           access_token = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           token_expires_at = EXCLUDED.token_expires_at,
           ativo = true`,
        [req.userId, tokenData.access_token, tokenData.refresh_token, expiresAt, userInfo.display_name, userInfo.open_id]
      );

      res.json({
        success: true,
        message: 'TikTok conectado com sucesso!',
        data: { display_name: userInfo.display_name, followers: userInfo.follower_count },
      });
    } catch (error) {
      console.error('TikTok callback error:', error);
      res.status(500).json({ success: false, message: 'Erro ao conectar TikTok' });
    }
  },

  // DELETE /api/social/accounts/:id
  async disconnectAccount(req: AuthRequest, res: Response): Promise<void> {
    try {
      await pool.query(
        'UPDATE contas_sociais SET ativo = false WHERE id = $1 AND usuario_id = $2',
        [req.params.id, req.userId]
      );
      res.json({ success: true, message: 'Conta desconectada com sucesso' });
    } catch (error) {
      console.error('Disconnect account error:', error);
      res.status(500).json({ success: false, message: 'Erro ao desconectar conta' });
    }
  },

  // POST /api/social/collect/:contaId
  async triggerCollection(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { rows: contas } = await pool.query(
        'SELECT id, plataforma, access_token FROM contas_sociais WHERE id = $1 AND usuario_id = $2 AND ativo = true',
        [req.params.contaId, req.userId]
      );

      if (contas.length === 0) {
        res.status(404).json({ success: false, message: 'Conta não encontrada' });
        return;
      }

      const conta = contas[0];
      res.json({ success: true, message: 'Coleta iniciada em background' });

      // Run in background
      if (conta.plataforma === 'instagram') {
        analyticsService.collectInstagramData(conta.id, conta.access_token).catch(console.error);
      } else if (conta.plataforma === 'tiktok') {
        analyticsService.collectTikTokData(conta.id, conta.access_token).catch(console.error);
      }
    } catch (error) {
      console.error('Trigger collection error:', error);
      res.status(500).json({ success: false, message: 'Erro ao iniciar coleta' });
    }
  },
};
