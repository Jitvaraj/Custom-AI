import { ApiKeyConfig, Message } from '../types';

function getModelName(modelId?: string) {
  if (!modelId) return 'gemini-3.8-flash';
  if (modelId === 'jarvis-1.0') return 'gemini-3.8-flash';
  if (modelId === 'jarvis-pro') return 'gemini-4-argon';
  if (modelId === 'jarvis-thinking') return 'gemini-4-carbon';
  if (modelId === 'jarvis-lite') return 'gemini-3.1-flash-lite';
  return modelId;
}

export interface SendChatParams {
  messages: Message[];
  model: string;
  systemInstruction?: string;
  apiKeyConfig?: ApiKeyConfig;
  provider?: 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'groq' | 'custom';
}

export async function sendChatClient(params: SendChatParams): Promise<string> {
  const { messages, model, systemInstruction, apiKeyConfig, provider = 'gemini' } = params;
  const selectedModel = getModelName(model);

  // OpenAI Provider
  if (provider === 'openai') {
    const key = apiKeyConfig?.apiKey;
    if (!key) throw new Error('OpenAI API Key is required. Please set it in API Keys tab.');
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: apiKeyConfig?.selectedModel || 'gpt-4o',
        messages: [
          ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ]
      })
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`OpenAI API error (${resp.status}): ${err}`);
    }
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || 'No response generated.';
  }

  // Anthropic Provider
  if (provider === 'anthropic') {
    const key = apiKeyConfig?.apiKey;
    if (!key) throw new Error('Anthropic API Key is required. Please set it in API Keys tab.');
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'dangerously-allow-browser': 'true'
      },
      body: JSON.stringify({
        model: apiKeyConfig?.selectedModel || 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        system: systemInstruction,
        messages: messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
      })
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Anthropic API error (${resp.status}): ${err}`);
    }
    const data = await resp.json();
    return data.content?.[0]?.text || 'No response generated.';
  }

  // Groq Provider
  if (provider === 'groq') {
    const key = apiKeyConfig?.apiKey;
    if (!key) throw new Error('Groq API Key is required. Please set it in API Keys tab.');
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: apiKeyConfig?.selectedModel || 'llama-3.3-70b-versatile',
        messages: [
          ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ]
      })
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Groq API error (${resp.status}): ${err}`);
    }
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || 'No response generated.';
  }

  // DeepSeek Provider
  if (provider === 'deepseek') {
    const key = apiKeyConfig?.apiKey;
    if (!key) throw new Error('DeepSeek API Key is required. Please set it in API Keys tab.');
    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: apiKeyConfig?.selectedModel || 'deepseek-chat',
        messages: [
          ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ]
      })
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`DeepSeek API error (${resp.status}): ${err}`);
    }
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || 'No response generated.';
  }

  // Custom Endpoint Provider
  if (provider === 'custom') {
    const endpoint = apiKeyConfig?.endpoint;
    if (!endpoint) throw new Error('Custom Endpoint URL is required. Please set it in API Keys tab.');
    const key = apiKeyConfig?.apiKey;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { 'Authorization': `Bearer ${key}` } : {})
      },
      body: JSON.stringify({
        model: apiKeyConfig?.selectedModel || 'custom',
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      })
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Custom Endpoint error (${resp.status}): ${err}`);
    }
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || data.reply || data.text || JSON.stringify(data, null, 2);
  }

  // Google Gemini API Client Call via fetch()
  const apiKey = apiKeyConfig?.apiKey || (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
  if (!apiKey) {
    throw new Error('Gemini API key is required. Please enter your API Key in Control Center > API Keys tab.');
  }

  const contents = messages.map(m => {
    const parts: any[] = [];
    if (m.image) {
      const base64Data = m.image.replace(/^data:image\/\w+;base64,/, '');
      const mimeType = m.image.substring('data:'.length, m.image.indexOf(';base64'));
      parts.push({
        inlineData: {
          mimeType: mimeType || 'image/png',
          data: base64Data
        }
      });
    }
    parts.push({ text: m.content || '' });
    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts
    };
  });

  const requestBody = {
    contents,
    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
  };

  const callGeminiModel = async (targetModel: string) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    if (!resp.ok) {
      const errorJson = await resp.json().catch(() => ({}));
      const errMessage = errorJson?.error?.message || `HTTP ${resp.status}`;
      const errObj = new Error(errMessage);
      (errObj as any).status = resp.status;
      throw errObj;
    }
    const data = await resp.json();
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.[0]?.text;
    return textPart || 'No content generated.';
  };

  try {
    return await callGeminiModel(selectedModel);
  } catch (err: any) {
    if ((err.status === 429 || err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) && selectedModel !== 'gemini-3.1-flash-lite') {
      console.warn(`Rate limit hit on ${selectedModel}, retrying with gemini-3.1-flash-lite...`);
      try {
        const fallbackText = await callGeminiModel('gemini-3.1-flash-lite');
        return fallbackText + '\n\n*(Note: High request volume detected. Served via Gemini Flash Lite)*';
      } catch (fallbackErr) {
        throw err;
      }
    }
    throw err;
  }
}

export async function verifyKeyClient(provider: string, apiKey: string, endpoint?: string): Promise<{ valid: boolean; message: string }> {
  try {
    if (provider === 'gemini' || !provider) {
      const keyToTest = apiKey;
      if (!keyToTest) return { valid: false, message: 'Please enter a Gemini API Key.' };
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${keyToTest}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping' }] }] })
      });
      if (resp.ok) return { valid: true, message: 'Gemini API Key verified and active!' };
      const data = await resp.json().catch(() => ({}));
      return { valid: false, message: data.error?.message || `HTTP ${resp.status}` };
    }

    if (endpoint) {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
        },
        body: JSON.stringify({ model: 'test', messages: [{ role: 'user', content: 'ping' }] })
      });
      if (resp.ok) return { valid: true, message: 'Custom Endpoint connected successfully!' };
      return { valid: false, message: `Endpoint returned HTTP ${resp.status}` };
    }

    return { valid: true, message: `Key saved for ${provider}` };
  } catch (e: any) {
    return { valid: false, message: e.message || 'Key validation failed.' };
  }
}
