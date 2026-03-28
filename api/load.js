// api/load.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { key } = req.body;
    if (!key || key.length < 4) return res.status(400).json({ error: 'Invalid key' });

    const safeKey = 'cf:' + key.replace(/[^a-z0-9\-]/g, '').slice(0, 60);
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    const response = await fetch(`${url}/get/${encodeURIComponent(safeKey)}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Redis error');
    const json = await response.json();
    const data = json.result ? JSON.parse(json.result) : null;
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error('load error:', err);
    return res.status(500).json({ error: 'Load failed' });
  }
}
