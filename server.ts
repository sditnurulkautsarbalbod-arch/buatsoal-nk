import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { put } from '@vercel/blob';
import { db } from '@vercel/postgres';
import multer from 'multer';
import dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const upload = multer({ storage: multer.memoryStorage() });

  // Middleware
  app.use(cors()); // Allow all origins in dev
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Global Logger
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Explicit OPTIONS handle for all /api routes to prevent 405 from nginx/Vite
  app.options('/api/*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
  });

  // API: Upload to Vercel Blob
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      let filename: string;
      let content: any;
      let contentType: string | undefined;

      if (req.file) {
        filename = req.file.originalname;
        content = req.file.buffer;
        contentType = req.file.mimetype;
      } else if (req.body.filename && req.body.content) {
        filename = req.body.filename;
        content = req.body.content;
        contentType = req.body.contentType; // optional
      } else {
        return res.status(400).json({ error: 'No file uploaded (file or filename/content required)' });
      }

      const token = process.env.BLOB_READ_WRITE_TOKEN;
      if (!token) {
        console.error('UPLOAD ERROR: BLOB_READ_WRITE_TOKEN is not defined');
        return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN tidak ditemukan.' });
      }

      const blob = await put(filename, content, {
        access: 'public',
        token,
        contentType,
      });

      res.json(blob);
    } catch (err: any) {
      console.error('UPLOAD ERROR:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // API: Vercel Postgres Query
  app.post('/api/db/query', async (req, res) => {
    try {
      const { sql, params } = req.body;
      
      const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
      if (!postgresUrl) {
        return res.status(400).json({ 
          success: false, 
          error: 'POSTGRES_URL tidak ditemukan. Jika Anda menjalankan ini di AI Studio, harap gunakan Cloudflare atau atur environment variable Vercel di Settings.' 
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

  // API: Gemini Generate
  app.post('/api/generate', async (req, res) => {
    try {
      const { prompt, apiKey: clientApiKey } = req.body;
      const apiKey = clientApiKey || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(400).json({ error: 'GEMINI_API_KEY tidak ditemukan. Harap atur di Pengaturan atau sebagai environment variable.' });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      const text = response.text || '';
      
      res.json({ text });
    } catch (err: any) {
      console.error('Gemini generation error:', err);
      res.status(500).json({ error: err.message });
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
