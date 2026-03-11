import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { env } from '../config/env';
import { AuthRequest } from '../middlewares/authMiddleware';

export const authController = {
  // POST /api/auth/register
  async register(req: Request, res: Response): Promise<void> {
    const { nome, email, senha } = req.body;

    try {
      const [existing] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
      if ((existing as any[]).length > 0) {
        res.status(409).json({ success: false, message: 'Email já cadastrado' });
        return;
      }

      const senha_hash = await bcrypt.hash(senha, 12);
      const [result] = await pool.query(
        'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
        [nome, email, senha_hash]
      );

      const userId = (result as any).insertId;
      const token = jwt.sign({ id: userId, email }, env.jwt.secret, {
        expiresIn: env.jwt.expiresIn,
      } as jwt.SignOptions);

      res.status(201).json({
        success: true,
        message: 'Usuário cadastrado com sucesso',
        data: { token, user: { id: userId, nome, email } },
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  },

  // POST /api/auth/login
  async login(req: Request, res: Response): Promise<void> {
    const { email, senha } = req.body;

    try {
      const [rows] = await pool.query(
        'SELECT id, nome, email, senha_hash, ativo FROM usuarios WHERE email = ?',
        [email]
      );
      const users = rows as any[];

      if (users.length === 0) {
        res.status(401).json({ success: false, message: 'Credenciais inválidas' });
        return;
      }

      const user = users[0];

      if (!user.ativo) {
        res.status(401).json({ success: false, message: 'Conta desativada' });
        return;
      }

      const passwordMatch = await bcrypt.compare(senha, user.senha_hash);
      if (!passwordMatch) {
        res.status(401).json({ success: false, message: 'Credenciais inválidas' });
        return;
      }

      const token = jwt.sign({ id: user.id, email: user.email }, env.jwt.secret, {
        expiresIn: env.jwt.expiresIn,
      } as jwt.SignOptions);

      res.json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          token,
          user: { id: user.id, nome: user.nome, email: user.email },
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  },

  // GET /api/auth/me
  async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      const [rows] = await pool.query(
        'SELECT id, nome, email, data_criacao FROM usuarios WHERE id = ?',
        [req.userId]
      );
      const users = rows as any[];

      if (users.length === 0) {
        res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        return;
      }

      res.json({ success: true, data: users[0] });
    } catch (error) {
      console.error('Me error:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  },

  // PUT /api/auth/profile
  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    const { nome } = req.body;

    try {
      await pool.query('UPDATE usuarios SET nome = ? WHERE id = ?', [nome, req.userId]);
      res.json({ success: true, message: 'Perfil atualizado com sucesso' });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  },
};
