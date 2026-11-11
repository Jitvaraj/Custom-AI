import { marked } from 'marked';
import hljs from 'highlight.js';

const renderer = new marked.Renderer();

renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const validLang = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
  let highlighted = text;
  try {
    highlighted = hljs.highlight(text, { language: validLang }).value;
  } catch (e) {
    highlighted = text;
  }

  const encodedCode = encodeURIComponent(text);

  return `
    <div class="code-card my-3.5 rounded-xl bg-[#0c101b] border border-[#1c2438] overflow-hidden">
      <div class="code-header flex items-center justify-between px-3.5 py-2 bg-[#111726] border-b border-[#1c2438]">
        <span class="code-lang font-mono text-xs text-[#9aa5b8] font-medium tracking-wide uppercase">${validLang}</span>
        <button 
          type="button"
          class="copy-btn flex items-center gap-1.5 text-xs text-[#9aa5b8] hover:text-[#e6ecf5] hover:bg-white/5 px-2 py-1 rounded transition-colors cursor-pointer"
          data-code="${encodedCode}"
          onclick="window.copyCodeBlock(this)"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span class="btn-text">Copy</span>
        </button>
      </div>
      <pre class="code-body p-3.5 overflow-x-auto font-mono text-[12.5px] leading-[1.62] text-[#dce4f2]"><code>${highlighted}</code></pre>
    </div>
  `;
};

renderer.codespan = ({ text }: { text: string }) => {
  return `<code class="inline-code font-mono text-[12.5px] bg-[#141b2d] border border-[#222d47] color-[#cbd5e1] px-1.5 py-0.5 rounded-md">${text}</code>`;
};

marked.use({ renderer, gfm: true, breaks: true });

export function renderMarkdown(content: string): string {
  if (!content) return '';
  return marked.parse(content) as string;
}

if (typeof window !== 'undefined') {
  (window as any).copyCodeBlock = function (btn: HTMLElement) {
    const code = decodeURIComponent(btn.getAttribute('data-code') || '');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        const textSpan = btn.querySelector('.btn-text');
        if (textSpan) {
          const original = textSpan.textContent;
          textSpan.textContent = 'Copied!';
          setTimeout(() => {
            textSpan.textContent = original;
          }, 1800);
        }
      });
    }
  };
}
