import pool from '../config/database';
import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: false,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
});

export const notificationService = {
  // Create an in-app notification
  async createNotification(
    usuarioId: number,
    tipo: string,
    titulo: string,
    mensagem: string
  ): Promise<void> {
    await pool.query(
      'INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem) VALUES (?, ?, ?, ?)',
      [usuarioId, tipo, titulo, mensagem]
    );
  },

  // Get unread notifications for a user
  async getNotifications(usuarioId: number) {
    const [rows] = await pool.query(
      `SELECT id, tipo, titulo, mensagem, lida, data_criacao
       FROM notificacoes
       WHERE usuario_id = ?
       ORDER BY data_criacao DESC
       LIMIT 50`,
      [usuarioId]
    );
    return rows;
  },

  // Mark notification as read
  async markAsRead(notificationId: number, usuarioId: number): Promise<void> {
    await pool.query(
      'UPDATE notificacoes SET lida = true WHERE id = ? AND usuario_id = ?',
      [notificationId, usuarioId]
    );
  },

  // Mark all as read
  async markAllAsRead(usuarioId: number): Promise<void> {
    await pool.query('UPDATE notificacoes SET lida = true WHERE usuario_id = ?', [usuarioId]);
  },

  // Send email notification
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!env.smtp.user) return; // Skip if SMTP not configured

    try {
      await transporter.sendMail({
        from: `"Social Analytics" <${env.smtp.user}>`,
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error('Email send error:', error);
    }
  },

  // Check follower growth alerts (called by cron)
  async checkFollowerAlerts(): Promise<void> {
    const [rows] = await pool.query(
      `SELECT
         cs.id as conta_id,
         cs.usuario_id,
         u.email,
         u.nome,
         s_latest.total_seguidores as atual,
         s_prev.total_seguidores as anterior
       FROM contas_sociais cs
       INNER JOIN usuarios u ON u.id = cs.usuario_id
       INNER JOIN seguidores s_latest ON s_latest.conta_id = cs.id
       INNER JOIN seguidores s_prev ON s_prev.conta_id = cs.id
       WHERE cs.ativo = true
         AND s_latest.data_registro = (SELECT MAX(data_registro) FROM seguidores WHERE conta_id = cs.id)
         AND s_prev.data_registro = (
           SELECT MAX(data_registro) FROM seguidores
           WHERE conta_id = cs.id AND data_registro < s_latest.data_registro
         )
         AND (s_latest.total_seguidores - s_prev.total_seguidores) >= 100`
    );

    for (const row of rows as any[]) {
      const crescimento = row.atual - row.anterior;
      await notificationService.createNotification(
        row.usuario_id,
        'crescimento_seguidores',
        'Crescimento de seguidores!',
        `Sua conta ganhou ${crescimento} novos seguidores hoje.`
      );
    }
  },
};
