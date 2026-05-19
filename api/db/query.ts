import { db } from '@vercel/postgres';

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { sql, params } = req.body;
    const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

    if (!postgresUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'POSTGRES_URL atau DATABASE_URL tidak ditemukan.' 
      });
    }

    const result = await db.query(sql, params || []);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Database query error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
