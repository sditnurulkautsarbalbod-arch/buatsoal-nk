import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { put } from '@vercel/blob';
import { db } from '@vercel/postgres';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const upload = multer({ storage: multer.memoryStorage() });

  app.use(express.json());

  // API: Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // API: Upload to Vercel Blob
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: 'No file uploaded' });

      const token = process.env.BLOB_READ_WRITE_TOKEN;
      if (!token) {
        return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN tidak ditemukan.' });
      }

      const { url } = await put(file.originalname, file.buffer, {
        access: 'public',
        token,
        contentType: file.mimetype,
      });

      res.json({ url });
    } catch (err: any) {
      console.error('Vercel Blob upload error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // API: Vercel Postgres Query
  app.post('/api/db/query', async (req, res) => {
    try {
      const { sql, params } = req.body;
      
      if (!process.env.POSTGRES_URL) {
        return res.status(500).json({ 
          success: false, 
          error: 'POSTGRES_URL tidak ditemukan. Harap hubungkan Vercel Postgres.' 
        });
      }

      const client = await db.connect();
      try {
        const result = await client.query(sql, params || []);
        res.json({ success: true, results: result.rows });
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error('Vercel Postgres query error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
