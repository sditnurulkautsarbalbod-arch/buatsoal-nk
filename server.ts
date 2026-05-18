import { Hono } from 'hono';

const app = new Hono();

// API: Health Check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

// API: Upload to R2
app.post('/api/upload', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'] as File;

  if (!file) return c.json({ error: 'No file uploaded' }, 400);

  const fileName = `${Date.now()}-${file.name}`;
  const bucket = (c.env as any)?.BUCKET;

  if (bucket) {
    await bucket.put(fileName, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });
    const publicUrl = `${(c.env as any).CF_R2_PUBLIC_URL}/${fileName}`;
    return c.json({ url: publicUrl });
  } else {
    // Fallback for dev proxy if needed
    return c.json({ error: 'R2 Binding not found.' }, 500);
  }
});

// API: D1 Proxy / Direct
app.post('/api/db/query', async (c) => {
  const { sql, params } = await c.req.json();
  const db = (c.env as any)?.DB;

  if (db) {
    try {
      const result = await db.prepare(sql).bind(...(params || [])).all();
      return c.json({ success: true, result: [result] });
    } catch (err: any) {
      return c.json({ success: false, errors: [{ message: err.message }] });
    }
  } else {
    // Development Proxy
    const CF_ACCOUNT_ID = (c.env as any)?.CF_ACCOUNT_ID;
    const CF_API_TOKEN = (c.env as any)?.CF_API_TOKEN;
    const CF_D1_DATABASE_ID = (c.env as any)?.CF_D1_DATABASE_ID;
    
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
      return c.json(await response.json());
    } catch (error: any) {
      return c.json({ error: "Failed to query D1 proxy", details: error.message }, 500);
    }
  }
});

// Serve Static Files is handled by [assets] in wrangler.toml + Cloudflare system
// For local dev, we will have a separate entry point or conditional import

export default app;
