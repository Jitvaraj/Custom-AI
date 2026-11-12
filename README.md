
<div align="center">

# ⚡ Jarvis AI Assistant

**A sleek, browser-based personal AI assistant powered by your own API keys—complete with live streaming, instant file exports, and a built-in Termux/PC terminal.**

![React](https://shields.io)
![TypeScript](https://shields.io)
![Bun](https://shields.io)

</div>

---

## ✨ Key Features

- **🔑 Bring Your Own Key (BYOK):** Plug in API keys from **Gemini, OpenAI, Anthropic, DeepSeek, Groq, OpenRouter**, or any OpenAI-compatible endpoint (such as `freellmapi` or `OmniRoute`).
- **⚡ Real-Time Streaming:** Watch responses generate token-by-token with full markdown support.
- **📥 One-Click File Downloads:** Every generated code block or file inside a chat can be downloaded directly to your device.
- **🖥️ Integrated Terminal:** Bridge your browser directly to **Termux** or your **PC** via `ttyd`.

---

## 🗂️ Project Architecture

```text
├── public/                 # Static assets (app icon, example plugin)
└── src/
    ├── app/                # JarvisApp.tsx — Main application shell & chat core
    ├── components/
    │   ├── jarvis/         # Core UI: sidebar, header, chat window, dock
    │   └── ui/             # Reusable primitives: buttons, sheets, tabs, inputs
    ├── services/           # AI streaming, markdown parser, downloads, terminal
    ├── hooks/              # Custom React hooks
    ├── types/              # Shared TypeScript definitions
    ├── lib/                # Helper utilities
    ├── routes/             # App routing (index.tsx entry point)
    └── styles.css          # Theme palette, typography, and visual effects
```

---

## 🚀 Quick Start

### 1. Run Locally

Clone the repository, install dependencies with Bun, and spin up the dev server:

```bash
bun install
bun run dev
```

### 2. Connect Your Terminal (Termux / PC)

Start a writable `ttyd` session on your host device:

```bash
# On Android (Termux)
pkg install -y ttyd nodejs git && ttyd -W bash

# On Linux / macOS / PC
ttyd -W bash
```

Once running, open **Control Center → Term → Connect** inside Jarvis to link your shell.

### 3. Local AI Hub (FreeLLMAPI / OmniRoute)

Open **Control Center → Term**. Each server card shows whether it is running, and has:

- **Start** (when the terminal is connected) or **Copy start script**: a Termux one-liner that installs what's missing, runs `termux-wake-lock` and starts the server in the background (log in `~/freellmapi.log` / `~/omniroute.log`).
- **Dashboard**: opens the server's web page (FreeLLMAPI `:5173`, OmniRoute `:20128`) where you add provider keys and copy your API key.
- **Models** + **Use in Jarvis**: paste the key, pick a model, and Jarvis replies through that server.
