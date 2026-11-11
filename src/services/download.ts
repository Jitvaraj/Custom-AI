import type { ChatConversation, Message } from '@/types';

/** File extension for a code block's language tag. */
const EXTENSIONS: Record<string, string> = {
  javascript: 'js', js: 'js', jsx: 'jsx', typescript: 'ts', ts: 'ts', tsx: 'tsx',
  python: 'py', py: 'py', java: 'java', kotlin: 'kt', kt: 'kt', swift: 'swift',
  c: 'c', cpp: 'cpp', 'c++': 'cpp', csharp: 'cs', cs: 'cs', go: 'go', rust: 'rs', rs: 'rs',
  ruby: 'rb', rb: 'rb', php: 'php', html: 'html', xml: 'xml', css: 'css', scss: 'scss',
  json: 'json', yaml: 'yml', yml: 'yml', toml: 'toml', sql: 'sql', bash: 'sh', sh: 'sh',
  shell: 'sh', zsh: 'sh', powershell: 'ps1', dockerfile: 'Dockerfile', markdown: 'md', md: 'md',
  dart: 'dart', lua: 'lua', r: 'r', vue: 'vue', svelte: 'svelte', graphql: 'graphql',
};

const MIME: Record<string, string> = {
  json: 'application/json', html: 'text/html', css: 'text/css', md: 'text/markdown',
  js: 'text/javascript', svg: 'image/svg+xml',
};

export function extensionForLang(lang?: string | null): string {
  if (!lang) return 'txt';
  return EXTENSIONS[lang.trim().toLowerCase()] ?? 'txt';
}

export function codeFileName(lang: string | null | undefined, index: number, stamp = fileStamp()): string {
  const ext = extensionForLang(lang);
  return ext === 'Dockerfile' ? `Dockerfile-${index}` : `jarvis-code-${stamp}-${index}.${ext}`;
}

export function fileStamp(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}

export function textBlob(text: string, filename: string): Blob {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return new Blob([text], { type: `${MIME[ext] ?? 'text/plain'};charset=utf-8` });
}

/** Converts a base64 data URL (e.g. an attached image) to a Blob without waiting. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header = '', data = ''] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(header)?.[1] ?? 'application/octet-stream';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function imageExtension(dataUrl: string): string {
  const mime = /data:image\/([\w+.-]+)/.exec(dataUrl)?.[1] ?? 'png';
  return mime === 'jpeg' ? 'jpg' : mime === 'svg+xml' ? 'svg' : mime;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Saves a file to the device. Android and desktop browsers download it straight to the
 * Downloads folder; iPhone/iPad, which can't save blobs directly, get the share sheet ("Save to Files").
 * Call it directly from a click handler.
 */
export function saveFile(blob: Blob, filename: string) {
  if (isIOS()) {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      navigator.share({ files: [file], title: filename }).catch((e: DOMException) => {
        if (e.name !== 'AbortError') downloadBlob(blob, filename);
      });
      return;
    }
  }
  downloadBlob(blob, filename);
}

export interface CodeBlock {
  lang: string;
  code: string;
}

/** Pulls fenced code blocks out of a markdown reply. */
export function extractCodeBlocks(markdown: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const re = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)[^\n]*\n([\s\S]*?)^ {0,3}\1[ \t]*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown))) blocks.push({ lang: m[2] ?? '', code: (m[3] ?? '').replace(/\n$/, '') });
  return blocks;
}

export function chatToMarkdown(conv: ChatConversation): string {
  const lines = [`# ${conv.title}`, '', `_Exported from Jarvis on ${new Date().toLocaleString()}_`, ''];
  for (const m of conv.messages) {
    lines.push(`## ${m.role === 'user' ? 'You' : 'Jarvis'} · ${m.timestamp}`, '');
    if (m.image) lines.push('_[image attached]_', '');
    lines.push(m.content, '');
  }
  return lines.join('\n');
}

export function safeName(title: string): string {
  return (title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'chat').toLowerCase();
}

export interface CollectedFiles {
  images: Array<{ id: string; dataUrl: string; chat: string; filename: string }>;
  code: Array<{ id: string; lang: string; code: string; chat: string; filename: string }>;
}

/** Every image and code block across all chats, with ready-to-use file names. */
export function collectFiles(conversations: ChatConversation[]): CollectedFiles {
  const images: CollectedFiles['images'] = [];
  const code: CollectedFiles['code'] = [];
  const used = new Set<string>();
  const unique = (name: string) => {
    let candidate = name;
    let n = 2;
    while (used.has(candidate)) {
      const dot = name.lastIndexOf('.');
      candidate = dot > 0 ? `${name.slice(0, dot)}-${n}${name.slice(dot)}` : `${name}-${n}`;
      n++;
    }
    used.add(candidate);
    return candidate;
  };
  for (const conv of conversations) {
    const base = safeName(conv.title);
    conv.messages.forEach((m: Message, mi) => {
      if (m.image) {
        images.push({ id: `${m.id}-img`, dataUrl: m.image, chat: conv.title, filename: unique(`${base}-image-${mi + 1}.${imageExtension(m.image)}`) });
      }
      if (m.role === 'assistant' && !m.isStreaming) {
        extractCodeBlocks(m.content).forEach((b, bi) => {
          const ext = extensionForLang(b.lang);
          const filename = ext === 'Dockerfile' ? unique(`${base}-Dockerfile`) : unique(`${base}-code-${mi + 1}-${bi + 1}.${ext}`);
          code.push({ id: `${m.id}-code-${bi}`, lang: b.lang || 'text', code: b.code, chat: conv.title, filename });
        });
      }
    });
  }
  return { images, code };
}

/** Bundles everything into a single zip. */
export async function buildFilesZip(conversations: ChatConversation[]): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const { images, code } = collectFiles(conversations);
  for (const img of images) zip.file(`images/${img.filename}`, dataUrlToBlob(img.dataUrl));
  for (const c of code) zip.file(`code/${c.filename}`, c.code);
  const usedChatNames = new Set<string>();
  for (const conv of conversations) {
    if (conv.messages.length === 0) continue;
    let name = safeName(conv.title);
    for (let n = 2; usedChatNames.has(name); n++) name = `${safeName(conv.title)}-${n}`;
    usedChatNames.add(name);
    zip.file(`chats/${name}.md`, chatToMarkdown(conv));
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}
