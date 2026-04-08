export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(500).json({ 
      error: 'ANTHROPIC_API_KEY não configurada. Vai ao Vercel → Settings → Environment Variables e adiciona a chave.'
    });
  }

  try {
    const { messages, systemPrompt } = req.body || {};
    if (!messages || !messages.length) {
      return res.status(400).json({ error: 'No messages' });
    }

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: systemPrompt || 'És um mentor financeiro pessoal em português de Portugal. Sê directo e prático.',
        messages: messages
      })
    });

    const data = await r.json();
    
    if (!r.ok) {
      return res.status(500).json({ 
        error: 'Erro da API Claude: ' + (data.error?.message || r.status)
      });
    }

    const text = data.content && data.content[0] ? data.content[0].text : 'Sem resposta.';
    return res.status(200).json({ ok: true, text });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
