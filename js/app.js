// PatchBoards · app.js

const App = (() => {

  // ── Render ───────────────────────────────────────────────────────────────────
  function render() {
    const q = document.getElementById('searchInput')?.value || '';
    UI.renderStats();
    UI.renderDashboard(q);
  }

  // ── Boot ─────────────────────────────────────────────────────────────────────
  async function init() {
    Store.load();
    render();
    checkGitHubRateLimit();
    await fetchReleases();
  }

  // Warn if GitHub token is missing (soft warning — doesn't block)
  async function checkGitHubRateLimit() {
    if (CONFIG.GITHUB_TOKEN) return;
    try {
      const res  = await fetch('https://api.github.com/rate_limit', { signal: AbortSignal.timeout(4000) });
      const data = await res.json();
      const remaining = data?.rate?.remaining ?? 60;
      if (remaining < 10) {
        UI.showBanner(
          `<strong>GitHub API rate limit low (${remaining} requests remaining).</strong> ` +
          `Add a <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener">GitHub personal access token</a> ` +
          `to <code>js/config.js</code> as <code>GITHUB_TOKEN</code> for 5 000 requests/hour.`
        );
      }
    } catch { /* ignore — just a soft check */ }
  }

  // ── Fetch latest releases for all tracked apps ───────────────────────────────
  async function fetchReleases() {
    const myApps = Store.getMyApps();
    if (!myApps.length) {
      UI.setScanStatus('Add apps from the catalog to start tracking releases.');
      return;
    }

    UI.setRefreshBtn(true);
    UI.setSpinner(true);
    UI.setScanStatus(`<strong>Checking releases…</strong> 0 of ${myApps.length} apps.`);
    UI.setProgress(0);

    let done = 0;
    await Fetcher.fetchAll(myApps, (id, result) => {
      Store.setRelease(id, result);
      done++;
      UI.setProgress((done / myApps.length) * 100);
      UI.setScanStatus(`<strong>Checking releases…</strong> ${done} of ${myApps.length} apps.`);
      render();
    });

    UI.setSpinner(false);
    UI.setRefreshBtn(false);
    UI.setProgress(-1);

    const s = Store.getDashboardStats();
    UI.setScanStatus(
      s.newReleases
        ? `<strong>Done.</strong> <span style="color:var(--warning-text)">${s.newReleases} new release${s.newReleases !== 1 ? 's' : ''}</span> available · ${s.upToDate} up to date.`
        : `<strong>All up to date.</strong> ${s.upToDate} app${s.upToDate !== 1 ? 's' : ''} tracked, no new releases.`
    );
    render();
  }

  // ── Catalog: add / remove / toggle ───────────────────────────────────────────
  function addApp(id) {
    Store.addApp(id);
    // Kick off an immediate version fetch for this new app
    const app = getCatalogApp(id);
    if (app) {
      Fetcher.fetchBoth(app)
        .then(result => { Store.setRelease(id, result); render(); })
        .catch(() => { Store.setRelease(id, { mac: { version: null, error: 'fetch failed' }, win: { version: null, error: 'fetch failed' } }); render(); });
    }
    render();
  }

  function removeApp(id) {
    Store.removeApp(id);
    render();
  }

  function toggleApp(id, btn) {
    if (Store.isTracked(id)) {
      Store.removeApp(id);
      btn.textContent = '+ Track';
      btn.classList.remove('tracked');
      btn.classList.add('primary');
    } else {
      addApp(id);
      btn.textContent = '✓ Tracked';
      btn.classList.remove('primary');
      btn.classList.add('tracked');
    }
    UI.renderCatalog();
    render();
  }

  function markSeen(id) {
    Store.markSeenAll(id);
    render();
  }

  return { init, render, fetchReleases, addApp, removeApp, toggleApp, markSeen };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
