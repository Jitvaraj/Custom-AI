import { useState, type MouseEvent } from 'react';
import { Plus, Search, Pin, PencilLine, Download, Trash2, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { chatToMarkdown, safeName, saveFile, textBlob } from '@/services/download';
import { cn } from '@/lib/utils';
import type { ChatConversation, DrawerTab, UserProfile } from '@/types';
import { ArcMark } from './ArcMark';

interface ConversationSidebarProps {
  conversations: ChatConversation[];
  activeChatId: string;
  generatingChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
  onTogglePinChat: (id: string) => void;
  userProfile: UserProfile;
  onOpenControlCenter: (tab: DrawerTab) => void;
}

const DAY = 86_400_000;

export function ConversationSidebar({
  conversations,
  activeChatId,
  generatingChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onTogglePinChat,
  userProfile,
  onOpenControlCenter,
}: ConversationSidebarProps) {
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const q = query.toLowerCase();
  const filtered = conversations.filter(
    (c) => c.title.toLowerCase().includes(q) || c.messages.some((m) => m.content.toLowerCase().includes(q)),
  );
  const now = Date.now();
  const regular = filtered.filter((c) => !c.pinned);
  const groups: Array<[string, ChatConversation[]]> = [
    ['Pinned', filtered.filter((c) => c.pinned)],
    ['Today', regular.filter((c) => now - c.updatedAt < DAY)],
    ['Yesterday', regular.filter((c) => now - c.updatedAt >= DAY && now - c.updatedAt < 2 * DAY)],
    ['Earlier', regular.filter((c) => now - c.updatedAt >= 2 * DAY)],
  ];

  const saveRename = (id: string) => {
    if (editingTitle.trim()) onRenameChat(id, editingTitle.trim());
    setEditingId(null);
  };

  const exportChat = (conv: ChatConversation, format: 'md' | 'json') => {
    const name = `jarvis-${safeName(conv.title)}.${format}`;
    const text = format === 'md' ? chatToMarkdown(conv) : JSON.stringify(conv, null, 2);
    saveFile(textBlob(text, name), name);
  };

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-4 pb-4 pt-5">
        <ArcMark className="size-9" />
        <div className="leading-tight">
          <div className="font-display text-lg font-bold tracking-[0.18em]">JARVIS</div>
          <div className="hud-label">Personal AI · v1.0</div>
        </div>
      </div>

      <div className="space-y-2.5 px-3">
        <Button variant="arc" className="w-full justify-start rounded-lg" onClick={onNewChat}>
          <Plus /> New conversation
        </Button>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
          <input
            type="search"
            placeholder="Search chats"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-transparent pl-8 pr-3 text-sm text-foreground placeholder:text-subtle focus:border-primary/50 focus:outline-none"
          />
        </div>
      </div>

      <nav className="mt-4 flex-1 space-y-5 overflow-y-auto px-2 pb-4 scrollbar-thin" aria-label="Conversations">
        {groups.map(([label, items]) =>
          items.length === 0 ? null : (
            <section key={label}>
              <h3 className="hud-label px-2 pb-1.5">{label}</h3>
              <ul className="space-y-0.5">
                {items.map((conv) => {
                  const active = conv.id === activeChatId;
                  const editing = editingId === conv.id;
                  return (
                    <li key={conv.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectChat(conv.id)}
                        onKeyDown={(e) => e.key === 'Enter' && onSelectChat(conv.id)}
                        className={cn(
                          'group relative flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors',
                          active
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
                        )}
                      >
                        {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" />}
                        {generatingChatId === conv.id && (
                          <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-primary" />
                        )}
                        {editing ? (
                          <input
                            autoFocus
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveRename(conv.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            onBlur={() => saveRename(conv.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full rounded border border-primary/50 bg-background px-1.5 py-0.5 text-sm text-foreground focus:outline-none"
                          />
                        ) : (
                          <span className="min-w-0 flex-1 truncate">{conv.title}</span>
                        )}
                        {!editing && (
                          <span className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                            <IconAction
                              label={conv.pinned ? 'Unpin' : 'Pin'}
                              onClick={(e) => {
                                e.stopPropagation();
                                onTogglePinChat(conv.id);
                              }}
                            >
                              <Pin className={cn('size-3.5', conv.pinned && 'fill-signal text-signal')} />
                            </IconAction>
                            <IconAction
                              label="Rename"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(conv.id);
                                setEditingTitle(conv.title);
                              }}
                            >
                              <PencilLine className="size-3.5" />
                            </IconAction>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => e.stopPropagation()}
                                  title="Download chat"
                                  aria-label="Download chat"
                                  className="grid size-6 place-items-center rounded text-subtle transition-colors hover:bg-accent hover:text-foreground"
                                >
                                  <Download className="size-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                onClick={(e) => e.stopPropagation()}
                                className="rounded-lg border-border-strong bg-popover"
                              >
                                <DropdownMenuItem className="cursor-pointer text-xs" onSelect={() => exportChat(conv, 'md')}>
                                  Download as text (.md)
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer text-xs" onSelect={() => exportChat(conv, 'json')}>
                                  Download as data (.json)
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <IconAction
                              label="Delete"
                              tone="danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Delete this conversation?')) onDeleteChat(conv.id);
                              }}
                            >
                              <Trash2 className="size-3.5" />
                            </IconAction>
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ),
        )}
        {filtered.length === 0 && <p className="px-2 text-sm text-subtle">No chats match “{query}”.</p>}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <button
          type="button"
          onClick={() => onOpenControlCenter('profile')}
          className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent"
        >
          <img
            src={userProfile.avatar}
            alt=""
            className="size-8 rounded-full border border-primary/40 object-cover"
          />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-medium text-foreground">{userProfile.name}</span>
            <span className="block truncate text-xs text-subtle">{userProfile.email}</span>
          </span>
          <span
            role="button"
            tabIndex={0}
            aria-label="Control Center"
            title="Control Center"
            onClick={(e) => {
              e.stopPropagation();
              onOpenControlCenter('apikeys');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                onOpenControlCenter('apikeys');
              }
            }}
            className="grid size-8 place-items-center rounded-md text-subtle hover:bg-accent hover:text-foreground"
          >
            <SlidersHorizontal className="size-4" />
          </span>
        </button>
      </div>
    </div>
  );
}

function IconAction({
  label,
  onClick,
  children,
  tone,
}: {
  label: string;
  onClick: (e: MouseEvent) => void;
  children: React.ReactNode;
  tone?: 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'grid size-6 place-items-center rounded text-subtle transition-colors hover:bg-accent',
        tone === 'danger' ? 'hover:text-destructive' : 'hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
