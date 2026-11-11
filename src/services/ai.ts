import type { ApiKeyConfig, ApiProvider, Message, PluginSettings } from '@/types';

function getModelName(modelId?: string) {
  if (!modelId) return 'gemini-2.5-flash';
  if (modelId === 'jarvis-1.0') return 'gemini-2.5-flash';
  if (modelId === 'jarvis-pro') return 'gemini-2.5-pro';
  if (modelId === 'jarvis-thinking') return 'gemini-2.5-pro';
  if (modelId === 'jarvis-lite') return 'gemini-2.5-flash-lite';
  return modelId;
}

export interface SendChatParams {
  messages: Message[];
  model: string;
  systemInstruction?: string | undefined;
  apiKeyConfig?: ApiKeyConfig | undefined;
  provider?: ApiProvider | undefined;
  pluginSettings?: PluginSettings | undefined;
}

export interface StreamOptions {
  /** Called with each new piece of text as it arrives. */
  onDelta: (text: string) => void;
  signal?: AbortSignal | undefined;
}

async function readErrorBody(resp: Response): Promise<string> {
  const text = await resp.text().catch(() => '');
  try {
    const json = JSON.parse(text);
    return json?.error?.message || json?.message || text;
  } catch {
    return text || `HTTP ${resp.status}`;
  }
}

/** Reads a Server-Sent Events body and hands each `data:` payload to onData. */
async function readSSE(resp: Response, onData: (data: string) => void): Promise<void> {
  if (!resp.body) return;
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const flushLine = (raw: string) => {
    const line = raw.replace(/\r$/, '');
    if (!line.startsWith('data:')) return;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') return;
    onData(data);
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      flushLine(buffer.slice(0, idx));
      buffer = buffer.slice(idx + 1);
    }
  }
  buffer += decoder.decode();
  if (buffer) flushLine(buffer);
}

function parseJSON(data: string): any {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/** OpenAI-style chat completions (OpenAI, OpenRouter, Groq, DeepSeek, custom). */
async function streamOpenAICompatible(args: {
  label: string;
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  opts: StreamOptions;
}): Promise<string> {
  const { label, url, headers, body, opts } = args;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ ...body, stream: true }),
    signal: opts.signal ?? null,
  });
  if (!resp.ok) throw new Error(`${label} API error (${resp.status}): ${await readErrorBody(resp)}`);

  // Some custom endpoints ignore `stream: true` and answer with plain JSON.
  const contentType = resp.headers.get('content-type') || '';
  if (!contentType.includes('event-stream')) {
    const data = await resp.json().catch(() => ({}));
    const text =
      data.choices?.[0]?.message?.content || data.reply || data.text || JSON.stringify(data, null, 2);
    opts.onDelta(text);
    return text;
  }

  let full = '';
  let streamError: string | null = null;
  await readSSE(resp, (data) => {
    const json = parseJSON(data);
    if (!json) return;
    if (json.error) {
      streamError = json.error.message || String(json.error);
      return;
    }
    const delta: string | undefined = json.choices?.[0]?.delta?.content;
    if (delta) {
      full += delta;
      opts.onDelta(delta);
    }
  });
  if (streamError && !full) throw new Error(`${label} API error: ${streamError}`);
  return full || 'No response generated.';
}

function chatMessages(messages: Message[], systemInstruction?: string) {
  return [
    ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];
}

/** Streams a reply from the chosen provider, calling opts.onDelta for every new chunk. */
export async function streamChatClient(params: SendChatParams, opts: StreamOptions): Promise<string> {
  const { messages, model, systemInstruction, apiKeyConfig, provider = 'gemini', pluginSettings } = params;
  const selectedModel = getModelName(model);

  if (provider === 'openrouter') {
    const key = apiKeyConfig?.apiKey;
    if (!key) throw new Error('OpenRouter API Key is required. Please set it in Control Center > API Keys.');
    const targetModel =
      apiKeyConfig?.selectedModel || (model.includes('/') ? model : 'anthropic/claude-3.5-sonnet');
    return streamOpenAICompatible({
      label: 'OpenRouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      headers: {
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Jarvis AI',
      },
      body: { model: targetModel, messages: chatMessages(messages, systemInstruction) },
      opts,
    });
  }

  if (provider === 'openai') {
    const key = apiKeyConfig?.apiKey;
    if (!key) throw new Error('OpenAI API Key is required. Please set it in Control Center > API Keys.');
    return streamOpenAICompatible({
      label: 'OpenAI',
      url: 'https://api.openai.com/v1/chat/completions',
      headers: { Authorization: `Bearer ${key}` },
      body: { model: apiKeyConfig?.selectedModel || 'gpt-4o', messages: chatMessages(messages, systemInstruction) },
      opts,
    });
  }

  if (provider === 'groq') {
    const key = apiKeyConfig?.apiKey;
    if (!key) throw new Error('Groq API Key is required. Please set it in Control Center > API Keys.');
    return streamOpenAICompatible({
      label: 'Groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      headers: { Authorization: `Bearer ${key}` },
      body: {
        model: apiKeyConfig?.selectedModel || 'llama-3.3-70b-versatile',
        messages: chatMessages(messages, systemInstruction),
      },
      opts,
    });
  }

  if (provider === 'deepseek') {
    const key = apiKeyConfig?.apiKey;
    if (!key) throw new Error('DeepSeek API Key is required. Please set it in Control Center > API Keys.');
    return streamOpenAICompatible({
      label: 'DeepSeek',
      url: 'https://api.deepseek.com/v1/chat/completions',
      headers: { Authorization: `Bearer ${key}` },
      body: {
        model: apiKeyConfig?.selectedModel || 'deepseek-chat',
        messages: chatMessages(messages, systemInstruction),
      },
      opts,
    });
  }

  if (provider === 'custom') {
    const endpoint = apiKeyConfig?.endpoint?.trim();
    if (!endpoint) {
      throw new Error(
        'Custom Endpoint URL is required. Add a full URL (e.g. https://api.my-llm.com/v1/chat/completions) in Control Center > API Keys.',
      );
    }
    const key = apiKeyConfig?.apiKey;
    return streamOpenAICompatible({
      label: 'Custom Endpoint',
      url: endpoint,
      headers: key ? { Authorization: `Bearer ${key}` } : {},
      body: {
        model: apiKeyConfig?.selectedModel || 'custom-model',
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      },
      opts,
    });
  }

  if (provider === 'anthropic') {
    const key = apiKeyConfig?.apiKey;
    if (!key) throw new Error('Anthropic API Key is required. Please set it in Control Center > API Keys.');
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: apiKeyConfig?.selectedModel || 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        system: systemInstruction,
        stream: true,
        messages: messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      }),
      signal: opts.signal ?? null,
    });
    if (!resp.ok) throw new Error(`Anthropic API error (${resp.status}): ${await readErrorBody(resp)}`);
    let full = '';
    let streamError: string | null = null;
    await readSSE(resp, (data) => {
      const json = parseJSON(data);
      if (!json) return;
      if (json.type === 'error') streamError = json.error?.message || 'Unknown error';
      if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
        full += json.delta.text;
        opts.onDelta(json.delta.text);
      }
    });
    if (streamError && !full) throw new Error(`Anthropic API error: ${streamError}`);
    return full || 'No response generated.';
  }

  // Google Gemini (default)
  const apiKey =
    apiKeyConfig?.apiKey ||
    (import.meta.env['VITE_GEMINI_API_KEY'] as string) ||
    (import.meta.env['GEMINI_API_KEY'] as string) ||
    '';
  if (!apiKey) {
    throw new Error('Gemini API key is required. Please enter your API Key in Control Center > API Keys.');
  }

  const contents = messages.map((m) => {
    const parts: any[] = [];
    if (m.image) {
      const base64Data = m.image.replace(/^data:image\/\w+;base64,/, '');
      const mimeType = m.image.substring('data:'.length, m.image.indexOf(';base64'));
      parts.push({ inlineData: { mimeType: mimeType || 'image/png', data: base64Data } });
    }
    parts.push({ text: m.content || '' });
    return { role: m.role === 'assistant' ? 'model' : 'user', parts };
  });

  const requestBody: any = {
    contents,
    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
  };
  if (pluginSettings?.searchEnabled) {
    requestBody.tools = [{ googleSearch: {} }];
  }

  const streamGemini = async (targetModel: string): Promise<string> => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${apiKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: opts.signal ?? null,
    });
    if (!resp.ok) {
      const errObj = new Error(await readErrorBody(resp)) as Error & { status?: number };
      errObj.status = resp.status;
      throw errObj;
    }
    let full = '';
    await readSSE(resp, (data) => {
      const json = parseJSON(data);
      const parts: any[] = json?.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.thought || typeof part.text !== 'string' || !part.text) continue;
        full += part.text;
        opts.onDelta(part.text);
      }
    });
    return full || 'No content generated.';
  };

  try {
    return await streamGemini(selectedModel);
  } catch (err: any) {
    const isRateLimit =
      err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED');
    if (isRateLimit && selectedModel !== 'gemini-2.5-flash-lite') {
      console.warn(`Rate limit hit on ${selectedModel}, retrying with gemini-2.5-flash-lite...`);
      const text = await streamGemini('gemini-2.5-flash-lite').catch(() => {
        throw err;
      });
      const note = '\n\n*(Note: High request volume detected. Served via Gemini Flash Lite)*';
      opts.onDelta(note);
      return text + note;
    }
    throw err;
  }
}

export async function verifyKeyClient(provider: string, apiKey: string, endpoint?: string): Promise<{ valid: boolean; message: string }> {
  try {
    if (provider === 'gemini' || !provider) {
      const keyToTest = apiKey || (import.meta.env['VITE_GEMINI_API_KEY'] as string) || (import.meta.env['GEMINI_API_KEY'] as string) || '';
      if (!keyToTest) return { valid: false, message: 'Please enter a Gemini API Key.' };
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keyToTest}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping' }] }] })
      });
      if (resp.ok) return { valid: true, message: 'Gemini API Key verified and active!' };
      const data = await resp.json().catch(() => ({}));
      return { valid: false, message: data.error?.message || `HTTP ${resp.status}` };
    }

    if (provider === 'openrouter') {
      if (!apiKey) return { valid: false, message: 'Please enter an OpenRouter API Key.' };
      const resp = await fetch('https://openrouter.ai/api/v1/auth/key', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://jarvis.ai',
          'X-Title': 'Jarvis AI'
        }
      });
      if (resp.ok) return { valid: true, message: 'OpenRouter API Key verified and active!' };
      const errText = await resp.text().catch(() => '');
      let errMsg = `HTTP ${resp.status}`;
      try {
        const parsed = JSON.parse(errText);
        errMsg = parsed.error?.message || parsed.message || errMsg;
      } catch (e) {}
      return { valid: false, message: `OpenRouter error: ${errMsg}` };
    }

    if (provider === 'openai') {
      if (!apiKey) return { valid: false, message: 'Please enter an OpenAI API Key.' };
      const resp = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (resp.ok) return { valid: true, message: 'OpenAI API Key verified successfully!' };
      const errText = await resp.text().catch(() => '');
      return { valid: false, message: `OpenAI returned HTTP ${resp.status}: ${errText.slice(0, 100)}` };
    }

    if (provider === 'anthropic') {
      if (!apiKey) return { valid: false, message: 'Please enter an Anthropic API Key.' };
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }]
        })
      });
      if (resp.ok) return { valid: true, message: 'Anthropic API Key verified successfully!' };
      const errText = await resp.text().catch(() => '');
      return { valid: false, message: `Anthropic returned HTTP ${resp.status}: ${errText.slice(0, 100)}` };
    }

    if (provider === 'groq') {
      if (!apiKey) return { valid: false, message: 'Please enter a Groq API Key.' };
      const resp = await fetch('https://api.groq.com/openai/v1/models', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (resp.ok) return { valid: true, message: 'Groq API Key verified successfully!' };
      const errText = await resp.text().catch(() => '');
      return { valid: false, message: `Groq returned HTTP ${resp.status}: ${errText.slice(0, 100)}` };
    }

    if (provider === 'deepseek') {
      if (!apiKey) return { valid: false, message: 'Please enter a DeepSeek API Key.' };
      const resp = await fetch('https://api.deepseek.com/models', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (resp.ok) return { valid: true, message: 'DeepSeek API Key verified successfully!' };
      const errText = await resp.text().catch(() => '');
      return { valid: false, message: `DeepSeek returned HTTP ${resp.status}: ${errText.slice(0, 100)}` };
    }

    if (provider === 'custom') {
      if (!endpoint || !endpoint.trim()) {
        return { valid: false, message: 'Please enter a valid Custom Endpoint URL (e.g. https://api.my-llm.com/v1/chat/completions).' };
      }
      const resp = await fetch(endpoint.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
        },
        body: JSON.stringify({ model: 'test', messages: [{ role: 'user', content: 'ping' }] })
      });
      if (resp.ok) return { valid: true, message: 'Custom Endpoint connected successfully!' };
      return { valid: false, message: `Custom Endpoint returned HTTP ${resp.status}` };
    }

    return { valid: true, message: `Key saved for ${provider}` };
  } catch (e: any) {
    return { valid: false, message: e.message || 'Key validation failed.' };
  }
}
