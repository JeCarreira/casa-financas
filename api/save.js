export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { key, data } = req.body || {};
    if (!key) return res.status(400).json({ error: 'No key' });

    const safeKey = key.replace(/[^a-z0-9\-]/g, '').slice(0, 60);
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    if (!url || !token) return res.status(500).json({ error: 'Missing env: ' + JSON.stringify({ url: !!url, token: !!token }) });

    const value = JSON.stringify(data);
    const r = await fetch(`${url}/set/cf_${safeKey}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([value, 'EX', '31536000']),
    });

    const txt = await r.text();
    return res.status(200).json({ ok: true, status: r.status, body: txt });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
