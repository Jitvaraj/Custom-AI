import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Copy, CornerDownLeft, Keyboard, KeyboardOff, Plug, PlugZap, Terminal as TerminalIcon } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { terminalSession as session } from '@/services/terminalSession';

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
  { label: '-', seq: '-' },
];

const STATUS_LABEL = {
  local: 'built-in shell',
  connecting: 'connecting',
  online: 'connected',
  error: 'error · built-in shell',
} as const;

export default function TerminalPanel() {
  const hostRef = useRef<HTMLDivElement>(null);
  const { status, note, url, directTyping } = useSyncExternalStore(session.subscribe, session.getState, session.getState);
  const [line, setLine] = useState('');
  const [past, setPast] = useState<string[]>([]);
  const [pastIndex, setPastIndex] = useState(-1);

  useEffect(() => {
    if (!hostRef.current) return;
    return session.attach(hostRef.current);
  }, []);

  const online = status === 'online';
  const send = (text: string) => {
    session.input(text);
    session.focus();
  };
  const runLine = () => {
    session.submit(line);
    if (line.trim()) setPast((p) => (p[p.length - 1] === line ? p : [...p, line]));
    setPastIndex(-1);
    setLine('');
  };
  const recall = (dir: -1 | 1) => {
    if (!past.length) return;
    const start = pastIndex === -1 ? past.length : pastIndex;
    const next = start + dir;
    if (next >= past.length) {
      setPastIndex(-1);
      setLine('');
    } else if (next >= 0) {
      setPastIndex(next);
      setLine(past[next] ?? '');
    }
  };
  const copy = (t: string) => void navigator.clipboard?.writeText(t);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          aria-label="Terminal address"
          className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background/60 px-3 font-mono text-xs text-foreground focus:border-primary/50 focus:outline-none"
          value={url}
          onChange={(e) => session.setUrl(e.target.value)}
        />
        {online ? (
          <Button variant="hud" size="sm" className="rounded-lg" onClick={() => session.disconnect()}>
            <Plug /> Disconnect
          </Button>
        ) : (
          <Button variant="arc" size="sm" className="rounded-lg" onClick={() => session.connect()} disabled={status === 'connecting'}>
            <PlugZap /> Connect
          </Button>
        )}
      </div>
      <p className="flex flex-wrap items-center gap-2 font-mono text-[0.65rem] uppercase tracking-wider text-subtle">
        <span
          className={cn(
            'size-2 rounded-full',
            online ? 'bg-success' : status === 'error' ? 'bg-destructive' : status === 'connecting' ? 'bg-signal' : 'bg-primary',
          )}
        />
        {STATUS_LABEL[status]}
        {note && <span className="normal-case tracking-normal text-destructive">{note}</span>}
      </p>

      <div className="overflow-hidden rounded-xl border border-border-strong bg-code p-2" onClick={() => session.focus()}>
        <div ref={hostRef} className="h-72 w-full" />
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          runLine();
        }}
      >
        <input
          aria-label="Command"
          placeholder={online ? 'Type a command for Termux / PC…' : 'Type a command (try help)…'}
          className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background/60 px-3 font-mono text-xs text-foreground placeholder:text-subtle focus:border-primary/50 focus:outline-none"
          value={line}
          onChange={(e) => setLine(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              recall(-1);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              recall(1);
            }
          }}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="send"
        />
        <Button type="submit" variant="arc" size="sm" className="rounded-lg" aria-label="Run command">
          <CornerDownLeft /> Run
        </Button>
      </form>

      <div className="flex flex-wrap gap-1.5">
        <QuickBtn onClick={() => send('\x03')}>Ctrl+C</QuickBtn>
        <QuickBtn onClick={() => session.run('clear')}>Clear</QuickBtn>
        <QuickBtn onClick={() => recall(-1)}>Last command</QuickBtn>
        {online && <QuickBtn onClick={() => session.run('termux-wake-lock')}>Keep awake</QuickBtn>}
        <QuickBtn onClick={() => session.setDirectTyping(!directTyping)} active={directTyping}>
          {directTyping ? <Keyboard className="size-3.5" /> : <KeyboardOff className="size-3.5" />}
          {directTyping ? 'Typing in terminal' : 'Type in terminal'}
        </QuickBtn>
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
          Without a connection you get Jarvis's built-in shell (type help). For real Linux commands, start ttyd
          and tap Connect. On a phone, type in the command bar above; tap "Type in terminal" only for apps like nano. Open Jarvis on the same device that runs ttyd. Some browsers block local addresses on https pages; if
          Connect fails, allow "insecure content" for this site in browser settings.
        </p>
      </section>

    </div>
  );
}

function QuickBtn({ children, onClick, active }: { children: ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs',
        active ? 'border-primary/50 text-primary' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-primary',
      )}
    >
      {children}
    </button>
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
