import { describe, expect, it } from 'vitest';
import { LOCAL_SERVERS, encodeInput, encodeResize, localServerEndpoint, normalizeTtydUrl, parseModelList } from './terminal';

const dec = new TextDecoder();

describe('terminal helpers', () => {
  it('builds ttyd websocket URLs', () => {
    expect(normalizeTtydUrl('localhost:7681')).toBe('ws://localhost:7681/ws');
    expect(normalizeTtydUrl('https://box.local:7681')).toBe('wss://box.local:7681/ws');
    expect(normalizeTtydUrl('')).toBe('ws://localhost:7681/ws');
  });
  it('encodes ttyd input and resize frames', () => {
    expect(dec.decode(encodeInput('ls\r'))).toBe('0ls\r');
    expect(dec.decode(encodeResize(80, 24))).toBe('1{"columns":80,"rows":24}');
  });
  it('points presets at the OpenAI chat route', () => {
    expect(localServerEndpoint(3001)).toBe('http://localhost:3001/v1/chat/completions');
    expect(localServerEndpoint(20128)).toBe('http://localhost:20128/v1/chat/completions');
  });
});

describe('local AI servers', () => {
  it('uses the documented ports', () => {
    const by = Object.fromEntries(LOCAL_SERVERS.map((s) => [s.id, s]));
    expect(by['freellmapi']?.port).toBe(3001);
    expect(by['freellmapi']?.dashboardPort).toBe(5173);
    expect(by['omniroute']?.port).toBe(20128);
  });
  it('Termux scripts keep the phone awake and start in the background', () => {
    for (const s of LOCAL_SERVERS) {
      expect(s.termux).toContain('termux-wake-lock');
      expect(s.termux).toContain('nohup');
    }
  });
  it('reads model lists', () => {
    expect(parseModelList({ data: [{ id: 'auto' }, { id: 'gpt' }, { id: 'auto' }] })).toEqual(['auto', 'gpt']);
    expect(parseModelList(['a', 'b'])).toEqual(['a', 'b']);
    expect(parseModelList({ error: 'nope' })).toEqual([]);
  });
});
