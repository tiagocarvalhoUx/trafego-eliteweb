import mysql from 'mysql2/promise';
import { env } from './env';

// Connection pool for better performance
const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '-03:00', // Brazil timezone
});

export async function testConnection(): Promise<void> {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Database connected successfully');
    conn.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

export default pool;
