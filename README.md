# PatchBoards

> Real-time software patch tracker powered by Homebrew, winget, and AI-driven CVE detection.

---

## How it works

```
Your machine                           Browser
─────────────────────────────────────────────────────
brew list --versions   ┐
brew outdated --json   ├──► server.py ──► dashboard
winget list            ┘   (localhost:4242)
```

1. `start.sh` launches a tiny local Python server that queries Homebrew (and winget on Windows) directly
2. The dashboard fetches your real installed packages from that server
3. Optionally, the AI CVE scanner (Anthropic API + web search) checks each outdated package for known security vulnerabilities

---

## Requirements

- macOS with [Homebrew](https://brew.sh) installed
- Python 3 (comes with macOS)
- An [Anthropic API key](https://console.anthropic.com/) *(only needed for CVE scanning)*

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/emilyyadamss/Patchboards.git
cd Patchboards
```

### 2. Add your API key *(optional — only for CVE scanning)*

```bash
cp js/config.example.js js/config.js
# Edit js/config.js and paste your key
```

### 3. Start the app

```bash
chmod +x start.sh
./start.sh
```

This starts the local server and opens the dashboard in your browser automatically.

---

## Manual start (if start.sh doesn't work)

```bash
# Terminal 1 — start the server
python3 server/server.py

# Terminal 2 — open the dashboard
open index.html
```

---

## Project structure

```
Patchboards/
├── index.html              # Dashboard UI
├── start.sh                # One-command launcher
├── server/
│   └── server.py           # Local server (queries brew + winget)
├── css/
│   └── style.css
├── js/
│   ├── config.js           # ← Your API key goes here (gitignored)
│   ├── config.example.js   # Safe-to-commit placeholder
│   ├── store.js            # Package state + localStorage
│   ├── scanner.js          # AI CVE checker (Anthropic API)
│   ├── ui.js               # Rendering
│   └── app.js              # Main controller
└── README.md
```

---

## Features

| Feature | How |
|---|---|
| Real installed packages | `brew list --versions` + `brew list --cask --versions` |
| Outdated detection | `brew outdated --json=v2` |
| Security flagging | `brew audit` + AI CVE scan |
| CVE details | Anthropic API with web search |
| Update commands | Shown inline on each package row |
| Offline fallback | Last scan cached in `localStorage` |

---

## API key safety

`js/config.js` is in `.gitignore` — your key will never be committed. Only `js/config.example.js` (with a placeholder) is tracked by git.

---

## Roadmap

- [ ] Scheduled background scans
- [ ] Desktop notifications for new CVEs
- [ ] Export patch report (PDF/CSV)
- [ ] `apt` support on Linux
- [ ] Auto-detect and suggest `brew upgrade` commands
