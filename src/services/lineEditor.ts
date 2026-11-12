/** Minimal readline for the built-in Jarvis shell: turns xterm keystrokes into an edited line. */

export interface FeedResult {
  /** Bytes to write to the terminal (redrawn prompt line, newline on submit). */
  out: string;
  /** Set when Enter was pressed: the submitted line. */
  line?: string;
  /** Input left over after a submitted line (multi-line paste) — feed it again once the command finishes. */
  rest: string;
  interrupt?: boolean;
  clear?: boolean;
}

export class LineEditor {
  buffer = '';
  cursor = 0;
  history: string[] = [];
  private hIndex = -1;
  private draft = '';

  constructor(
    public prompt: string,
    private completions: () => string[] = () => [],
  ) {}

  /** The current prompt line, with the cursor in the right place. */
  render(): string {
    const back = this.buffer.length - this.cursor;
    return `\r\x1b[2K${this.prompt}${this.buffer}${back > 0 ? `\x1b[${back}D` : ''}`;
  }

  private insert(text: string) {
    this.buffer = this.buffer.slice(0, this.cursor) + text + this.buffer.slice(this.cursor);
    this.cursor += text.length;
  }

  private browse(dir: -1 | 1) {
    if (!this.history.length) return;
    if (this.hIndex === -1) {
      if (dir === 1) return;
      this.draft = this.buffer;
      this.hIndex = this.history.length;
    }
    const next = this.hIndex + dir;
    if (next < 0) return;
    if (next >= this.history.length) {
      this.hIndex = -1;
      this.buffer = this.draft;
    } else {
      this.hIndex = next;
      this.buffer = this.history[next] ?? "";
    }
    this.cursor = this.buffer.length;
  }

  private complete() {
    if (this.buffer.includes(' ')) return;
    const matches = this.completions().filter((c) => c.startsWith(this.buffer));
    if (matches.length === 1) {
      this.buffer = `${matches[0]} `;
      this.cursor = this.buffer.length;
    }
  }

  feed(data: string): FeedResult {
    const chars = Array.from(data);
    let clear = false;
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i] ?? "";
      if (ch === '\x1b') {
        // Escape sequences: ESC [ ... final  or  ESC O final
        if (chars[i + 1] === '[' || chars[i + 1] === 'O') {
          let j = i + 2;
          let params = '';
          while (j < chars.length && !/[A-Za-z~]/.test(chars[j] ?? "~")) params += chars[j++];
          const final = chars[j] ?? '';
          i = j;
          const key = final === '~' ? `${params}~` : final;
          if (key === 'A') this.browse(-1);
          else if (key === 'B') this.browse(1);
          else if (key === 'C') this.cursor = Math.min(this.buffer.length, this.cursor + 1);
          else if (key === 'D') this.cursor = Math.max(0, this.cursor - 1);
          else if (key === 'H' || key === '1~' || key === '7~') this.cursor = 0;
          else if (key === 'F' || key === '4~' || key === '8~') this.cursor = this.buffer.length;
          else if (key === '3~' && this.cursor < this.buffer.length)
            this.buffer = this.buffer.slice(0, this.cursor) + this.buffer.slice(this.cursor + 1);
        }
        continue;
      }
      if (ch === '\r' || ch === '\n') {
        const line = this.buffer;
        const out = `${this.render()}\r\n`;
        if (line.trim() && this.history[this.history.length - 1] !== line) this.history.push(line);
        this.buffer = '';
        this.cursor = 0;
        this.hIndex = -1;
        // Treat \r\n as a single Enter.
        const restStart = ch === '\r' && chars[i + 1] === '\n' ? i + 2 : i + 1;
        return { out: clear ? `\x1b[2J\x1b[3J\x1b[H${out}` : out, line, rest: chars.slice(restStart).join(''), clear };
      }
      if (ch === '\x7f' || ch === '\b') {
        if (this.cursor > 0) {
          this.buffer = this.buffer.slice(0, this.cursor - 1) + this.buffer.slice(this.cursor);
          this.cursor--;
        }
      } else if (ch === '\x03') {
        const out = `${this.render()}^C\r\n`;
        this.buffer = '';
        this.cursor = 0;
        this.hIndex = -1;
        return { out: out + this.render(), rest: '', interrupt: true };
      } else if (ch === '\x0c') clear = true;
      else if (ch === '\x15') {
        this.buffer = this.buffer.slice(this.cursor);
        this.cursor = 0;
      } else if (ch === '\x01') this.cursor = 0;
      else if (ch === '\x05') this.cursor = this.buffer.length;
      else if (ch === '\t') this.complete();
      else if (ch >= ' ') this.insert(ch);
    }
    const out = this.render();
    return { out: clear ? `\x1b[2J\x1b[3J\x1b[H${out}` : out, rest: '', clear };
  }
}
