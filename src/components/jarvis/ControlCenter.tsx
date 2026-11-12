import { lazy, Suspense, useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import { SquareTerminal } from 'lucide-react';
import { LOCAL_SERVERS, localServerEndpoint } from '@/services/terminal';
const TerminalPanel = lazy(() => import('./TerminalPanel'));
const LocalHubPanel = lazy(() => import('./LocalHubPanel'));
import {
  KeyRound,
  Code2,
  Plug,
  Files,
  Settings2,
  UserRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  Trash2,
  Download,
} from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ApiKeyConfig, ApiProvider, ChatConversation, DrawerTab, Plugin, PluginSettings, UserProfile } from '@/types';
import { verifyKeyClient } from '@/services/ai';
import { ArcMark } from './ArcMark';
import { buildFilesZip, collectFiles, dataUrlToBlob, fileStamp, saveFile, textBlob } from '@/services/download';

interface ControlCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: DrawerTab;
  onSelectTab: (tab: DrawerTab) => void;
  conversations: ChatConversation[];
  onClearAllHistory: () => void;
  userProfile: UserProfile;
  onUpdateUserProfile: (p: UserProfile) => void;
  apiKeys: Record<string, ApiKeyConfig>;
  onSaveApiKey: (config: ApiKeyConfig) => void;
  pluginSettings: PluginSettings;
  onUpdatePluginSettings: (s: PluginSettings) => void;
  systemInstruction: string;
  onChangeSystemInstruction: (v: string) => void;
  selfEditEnabled: boolean;
  onToggleSelfEdit: (v: boolean) => void;
  currentProvider: ApiProvider;
  /** Switches the chat engine to the Custom endpoint (used by the Local AI Hub). */
  onUseCustomEngine: () => void;
}

const PROVIDERS: Array<{ id: ApiProvider; label: string; defaultModel: string }> = [
  { id: 'gemini', label: 'Gemini', defaultModel: 'gemini-2.5-flash' },
  { id: 'openrouter', label: 'OpenRouter', defaultModel: 'anthropic/claude-3.5-sonnet' },
  { id: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o' },
  { id: 'anthropic', label: 'Anthropic', defaultModel: 'claude-3-5-sonnet-20241022' },
  { id: 'deepseek', label: 'DeepSeek', defaultModel: 'deepseek-chat' },
  { id: 'groq', label: 'Groq', defaultModel: 'llama-3.3-70b-versatile' },
  { id: 'custom', label: 'Custom', defaultModel: 'custom-model' },
];

const TABS: Array<{ id: DrawerTab; label: string; icon: ReactNode }> = [
  { id: 'apikeys', label: 'Keys', icon: <KeyRound /> },
  { id: 'selfedit', label: 'Coder', icon: <Code2 /> },
  { id: 'plugins', label: 'Plugins', icon: <Plug /> },
  { id: 'files', label: 'Files', icon: <Files /> },
  { id: 'settings', label: 'Config', icon: <Settings2 /> },
  { id: 'terminal', label: 'Term', icon: <SquareTerminal /> },
  { id: 'profile', label: 'Profile', icon: <UserRound /> },
];

const fieldClass =
  'h-10 w-full rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground placeholder:text-subtle focus:border-primary/50 focus:outline-none';

export function ControlCenter(props: ControlCenterProps) {
  const { open, onOpenChange, activeTab, onSelectTab } = props;
  const tab = activeTab === 'history' ? 'apikeys' : activeTab;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-border-strong bg-sidebar p-0 sm:max-w-md"
      >
        <SheetHeader className="flex-row items-center gap-3 space-y-0 border-b border-border px-5 py-4 text-left">
          <ArcMark className="size-8" />
          <div>
            <SheetTitle className="font-display text-base">Control Center</SheetTitle>
            <SheetDescription className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-subtle">Keys · Plugins · Settings</SheetDescription>
          </div>
        </SheetHeader>

        <Tabs value={tab} onValueChange={(v) => onSelectTab(v as DrawerTab)} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-4 mt-4 grid h-auto shrink-0 grid-cols-7 gap-0.5 rounded-xl border border-border bg-background/50 p-1">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="flex flex-col gap-1 rounded-lg px-1 py-1.5 font-mono text-[0.6rem] uppercase tracking-wider text-subtle data-[state=active]:bg-accent data-[state=active]:text-primary data-[state=active]:shadow-none [&_svg]:size-4"
              >
                {t.icon}
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 scrollbar-thin">
            <TabsContent value="apikeys" className="mt-4">
              <KeysPanel {...props} />
            </TabsContent>
            <TabsContent value="selfedit" className="mt-4">
              <SelfCoderPanel {...props} />
            </TabsContent>
            <TabsContent value="plugins" className="mt-4">
              <PluginsPanel {...props} />
            </TabsContent>
            <TabsContent value="files" className="mt-4">
              <FilesPanel {...props} />
            </TabsContent>
            <TabsContent value="settings" className="mt-4">
              <ConfigPanel {...props} />
            </TabsContent>
            <TabsContent value="terminal" className="mt-4">
              <Suspense fallback={<p className="text-sm text-subtle">Loading terminal…</p>}>
                <div className="space-y-4">
                  <LocalHubPanel
                    customConfig={props.apiKeys['custom']}
                    onSaveApiKey={props.onSaveApiKey}
                    onUseCustomEngine={props.onUseCustomEngine}
                  />
                  <TerminalPanel />
                </div>
              </Suspense>
            </TabsContent>
            <TabsContent value="profile" className="mt-4">
              <ProfilePanel {...props} />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Panel({ title, hint, children, tone }: { title: string; hint?: string; children: ReactNode; tone?: 'signal' }) {
  return (
    <section
      className={cn(
        'rounded-xl border bg-card/60 p-4',
        tone === 'signal' ? 'border-signal/30' : 'border-border',
      )}
    >
      <h3 className={cn('font-display text-sm font-semibold', tone === 'signal' && 'text-signal')}>{title}</h3>
      {hint && <p className="mt-1 text-xs leading-relaxed text-subtle">{hint}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="hud-label">{label}</span>
      {children}
    </label>
  );
}

function KeysPanel({ apiKeys, onSaveApiKey, currentProvider }: ControlCenterProps) {
  const [provider, setProvider] = useState<ApiProvider>(currentProvider);
  const [showKey, setShowKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [endpointInput, setEndpointInput] = useState('');
  const [modelInput, setModelInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState<{ valid: boolean; message: string } | null>(null);

  useEffect(() => {
    const config = apiKeys[provider];
    const meta = PROVIDERS.find((p) => p.id === provider)!;
    setKeyInput(config?.apiKey ?? '');
    setEndpointInput(config?.endpoint ?? '');
    setModelInput(config?.selectedModel || meta.defaultModel);
    setStatus(null);
    // Reload the form only when switching provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const buildConfig = (valid: boolean, message?: string): ApiKeyConfig => ({
    provider,
    apiKey: keyInput.trim(),
    endpoint: endpointInput.trim(),
    selectedModel: modelInput.trim(),
    isValidated: valid,
    validationMessage: message,
  });

  const testAndSave = async () => {
    setVerifying(true);
    setStatus(null);
    try {
      const result = await verifyKeyClient(provider, keyInput.trim(), endpointInput.trim());
      setStatus(result);
      if (result.valid) onSaveApiKey(buildConfig(true, result.message));
    } catch (e: any) {
      setStatus({ valid: false, message: e?.message || 'Verification failed.' });
    } finally {
      setVerifying(false);
    }
  };

  const saveOnly = () => {
    onSaveApiKey(buildConfig(false));
    setStatus({ valid: true, message: 'Saved in this browser.' });
  };

  return (
    <div className="space-y-4">
      <Panel title="Providers" hint="Keys are stored only in this browser and sent straight to the provider you pick.">
        <div className="grid grid-cols-4 gap-1.5">
          {PROVIDERS.map((p) => {
            const hasKey = Boolean(apiKeys[p.id]?.apiKey) || (p.id === 'custom' && Boolean(apiKeys[p.id]?.endpoint));
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setProvider(p.id)}
                className={cn(
                  'relative rounded-lg border px-1 py-2 text-xs font-medium transition-colors',
                  provider === p.id
                    ? 'border-primary/60 bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
                )}
              >
                {p.label}
                {hasKey && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-success" />}
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel title={`${PROVIDERS.find((p) => p.id === provider)!.label} settings`}>
        {provider === 'custom' && (
          <div className="flex flex-wrap gap-1.5">
            <span className="w-full text-xs text-muted-foreground">Local server presets</span>
            {LOCAL_SERVERS.map((s) => (
              <Button
                key={s.id}
                variant="hud"
                size="sm"
                className="h-7 rounded-md text-xs"
                onClick={() => {
                  setEndpointInput(localServerEndpoint(s.port));
                  setModelInput(s.model);
                  setStatus({ valid: true, message: `${s.label} filled in. Paste the ${s.keyHint}, then Test & save.` });
                }}
              >
                {s.label} :{s.port}
              </Button>
            ))}
          </div>
        )}
        {provider === 'custom' && (
          <Field label="Endpoint URL">
            <input
              className={fieldClass}
              placeholder="https://api.example.com/v1/chat/completions"
              value={endpointInput}
              onChange={(e) => setEndpointInput(e.target.value)}
            />
          </Field>
        )}
        <Field label={provider === 'custom' ? 'API key (optional)' : 'API key'}>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              className={cn(fieldClass, 'pr-10 font-mono')}
              placeholder="Paste your key"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              aria-label={showKey ? 'Hide key' : 'Show key'}
              className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded text-subtle hover:text-foreground"
            >
              {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <Field label="Model ID">
          <input className={cn(fieldClass, 'font-mono')} value={modelInput} onChange={(e) => setModelInput(e.target.value)} />
        </Field>

        {status && (
          <p
            className={cn(
              'flex items-start gap-2 rounded-lg border px-3 py-2 text-xs',
              status.valid ? 'border-success/30 text-success' : 'border-destructive/40 text-destructive',
            )}
          >
            {status.valid ? <CheckCircle2 className="mt-px size-3.5 shrink-0" /> : <AlertCircle className="mt-px size-3.5 shrink-0" />}
            <span className="break-words">{status.message}</span>
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="arc" className="flex-1 rounded-lg" onClick={testAndSave} disabled={verifying}>
            {verifying && <Loader2 className="animate-spin" />} Test & save
          </Button>
          <Button variant="hud" className="rounded-lg" onClick={saveOnly}>
            Save
          </Button>
        </div>
      </Panel>
    </div>
  );
}

function SelfCoderPanel({ selfEditEnabled, onToggleSelfEdit, systemInstruction, onChangeSystemInstruction }: ControlCenterProps) {
  const [snippet, setSnippet] = useState('// App Custom Instruction Patch\nconsole.log("Jarvis Self-Coder Ready");');
  const [message, setMessage] = useState('');

  return (
    <div className="space-y-4">
      <Panel title="Self-Edit mode" hint="Jarvis answers with clean code patches and step-by-step refactoring rules." tone="signal">
        <label className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{selfEditEnabled ? 'Active' : 'Off'}</span>
          <Switch
            checked={selfEditEnabled}
            onCheckedChange={onToggleSelfEdit}
            className="data-[state=checked]:bg-signal"
          />
        </label>
      </Panel>
      <Panel title="Instruction patch" hint="Append extra rules to Jarvis's system instruction.">
        <textarea
          rows={8}
          value={snippet}
          onChange={(e) => setSnippet(e.target.value)}
          className="w-full rounded-lg border border-input bg-code p-3 font-mono text-xs text-success focus:border-primary/50 focus:outline-none"
        />
        <div className="flex items-center gap-3">
          <Button
            variant="signal"
            size="sm"
            className="rounded-lg"
            onClick={() => {
              onChangeSystemInstruction(systemInstruction + '\n\n' + snippet);
              setMessage('Patch merged into the system instruction.');
              setTimeout(() => setMessage(''), 2200);
            }}
          >
            Apply patch
          </Button>
          {message && <span className="text-xs text-signal">{message}</span>}
        </div>
      </Panel>
    </div>
  );
}

function PluginsPanel({ pluginSettings, onUpdatePluginSettings }: ControlCenterProps) {
  const update = (patch: Partial<PluginSettings>) => onUpdatePluginSettings({ ...pluginSettings, ...patch });

  const importPlugin = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const plugin: Plugin = {
          id: json.id || Date.now().toString(),
          name: json.name || 'Unnamed Plugin',
          description: json.description || '',
          version: json.version || '1.0.0',
          manifest: json.manifest || {},
        };
        update({ loadedPlugins: [...pluginSettings.loadedPlugins, plugin] });
      } catch (err) {
        console.error('Invalid plugin JSON:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <Panel title="Internet search" hint="Lets Gemini models look things up on the web before answering.">
        <label className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Grounding with Google Search</span>
          <Switch checked={pluginSettings.searchEnabled} onCheckedChange={(v) => update({ searchEnabled: v })} />
        </label>
      </Panel>

      <Panel title="GitHub" hint="A personal access token for the GitHub integration.">
        <label className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Enabled</span>
          <Switch checked={pluginSettings.githubEnabled} onCheckedChange={(v) => update({ githubEnabled: v })} />
        </label>
        <input
          type="password"
          className={cn(fieldClass, 'font-mono')}
          placeholder="ghp_…"
          value={pluginSettings.githubToken}
          onChange={(e) => update({ githubToken: e.target.value })}
          autoComplete="off"
        />
      </Panel>

      <Panel title="Custom plugins" hint="Import a plugin manifest (.json).">
        {pluginSettings.loadedPlugins.length === 0 && <p className="text-xs text-subtle">No plugins loaded yet.</p>}
        {pluginSettings.loadedPlugins.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{p.name}</div>
              {p.description && <div className="truncate text-xs text-subtle">{p.description}</div>}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[0.65rem] text-subtle">v{p.version}</span>
              <button
                type="button"
                aria-label={`Remove ${p.name}`}
                onClick={() => update({ loadedPlugins: pluginSettings.loadedPlugins.filter((x) => x.id !== p.id) })}
                className="rounded p-1 text-subtle hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
          <Upload className="size-3.5" /> Import plugin
          <input type="file" accept=".json" className="hidden" onChange={importPlugin} />
        </label>
      </Panel>
    </div>
  );
}

function FilesPanel({ conversations }: ControlCenterProps) {
  const { images, code } = collectFiles(conversations);
  const [zipping, setZipping] = useState(false);
  const [zipError, setZipError] = useState('');
  const hasChats = conversations.some((c) => c.messages.length > 0);

  const downloadAll = async () => {
    setZipping(true);
    setZipError('');
    try {
      const blob = await buildFilesZip(conversations);
      saveFile(blob, `jarvis-files-${fileStamp()}.zip`);
    } catch (e: any) {
      setZipError(e?.message || 'Could not build the zip file.');
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="space-y-4">
      <Panel
        title="Download everything"
        hint="One zip with every image, every code block and a text copy of each chat. Saves to your Downloads folder on Android and PC."
      >
        <Button variant="arc" className="w-full rounded-lg" onClick={downloadAll} disabled={zipping || !hasChats}>
          {zipping ? <Loader2 className="animate-spin" /> : <Download />} Download all (.zip)
        </Button>
        {zipError && <p className="text-xs text-destructive">{zipError}</p>}
      </Panel>

      <Panel title={`Images (${images.length})`} hint="Pictures you've shared in chats.">
        {images.length === 0 && <p className="text-xs text-subtle">No images yet.</p>}
        <div className="grid grid-cols-3 gap-2">
          {images.map((f) => (
            <figure key={f.id} className="group relative overflow-hidden rounded-lg border border-border">
              <img src={f.dataUrl} alt="" className="aspect-square w-full object-cover" />
              <figcaption className="truncate px-1.5 py-1 text-[0.65rem] text-subtle">{f.chat}</figcaption>
              <button
                type="button"
                onClick={() => saveFile(dataUrlToBlob(f.dataUrl), f.filename)}
                aria-label={`Download ${f.filename}`}
                title="Download"
                className="absolute right-1 top-1 grid size-7 place-items-center rounded-md bg-background/80 text-foreground backdrop-blur hover:text-primary"
              >
                <Download className="size-3.5" />
              </button>
            </figure>
          ))}
        </div>
      </Panel>

      <Panel title={`Code files (${code.length})`} hint="Code blocks from Jarvis's replies, saved with the right file type.">
        {code.length === 0 && <p className="text-xs text-subtle">No code in replies yet.</p>}
        <ul className="space-y-1.5">
          {code.map((c) => (
            <li key={c.id} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2">
              <span className="w-12 shrink-0 truncate rounded border border-primary/30 px-1 py-px text-center font-mono text-[0.6rem] uppercase text-primary">
                {c.lang}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-xs text-foreground">{c.filename}</div>
                <div className="truncate text-[0.65rem] text-subtle">{c.code.split('\n')[0]}</div>
              </div>
              <button
                type="button"
                onClick={() => saveFile(textBlob(c.code, c.filename), c.filename)}
                aria-label={`Download ${c.filename}`}
                title="Download"
                className="grid size-8 shrink-0 place-items-center rounded-md text-subtle hover:bg-accent hover:text-primary"
              >
                <Download className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function ConfigPanel({ systemInstruction, onChangeSystemInstruction, onClearAllHistory }: ControlCenterProps) {
  return (
    <div className="space-y-4">
      <Panel title="System instruction" hint="How Jarvis should behave in every conversation.">
        <textarea
          rows={9}
          value={systemInstruction}
          onChange={(e) => onChangeSystemInstruction(e.target.value)}
          className="w-full rounded-lg border border-input bg-background/60 p-3 font-mono text-xs leading-relaxed text-foreground focus:border-primary/50 focus:outline-none"
        />
      </Panel>
      <Panel title="Danger zone">
        <Button
          variant="outline"
          className="w-full rounded-lg border-destructive/40 bg-transparent text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => {
            if (confirm('Delete all conversations? This cannot be undone.')) onClearAllHistory();
          }}
        >
          <Trash2 /> Clear all history
        </Button>
      </Panel>
    </div>
  );
}

function ProfilePanel({ userProfile, onUpdateUserProfile }: ControlCenterProps) {
  const [draft, setDraft] = useState(userProfile);
  const [saved, setSaved] = useState(false);
  useEffect(() => setDraft(userProfile), [userProfile]);

  return (
    <Panel title="Your profile" hint="Shown in the sidebar and used in greetings.">
      <div className="flex items-center gap-3">
        <img src={draft.avatar} alt="" className="size-14 rounded-full border border-primary/40 object-cover" />
        <div className="min-w-0">
          <div className="truncate font-display font-semibold">{draft.name || 'Unnamed'}</div>
          <div className="truncate text-xs text-subtle">{draft.email}</div>
        </div>
      </div>
      <Field label="Name">
        <input className={fieldClass} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </Field>
      <Field label="Email">
        <input className={fieldClass} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
      </Field>
      <Field label="Avatar image URL">
        <input className={fieldClass} value={draft.avatar} onChange={(e) => setDraft({ ...draft, avatar: e.target.value })} />
      </Field>
      <div className="flex items-center gap-3">
        <Button
          variant="arc"
          className="rounded-lg"
          onClick={() => {
            onUpdateUserProfile({ ...draft, name: draft.name.trim() || userProfile.name });
            setSaved(true);
            setTimeout(() => setSaved(false), 1800);
          }}
        >
          Save profile
        </Button>
        {saved && <span className="text-xs text-success">Saved</span>}
      </div>
    </Panel>
  );
}
