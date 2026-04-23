// PatchBoards · app.js

const App = (() => {
  let currentView = 'dashboard';   // 'dashboard' | 'installed'
  let installedTab = 'all';
  let isScanning = false;

  // ── Render ───────────────────────────────────────────────────────────────────
  function render() {
    const q = currentView === 'dashboard'
      ? (document.getElementById('searchInput')?.value || '')
      : (document.getElementById('pkgSearchInput')?.value || '');

    UI.renderStats(currentView);

    if (currentView === 'dashboard') {
      UI.renderDashboard(q);
    } else {
      UI.renderInstalledList(installedTab, isScanning, q);
    }
  }

  // ── View switching ───────────────────────────────────────────────────────────
  function setView(view, btn) {
    currentView = view;
    document.getElementById('dashboardView').style.display  = view === 'dashboard' ? '' : 'none';
    document.getElementById('installedView').style.display  = view === 'installed' ? '' : 'none';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  }

  function setInstalledTab(tab, btn) {
    installedTab = tab;
    document.querySelectorAll('#installedView .tab-nav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  }

  // ── Boot ─────────────────────────────────────────────────────────────────────
  async function init() {
    Store.load();
    render();

    // Fetch both dashboard releases and installed packages in parallel
    await Promise.all([
      fetchReleases(),
      fetchPackages(),
    ]);
  }

  // ── Dashboard: fetch latest versions from APIs ────────────────────────────────
  async function fetchReleases() {
    const myApps = Store.getMyApps();
    if (!myApps.length) {
      UI.setScanStatus('Add apps from the catalog to start tracking releases.');
      return;
    }

    UI.setRefreshBtn(true);
    UI.setSpinner(true);
    UI.setScanStatus(`<strong>Checking latest releases…</strong> 0 of ${myApps.length} apps checked.`);

    let done = 0;
    await Fetcher.fetchAll(myApps, (id, result) => {
      Store.setRelease(id, result);
      // Auto-set seenVersion on the very first fetch so we have a baseline
      const entry = Store.getMyApps().find(a => a.id === id);
      if (entry && !entry.seenVersion && result.version) {
        Store.markSeen(id, result.version);
      }
      done++;
      UI.setScanStatus(`<strong>Checking latest releases…</strong> ${done} of ${myApps.length} apps checked.`);
      render();
    });

    UI.setSpinner(false);
    UI.setRefreshBtn(false);

    const s = Store.getDashboardStats();
    UI.setScanStatus(
      s.newReleases
        ? `<strong>Done.</strong> <span style="color:var(--warning-text)">${s.newReleases} new release${s.newReleases !== 1 ? 's' : ''}</span> available · ${s.upToDate} up to date.`
        : `<strong>All up to date.</strong> ${s.upToDate} app${s.upToDate !== 1 ? 's' : ''} tracking, no new releases.`
    );
    render();
  }

  // ── Dashboard: add / remove / mark seen ─────────────────────────────────────
  function addApp(id) {
    Store.addApp(id);
    // Fetch version immediately for the new app
    const app = getCatalogApp(id);
    if (app) {
      Fetcher.fetchAppVersion(app)
        .then(result => {
          Store.setRelease(id, result);
          // Set baseline so first-time tracking starts clean
          const entry = Store.getMyApps().find(a => a.id === id);
          if (entry && !entry.seenVersion && result.version) {
            Store.markSeen(id, result.version);
          }
          render();
        })
        .catch(err => {
          Store.setRelease(id, { version: null, error: err.message });
          render();
        });
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
    // Re-render the catalog card
    UI.renderCatalog();
    render();
  }

  function markSeen(id) {
    const release = Store.getRelease(id);
    if (release?.version) {
      Store.markSeen(id, release.version);
      render();
    }
  }

  // ── Installed packages: fetch from local server ──────────────────────────────
  async function fetchPackages() {
    try {
      const res = await fetch(`${CONFIG.SERVER_URL}/packages`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      Store.setAll(data.packages);
      UI.showBanner(null);
    } catch (err) {
      console.warn('Server fetch failed:', err);
      UI.showBanner(
        `<strong>Local server not running.</strong> ` +
        `Open your terminal in the project folder and run: <code>./start.sh</code> — then click ↺ Refresh. ` +
        `Dashboard release tracking works without the server.`
      );
      if (Store.getAll().length === 0) Store.setAll([]);
    }
    render();
  }

  // ── CVE scanning (installed packages view) ──────────────────────────────────
  function markUpdated(id) {
    const p = Store.getById(id);
    if (!p) return;
    Store.update(id, { version: p.latest || p.version, status: 'ok', note: '', cves: [] });
    render();
  }

  async function scanOne(id) {
    if (isScanning) return;
    const p = Store.getById(id);
    if (!p) return;
    Store.update(id, { status: 'scanning' });
    render();
    try {
      const result = await Scanner.checkPackage(p.name, p.version, p.latest);
      const newStatus = result.isSecurity ? 'security' : (p.latest && p.latest !== p.version ? 'update' : 'ok');
      Store.update(id, { ...result, status: newStatus });
    } catch (err) {
      Store.update(id, {
        status: p.latest && p.latest !== p.version ? 'update' : 'ok',
        note: `CVE scan failed: ${err.message}`,
      });
    }
    render();
  }

  async function scanCVEs() {
    if (isScanning) return;
    if (CONFIG.ANTHROPIC_API_KEY === 'YOUR_API_KEY_HERE') {
      alert('Add your Anthropic API key in js/config.js to enable AI CVE scanning.');
      return;
    }

    const toScan = Store.getAll().filter(p => p.status === 'update' || p.status === 'unscanned');
    if (!toScan.length) {
      UI.setScanStatus('<strong>Nothing to scan.</strong> All packages are up to date or already checked.');
      return;
    }

    isScanning = true;
    UI.setScanBtn(true);
    UI.setSpinner(true);

    let done = 0;
    const updateProgress = () => {
      UI.setProgress((done / toScan.length) * 100);
      UI.setScanStatus(`<strong>Scanning for CVEs…</strong> ${done} of ${toScan.length} packages checked.`);
    };
    updateProgress();

    for (const p of toScan) {
      Store.update(p.id, { status: 'scanning' });
      render();
      try {
        const result = await Scanner.checkPackage(p.name, p.version, p.latest);
        const newStatus = result.isSecurity ? 'security' : (p.latest && p.latest !== p.version ? 'update' : 'ok');
        Store.update(p.id, { ...result, status: newStatus });
      } catch (err) {
        Store.update(p.id, {
          status: p.latest && p.latest !== p.version ? 'update' : 'ok',
          note: `CVE scan failed: ${err.message}`,
        });
      }
      done++;
      updateProgress();
      render();
    }

    isScanning = false;
    UI.setScanBtn(false);
    UI.setSpinner(false);
    UI.setProgress(-1);

    const s = Store.getStats();
    UI.setScanStatus(
      `<strong>CVE scan complete.</strong> ` +
      `<span style="color:var(--danger-text)">${s.security} security patch${s.security !== 1 ? 'es' : ''}</span> · ` +
      `<span style="color:var(--warning-text)">${s.updates} regular update${s.updates !== 1 ? 's' : ''}</span> · ` +
      `<span style="color:var(--success-text)">${s.ok} up to date</span>`
    );
  }

  return {
    init, render, setView, setInstalledTab,
    fetchReleases, fetchPackages,
    addApp, removeApp, toggleApp, markSeen,
    markUpdated, scanOne, scanCVEs,
  };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
