import { describe, expect, it } from 'vitest';
import { codeFileName, collectFiles, extensionForLang, extractCodeBlocks } from './download';
import type { ChatConversation } from '@/types';

describe('code block downloads', () => {
  it('names a code file by its language', () => {
    expect(extensionForLang('typescript')).toBe('ts');
    expect(extensionForLang('Python')).toBe('py');
    expect(extensionForLang('unknown-lang')).toBe('txt');
    expect(codeFileName('ts', 1, '20261111-180000')).toBe('jarvis-code-20261111-180000-1.ts');
  });

  it('pulls every fenced code block out of a reply', () => {
    const md = 'Intro\n\n```ts\nconst a = 1;\n```\n\ntext\n\n```python\nprint("hi")\n```';
    expect(extractCodeBlocks(md)).toEqual([
      { lang: 'ts', code: 'const a = 1;' },
      { lang: 'python', code: 'print("hi")' },
    ]);
  });

  it('collects images and code from all chats with unique file names', () => {
    const conv = (id: string): ChatConversation => ({
      id,
      title: 'Same title',
      createdAt: 0,
      updatedAt: 0,
      model: 'm',
      messages: [
        { id: `${id}-u`, role: 'user', content: 'pic', timestamp: '', image: 'data:image/jpeg;base64,AAAA' },
        { id: `${id}-a`, role: 'assistant', content: '```js\nx()\n```', timestamp: '' },
      ],
    });
    const { images, code } = collectFiles([conv('a'), conv('b')]);
    expect(images.map((i) => i.filename)).toEqual(['same-title-image-1.jpg', 'same-title-image-1-2.jpg']);
    expect(code.map((c) => c.filename)).toEqual(['same-title-code-2-1.js', 'same-title-code-2-1-2.js']);
  });
});
