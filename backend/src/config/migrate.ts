/**
 * Database Migration Script
 * Run with: npm run migrate
 * Creates all tables if they don't exist
 */
import { Client } from 'pg';
import { env } from './env';

async function migrate(): Promise<void> {
  const client = new Client({ connectionString: env.db.url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    // Usuarios
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        senha_hash VARCHAR(255) NOT NULL,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ativo BOOLEAN DEFAULT TRUE
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);`);

    // Contas sociais
    await client.query(`
      CREATE TABLE IF NOT EXISTS contas_sociais (
        id SERIAL PRIMARY KEY,
        usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        plataforma VARCHAR(20) NOT NULL CHECK (plataforma IN ('instagram', 'tiktok')),
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expires_at TIMESTAMP NULL,
        conta_nome VARCHAR(100),
        conta_id_plataforma VARCHAR(100),
        data_conexao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ativo BOOLEAN DEFAULT TRUE,
        UNIQUE (usuario_id, conta_id_plataforma)
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contas_usuario ON contas_sociais(usuario_id);`);

    // Posts
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        conta_id INT NOT NULL REFERENCES contas_sociais(id) ON DELETE CASCADE,
        id_post_plataforma VARCHAR(200) NOT NULL,
        data_postagem TIMESTAMP NULL,
        legenda TEXT,
        tipo_midia VARCHAR(50),
        url_midia VARCHAR(500),
        url_permalink VARCHAR(500),
        data_coleta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (conta_id, id_post_plataforma)
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_posts_conta ON posts(conta_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_posts_data_postagem ON posts(data_postagem);`);

    // Engajamento
    await client.query(`
      CREATE TABLE IF NOT EXISTS engajamento (
        id SERIAL PRIMARY KEY,
        post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        data_coleta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        curtidas INT DEFAULT 0,
        comentarios INT DEFAULT 0,
        compartilhamentos INT DEFAULT 0,
        visualizacoes INT DEFAULT 0,
        alcance INT DEFAULT 0,
        impressoes INT DEFAULT 0,
        taxa_engajamento DECIMAL(5,2) DEFAULT 0.00
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_engajamento_post ON engajamento(post_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_engajamento_data ON engajamento(data_coleta);`);

    // Seguidores
    await client.query(`
      CREATE TABLE IF NOT EXISTS seguidores (
        id SERIAL PRIMARY KEY,
        conta_id INT NOT NULL REFERENCES contas_sociais(id) ON DELETE CASCADE,
        total_seguidores INT DEFAULT 0,
        novos_seguidores INT DEFAULT 0,
        deixaram_de_seguir INT DEFAULT 0,
        data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_seguidores_conta ON seguidores(conta_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_seguidores_data ON seguidores(data_registro);`);

    // Leads
    await client.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        nome VARCHAR(100),
        usuario_plataforma VARCHAR(100) NOT NULL,
        plataforma VARCHAR(20) NOT NULL CHECK (plataforma IN ('instagram', 'tiktok')),
        origem VARCHAR(200),
        post_id INT,
        palavra_chave VARCHAR(100),
        mensagem_enviada TEXT,
        data_captura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'novo' CHECK (status IN ('novo', 'contatado', 'respondeu', 'convertido', 'descartado'))
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_usuario ON leads(usuario_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_data ON leads(data_captura);`);

    // Automações
    await client.query(`
      CREATE TABLE IF NOT EXISTS automacoes (
        id SERIAL PRIMARY KEY,
        conta_id INT NOT NULL REFERENCES contas_sociais(id) ON DELETE CASCADE,
        nome VARCHAR(100) NOT NULL,
        tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('comentario_keyword', 'dm_automatica', 'follow_back')),
        palavra_chave VARCHAR(100),
        mensagem_resposta TEXT,
        ativo BOOLEAN DEFAULT TRUE,
        total_disparos INT DEFAULT 0,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_automacoes_conta ON automacoes(conta_id);`);

    // Notificações
    await client.query(`
      CREATE TABLE IF NOT EXISTS notificacoes (
        id SERIAL PRIMARY KEY,
        usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        tipo VARCHAR(50) NOT NULL,
        titulo VARCHAR(200) NOT NULL,
        mensagem TEXT NOT NULL,
        lida BOOLEAN DEFAULT FALSE,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_lida ON notificacoes(usuario_id, lida);`);

    // Metas de crescimento
    await client.query(`
      CREATE TABLE IF NOT EXISTS metas (
        id SERIAL PRIMARY KEY,
        conta_id INT NOT NULL REFERENCES contas_sociais(id) ON DELETE CASCADE,
        tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('seguidores', 'engajamento', 'leads')),
        valor_meta INT NOT NULL,
        valor_atual INT DEFAULT 0,
        periodo VARCHAR(10) NOT NULL CHECK (periodo IN ('semanal', 'mensal')),
        data_inicio DATE NOT NULL,
        data_fim DATE NOT NULL,
        concluida BOOLEAN DEFAULT FALSE,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Video Jobs
    await client.query(`
      CREATE TABLE IF NOT EXISTS video_jobs (
        id SERIAL PRIMARY KEY,
        usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        prompt_tema TEXT NOT NULL,
        prompt_estilo TEXT,
        prompt_tom TEXT,
        prompt_publico TEXT,
        prompt_elementos TEXT,
        prompt_musica TEXT,
        prompt_cta TEXT,
        plataformas TEXT,
        status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
        video_url TEXT,
        caption TEXT,
        thumbnail_url TEXT,
        google_operation_id TEXT,
        publicado_instagram BOOLEAN DEFAULT FALSE,
        publicado_tiktok BOOLEAN DEFAULT FALSE,
        error_msg TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_video_jobs_usuario ON video_jobs(usuario_id);`);

    // Add caption column if missing (migration for existing DBs)
    await client.query(`ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS caption TEXT;`).catch(() => {});

    console.log('✅ Migrations executed successfully! All tables created.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

migrate().catch(console.error);
