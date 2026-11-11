import { describe, expect, it } from 'vitest';
import { encodeInput, encodeResize, localServerEndpoint, normalizeTtydUrl } from './terminal';

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
