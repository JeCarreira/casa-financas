// api/save.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { key, data } = req.body;
    if (!key || key.length < 4) return res.status(400).json({ error: 'Invalid key' });

    const safeKey = 'cf:' + key.replace(/[^a-z0-9\-]/g, '').slice(0, 60);
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    const response = await fetch(`${url}/set/${encodeURIComponent(safeKey)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value: JSON.stringify(data), ex: 31536000 }),
    });

    if (!response.ok) throw new Error('Redis error');
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('save error:', err);
    return res.status(500).json({ error: 'Save failed' });
  }
}
