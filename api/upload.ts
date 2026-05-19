import { put } from '@vercel/blob';
import multer from 'multer';

// Note: Vercel Functions in some configurations prefer standard Request/Response
// But for Express-like compatibility in Vercel, we can use this structure.

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = multer({ storage: multer.memoryStorage() });

function runMiddleware(req: any, res: any, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN missing' });
    }

    await runMiddleware(req, res, upload.single('file'));
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const blob = await put(req.file.originalname, req.file.buffer, {
      access: 'public',
      token: blobToken
    });

    return res.status(200).json(blob);
  } catch (error: any) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: error.message });
  }
}
