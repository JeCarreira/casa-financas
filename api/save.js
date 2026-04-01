export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { key, data } = req.body || {};
    if (!key) return res.status(400).json({ error: 'No key' });
    const safeKey = 'cf_' + String(key).replace(/[^a-z0-9]/g, '').slice(0, 50);
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return res.status(500).json({ error: 'Missing env: url=' + !!url + ' token=' + !!token });
    const value = JSON.stringify(data);
    // Upstash REST: pipeline with SET + EXPIRE
    const r = await fetch(url + '/pipeline', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['SET', safeKey, value],
        ['EXPIRE', safeKey, 31536000]
      ])
    });
    const txt = await r.text();
    if (!r.ok) return res.status(500).json({ error: 'Redis ' + r.status + ': ' + txt });
    return res.status(200).json({ ok: true });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
