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
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { sql, params } = req.body || {};
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ success: false, error: 'sql wajib berupa string.' });
    }

    const result = await callGas('dbQuery', {
      sql,
      params: Array.isArray(params) ? params : [],
    });

    if (result?.success) {
      return res.status(200).json({ success: true, results: result.results || [] });
    }

    return res.status(400).json({ success: false, error: result?.error || 'Query gagal di GAS.' });
  } catch (error: any) {
    console.error('Database query adapter error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Gagal query ke GAS.' });
  }
}
