import { Hono } from 'hono';

const app = new Hono();

// API: Health Check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

// API: Upload to R2
app.post('/api/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'] as File;

    if (!file) return c.json({ error: 'No file uploaded' }, 400);

    const fileName = `${Date.now()}-${file.name}`;
    const bucket = (c.env as any)?.BUCKET;

    if (bucket) {
      await bucket.put(fileName, await file.arrayBuffer(), {
        httpMetadata: { contentType: file.type },
      });
      // Ambil Public URL dari env atau hardcode jika sudah ada
      const baseUrl = (c.env as any).CF_R2_PUBLIC_URL || '';
      const publicUrl = `${baseUrl}/${fileName}`;
      return c.json({ url: publicUrl });
    } else {
      return c.json({ error: 'R2 Binding BUCKET tidak ditemukan.' }, 500);
    }
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// API: D1 Proxy / Direct
app.post('/api/db/query', async (c) => {
  const { sql, params } = await c.req.json();
  const db = (c.env as any)?.DB;

  if (db) {
    // PRODUCTION: Gunakan D1 Binding
    try {
      const result = await db.prepare(sql).bind(...(params || [])).all();
      // Format response agar sesuai dengan cloudflareService.ts
      return c.json({ success: true, result: [{ results: result.results, success: true }] });
    } catch (err: any) {
      return c.json({ success: false, errors: [{ message: err.message }] });
    }
  } else {
    // DEVELOPMENT: Proxy via Cloudflare API
    const env = c.env as any;
    const CF_ACCOUNT_ID = env?.CF_ACCOUNT_ID || process.env.CF_ACCOUNT_ID;
    const CF_API_TOKEN = env?.CF_API_TOKEN || process.env.CF_API_TOKEN;
    const CF_D1_DATABASE_ID = env?.CF_D1_DATABASE_ID || process.env.CF_D1_DATABASE_ID;

    if (!CF_ACCOUNT_ID || !CF_API_TOKEN || !CF_D1_DATABASE_ID) {
      console.error('Cloudflare D1 credentials missing in environment');
      return c.json({ 
        success: false, 
        errors: [{ message: 'Cloudflare D1 credentials missing. Please set CF_ACCOUNT_ID, CF_API_TOKEN, and CF_D1_DATABASE_ID in Secrets.' }] 
      }, 500);
    }
    
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_DATABASE_ID}/query`,
        {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${CF_API_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ sql, params })
        }
      );
      
      const data = await response.json();
      if (!response.ok) {
        console.error('Cloudflare API returned error:', data);
        return c.json(data, response.status as any);
      }
      return c.json(data);
    } catch (error: any) {
      console.error('Fetch to Cloudflare API failed:', error);
      return c.json({ success: false, errors: [{ message: "Gagal memproses query ke D1: " + error.message }] }, 500);
    }
  }
});

export default app;
