import { useEffect, useRef, useState } from 'react';
import { Copy, Plug, PlugZap, Terminal as TerminalIcon } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DEFAULT_TTYD_URL,
  LOCAL_SERVERS,
  encodeHandshake,
  encodeInput,
  encodeResize,
  normalizeTtydUrl,
} from '@/services/terminal';

type Status = 'idle' | 'connecting' | 'online' | 'error';
const URL_KEY = 'jarvis_ttyd_url';

const KEYS: Array<{ label: string; seq: string }> = [
  { label: 'Esc', seq: '\x1b' },
  { label: 'Tab', seq: '\t' },
  { label: '^C', seq: '\x03' },
  { label: '^D', seq: '\x04' },
  { label: '^L', seq: '\x0c' },
  { label: '←', seq: '\x1b[D' },
  { label: '↑', seq: '\x1b[A' },
  { label: '↓', seq: '\x1b[B' },
  { label: '→', seq: '\x1b[C' },
  { label: '|', seq: '|' },
  { label: '~', seq: '~' },
  { label: '/', seq: '/' },
];

export default function TerminalPanel() {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<any>(null);
  const fitRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [url, setUrl] = useState(DEFAULT_TTYD_URL);
  const [status, setStatus] = useState<Status>('idle');
  const [note, setNote] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(URL_KEY);
    if (saved) setUrl(saved);
    let disposed = false;
    let ro: ResizeObserver | undefined;
    (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([import('@xterm/xterm'), import('@xterm/addon-fit')]);
      if (disposed || !hostRef.current) return;
      const styles = getComputedStyle(document.documentElement);
      const term = new Terminal({
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 13,
        cursorBlink: true,
        convertEol: false,
        theme: { background: '#0b0f14', foreground: '#d7e3ee', cursor: '#38e1ff' },
      });
      void styles;
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(hostRef.current);
      fit.fit();
      term.writeln('\x1b[36mJarvis terminal\x1b[0m — connect to Termux or your PC running ttyd.');
      term.onData((d: string) => {
        const ws = wsRef.current;
        if (ws?.readyState === WebSocket.OPEN) ws.send(encodeInput(d));
      });
      term.onResize(({ cols, rows }: { cols: number; rows: number }) => {
        const ws = wsRef.current;
        if (ws?.readyState === WebSocket.OPEN) ws.send(encodeResize(cols, rows));
      });
      termRef.current = term;
      fitRef.current = fit;
      ro = new ResizeObserver(() => fit.fit());
      ro.observe(hostRef.current);
    })();
    return () => {
      disposed = true;
      ro?.disconnect();
      wsRef.current?.close();
      termRef.current?.dispose();
    };
  }, []);

  const connect = () => {
    const term = termRef.current;
    if (!term) return;
    let target: string;
    try {
      target = normalizeTtydUrl(url);
    } catch {
      setStatus('error');
      setNote('That address does not look right.');
      return;
    }
    localStorage.setItem(URL_KEY, url);
    wsRef.current?.close();
    setStatus('connecting');
    setNote('');
    const ws = new WebSocket(target, ['tty']);
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => {
      ws.send(encodeHandshake(term.cols, term.rows));
      setStatus('online');
      term.focus();
    };
    ws.onmessage = (ev) => {
      const data = typeof ev.data === 'string' ? new TextEncoder().encode(ev.data) : new Uint8Array(ev.data);
      if (data[0] === 0x30) term.write(data.slice(1));
    };
    ws.onerror = () => {
      setStatus('error');
      setNote('Could not reach ttyd. Is it running with "ttyd -W bash"?');
    };
    ws.onclose = () => {
      setStatus((s) => (s === 'error' ? s : 'idle'));
      term.writeln('\r\n\x1b[33m[disconnected]\x1b[0m');
    };
    wsRef.current = ws;
  };

  const disconnect = () => wsRef.current?.close();
  const send = (text: string) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(encodeInput(text));
    termRef.current?.focus();
  };
  const copy = (t: string) => void navigator.clipboard?.writeText(t);

  const online = status === 'online';

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          aria-label="Terminal address"
          className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background/60 px-3 font-mono text-xs text-foreground focus:border-primary/50 focus:outline-none"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        {online ? (
          <Button variant="hud" size="sm" className="rounded-lg" onClick={disconnect}>
            <Plug /> Disconnect
          </Button>
        ) : (
          <Button variant="arc" size="sm" className="rounded-lg" onClick={connect} disabled={status === 'connecting'}>
            <PlugZap /> Connect
          </Button>
        )}
      </div>
      <p className="flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-wider text-subtle">
        <span
          className={cn(
            'size-2 rounded-full',
            online ? 'bg-success' : status === 'error' ? 'bg-destructive' : status === 'connecting' ? 'bg-signal' : 'bg-subtle',
          )}
        />
        {status}
        {note && <span className="normal-case tracking-normal text-destructive">{note}</span>}
      </p>

      <div className="overflow-hidden rounded-xl border border-border-strong bg-code p-2">
        <div ref={hostRef} className="h-72 w-full" />
      </div>

      <div className="flex gap-1 overflow-x-auto scrollbar-none">
        {KEYS.map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={() => send(k.seq)}
            className="shrink-0 rounded-md border border-border px-2.5 py-1.5 font-mono text-xs text-muted-foreground hover:border-primary/50 hover:text-primary"
          >
            {k.label}
          </button>
        ))}
      </div>

      <section className="space-y-2 rounded-xl border border-border bg-background/40 p-3">
        <h4 className="hud-label flex items-center gap-1.5"><TerminalIcon className="size-3.5" /> Setup</h4>
        <Cmd label="Termux (Android)" cmd="pkg install -y ttyd nodejs git && ttyd -W bash" onCopy={copy} />
        <Cmd label="PC (after installing ttyd)" cmd="ttyd -W bash" onCopy={copy} />
        <p className="text-xs text-muted-foreground">
          Open Jarvis on the same device that runs ttyd. Some browsers block local addresses on https pages; if
          Connect fails, allow "insecure content" for this site in browser settings.
        </p>
      </section>

      <section className="space-y-2 rounded-xl border border-border bg-background/40 p-3">
        <h4 className="hud-label">Local AI servers</h4>
        {LOCAL_SERVERS.map((s) => (
          <div key={s.id} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{s.label} <span className="font-mono text-xs text-subtle">:{s.port}</span></span>
              <Button variant="hud" size="sm" className="h-7 rounded-md text-xs" disabled={!online} onClick={() => send(`${s.setup}\r`)}>
                Run in terminal
              </Button>
            </div>
            <Cmd cmd={s.setup} onCopy={copy} />
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          When it's running, go to Keys → Custom and tap the {LOCAL_SERVERS.map((s) => s.label).join(' or ')} preset.
        </p>
      </section>
    </div>
  );
}

function Cmd({ label, cmd, onCopy }: { label?: string; cmd: string; onCopy: (t: string) => void }) {
  return (
    <div>
      {label && <p className="mb-1 text-xs text-muted-foreground">{label}</p>}
      <div className="flex items-start gap-2 rounded-md bg-code px-2 py-1.5">
        <code className="min-w-0 flex-1 break-all font-mono text-[0.7rem] text-foreground">{cmd}</code>
        <button type="button" aria-label="Copy command" onClick={() => onCopy(cmd)} className="text-subtle hover:text-primary">
          <Copy className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
