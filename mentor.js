export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { messages, systemPrompt } = req.body || {};
    if (!messages) return res.status(400).json({ error: 'No messages' });

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: systemPrompt || 'És um mentor financeiro pessoal em português de Portugal.',
        messages: messages
      })
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(500).json({ error: 'Claude API error: ' + err });
    }

    const data = await r.json();
    const text = data.content && data.content[0] ? data.content[0].text : '';
    return res.status(200).json({ ok: true, text });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
