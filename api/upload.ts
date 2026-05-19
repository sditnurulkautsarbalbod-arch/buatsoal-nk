import { put } from '@vercel/blob';

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed',
      });
    }

    const { filename, content } = req.body;

    if (!filename || !content) {
      return res.status(400).json({ error: 'filename and content are required' });
    }

    const blob = await put(filename, content, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return res.status(200).json(blob);

  } catch (err: any) {
    console.error('UPLOAD ERROR:', err);

    return res.status(500).json({
      error: err.message,
    });
  }
}
