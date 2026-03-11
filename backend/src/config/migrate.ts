/**
 * Database Migration Script
 * Run with: npm run migrate
 * Creates all tables if they don't exist
 */
import mysql from 'mysql2/promise';
import { env } from './env';

async function migrate(): Promise<void> {
  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
  });

  try {
    // Create database
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${env.db.name}\``);
    await conn.query(`USE \`${env.db.name}\``);

    // Usuarios
    await conn.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        senha_hash VARCHAR(255) NOT NULL,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ativo BOOLEAN DEFAULT TRUE,
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Contas sociais
    await conn.query(`
      CREATE TABLE IF NOT EXISTS contas_sociais (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        plataforma ENUM('instagram', 'tiktok') NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expires_at TIMESTAMP NULL,
        conta_nome VARCHAR(100),
        conta_id_plataforma VARCHAR(100),
        data_conexao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ativo BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        INDEX idx_usuario (usuario_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Posts
    await conn.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conta_id INT NOT NULL,
        id_post_plataforma VARCHAR(200) NOT NULL,
        data_postagem TIMESTAMP NULL,
        legenda TEXT,
        tipo_midia VARCHAR(50),
        url_midia VARCHAR(500),
        url_permalink VARCHAR(500),
        data_coleta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conta_id) REFERENCES contas_sociais(id) ON DELETE CASCADE,
        UNIQUE KEY uk_plataforma_post (conta_id, id_post_plataforma),
        INDEX idx_conta (conta_id),
        INDEX idx_data_postagem (data_postagem)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Engajamento
    await conn.query(`
      CREATE TABLE IF NOT EXISTS engajamento (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        data_coleta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        curtidas INT DEFAULT 0,
        comentarios INT DEFAULT 0,
        compartilhamentos INT DEFAULT 0,
        visualizacoes INT DEFAULT 0,
        alcance INT DEFAULT 0,
        impressoes INT DEFAULT 0,
        taxa_engajamento DECIMAL(5,2) DEFAULT 0.00,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        INDEX idx_post (post_id),
        INDEX idx_data_coleta (data_coleta)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seguidores
    await conn.query(`
      CREATE TABLE IF NOT EXISTS seguidores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conta_id INT NOT NULL,
        total_seguidores INT DEFAULT 0,
        novos_seguidores INT DEFAULT 0,
        deixaram_de_seguir INT DEFAULT 0,
        data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conta_id) REFERENCES contas_sociais(id) ON DELETE CASCADE,
        INDEX idx_conta (conta_id),
        INDEX idx_data_registro (data_registro)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Leads
    await conn.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        nome VARCHAR(100),
        usuario_plataforma VARCHAR(100) NOT NULL,
        plataforma ENUM('instagram', 'tiktok') NOT NULL,
        origem VARCHAR(200),
        post_id INT,
        palavra_chave VARCHAR(100),
        mensagem_enviada TEXT,
        data_captura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('novo', 'contatado', 'respondeu', 'convertido', 'descartado') DEFAULT 'novo',
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        INDEX idx_usuario (usuario_id),
        INDEX idx_status (status),
        INDEX idx_data_captura (data_captura)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Automações
    await conn.query(`
      CREATE TABLE IF NOT EXISTS automacoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conta_id INT NOT NULL,
        nome VARCHAR(100) NOT NULL,
        tipo ENUM('comentario_keyword', 'dm_automatica', 'follow_back') NOT NULL,
        palavra_chave VARCHAR(100),
        mensagem_resposta TEXT,
        ativo BOOLEAN DEFAULT TRUE,
        total_disparos INT DEFAULT 0,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conta_id) REFERENCES contas_sociais(id) ON DELETE CASCADE,
        INDEX idx_conta (conta_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Notificações
    await conn.query(`
      CREATE TABLE IF NOT EXISTS notificacoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        titulo VARCHAR(200) NOT NULL,
        mensagem TEXT NOT NULL,
        lida BOOLEAN DEFAULT FALSE,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        INDEX idx_usuario_lida (usuario_id, lida)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Metas de crescimento
    await conn.query(`
      CREATE TABLE IF NOT EXISTS metas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conta_id INT NOT NULL,
        tipo ENUM('seguidores', 'engajamento', 'leads') NOT NULL,
        valor_meta INT NOT NULL,
        valor_atual INT DEFAULT 0,
        periodo ENUM('semanal', 'mensal') NOT NULL,
        data_inicio DATE NOT NULL,
        data_fim DATE NOT NULL,
        concluida BOOLEAN DEFAULT FALSE,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conta_id) REFERENCES contas_sociais(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ Migrations executed successfully! All tables created.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

migrate().catch(console.error);
