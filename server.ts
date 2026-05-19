import { Hono } from 'hono';
import { sql as vercelSql } from '@vercel/postgres';
import { put } from '@vercel/blob';

const app = new Hono();

// API: Health Check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

// API: Upload to Vercel Blob
app.post('/api/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'] as File;

    if (!file) return c.json({ error: 'No file uploaded' }, 400);

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return c.json({ error: 'BLOB_READ_WRITE_TOKEN tidak ditemukan di environment variables.' }, 500);
    }

    const { url } = await put(file.name, file, {
      access: 'public',
      token,
    });

    return c.json({ url });
  } catch (err: any) {
    console.error('Vercel Blob upload error:', err);
    return c.json({ error: err.message }, 500);
  }
});

// API: Vercel Postgres Query
app.post('/api/db/query', async (c) => {
  try {
    const { sql, params } = await c.req.json();
    
    // Check for POSTGRES_URL
    if (!process.env.POSTGRES_URL) {
      return c.json({ 
        success: false, 
        error: 'POSTGRES_URL tidak ditemukan. Harap hubungkan Vercel Postgres di dashboard Vercel.' 
      }, 500);
    }

    // vercelSql uses tagged template literals, but we have string + params
    // We can use the 'query' method or just bridge it
    // Using a simple direct query if possible, or mapping params
    
    // Note: Vercel Postgres sql`...` is preferred, but for dynamic queries:
    const { db } = await import('@vercel/postgres');
    const client = await db.connect();
    
    try {
      const result = await client.query(sql, params || []);
      return c.json({ success: true, results: result.rows });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('Vercel Postgres query error:', err);
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default app;
