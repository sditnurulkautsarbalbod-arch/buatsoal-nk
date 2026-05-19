import { put } from '@vercel/blob';

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed',
      });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN tidak ditemukan.' });
    }

    const { filename, content, contentType } = req.body || {};

    if (!filename || !content) {
      return res.status(400).json({ error: 'filename and content are required' });
    }

    const base64Payload = String(content).includes(',') ? String(content).split(',')[1] : String(content);
    const binary = Buffer.from(base64Payload, 'base64');

    const blob = await put(filename, binary, {
      access: 'public',
      token,
      contentType,
    });

    return res.status(200).json({ url: blob.url, pathname: blob.pathname });
  } catch (err: any) {
    console.error('UPLOAD ERROR:', err);

    return res.status(500).json({
      error: err.message,
    });
  }
}
