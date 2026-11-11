import { cn } from '@/lib/utils';

/** Jarvis identity: a small arc-reactor orb. `active` makes it pulse while replying. */
export function ArcMark({ className, active = false }: { className?: string; active?: boolean }) {
  return <span aria-hidden className={cn('arc-orb shrink-0', className)} data-active={active} />;
}
