/** Jarvis built-in shell: runs in the browser when no Termux/PC shell is connected. */
import { LOCAL_SERVERS, pingServer } from './terminal';

export interface ShellContext {
  history: string[];
  connect: (address?: string) => void;
  disconnect: () => void;
  signal: AbortSignal;
}

export interface ShellResult {
  output: string;
  clear?: boolean;
}

const C = { cyan: '\x1b[36m', yellow: '\x1b[33m', red: '\x1b[31m', green: '\x1b[32m', dim: '\x1b[2m', off: '\x1b[0m' };

export const LOCAL_COMMANDS = ['help', 'clear', 'echo', 'date', 'history', 'connect', 'disconnect', 'js', 'curl', 'servers', 'open'];

/** Splits a command line into words, honouring "double" and 'single' quotes. */
export function splitArgs(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quote: string | null = null;
  let has = false;
  for (const ch of line) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      has = true;
    } else if (/\s/.test(ch)) {
      if (cur || has) out.push(cur);
      cur = '';
      has = false;
    } else {
      cur += ch;
      has = true;
    }
  }
  if (cur || has) out.push(cur);
  return out;
}

function show(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v === undefined) return 'undefined';
  if (typeof v === 'function') return String(v);
  try {
    return JSON.stringify(v, null, 2) ?? String(v);
  } catch {
    return String(v);
  }
}

const HELP = `${C.cyan}Jarvis built-in shell${C.off} ${C.dim}(runs inside the app)${C.off}
  help                 show this list
  clear                clear the screen
  echo <text>          print text
  date                 current date and time
  history              commands you ran
  js <code>            run JavaScript, e.g. js 2**10
  curl <url>           fetch a web address
  servers              check if FreeLLMAPI / OmniRoute are running
  open <url>           open a link
  connect [address]    connect to Termux / PC (ttyd), default localhost:7681
  disconnect           go back to this built-in shell
${C.dim}For real Linux commands (npm, git, python…) run "ttyd -W bash" in Termux, then type connect.${C.off}`;

export async function runLocal(line: string, ctx: ShellContext): Promise<ShellResult> {
  const trimmed = line.trim();
  if (!trimmed) return { output: '' };
  const [cmd = '', ...args] = splitArgs(trimmed);
  const rawArgs = trimmed.slice(trimmed.indexOf(cmd) + cmd.length).trim();

  switch (cmd) {
    case 'help':
    case '?':
      return { output: HELP };
    case 'clear':
    case 'cls':
      return { output: '', clear: true };
    case 'echo':
      return { output: args.join(' ') };
    case 'date':
      return { output: new Date().toString() };
    case 'history':
      return { output: ctx.history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join('\n') };
    case 'connect':
      ctx.connect(args[0]);
      return { output: `${C.dim}connecting…${C.off}` };
    case 'disconnect':
      ctx.disconnect();
      return { output: 'Not connected — already in the built-in shell.' };
    case 'js': {
      if (!rawArgs) return { output: 'usage: js <code>' };
      try {
        let fn: () => unknown;
        try {
          fn = new Function(`return (${rawArgs});`) as () => unknown;
        } catch {
          fn = new Function(rawArgs) as () => unknown;
        }
        return { output: show(await fn()) };
      } catch (e) {
        return { output: `${C.red}${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}${C.off}` };
      }
    }
    case 'curl':
    case 'fetch': {
      const target = args.find((a) => !a.startsWith('-'));
      if (!target) return { output: 'usage: curl <url>' };
      const url = /^[a-z]+:\/\//i.test(target) ? target : `https://${target}`;
      try {
        const res = await fetch(url, { signal: ctx.signal });
        const text = await res.text();
        const body = text.length > 8000 ? `${text.slice(0, 8000)}\n${C.dim}… (${text.length - 8000} more characters)${C.off}` : text;
        return { output: `${C.dim}HTTP ${res.status} ${res.statusText}${C.off}\n${body}` };
      } catch (e) {
        if (ctx.signal.aborted) return { output: '' };
        return {
          output: `${C.red}Could not fetch ${url}.${C.off} The site may be down or may not allow requests from apps (CORS).${e instanceof Error && e.message ? ` (${e.message})` : ''}`,
        };
      }
    }
    case 'servers': {
      const rows = await Promise.all(
        LOCAL_SERVERS.map(async (s) =>
          (await pingServer(s.port))
            ? `  ${s.label.padEnd(11)} :${s.port}  ${C.green}running${C.off}`
            : `  ${s.label.padEnd(11)} :${s.port}  ${C.yellow}not running${C.off}`,
        ),
      );
      if (ctx.signal.aborted) return { output: '' };
      return { output: rows.join('\n') };
    }
    case 'open': {
      if (!args[0]) return { output: 'usage: open <url>' };
      const url = /^[a-z]+:\/\//i.test(args[0]) ? args[0] : `https://${args[0]}`;
      window.open(url, '_blank', 'noopener');
      return { output: `opened ${url}` };
    }
    default:
      return {
        output: `${C.yellow}${cmd}: not available in the built-in shell.${C.off} Type ${C.cyan}help${C.off} for commands, or ${C.cyan}connect${C.off} to use Termux / your PC.`,
      };
  }
}
