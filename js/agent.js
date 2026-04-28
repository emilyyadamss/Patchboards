// PatchBoards · agent.js
// AI agent: scans apps saved to the dashboard (from Store) and uses Claude + web
// search to surface security advisories and summarize what changed in each release.

// ── Core scanner ──────────────────────────────────────────────────────────────

const Agent = (() => {
  let _scanning = false;

  function buildBatchPrompt(items) {
    const list = items.map((item, i) => {
      const { app, entry, release } = item;
      const cv        = entry.currentVersion;
      const latestMac = release?.mac?.version;
      const latestWin = release?.win?.version;
      const latest    = latestMac || latestWin || null;

      // Qualify the name when a non-default channel is active (e.g. Firefox ESR)
      const channelLabel = entry.channel && app.channels
        ? app.channels.find(c => c.id === entry.channel)?.label
        : null;
      const isNonDefault = channelLabel && app.channels && entry.channel !== app.channels[0].id;
      const displayName  = isNonDefault ? `${app.name} ${channelLabel}` : app.name;

      let line = `${i + 1}. "${displayName}"`;
      if (cv)     line += ` — deployed: ${cv}`;
      if (latest) line += `, latest available: ${latest}`;
      if (isNonDefault) line += ` [${channelLabel} — separate versioning track from standard release]`;
      return line;
    }).join('\n');

    return `You are a software update security advisor.

For each app below:
- IMPORTANT: if "latest available" is provided, copy it exactly into "latestVersion". Do not substitute your own version number
- If "latest available" is NOT provided, use your knowledge to fill in the latest stable version
- Determine whether there is a known CVE or security advisory between the deployed version and the latest
- Write a one-sentence summary of the most notable change in the latest release
- Provide the official release notes or changelog URL (use the real, well-known URL for each project)

Apps to analyze:
${list}

Return ONLY a JSON array — no markdown fences, no preamble:
[
  {
    "latestVersion": "x.y.z",
    "isSecurity": false,
    "summary": "One sentence describing what changed.",
    "releaseUrl": "https://..."
  }
]

One object per input app, in the same order. Set releaseUrl to null if genuinely unknown.`;
  }

  async function callClaude(prompt) {
    const apiKey = CONFIG.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') throw new Error('NO_API_KEY');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: CONFIG.MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Anthropic API ${res.status}`);
    }

    const data  = await res.json();
    const text  = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const clean = text.replace(/```json\n?|```/g, '').trim();
    const match = clean.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('AI response was not a JSON array');
    return JSON.parse(match[0]);
  }

  async function scan(onProgress, onComplete, onError) {
    if (_scanning) return;
    _scanning = true;

    try {
      const myApps = Store.getMyApps();
      if (!myApps.length) {
        onComplete({ enriched: [], empty: true });
        _scanning = false;
        return;
      }

      const items = myApps
        .map(entry => ({
          entry,
          app:     getCatalogApp(entry.id),
          release: Store.getRelease(entry.id),
        }))
        .filter(item => item.app);

      onProgress({ pct: 10, message: `Analyzing ${items.length} dashboard app${items.length !== 1 ? 's' : ''} with AI…` });

      const batch = items.slice(0, 20);
      let aiResults = null;
      let noApiKey  = false;
      let aiError   = null;

      try {
        aiResults = await callClaude(buildBatchPrompt(batch));
      } catch (e) {
        if (e.message === 'NO_API_KEY') noApiKey = true;
        else aiError = e.message;
      }

      const enriched = batch.map((item, i) => ({
        ...item,
        ai: aiResults ? (aiResults[i] || null) : null,
      }));

      onComplete({ enriched, empty: false, noApiKey, aiError });
    } catch (e) {
      onError(e.message || String(e));
    } finally {
      _scanning = false;
    }
  }

  return { scan };
})();

// ── Panel UI ──────────────────────────────────────────────────────────────────

const AgentUI = (() => {

  function openPanel() {
    document.getElementById('agentOverlay').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    renderIdle();
  }

  function closePanel() {
    document.getElementById('agentOverlay').style.display = 'none';
    document.body.style.overflow = '';
  }

  function closePanelOnBg(e) {
    if (e.target === document.getElementById('agentOverlay')) closePanel();
  }

  function set(html) {
    document.getElementById('agentContent').innerHTML = html;
  }

  function renderIdle() {
    const count = Store.getMyApps().length;
    const desc  = count
      ? `${count} app${count !== 1 ? 's' : ''} on your dashboard`
      : 'No apps on your dashboard yet. Add some via Browse Software first.';

    set(`
      <div class="agent-idle">
        
        <div class="agent-idle-title">AI Agent Scan</div>
        <p class="agent-idle-desc">
          Uses Claude to look up the latest release for each app on your dashboard,
          flag security advisories, and summarize what changed. There are no local install required.
        </p>
        <div class="agent-idle-count">${desc}</div>
        <button class="btn primary agent-scan-btn" onclick="AgentUI.startScan()" ${!count ? 'disabled' : ''}>Scan Dashboard</button>
        <p class="agent-idle-note">Requires <code>ANTHROPIC_API_KEY</code> in <code>js/config.js</code></p>
        <p class="agent-idle-note">AI analysis may be inaccurate or incomplete. Always verify with official sources before making decisions. Thank you!</p>
      </div>
    `);
  }

  function renderProgress({ message, pct }) {
    set(`
      <div class="agent-scanning">
        <div class="spinner agent-spinner"></div>
        <div class="agent-scanning-msg">${message}</div>
        <div class="agent-prog-wrap">
          <div class="agent-prog-bar" style="width:${Math.round(pct)}%"></div>
        </div>
      </div>
    `);
  }

  function renderError(msg) {
    set(`
      <div class="agent-error">
        <div class="agent-error-icon"></div>
        <pre class="agent-error-msg">${msg}</pre>
        <button class="btn" onclick="AgentUI.renderIdle()" style="margin-top:1rem">← Back</button>
      </div>
    `);
  }

  function renderResults({ enriched, empty, noApiKey, aiError }) {
    if (empty) {
      set(`
        <div class="agent-all-good">
          <div class="agent-all-good-icon"></div>
          <div class="agent-all-good-title">No apps on your dashboard</div>
          <p class="agent-all-good-desc">Add apps via Browse Software, then run the agent scan.</p>
          <button class="btn" onclick="AgentUI.renderIdle()" style="margin-top:1rem">← Back</button>
        </div>
      `);
      return;
    }

    const apiBanner = noApiKey
      ? `<div class="agent-warn-banner">No Anthropic API key. Add <code>ANTHROPIC_API_KEY</code> to <code>js/config.js</code> to enable AI analysis.</div>`
      : aiError
      ? `<div class="agent-warn-banner">AI scan failed: ${aiError}</div>`
      : '';

    const secCount = enriched.filter(r => r.ai?.isSecurity).length;

    // Sort: security first, then apps with AI results, then the rest
    const sorted = [...enriched].sort((a, b) => {
      const as = a.ai?.isSecurity ? 0 : a.ai ? 1 : 2;
      const bs = b.ai?.isSecurity ? 0 : b.ai ? 1 : 2;
      return as - bs;
    });

    const rows = sorted.map(({ app, entry, release, ai }) => {
      const cv     = entry.currentVersion;
      const isSec  = !!ai?.isSecurity;
      // Prefer the fetcher's live data; fall back to Claude's answer only if unavailable
      const fetchedLatest = release?.mac?.version || release?.win?.version || null;
      const latest = fetchedLatest || ai?.latestVersion || null;

      const badge = isSec
        ? `<span class="badge b-sec">security</span>`
        : ai ? `<span class="badge b-scan">AI</span>` : '';

      let versionsHtml = '';
      if (cv && latest && latest !== cv) {
        versionsHtml = `
          <div class="agent-pkg-versions">
            <span class="vpill v-cur">${cv}</span>
            <span class="v-arr">→</span>
            <span class="vpill ${isSec ? 'v-sec' : 'v-upd'}">${latest}</span>
          </div>`;
      } else if (cv && latest && latest === cv) {
        versionsHtml = `
          <div class="agent-pkg-versions">
            <span class="vpill v-ok">${cv}</span>
            <span style="font-size:11px;color:var(--success-text);margin-left:4px">✓ up to date</span>
          </div>`;
      } else if (latest) {
        versionsHtml = `
          <div class="agent-pkg-versions">
            <span style="font-size:11px;color:var(--text-3)">latest:</span>
            <span class="vpill v-cur">${latest}</span>
          </div>`;
      }

      const summary = ai?.summary || '';
      const url     = ai?.releaseUrl || '';
      const link    = url ? `<a href="${url}" target="_blank" rel="noopener" class="plat-link">release notes ↗</a>` : '';

      return `
        <div class="agent-pkg-row ${isSec ? 'is-sec' : ''}">
          <div class="agent-pkg-body">
            <div class="agent-pkg-name-row">
              <span class="agent-pkg-name">${app.name}</span>
              ${badge}
            </div>
            ${versionsHtml}
            ${summary ? `<p class="agent-pkg-summary">${summary}</p>` : ''}
            ${link    ? `<div class="agent-pkg-meta">${link}</div>` : ''}
          </div>
        </div>`;
    }).join('');

    set(`
      <div class="agent-results">
        <div class="agent-summary-bar">
          <span class="agent-summ-total">${enriched.length} app${enriched.length !== 1 ? 's' : ''} scanned</span>
          ${secCount ? `<span class="agent-summ-sec">${secCount} security${secCount !== 1 ? ' issues' : ' issue'}</span>` : ''}
          <button class="btn btn-sm" onclick="AgentUI.renderIdle()" style="margin-left:auto">↺ Rescan</button>
        </div>
        ${apiBanner}
        <div class="agent-pkg-list">${rows}</div>
      </div>
    `);
  }

  function startScan() {
    Agent.scan(
      progress => renderProgress(progress),
      result   => renderResults(result),
      err      => renderError(err),
    );
  }

  return { openPanel, closePanel, closePanelOnBg, renderIdle, startScan };
})();
