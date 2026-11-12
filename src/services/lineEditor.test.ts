import { describe, expect, it } from 'vitest';
import { LineEditor } from './lineEditor';

describe('LineEditor', () => {
  it('keeps spaces while typing and on Enter', () => {
    const ed = new LineEditor('$ ');
    ed.feed('echo');
    const r1 = ed.feed(' ');
    expect(ed.buffer).toBe('echo ');
    expect(r1.out).toContain('$ echo ');
    ed.feed('hi there');
    const r2 = ed.feed('\r');
    expect(r2.line).toBe('echo hi there');
    expect(ed.buffer).toBe('');
  });
  it('handles phone keyboards sending whole words with a trailing space', () => {
    const ed = new LineEditor('$ ');
    ed.feed('git ');
    ed.feed('status ');
    expect(ed.buffer).toBe('git status ');
  });
  it('edits with backspace and arrow keys', () => {
    const ed = new LineEditor('$ ');
    ed.feed('lss\x7f');
    expect(ed.buffer).toBe('ls');
    ed.feed('\x1b[Da');
    expect(ed.buffer).toBe('las');
  });
  it('recalls history with the up arrow', () => {
    const ed = new LineEditor('$ ');
    ed.feed('date\r');
    ed.feed('help\r');
    ed.feed('\x1b[A');
    expect(ed.buffer).toBe('help');
    ed.feed('\x1b[A');
    expect(ed.buffer).toBe('date');
  });
  it('splits a multi-line paste into one line plus the rest', () => {
    const ed = new LineEditor('$ ');
    const r = ed.feed('echo a\r\necho b\r');
    expect(r.line).toBe('echo a');
    expect(r.rest).toBe('echo b\r');
  });
  it('Ctrl+C clears the line', () => {
    const ed = new LineEditor('$ ');
    const r = ed.feed('abc\x03');
    expect(r.interrupt).toBe(true);
    expect(ed.buffer).toBe('');
  });
});
