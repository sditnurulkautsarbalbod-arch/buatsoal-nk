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
      const baseUrl = (c.env as any).CF_R2_PUBLIC_URL || '';
      const publicUrl = `${baseUrl}/${fileName}`;
      return c.json({ url: publicUrl });
    } else {
      // Fallback: Gunakan S3 Client (untuk local development di AI Studio)
      const env = (c.env as any) || process.env;
      const R2_ACCESS_KEY_ID = env.CF_R2_ACCESS_KEY_ID;
      const R2_SECRET_ACCESS_KEY = env.CF_R2_SECRET_ACCESS_KEY;
      const R2_BUCKET_NAME = env.CF_R2_BUCKET_NAME;
      const R2_ACCOUNT_ID = env.CF_ACCOUNT_ID;
      const R2_PUBLIC_URL = env.CF_R2_PUBLIC_URL;

      if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_ACCOUNT_ID) {
        return c.json({ error: 'R2 Credentials (Access Key, Secret, Bucket Name, Account ID) tidak lengkap di Environment Variables.' }, 500);
      }

      try {
        const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
        const s3 = new S3Client({
          region: 'auto',
          endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
          },
        });

        await s3.send(new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: fileName,
          Body: Buffer.from(await file.arrayBuffer()),
          ContentType: file.type,
        }));

        const publicUrl = `${R2_PUBLIC_URL}/${fileName}`;
        return c.json({ url: publicUrl });
      } catch (s3Err: any) {
        return c.json({ error: `Gagal upload ke R2 via S3: ${s3Err.message}` }, 500);
      }
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
    const CF_ACCOUNT_ID = (env?.CF_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || '').trim();
    const CF_API_TOKEN = (env?.CF_API_TOKEN || process.env.CF_API_TOKEN || '').trim();
    const CF_D1_DATABASE_ID = (env?.CF_D1_DATABASE_ID || process.env.CF_D1_DATABASE_ID || '').trim();

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
