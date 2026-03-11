import { Pool } from 'pg';
import dns from 'dns';
import { env } from './env';

// Force IPv4 to avoid ENETUNREACH on IPv6-only hosts (e.g. Render)
dns.setDefaultResultOrder('ipv4first');

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
