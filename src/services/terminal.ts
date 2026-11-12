/** Helpers for talking to a ttyd server (Termux / PC) and local AI server presets. */

export const DEFAULT_TTYD_URL = 'ws://localhost:7681/ws';

/** Turns "localhost:7681", "http://host:7681" or "ws://host:7681" into ttyd's websocket URL. */
export function normalizeTtydUrl(input: string): string {
  let url = input.trim() || DEFAULT_TTYD_URL;
  if (!/^[a-z]+:\/\//i.test(url)) url = `ws://${url}`;
  url = url.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
  const u = new URL(url);
  if (!u.pathname.endsWith('/ws')) u.pathname = `${u.pathname.replace(/\/$/, '')}/ws`;
  return u.toString();
}

const enc = new TextEncoder();

/** ttyd message: '0' + keystrokes. */
export function encodeInput(text: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(enc.encode(`0${text}`));
}

/** ttyd message: '1' + JSON size. */
export function encodeResize(columns: number, rows: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array(enc.encode(`1${JSON.stringify({ columns, rows })}`));
}

/** First message ttyd expects after the socket opens. */
export function encodeHandshake(columns: number, rows: number): string {
  return JSON.stringify({ AuthToken: '', columns, rows });
}

export interface LocalServerPreset {
  id: 'freellmapi' | 'omniroute';
  label: string;
  /** Port of the OpenAI-style API (/v1). */
  port: number;
  /** Port of the web dashboard where keys are managed. */
  dashboardPort: number;
  model: string;
  keyHint: string;
  /** Install + start in the foreground (PC, or to watch it in Termux). */
  setup: string;
  /** One-liner for Termux: installs what's missing, keeps Android awake, starts in the background. */
  termux: string;
  stop: string;
  logs: string;
}

const NODE = 'command -v node >/dev/null || pkg install -y nodejs-lts';
const GIT = 'command -v git >/dev/null || pkg install -y git';
const WAKE = 'termux-wake-lock 2>/dev/null';

export const LOCAL_SERVERS: LocalServerPreset[] = [
  {
    id: 'freellmapi',
    label: 'FreeLLMAPI',
    port: 3001,
    dashboardPort: 5173,
    model: 'auto',
    keyHint: 'unified key from the FreeLLMAPI Keys page',
    setup:
      'git clone https://github.com/tashfeenahmed/freellmapi.git && cd freellmapi && npm install --no-audit --no-fund && npm run dev',
    termux: `${WAKE}; ${NODE}; ${GIT}; [ -d ~/freellmapi ] || git clone https://github.com/tashfeenahmed/freellmapi.git ~/freellmapi; cd ~/freellmapi && npm install --no-audit --no-fund && (nohup npm run dev > ~/freellmapi.log 2>&1 &) ; cd ~; echo "FreeLLMAPI starting - log: ~/freellmapi.log"`,
    stop: 'pkill -f freellmapi; echo stopped',
    logs: 'tail -n 40 ~/freellmapi.log',
  },
  {
    id: 'omniroute',
    label: 'OmniRoute',
    port: 20128,
    dashboardPort: 20128,
    model: 'auto',
    keyHint: 'API key from the OmniRoute dashboard',
    setup: 'npx -y omniroute',
    termux: `${WAKE}; ${NODE}; (nohup npx -y omniroute > ~/omniroute.log 2>&1 &) ; echo "OmniRoute starting - log: ~/omniroute.log"`,
    stop: 'pkill -f omniroute; echo stopped',
    logs: 'tail -n 40 ~/omniroute.log',
  },
];

export function localServerEndpoint(port: number, host = 'localhost'): string {
  return `http://${host}:${port}/v1/chat/completions`;
}

export function localServerBase(port: number, host = 'localhost'): string {
  return `http://${host}:${port}`;
}

/** True when something answers on the port (no-cors: we only learn that it is reachable). */
export async function pingServer(port: number, timeoutMs = 2500, host = 'localhost'): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    await fetch(`${localServerBase(port, host)}/v1/models`, { mode: 'no-cors', cache: 'no-store', signal: ctrl.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Reads model IDs from an OpenAI-style /v1/models reply ({ data: [{ id }] } or a plain list). */
export function parseModelList(json: unknown): string[] {
  const list = Array.isArray(json) ? json : (json as { data?: unknown; models?: unknown })?.data ?? (json as { models?: unknown })?.models;
  if (!Array.isArray(list)) return [];
  const ids = list
    .map((m) => (typeof m === 'string' ? m : typeof m === 'object' && m ? (m as { id?: unknown }).id : undefined))
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
  return [...new Set(ids)];
}

/** Lists models on a local server. Throws with a readable message if the server refuses. */
export async function fetchServerModels(port: number, apiKey: string, host = 'localhost'): Promise<string[]> {
  const res = await fetch(`${localServerBase(port, host)}/v1/models`, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  });
  if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? 'The server rejected the key.' : `Server answered HTTP ${res.status}.`);
  return parseModelList(await res.json());
}
