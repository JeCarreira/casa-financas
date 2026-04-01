export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { key } = req.body || {};
    if (!key) return res.status(400).json({ error: 'No key' });
    const safeKey = 'cf_' + String(key).replace(/[^a-z0-9]/g, '').slice(0, 50);
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return res.status(500).json({ error: 'Missing env' });
    const r = await fetch(url + '/get/' + safeKey, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!r.ok) return res.status(500).json({ error: 'Redis ' + r.status });
    const json = await r.json();
    let data = null;
    if (json.result) { try { data = JSON.parse(json.result); } catch(e) {} }
    return res.status(200).json({ ok: true, data });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
