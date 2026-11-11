import { Menu, Plus, ChevronDown, KeyRound, SlidersHorizontal, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ApiProvider, DrawerTab, ModelOption } from '@/types';

export const MODELS: ModelOption[] = [
  {
    id: 'jarvis-1.0',
    name: 'Jarvis 1.0 (Gemini 2.5 Flash)',
    provider: 'gemini',
    description: 'Fast, intelligent, high throughput for everyday code & conversation.',
    badge: 'Fast & Default'
  },
  {
    id: 'jarvis-pro',
    name: 'Jarvis Pro (Gemini 2.5 Pro)',
    provider: 'gemini',
    description: 'Advanced reasoning, deep technical analysis & complex code architecture.',
    badge: 'Pro Reasoning',
    isPaid: true
  },
  {
    id: 'jarvis-thinking',
    name: 'Jarvis Thinking (Gemini 2.5 Pro Thinking)',
    provider: 'gemini',
    description: 'Maximum reasoning depth for scientific, security & root-cause analysis.',
    badge: 'Deep Thinking',
    isPaid: true
  },
  {
    id: 'openrouter-claude',
    name: 'OpenRouter (Claude 3.5 Sonnet)',
    provider: 'openrouter',
    description: 'Access Claude 3.5 Sonnet via OpenRouter API Key.',
    badge: 'OpenRouter API'
  },
  {
    id: 'openrouter-gpt4o',
    name: 'OpenRouter (GPT-4o)',
    provider: 'openrouter',
    description: 'Access OpenAI GPT-4o via OpenRouter API Key.',
    badge: 'OpenRouter API'
  },
  {
    id: 'openrouter-deepseek',
    name: 'OpenRouter (DeepSeek R1)',
    provider: 'openrouter',
    description: 'Access DeepSeek R1 via OpenRouter API Key.',
    badge: 'OpenRouter API'
  },
  {
    id: 'gpt-4o',
    name: 'OpenAI GPT-4o',
    provider: 'openai',
    description: 'Multimodal intelligence directly by OpenAI.',
    badge: 'Direct API'
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Anthropic Claude 3.5 Sonnet',
    provider: 'anthropic',
    description: 'Premier coding and markdown synthesis.',
    badge: 'Direct API'
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'deepseek',
    description: 'Open-weights reasoning model directly by DeepSeek.',
    badge: 'Direct API'
  },
  {
    id: 'groq-llama',
    name: 'Groq (Llama 3.3 70B)',
    provider: 'groq',
    description: 'Ultra-fast inference powered by Groq LPU.',
    badge: 'Groq API'
  },
  {
    id: 'custom-model',
    name: 'Custom REST Endpoint',
    provider: 'custom',
    description: 'Connect to your custom local or remote API endpoint.',
    badge: 'Custom URL'
  }
];

interface HeaderProps {
  onOpenNav: () => void;
  onOpenControlCenter: (tab: DrawerTab) => void;
  onNewChat: () => void;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  provider: ApiProvider;
  keyReady: boolean;
  title: string;
}

export function Header({
  onOpenNav,
  onOpenControlCenter,
  onNewChat,
  selectedModel,
  onSelectModel,
  provider,
  keyReady,
  title,
}: HeaderProps) {
  const current = MODELS.find((m) => m.id === selectedModel) ?? MODELS[0]!;

  return (
    <header className="relative z-20 flex shrink-0 items-center gap-2 border-b border-border bg-background/70 px-3 py-2.5 backdrop-blur-md sm:px-5">
      <Button variant="hud" size="icon" className="lg:hidden" onClick={onOpenNav} aria-label="Menu">
        <Menu />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="hud-label">Engine</span>
              <span className="truncate font-display text-sm font-semibold text-foreground">{current.name}</span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-subtle transition-transform group-data-[state=open]:rotate-180" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border-border-strong bg-popover p-1.5 shadow-panel"
        >
          <DropdownMenuLabel className="hud-label px-2 py-1.5">Select AI engine</DropdownMenuLabel>
          <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
            {MODELS.map((model) => {
              const active = model.id === selectedModel;
              return (
                <DropdownMenuItem
                  key={model.id}
                  onSelect={() => onSelectModel(model.id)}
                  className={cn(
                    'flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 focus:bg-accent',
                    active && 'bg-accent',
                  )}
                >
                  <span
                    className={cn(
                      'mt-1 grid size-4 shrink-0 place-items-center rounded-full border',
                      active ? 'border-primary bg-primary text-primary-foreground' : 'border-border-strong',
                    )}
                  >
                    {active && <Check className="size-3" />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-foreground">{model.name}</span>
                      {model.badge && (
                        <span
                          className={cn(
                            'shrink-0 rounded-full border px-1.5 py-px font-mono text-[0.6rem] uppercase tracking-wider',
                            model.isPaid ? 'border-signal/40 text-signal' : 'border-primary/30 text-primary',
                          )}
                        >
                          {model.badge}
                        </span>
                      )}
                    </span>
                    <span className="line-clamp-1 text-xs text-subtle">{model.description}</span>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </div>
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem
            onSelect={() => onOpenControlCenter('apikeys')}
            className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-xs text-muted-foreground focus:bg-accent"
          >
            <KeyRound className="size-3.5 text-primary" /> Manage API keys
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <span className="hidden min-w-0 flex-1 truncate text-center text-xs text-subtle md:block">{title}</span>
      <span className="flex-1 md:hidden" />

      <button
        type="button"
        onClick={() => onOpenControlCenter('apikeys')}
        className={cn(
          'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-wider transition-colors',
          keyReady
            ? 'border-success/30 text-success hover:bg-success/10'
            : 'border-signal/40 text-signal hover:bg-signal/10',
        )}
        title="Manage API keys"
      >
        <span className={cn('size-1.5 rounded-full', keyReady ? 'bg-success' : 'bg-signal animate-pulse')} />
        <span className="hidden sm:inline">{provider}</span>
        <span>{keyReady ? 'Online' : 'Key needed'}</span>
      </button>

      <Button variant="hud" size="icon" onClick={onNewChat} aria-label="New chat" title="New chat" className="lg:hidden">
        <Plus />
      </Button>
      <Button
        variant="hud"
        size="icon"
        onClick={() => onOpenControlCenter('apikeys')}
        aria-label="Control Center"
        title="Control Center"
      >
        <SlidersHorizontal />
      </Button>
    </header>
  );
}
