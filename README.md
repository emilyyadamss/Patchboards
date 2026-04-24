# PatchBoards

> Browser-based software release tracker powered by GitHub, winget, Homebrew, and AI-driven CVE detection.

---

## How it works

```
Catalog (catalog.js)
  └── You add apps + enter your deployed version
        │
        ▼
  Fetcher checks public APIs for latest release:
    • GitHub Releases API       (open-source apps)
    • winget.run API            (Windows packages)
    • Homebrew formulae API     (Mac packages)
        │
        ▼
  Dashboard shows what's out of date
```

1. You add apps from the built-in catalog and enter the version you currently have deployed
2. PatchBoards fetches the latest available release from public package APIs
3. The dashboard compares your deployed version against the latest and flags anything out of date
4. Optionally, the AI CVE scanner (Anthropic API) checks outdated packages for known security vulnerabilities

No local agent or server required — runs entirely in the browser.

---

## Requirements

- A modern browser
- An [Anthropic API key](https://console.anthropic.com/) *(only needed for CVE scanning)*
- A [GitHub personal access token](https://github.com/settings/tokens/new) *(optional — raises API rate limit from 60 to 5,000 req/hr)*

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
# Edit js/config.js and paste your Anthropic key (and optionally your GitHub token)
```

### 3. Open the dashboard

```bash
open index.html
```

Or serve it locally if your browser blocks file:// fetch requests:

```bash
python3 -m http.server 4242
# then open http://localhost:4242
```

---

## Project structure

```
Patchboards/
├── index.html              # Dashboard UI
├── css/
│   └── style.css
├── js/
│   ├── config.js           # ← Your API keys go here (gitignored)
│   ├── config.example.js   # Safe-to-commit placeholder
│   ├── catalog.js          # App definitions (brew/winget/github IDs)
│   ├── store.js            # Tracked apps + deployed versions (localStorage)
│   ├── fetcher.js          # Fetches latest releases from public APIs
│   ├── scanner.js          # AI CVE checker (Anthropic API)
│   ├── agent.js            # AI agent logic
│   ├── ui.js               # Rendering
│   └── app.js              # Main controller
└── README.md
```

---

## Features

| Feature | How |
|---|---|
| Release tracking | Fetches latest versions from GitHub Releases, winget.run, and Homebrew APIs |
| Outdated detection | Compares latest available release against your manually entered deployed version |
| Multi-platform | Mac (Homebrew casks + formulae) and Windows (winget) side by side |
| CVE scanning | Anthropic API checks outdated packages for known vulnerabilities |
| Offline fallback | Last fetch cached in `localStorage` |
| Channel support | Track stable vs. beta channels per app |

---

## API key safety

`js/config.js` is in `.gitignore` — your keys will never be committed. Only `js/config.example.js` (with placeholders) is tracked by git.

---

## Roadmap

- [ ] Scheduled background scans
- [ ] Desktop notifications for new CVEs
- [ ] Export patch report (PDF/CSV)
- [ ] `apt` support on Linux
