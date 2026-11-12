import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { CheckCircle2, Copy, ExternalLink, Loader2, Play, RefreshCw, ScrollText, Square, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ApiKeyConfig } from '@/types';
import { LOCAL_SERVERS, fetchServerModels, localServerEndpoint, pingServer, type LocalServerPreset } from '@/services/terminal';
import { terminalSession as session } from '@/services/terminalSession';

type Health = 'checking' | 'running' | 'offline';

interface LocalHubPanelProps {
  customConfig?: ApiKeyConfig | undefined;
  onSaveApiKey: (config: ApiKeyConfig) => void;
  onUseCustomEngine: () => void;
}

/** One-tap start, health check, dashboard link and "use in Jarvis" for FreeLLMAPI and OmniRoute. */
export default function LocalHubPanel(props: LocalHubPanelProps) {
  const [health, setHealth] = useState<Record<string, Health>>({});

  const check = useCallback(async () => {
    setHealth((h) => Object.fromEntries(LOCAL_SERVERS.map((s) => [s.id, h[s.id] ?? 'checking'])));
    const results = await Promise.all(LOCAL_SERVERS.map(async (s) => [s.id, (await pingServer(s.port)) ? 'running' : 'offline'] as const));
    setHealth(Object.fromEntries(results));
  }, []);

  useEffect(() => {
    void check();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void check();
    }, 6000);
    return () => clearInterval(id);
  }, [check]);

  return (
    <section className="space-y-3 rounded-xl border border-primary/25 bg-card/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-semibold">Local AI Hub</h3>
          <p className="text-xs text-subtle">Start a free AI server on this phone or PC, then use it as Jarvis's engine.</p>
        </div>
        <Button variant="hud" size="icon" className="size-8 shrink-0 rounded-lg" aria-label="Check servers again" onClick={() => void check()}>
          <RefreshCw className="size-3.5" />
        </Button>
      </div>
      {LOCAL_SERVERS.map((s) => (
        <ServerCard key={s.id} server={s} health={health[s.id] ?? 'checking'} {...props} />
      ))}
    </section>
  );
}

function ServerCard({
  server: s,
  health,
  customConfig,
  onSaveApiKey,
  onUseCustomEngine,
}: LocalHubPanelProps & { server: LocalServerPreset; health: Health }) {
  const { status } = useSyncExternalStore(session.subscribe, session.getState, session.getState);
  const online = status === 'online';
  const endpoint = localServerEndpoint(s.port);
  const isCurrent = customConfig?.endpoint === endpoint;
  const [key, setKey] = useState(isCurrent ? (customConfig?.apiKey ?? '') : '');
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState(isCurrent ? customConfig?.selectedModel || s.model : s.model);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNote({ ok: true, text: `${what} copied. Paste it into Termux and press Enter.` });
    } catch {
      setNote({ ok: false, text: 'Could not copy. Long-press the command below to copy it.' });
    }
  };

  const start = () => {
    if (online) {
      session.run(s.termux);
      setNote({ ok: true, text: `Starting ${s.label} in your terminal. The first run installs it and can take a few minutes.` });
    } else void copy(s.termux, 'Start script');
  };

  const loadModels = async () => {
    setBusy(true);
    setNote(null);
    try {
      const list = await fetchServerModels(s.port, key.trim());
      setModels(list);
      if (list.length && !list.includes(model)) setModel(list.includes(s.model) ? s.model : list[0]!);
      setNote({ ok: true, text: list.length ? `${list.length} models found.` : 'Connected, but no models are listed yet. Add provider keys in the dashboard.' });
    } catch (e) {
      setNote({
        ok: false,
        text:
          health === 'offline'
            ? `${s.label} isn't running. Tap Start first.`
            : `Couldn't list models: ${e instanceof Error ? e.message : 'request blocked'} You can still type a model name.`,
      });
    } finally {
      setBusy(false);
    }
  };

  const use = () => {
    onSaveApiKey({
      provider: 'custom',
      apiKey: key.trim(),
      endpoint,
      selectedModel: model.trim() || s.model,
      isValidated: health === 'running',
      validationMessage: `${s.label} on this device`,
    });
    onUseCustomEngine();
    setNote({ ok: true, text: `Jarvis now replies through ${s.label} (${model.trim() || s.model}).` });
  };

  return (
    <div className="space-y-2.5 rounded-lg border border-border bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {s.label} <span className="font-mono text-xs text-subtle">:{s.port}</span>
            {isCurrent && <span className="ml-2 font-mono text-[0.6rem] uppercase tracking-wider text-primary">in use</span>}
          </p>
        </div>
        <span
          className={cn(
            'flex shrink-0 items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wider',
            health === 'running' ? 'text-success' : health === 'offline' ? 'text-subtle' : 'text-signal',
          )}
        >
          <span
            className={cn(
              'size-2 rounded-full',
              health === 'running' ? 'bg-success' : health === 'offline' ? 'bg-destructive' : 'animate-pulse bg-signal',
            )}
          />
          {health === 'running' ? 'running' : health === 'offline' ? 'offline' : 'checking'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Button variant="arc" size="sm" className="rounded-md text-xs" onClick={start}>
          <Play /> {online ? 'Start' : 'Copy start script'}
        </Button>
        <Button variant="hud" size="sm" className="rounded-md text-xs" asChild>
          <a href={`http://127.0.0.1:${s.dashboardPort}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink /> Dashboard
          </a>
        </Button>
        {online && (
          <>
            <Button variant="hud" size="sm" className="rounded-md text-xs" onClick={() => session.run(s.logs)}>
              <ScrollText /> Show log
            </Button>
            <Button variant="hud" size="sm" className="rounded-md text-xs" onClick={() => session.run(s.stop)}>
              <Square /> Stop
            </Button>
          </>
        )}
      </div>

      <details className="group">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Commands</summary>
        <div className="mt-2 space-y-2">
          <CmdLine label="Termux (background)" cmd={s.termux} onCopy={() => void copy(s.termux, 'Start script')} />
          <CmdLine label="PC" cmd={s.setup} onCopy={() => void copy(s.setup, 'Command')} />
        </div>
      </details>

      <div className="space-y-1.5">
        <input
          aria-label={`${s.label} API key`}
          type="password"
          placeholder={`Paste the ${s.keyHint}`}
          className="h-9 w-full rounded-lg border border-input bg-background/60 px-3 font-mono text-xs text-foreground placeholder:text-subtle focus:border-primary/50 focus:outline-none"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoComplete="off"
        />
        <div className="flex gap-1.5">
          {models.length > 0 ? (
            <select
              aria-label={`${s.label} model`}
              className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background/60 px-2 font-mono text-xs text-foreground focus:border-primary/50 focus:outline-none"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          ) : (
            <input
              aria-label={`${s.label} model`}
              className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background/60 px-3 font-mono text-xs text-foreground focus:border-primary/50 focus:outline-none"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          )}
          <Button variant="hud" size="sm" className="h-9 rounded-lg text-xs" onClick={loadModels} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />} Models
          </Button>
        </div>
        <Button variant="arc" size="sm" className="w-full rounded-lg" onClick={use}>
          {isCurrent ? <CheckCircle2 /> : <Zap />} Use in Jarvis
        </Button>
      </div>

      {note && <p className={cn('text-xs', note.ok ? 'text-success' : 'text-destructive')}>{note.text}</p>}
    </div>
  );
}

function CmdLine({ label, cmd, onCopy }: { label: string; cmd: string; onCopy: () => void }) {
  return (
    <div>
      <p className="mb-1 text-[0.7rem] text-subtle">{label}</p>
      <div className="flex items-start gap-2 rounded-md bg-code px-2 py-1.5">
        <code className="min-w-0 flex-1 select-all break-all font-mono text-[0.65rem] text-foreground">{cmd}</code>
        <button type="button" aria-label="Copy command" onClick={onCopy} className="text-subtle hover:text-primary">
          <Copy className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
