// PatchBoards · app.js

const App = (() => {
  let currentTab = 'all';
  let isScanning = false;

  function render() {
    const q = document.getElementById('searchInput')?.value || '';
    UI.renderStats();
    UI.renderList(currentTab, isScanning, q);
  }

  // ── Boot ────────────────────────────────────────────────
  async function init() {
    Store.load();
    render();
    await fetchPackages();
  }

  // ── Fetch from local server ─────────────────────────────
  async function fetchPackages() {
    UI.setRefreshBtn(true);
    UI.setScanStatus('<strong>Connecting to local server…</strong>');
    UI.setSpinner(true);

    try {
      const res = await fetch(`${CONFIG.SERVER_URL}/packages`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      Store.setAll(data.packages);
      UI.showBanner(null);

      const s = Store.getStats();
      UI.setScanStatus(
        `<strong>System scan complete.</strong> Found ${s.total} packages — ` +
        `<span style="color:var(--warning-text)">${s.updates} update${s.updates !== 1 ? 's' : ''}</span>, ` +
        `<span style="color:var(--text-3)">${s.unscanned} unscanned</span>. ` +
        `Click <strong>AI scan for CVEs</strong> to check for security vulnerabilities.`
      );
    } catch (err) {
      console.warn('Server fetch failed:', err);
      UI.showBanner(
        `<strong>Local server not running.</strong> ` +
        `Open your terminal in the project folder and run: <code>./start.sh</code> — then click ↺ Refresh.`
      );
      UI.setScanStatus('<strong>Server offline.</strong> Using cached package list.');

      // Fall back to whatever is in localStorage
      if (Store.getAll().length === 0) {
        Store.setAll([]);
      }
    }

    UI.setSpinner(false);
    UI.setRefreshBtn(false);
    render();
  }

  // ── Tab ─────────────────────────────────────────────────
  function setTab(tab, el) {
    currentTab = tab;
    document.querySelectorAll('.tab-nav button').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    render();
  }

  // ── Mark updated ────────────────────────────────────────
  function markUpdated(id) {
    const p = Store.getById(id);
    if (!p) return;
    Store.update(id, { version: p.latest || p.version, status: 'ok', note: '', cves: [] });
    render();
  }

  // ── Scan one package for CVEs ───────────────────────────
  async function scanOne(id) {
    if (isScanning) return;
    const p = Store.getById(id);
    if (!p) return;

    Store.update(id, { status: 'scanning' });
    render();

    try {
      const result = await Scanner.checkPackage(p.name, p.version, p.latest);
      // Upgrade status to 'security' if CVEs found, otherwise keep existing update/ok status
      const newStatus = result.isSecurity
        ? 'security'
        : (p.latest && p.latest !== p.version ? 'update' : 'ok');
      Store.update(id, { ...result, status: newStatus });
    } catch (err) {
      console.error('Scan error:', err);
      Store.update(id, {
        status: p.latest && p.latest !== p.version ? 'update' : 'ok',
        note: `CVE scan failed: ${err.message}`,
      });
    }
    render();
  }

  // ── AI scan all outdated packages ───────────────────────
  async function scanAll() {
    if (isScanning) return;

    if (CONFIG.ANTHROPIC_API_KEY === 'YOUR_API_KEY_HERE') {
      alert('Add your Anthropic API key in js/config.js to enable AI CVE scanning.');
      return;
    }

    const toScan = Store.getAll().filter(p =>
      p.status === 'update' || p.status === 'unscanned'
    );

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
        const newStatus = result.isSecurity
          ? 'security'
          : (p.latest && p.latest !== p.version ? 'update' : 'ok');
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

    const s = Store.getStats();
    UI.setScanStatus(
      `<strong>CVE scan complete.</strong> ` +
      `<span style="color:var(--danger-text)">${s.security} security patch${s.security !== 1 ? 'es' : ''}</span> · ` +
      `<span style="color:var(--warning-text)">${s.updates} regular update${s.updates !== 1 ? 's' : ''}</span> · ` +
      `<span style="color:var(--success-text)">${s.ok} up to date</span>`
    );
  }

  // ── Expose for inline handlers ──────────────────────────
  return { init, fetchPackages, setTab, markUpdated, scanOne, scanAll, renderList: render };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
