// PatchBoards · envScan.js
// Environment Scan: queries /packages (server.py → winget list + winget upgrade)
// to discover what is installed on the Windows machine, then surfaces packages
// that need updates — flagged by security advisory or age-based policy.
//
// Age tracking: the first time we detect a pending update for a package we record
// a timestamp in localStorage. This lets us report "update has been available for
// N days" without relying on any external API.

const SEEN_KEY = 'patchboards_env_seen_v1';

const EnvScan = (() => {

  // { [wingetId]: firstSeenTimestampMs } — set when an update is first detected,
  // cleared automatically once the package is no longer reported as outdated.
  let _firstSeen = {};

  function load() {
    try {
      const s = localStorage.getItem(SEEN_KEY);
      if (s) _firstSeen = JSON.parse(s);
    } catch { _firstSeen = {}; }
  }

  function _save() {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(_firstSeen)); } catch {}
  }

  function _recordSeen(id) {
    if (!_firstSeen[id]) { _firstSeen[id] = Date.now(); _save(); }
  }

  function _clearSeen(id) {
    if (_firstSeen[id]) { delete _firstSeen[id]; _save(); }
  }

  function daysPending(id) {
    if (!_firstSeen[id]) return 0;
    return Math.floor((Date.now() - _firstSeen[id]) / 86400000);
  }

  async function _fetchPackages() {
    const res = await fetch('http://localhost:4242/packages', {
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.packages || [];
  }

  function _enrichPackages(packages) {
    const allCatalog = [...CATALOG, ...Store.getCustomApps()];
    const thresholds = PatchRules.getAgeThresholds();
    const result = [];

    for (const pkg of packages) {
      if (pkg.manager !== 'winget') continue;

      const hasUpdate = pkg.status === 'update' && !!pkg.latest;
      const id = pkg.wingetId || pkg.name;

      if (hasUpdate) {
        _recordSeen(id);
      } else {
        _clearSeen(id);
      }

      const catalogApp = allCatalog.find(c =>
        c.winget && c.winget.toLowerCase() === (pkg.wingetId || '').toLowerCase()
      ) || null;

      const days = hasUpdate ? daysPending(id) : 0;
      const ageLimit = pkg.isSecurity ? thresholds.security : thresholds.standard;
      const isOverdue = hasUpdate && days >= ageLimit;

      result.push({ pkg, catalogApp, hasUpdate, daysPending: days, ageLimit, isOverdue });
    }

    // Sort: security+overdue → overdue → security → regular update → ok
    return result.sort((a, b) => {
      const rank = r =>
        (r.pkg.isSecurity && r.isOverdue) ? 0 :
        r.isOverdue                        ? 1 :
        (r.pkg.isSecurity && r.hasUpdate)  ? 2 :
        r.hasUpdate                        ? 3 : 4;
      return rank(a) - rank(b);
    });
  }

  async function scan() {
    const packages = await _fetchPackages();
    return _enrichPackages(packages);
  }

  return { load, scan };
})();


// ── Panel UI ──────────────────────────────────────────────────────────────────

const EnvScanUI = (() => {

  function open() {
    document.getElementById('envScanOverlay').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    renderIdle();
  }

  function close() {
    document.getElementById('envScanOverlay').style.display = 'none';
    document.body.style.overflow = '';
  }

  function closeOnBg(e) {
    if (e.target === document.getElementById('envScanOverlay')) close();
  }

  function _set(html) {
    document.getElementById('envScanContent').innerHTML = html;
  }

  function renderIdle() {
    const { security, standard } = PatchRules.getAgeThresholds();
    _set(`
      <div class="env-idle">
        <div class="env-idle-title">Winget Environment Scan</div>
        <p class="env-idle-desc">
          Queries the local winget database to list all installed Windows packages
          and flags those with pending updates — by security advisory or how long
          the update has been available.
        </p>
        <ul class="env-idle-rules">
          <li><span class="badge b-sec">security</span> updates overdue after <strong>${security} days</strong></li>
          <li><span class="badge b-over">overdue</span> non-security updates pending more than <strong>${standard} days (3 months)</strong></li>
        </ul>
        <button class="btn primary" onclick="EnvScanUI.runScan()">Scan Now</button>
        <p class="env-idle-note">Requires the PatchBoards server running on Windows with winget available.</p>
      </div>
    `);
  }

  function _renderScanning() {
    _set(`
      <div class="env-scanning">
        <div class="spinner"></div>
        <div class="env-scanning-msg">Querying winget…</div>
      </div>
    `);
  }

  function _renderError(msg) {
    _set(`
      <div class="env-error">
        <div class="env-error-msg">${msg}</div>
        <p class="env-idle-note" style="margin-top:.5rem">
          Make sure the PatchBoards server is running on Windows and winget is available.
        </p>
        <button class="btn" onclick="EnvScanUI.renderIdle()" style="margin-top:1rem">← Back</button>
      </div>
    `);
  }

  function _renderResults(items) {
    const withUpdate = items.filter(r => r.hasUpdate);
    const overdueCount  = items.filter(r => r.isOverdue).length;
    const securityCount = items.filter(r => r.hasUpdate && r.pkg.isSecurity).length;
    const total = items.length;

    const summaryHtml = `
      <div class="env-summary-bar">
        <span class="env-summ-total">${total} package${total !== 1 ? 's' : ''} scanned</span>
        ${securityCount ? `<span class="env-summ-sec">${securityCount} security</span>` : ''}
        ${overdueCount  ? `<span class="env-summ-over">${overdueCount} overdue</span>` : ''}
        ${withUpdate.length && !overdueCount && !securityCount
          ? `<span class="env-summ-upd">${withUpdate.length} update${withUpdate.length !== 1 ? 's' : ''} available</span>`
          : ''}
        <button class="btn btn-sm" onclick="EnvScanUI.runScan()" style="margin-left:auto">↺ Rescan</button>
      </div>`;

    if (total === 0) {
      _set(`
        ${summaryHtml}
        <div class="env-no-winget">
          <div class="env-no-winget-title">No winget packages found</div>
          <p class="env-no-winget-desc">
            The server returned no winget-managed packages. This scan only works when
            the PatchBoards server is running on Windows with winget installed.
          </p>
        </div>
      `);
      return;
    }

    if (!withUpdate.length) {
      _set(`
        ${summaryHtml}
        <div class="env-all-good">
          <div class="env-all-good-title">All packages up to date</div>
          <p class="env-all-good-desc">winget reports no pending updates.</p>
        </div>
      `);
      return;
    }

    const rows = withUpdate.map(({ pkg, catalogApp, daysPending, ageLimit, isOverdue }) => {
      const isSec = pkg.isSecurity;

      let badge;
      if (isSec && isOverdue) {
        badge = `<span class="badge b-sec">security · overdue</span>`;
      } else if (isSec) {
        badge = `<span class="badge b-sec">security</span>`;
      } else if (isOverdue) {
        badge = `<span class="badge b-over">overdue</span>`;
      } else {
        badge = `<span class="badge b-upd">update</span>`;
      }

      const ageHtml = daysPending > 0
        ? `<span class="env-age${isOverdue ? ' env-age-over' : ''}">Pending ${daysPending} day${daysPending !== 1 ? 's' : ''} · limit: ${ageLimit}</span>`
        : '';

      const catHtml = catalogApp
        ? `<span class="env-cat">${catalogApp.category}</span>`
        : '';

      const linkHtml = pkg.sourceUrl
        ? `<a href="${pkg.sourceUrl}" target="_blank" rel="noopener" class="plat-link">view package ↗</a>`
        : '';

      return `
        <div class="env-pkg-row${isSec || isOverdue ? ' env-row-alert' : ''}">
          <div class="env-pkg-name-row">
            <span class="env-pkg-name">${pkg.name}</span>
            ${badge}
          </div>
          <div class="env-pkg-versions">
            <span class="vpill v-cur">${pkg.version}</span>
            <span class="v-arr">→</span>
            <span class="vpill ${isSec ? 'v-sec' : 'v-upd'}">${pkg.latest}</span>
          </div>
          <div class="env-pkg-meta">
            ${catHtml}${ageHtml}${linkHtml}
          </div>
        </div>`;
    }).join('');

    _set(`${summaryHtml}<div class="env-pkg-list">${rows}</div>`);
  }

  async function runScan() {
    _renderScanning();
    try {
      const items = await EnvScan.scan();
      _renderResults(items);
    } catch (e) {
      _renderError(e.message || String(e));
    }
  }

  return { open, close, closeOnBg, renderIdle, runScan };
})();
