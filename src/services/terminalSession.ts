/**
 * One terminal session for the whole app. It survives tab switches and closing the
 * Control Center, so a Termux/PC connection is not dropped when the panel unmounts.
 * Without a connection, input goes to the built-in shell (localShell.ts).
 */
import type { Terminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';
import { LineEditor } from './lineEditor';
import { LOCAL_COMMANDS, runLocal } from './localShell';
import { DEFAULT_TTYD_URL, encodeHandshake, encodeInput, encodeResize, normalizeTtydUrl } from './terminal';

export type TerminalStatus = 'local' | 'connecting' | 'online' | 'error';
export interface TerminalState {
  status: TerminalStatus;
  note: string;
  url: string;
  /** Phone keyboard types straight into the terminal (off on touch screens: use the command bar). */
  directTyping: boolean;
}

const URL_KEY = 'jarvis_ttyd_url';
const PROMPT = '\x1b[36mjarvis\x1b[0m:\x1b[34m~\x1b[0m$ ';

class TerminalSession {
  private term: Terminal | null = null;
  private fit: FitAddon | null = null;
  private wrapper: HTMLDivElement | null = null;
  private ws: WebSocket | null = null;
  private booting: Promise<void> | null = null;
  private busy: AbortController | null = null;
  private listeners = new Set<() => void>();
  private editor = new LineEditor(PROMPT, () => LOCAL_COMMANDS);
  state: TerminalState = { status: 'local', note: '', url: DEFAULT_TTYD_URL, directTyping: true };

  constructor() {
    if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) {
      this.state = { ...this.state, directTyping: false };
    }
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(URL_KEY);
      if (saved) this.state = { ...this.state, url: saved };
    }
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getState = () => this.state;
  private set(patch: Partial<TerminalState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }
  setUrl(url: string) {
    this.set({ url });
  }

  /** Lets the phone keyboard type into the terminal itself, or keeps it closed (command bar only). */
  setDirectTyping(on: boolean) {
    this.set({ directTyping: on });
    this.applyKeyboardMode();
    if (on) this.term?.focus();
    else this.term?.textarea?.blur();
  }

  private applyKeyboardMode() {
    // inputmode=none keeps Android's keyboard from opening when the terminal is tapped,
    // so predictive text can't fight xterm; a hardware keyboard still works.
    this.term?.textarea?.setAttribute('inputmode', this.state.directTyping ? 'text' : 'none');
  }

  get online() {
    return this.remote;
  }

  /** Runs a full command: in Termux/PC when connected, otherwise in the built-in shell. */
  run(command: string) {
    this.submit(command);
  }

  private get remote() {
    return this.ws?.readyState === WebSocket.OPEN && this.state.status === 'online';
  }

  /** Mounts the terminal into `host` (creating it once) and keeps it sized. Returns a detach function. */
  attach(host: HTMLElement): () => void {
    let ro: ResizeObserver | undefined;
    let gone = false;
    const mount = () => {
      if (gone || !this.wrapper) return;
      host.appendChild(this.wrapper);
      requestAnimationFrame(() => this.refit());
      ro = new ResizeObserver(() => this.refit());
      ro.observe(host);
    };
    if (this.wrapper) mount();
    else this.boot(host).then(mount);
    return () => {
      gone = true;
      ro?.disconnect();
    };
  }

  private refit() {
    const el = this.wrapper;
    if (!el || !el.isConnected || el.clientWidth === 0 || el.clientHeight === 0) return;
    try {
      this.fit?.fit();
    } catch {
      /* not visible yet */
    }
  }

  private boot(host: HTMLElement): Promise<void> {
    if (this.booting) return this.booting;
    this.booting = (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([import('@xterm/xterm'), import('@xterm/addon-fit')]);
      const wrapper = document.createElement('div');
      wrapper.style.width = '100%';
      wrapper.style.height = '100%';
      host.appendChild(wrapper);
      const term = new Terminal({
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 13,
        cursorBlink: true,
        scrollback: 3000,
        theme: { background: '#0b0f14', foreground: '#d7e3ee', cursor: '#38e1ff' },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(wrapper);
      // Phone keyboards: stop autocorrect/capitalisation from rewriting what you type.
      const ta = term.textarea;
      if (ta) {
        ta.setAttribute('autocapitalize', 'off');
        ta.setAttribute('autocorrect', 'off');
        ta.setAttribute('autocomplete', 'off');
        ta.setAttribute('spellcheck', 'false');
      }
      this.term = term;
      this.applyKeyboardMode();
      term.onData((d) => this.input(d));
      term.onResize(({ cols, rows }) => {
        if (this.remote) this.ws!.send(encodeResize(cols, rows));
      });
      this.fit = fit;
      this.wrapper = wrapper;
      try {
        fit.fit();
      } catch {
        /* hidden */
      }
      term.writeln('\x1b[36mJarvis terminal\x1b[0m — built-in shell. Type \x1b[36mhelp\x1b[0m, or \x1b[36mconnect\x1b[0m for Termux / PC.');
      term.write(this.editor.render());
    })();
    return this.booting;
  }

  focus() {
    if (this.state.directTyping) this.term?.focus();
  }

  /** Raw keystrokes (xterm typing, extra-key buttons). */
  input(data: string) {
    if (this.remote) {
      this.ws!.send(encodeInput(data));
      return;
    }
    void this.feedLocal(data);
  }

  /** A whole command typed in the command bar: runs it as if typed + Enter. */
  submit(line: string) {
    this.input(`${line}\r`);
  }

  private async feedLocal(data: string) {
    const term = this.term;
    if (!term) return;
    if (this.busy) {
      if (data.includes('\x03')) {
        this.busy.abort();
        term.write('^C');
      }
      return;
    }
    let rest = data;
    while (rest) {
      const r = this.editor.feed(rest);
      term.write(r.out);
      rest = r.rest;
      if (r.line === undefined) continue;
      await this.exec(r.line);
      if (this.remote) {
        if (rest) this.ws!.send(encodeInput(rest));
        return;
      }
    }
  }

  private async exec(line: string) {
    const term = this.term!;
    const ctrl = new AbortController();
    this.busy = ctrl;
    try {
      const res = await runLocal(line, {
        history: this.editor.history,
        connect: (addr) => this.connect(addr),
        disconnect: () => this.disconnect(),
        signal: ctrl.signal,
      });
      if (res.clear) term.write('\x1b[2J\x1b[3J\x1b[H');
      if (res.output) term.write(`${res.output.replace(/\r?\n/g, '\r\n')}\r\n`);
    } catch (e) {
      term.write(`\x1b[31m${e instanceof Error ? e.message : String(e)}\x1b[0m\r\n`);
    } finally {
      this.busy = null;
    }
    if (!this.remote && this.state.status !== 'connecting') term.write(this.editor.render());
  }

  connect(address?: string) {
    const term = this.term;
    const raw = address ?? this.state.url;
    let target: string;
    try {
      target = normalizeTtydUrl(raw);
    } catch {
      this.set({ status: 'error', note: 'That address does not look right.' });
      term?.write(`\x1b[31mBad address: ${raw}\x1b[0m\r\n${this.editor.render()}`);
      return;
    }
    if (address) this.set({ url: address });
    localStorage.setItem(URL_KEY, address ?? this.state.url);
    this.closeSocket();
    this.set({ status: 'connecting', note: '' });
    let opened = false;
    let ws: WebSocket;
    try {
      ws = new WebSocket(target, ['tty']);
    } catch (e) {
      this.set({ status: 'error', note: 'The browser blocked this address.' });
      term?.write(`\x1b[31m${e instanceof Error ? e.message : 'Connection blocked'}\x1b[0m\r\n${this.editor.render()}`);
      return;
    }
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => {
      opened = true;
      ws.send(encodeHandshake(term?.cols ?? 80, term?.rows ?? 24));
      this.set({ status: 'online', note: '' });
      term?.write('\r\n\x1b[32m[connected]\x1b[0m\r\n');
      term?.focus();
    };
    ws.onmessage = (ev) => {
      const data = typeof ev.data === 'string' ? new TextEncoder().encode(ev.data) : new Uint8Array(ev.data);
      if (data[0] === 0x30) term?.write(data.subarray(1));
    };
    ws.onerror = () => {
      if (!opened) this.set({ status: 'error', note: 'Could not reach ttyd. Is "ttyd -W bash" running?' });
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (opened) {
        this.set({ status: 'local', note: '' });
        term?.write('\r\n\x1b[33m[disconnected — back in the built-in shell]\x1b[0m\r\n');
      } else {
        this.set({ status: 'error', note: this.state.note || 'Could not reach ttyd. Is "ttyd -W bash" running?' });
        term?.write(`\x1b[31mCould not connect to ${target}\x1b[0m — start it in Termux with \x1b[36mttyd -W bash\x1b[0m\r\n`);
      }
      term?.write(this.editor.render());
    };
    this.ws = ws;
  }

  private closeSocket() {
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onclose = null;
      ws.close();
    }
  }

  disconnect() {
    if (!this.ws) return;
    this.closeSocket();
    this.set({ status: 'local', note: '' });
    this.term?.write(`\r\n\x1b[33m[disconnected]\x1b[0m\r\n${this.editor.render()}`);
  }
}

export const terminalSession = new TerminalSession();
