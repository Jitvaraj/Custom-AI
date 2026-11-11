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
  port: number;
  model: string;
  keyHint: string;
  setup: string;
}

export const LOCAL_SERVERS: LocalServerPreset[] = [
  {
    id: 'freellmapi',
    label: 'freellmapi',
    port: 3001,
    model: 'auto',
    keyHint: 'Unified key from the freellmapi Keys page (freellmapi-…)',
    setup:
      'git clone https://github.com/tashfeenahmed/freellmapi.git && cd freellmapi && npm install && npm run dev',
  },
  {
    id: 'omniroute',
    label: 'OmniRoute',
    port: 20128,
    model: 'auto',
    keyHint: 'API key from the OmniRoute dashboard',
    setup: 'npm install -g omniroute && omniroute',
  },
];

export function localServerEndpoint(port: number, host = 'localhost'): string {
  return `http://${host}:${port}/v1/chat/completions`;
}
