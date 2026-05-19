import { put } from '@vercel/blob';

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

async function readRawBody(req: any): Promise<string> {
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function getPayload(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  const raw = await readRawBody(req);
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: `Method not allowed: ${req.method}` });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN tidak ditemukan di environment Vercel.' });
    }

    const payload = await getPayload(req);
    const { filename, content, contentType } = payload || {};

    if (!filename || !content) {
      return res.status(400).json({ error: 'filename dan content wajib diisi.' });
    }

    const safeFilename = String(filename).trim();
    if (!safeFilename) {
      return res.status(400).json({ error: 'Nama file tidak valid.' });
    }

    const base64Payload = String(content).trim();
    if (!base64Payload) {
      return res.status(400).json({ error: 'Payload file kosong.' });
    }

    const binary = Buffer.from(base64Payload, 'base64');
    if (!binary.length) {
      return res.status(400).json({ error: 'Payload base64 tidak valid.' });
    }

    if (binary.length > MAX_UPLOAD_BYTES) {
      return res.status(413).json({
        error: `Ukuran file melebihi batas ${(MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(0)}MB.`,
      });
    }

    const blob = await put(safeFilename, binary, {
      access: 'public',
      token,
      contentType: contentType || 'application/octet-stream',
      addRandomSuffix: true,
    });

    return res.status(200).json({ url: blob.url, pathname: blob.pathname });
  } catch (err: any) {
    console.error('UPLOAD ERROR:', {
      message: err?.message,
      name: err?.name,
      statusCode: err?.statusCode,
      status: err?.status,
      cause: err?.cause,
    });

    return res.status(500).json({
      error: err?.message || 'Gagal mengunggah file ke Blob.',
    });
  }
}
