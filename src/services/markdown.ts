import { Marked } from 'marked';
import hljs from 'highlight.js';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const marked = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    code({ text, lang }) {
      const validLang = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
      let highlighted: string;
      try {
        highlighted = hljs.highlight(text, { language: validLang }).value;
      } catch {
        highlighted = escapeHtml(text);
      }
      // The copy button is handled by a click listener on the message (see ChatContainer).
      return `<div class="md-code"><div class="md-code-head"><span class="md-code-lang">${escapeHtml(
        validLang,
      )}</span><span class="md-actions"><button type="button" class="md-copy" data-action="copy" data-code="${encodeURIComponent(
        text,
      )}">Copy</button><button type="button" class="md-copy" data-action="download" data-lang="${escapeHtml(
        lang ?? '',
      )}" data-code="${encodeURIComponent(text)}">Download</button></span></div><pre><code class="hljs language-${escapeHtml(validLang)}">${highlighted}</code></pre></div>`;
    },
    codespan({ text }) {
      return `<code class="md-inline">${escapeHtml(text)}</code>`;
    },
  },
});

export function renderMarkdown(content: string): string {
  if (!content) return '';
  return marked.parse(content, { async: false }) as string;
}
