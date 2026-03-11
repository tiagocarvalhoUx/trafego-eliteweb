import { Pool } from 'pg';
import { env } from './env';

const pool = new Pool({
  connectionString: env.db.url,
  ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
});

export async function testConnection(): Promise<void> {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

export default pool;
