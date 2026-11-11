# Jarvis AI Assistant

Personal AI assistant that runs in the browser with your own provider keys
(Gemini, OpenAI, Anthropic, DeepSeek, Groq, OpenRouter, or any OpenAI-compatible
endpoint such as freellmapi or OmniRoute). Replies stream live, every file in a
chat can be downloaded, and a built-in terminal connects to Termux or your PC via ttyd.

## Folder layout

```text
public/                 static files (icon, example plugin)
src/
  app/                  JarvisApp.tsx – the main app shell and chat logic
  components/
    jarvis/             Jarvis screens: sidebar, header, chat, dock, control center, terminal
    ui/                 shared buttons, sheets, tabs, inputs
  services/             AI streaming, markdown, downloads, terminal, storage, speech, plugins (+ tests)
  hooks/                reusable React hooks
  types/                shared TypeScript types
  lib/                  small utilities
  routes/               pages (index.tsx loads the app)
  styles.css            theme colors, fonts and effects
```

## Run locally

```bash
bun install
bun run dev
```

## Terminal (Termux / PC)

```bash
pkg install -y ttyd nodejs git && ttyd -W bash   # Termux
ttyd -W bash                                     # PC
```

Then open Control Center → Term → Connect.
