import { GoogleGenAI } from '@google/genai';

async function callGas(action: string, data: any) {
  const gasUrl = process.env.GAS_WEB_APP_URL || process.env.VITE_GAS_API_URL;
  if (!gasUrl) {
    throw new Error('GAS_WEB_APP_URL tidak ditemukan di environment.');
  }

  const response = await fetch(gasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data }),
  });

  const text = await response.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { error: `Respons GAS bukan JSON valid: ${text?.slice?.(0, 200) || ''}` };
  }

  if (!response.ok) {
    throw new Error(json?.error || `HTTP ${response.status}`);
  }

  return json;
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method Not Allowed: ${req.method}` });
  }

  try {
    const { prompt, apiKey: clientApiKey } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt wajib berupa teks.' });
    }

    const gasEnabled = process.env.GAS_ENABLE_GENERATE !== 'false';
    if (gasEnabled) {
      try {
        const gasResult = await callGas('generateText', {
          prompt,
          apiKey: clientApiKey || '',
        });

        if (!gasResult?.text || typeof gasResult.text !== 'string' || !gasResult.text.trim()) {
          throw new Error(gasResult?.error || 'GAS tidak mengembalikan teks.');
        }

        return res.status(200).json({ text: gasResult.text });
      } catch (gasError: any) {
        console.error('GAS generate failed, fallback to direct Gemini:', gasError?.message);
      }
    }

    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: 'GEMINI_API_KEY tidak ditemukan.' });
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
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || '';
    if (!text.trim()) {
      return res.status(502).json({ error: 'Model tidak mengembalikan teks.' });
    }

    return res.status(200).json({ text });
  } catch (error: any) {
    console.error('Gemini error:', {
      message: error?.message,
      status: error?.status,
      statusCode: error?.statusCode,
      code: error?.code,
      details: error?.details,
    });
    return res.status(500).json({ error: error?.message || 'Gagal generate soal AI.' });
  }
}
