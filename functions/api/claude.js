export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    let body;
    try { body = await request.json(); }
    catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const { prompt, maxTokens = 1200, useWebSearch = false } = body;
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Missing prompt' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const tools = useWebSearch ? [{
      type: 'web_search_20250305',
      name: 'web_search',
      max_uses: 5
    }] : undefined;

    const requestBody = {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
      ...(tools ? { tools } : {})
    };

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        return new Response(JSON.stringify({ error: data.error?.message || 'API error' }), {
          status: response.status, headers: { 'Content-Type': 'application/json' }
        });
      }

      const text = data.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('');

      return new Response(JSON.stringify({ text }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: 'Proxy error: ' + err.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
