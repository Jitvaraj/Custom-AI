import { describe, expect, it } from 'vitest';
import { runLocal, splitArgs } from './localShell';

const ctx = () => {
  const calls: string[] = [];
  return {
    calls,
    history: ['help'],
    connect: (a?: string) => calls.push(`connect:${a ?? ''}`),
    disconnect: () => calls.push('disconnect'),
    signal: new AbortController().signal,
  };
};

describe('built-in shell', () => {
  it('splits arguments with quotes', () => {
    expect(splitArgs(`echo "hello world" 'a b' c`)).toEqual(['echo', 'hello world', 'a b', 'c']);
  });
  it('runs echo with spaces', async () => {
    expect((await runLocal('echo hello   world', ctx())).output).toBe('hello world');
  });
  it('runs JavaScript', async () => {
    expect((await runLocal('js 2**10', ctx())).output).toBe('1024');
    expect((await runLocal('js [1,2].map(x => x * 3)', ctx())).output).toBe('[\n  3,\n  6\n]');
  });
  it('connect passes the address on', async () => {
    const c = ctx();
    await runLocal('connect 192.168.1.5:7681', c);
    expect(c.calls).toEqual(['connect:192.168.1.5:7681']);
  });
  it('clear asks to clear the screen', async () => {
    expect((await runLocal('clear', ctx())).clear).toBe(true);
  });
  it('unknown commands explain how to get a real shell', async () => {
    expect((await runLocal('npm install', ctx())).output).toContain('connect');
  });
});
