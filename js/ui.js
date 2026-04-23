// PatchBoards · ui.js

const MGR_STYLES = {
  'homebrew':      { color: '#f97316', label: 'brew' },
  'homebrew-cask': { color: '#f97316', label: 'brew cask' },
  'winget':        { color: '#5b5bd6', label: 'winget' },
  'apt':           { color: '#e11d48', label: 'apt' },
  'npm':           { color: '#dc2626', label: 'npm' },
  'pip':           { color: '#2563eb', label: 'pip' },
  'Manual':        { color: '#888',    label: 'manual' },
};

const PLATFORM_COLORS = { mac: '#555', win: '#5b5bd6' };

let _catalogPlatform = 'all';
let _catalogCategory = 'all';

const UI = (() => {

  // ── Dashboard stats ──────────────────────────────────────────────────────────
  function renderStats(view) {
    if (view === 'dashboard') {
      const s = Store.getDashboardStats();
      document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card"><div class="stat-label">Tracked apps</div><div class="stat-value">${s.tracked}</div></div>
        <div class="stat-card"><div class="stat-label">New releases</div><div class="stat-value ${s.newReleases ? 'warning' : ''}">${s.newReleases}</div></div>
        <div class="stat-card"><div class="stat-label">Up to date</div><div class="stat-value ${s.upToDate && !s.newReleases ? 'success' : ''}">${s.upToDate}</div></div>
        <div class="stat-card"><div class="stat-label">Unknown</div><div class="stat-value">${s.unknown}</div></div>
      `;
    } else {
      const s = Store.getStats();
      document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card"><div class="stat-label">Total packages</div><div class="stat-value">${s.total}</div></div>
        <div class="stat-card"><div class="stat-label">Security patches</div><div class="stat-value danger">${s.security}</div></div>
        <div class="stat-card"><div class="stat-label">Updates available</div><div class="stat-value warning">${s.updates}</div></div>
        <div class="stat-card"><div class="stat-label">Up to date</div><div class="stat-value success">${s.ok}</div></div>
        <div class="stat-card"><div class="stat-label">Unscanned</div><div class="stat-value">${s.unscanned}</div></div>
      `;
    }
  }

  // ── Dashboard: My Apps cards ─────────────────────────────────────────────────
  function appStatusInfo(entry, release) {
    if (!release) return { cls: 'status-default', badge: 'loading…', badgeCls: 'b-loading' };
    if (release.error) return { cls: 'status-default', badge: 'unavailable', badgeCls: 'b-default' };

    const isNew = entry.seenVersion && release.version && release.version !== entry.seenVersion;
    if (isNew) return { cls: 'status-update', badge: 'new release!', badgeCls: 'b-upd' };

    if (!entry.seenVersion && release.version) {
      return { cls: 'status-ok', badge: 'tracking', badgeCls: 'b-ok' };
    }
    return { cls: 'status-ok', badge: 'up to date', badgeCls: 'b-ok' };
  }

  function platformBadges(app) {
    return app.platforms.map(p =>
      `<span class="platform-badge platform-${p}">${p === 'mac' ? 'Mac' : 'Windows'}</span>`
    ).join('');
  }

  function mgrTag(manager) {
    const s = MGR_STYLES[manager] || { color: '#888', label: manager };
    return `<span class="mgr-tag" style="background:${s.color}18;color:${s.color};">${s.label}</span>`;
  }

  function appCard(entry, app, release) {
    const { cls, badge, badgeCls } = appStatusInfo(entry, release);

    const version = release?.version || '—';
    const lastVersion = entry.seenVersion || null;
    const isNew = lastVersion && release?.version && release.version !== lastVersion;

    const versionHtml = isNew
      ? `<span class="vpill v-cur">${lastVersion}</span><span class="v-arr">→</span><span class="vpill v-upd">${release.version}</span>`
      : `<span class="vpill v-cur">${version}</span>`;

    const sourceUrl = release?.sourceUrl || app.homepage || null;
    const sourcePart = sourceUrl
      ? `<a href="${sourceUrl}" target="_blank" rel="noopener" class="app-link">view release ↗</a>` : '';

    const updateCmd = (() => {
      if (release?.manager === 'homebrew-cask') return `brew upgrade --cask ${app.brew}`;
      if (release?.manager === 'homebrew')      return `brew upgrade ${app.brew}`;
      if (release?.manager === 'winget')        return `winget upgrade ${app.winget}`;
      return '';
    })();

    return `
      <div class="app-card" id="appcard-${app.id}">
        <div class="app-card-top">
          <div class="app-card-icon ${cls}">${app.icon}</div>
          <div class="app-card-meta">
            <div class="app-card-name-row">
              <span class="app-card-name">${app.name}</span>
              <span class="badge ${badgeCls}">${badge}</span>
            </div>
            <div class="app-card-category">${app.category} · ${platformBadges(app)}</div>
          </div>
          <button class="btn app-remove-btn" title="Remove from dashboard" onclick="App.removeApp('${app.id}')">×</button>
        </div>
        <div class="app-card-body">
          <div class="app-card-version">${versionHtml}</div>
          <div class="app-card-actions">
            ${sourcePart}
            ${isNew ? `<button class="btn" onclick="App.markSeen('${app.id}')">Mark as seen</button>` : ''}
          </div>
        </div>
        ${updateCmd ? `<div class="app-card-cmd"><code>${updateCmd}</code></div>` : ''}
      </div>`;
  }

  function renderDashboard(query) {
    const myApps = Store.getMyApps();
    const q = (query || '').toLowerCase().trim();

    const el = document.getElementById('appGrid');
    const empty = document.getElementById('emptyDashboard');

    if (!myApps.length) {
      el.innerHTML = '';
      el.style.display = 'none';
      empty.style.display = 'block';
      document.getElementById('dashboardTitle').textContent = 'My Apps';
      return;
    }

    empty.style.display = 'none';
    el.style.display = 'grid';

    let filtered = myApps;
    if (q) {
      filtered = myApps.filter(entry => {
        const app = getCatalogApp(entry.id);
        if (!app) return false;
        return app.name.toLowerCase().includes(q) || app.category.toLowerCase().includes(q);
      });
    }

    // Sort: new releases first, then alphabetical
    filtered = [...filtered].sort((a, b) => {
      const ra = Store.getRelease(a.id);
      const rb = Store.getRelease(b.id);
      const aNew = ra && a.seenVersion && ra.version !== a.seenVersion ? 0 : 1;
      const bNew = rb && b.seenVersion && rb.version !== b.seenVersion ? 0 : 1;
      if (aNew !== bNew) return aNew - bNew;
      const appA = getCatalogApp(a.id);
      const appB = getCatalogApp(b.id);
      return (appA?.name || '').localeCompare(appB?.name || '');
    });

    el.innerHTML = filtered.map(entry => {
      const app = getCatalogApp(entry.id);
      if (!app) return '';
      const release = Store.getRelease(entry.id);
      return appCard(entry, app, release);
    }).join('');

    const count = myApps.length;
    document.getElementById('dashboardTitle').textContent =
      `My Apps (${count})`;
  }

  // ── Installed packages (existing view) ──────────────────────────────────────
  const CATEGORY_ICONS = {
    Browser: '🌐', Developer: '⚙️', Productivity: '📝',
    Media: '🎵', Security: '🔒', System: '💻', Other: '📦',
    formula: '⚙️', cask: '🖥️', winget: '🪟',
  };

  function badge(p) {
    const map = {
      scanning:  ['b-scan',    'scanning…'],
      security:  ['b-sec',     'security patch'],
      update:    ['b-upd',     'update available'],
      ok:        ['b-ok',      'up to date'],
      unscanned: ['b-default', 'not scanned'],
    };
    const [cls, label] = map[p.status] || ['b-default', p.status];
    return `<span class="badge ${cls}">${label}</span>`;
  }

  function versions(p) {
    const cur = `<span class="vpill v-cur">${p.version}</span>`;
    if (!p.latest || p.latest === p.version || p.status === 'unscanned' || p.status === 'scanning') return cur;
    const newCls = p.isSecurity ? 'v-sec' : 'v-upd';
    return `${cur}<span class="v-arr">→</span><span class="vpill ${newCls}">${p.latest}</span>`;
  }

  function iconClass(p) {
    return { security: 'status-security', update: 'status-update', ok: 'status-ok' }[p.status] || 'status-default';
  }

  function pkgRow(p, isScanning) {
    const icon = CATEGORY_ICONS[p.type] || CATEGORY_ICONS[p.category] || '📦';
    const sourcePart = p.sourceUrl
      ? ` · <a href="${p.sourceUrl}" target="_blank" rel="noopener">source ↗</a>` : '';
    const cvePart = p.cves && p.cves.length
      ? ` · <span style="color:var(--danger-text);font-weight:500;">${p.cves.join(', ')}</span>` : '';
    const notePart = p.note
      ? `<div class="pkg-note${p.isSecurity ? ' security' : ''}">${p.note}</div>` : '';

    const canScan   = p.status === 'update' || p.status === 'unscanned';
    const canUpdate = p.status === 'security' || p.status === 'update';

    const brewCmd = p.manager === 'homebrew'
      ? `brew upgrade ${p.name}`
      : p.manager === 'homebrew-cask'
      ? `brew upgrade --cask ${p.name}`
      : p.manager === 'winget'
      ? `winget upgrade ${p.name}`
      : '';

    return `
      <div class="pkg-row" id="pkg-${p.id}">
        <div class="pkg-icon ${iconClass(p)}">${icon}</div>
        <div class="pkg-body">
          <div class="pkg-name-row">
            <span class="pkg-name">${p.name}</span>
            ${badge(p)}
          </div>
          <div class="pkg-meta">
            ${mgrTag(p.manager)}${sourcePart}${cvePart}
            ${brewCmd ? `<code style="font-size:11px;font-family:monospace;background:rgba(0,0,0,0.06);padding:1px 6px;border-radius:4px;margin-left:6px;">${brewCmd}</code>` : ''}
          </div>
          ${notePart}
        </div>
        <div class="pkg-right">
          <div class="version-row">${versions(p)}</div>
          <div class="row-actions">
            ${canScan ? `<button class="btn" onclick="App.scanOne(${p.id})" ${isScanning ? 'disabled' : ''}>Check CVEs</button>` : ''}
            ${canUpdate ? `<button class="btn ${p.isSecurity ? 'danger' : ''}" onclick="App.markUpdated(${p.id})">Mark updated</button>` : ''}
          </div>
        </div>
      </div>`;
  }

  function renderInstalledList(tab, isScanning, query) {
    let list = Store.getAll();
    const q = (query || '').toLowerCase().trim();

    if (q) list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.manager || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.cves || []).some(c => c.toLowerCase().includes(q))
    );

    if (tab === 'action')    list = list.filter(p => p.status === 'security' || p.status === 'update');
    if (tab === 'security')  list = list.filter(p => p.status === 'security');
    if (tab === 'ok')        list = list.filter(p => p.status === 'ok');
    if (tab === 'unscanned') list = list.filter(p => p.status === 'unscanned' || p.status === 'scanning');

    const order = { security: 0, update: 1, scanning: 2, unscanned: 3, ok: 4 };
    list.sort((a, b) => (order[a.status] ?? 5) - (order[b.status] ?? 5));

    const titles = { all: 'All packages', action: 'Needs action', security: 'Security patches', ok: 'Up to date', unscanned: 'Not yet scanned' };
    document.getElementById('sectionTitle').textContent = titles[tab] || 'Packages';

    const el = document.getElementById('pkgList');
    el.innerHTML = list.length
      ? list.map(p => pkgRow(p, isScanning)).join('')
      : `<div class="empty">No packages in this view.</div>`;
  }

  // ── Catalog overlay ──────────────────────────────────────────────────────────
  function openCatalog() {
    document.getElementById('catalogOverlay').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    renderCategoryFilters();
    renderCatalog();
    document.getElementById('catalogSearch').focus();
  }

  function closeCatalog() {
    document.getElementById('catalogOverlay').style.display = 'none';
    document.body.style.overflow = '';
  }

  function closeCatalogOnBg(e) {
    if (e.target === document.getElementById('catalogOverlay')) closeCatalog();
  }

  function setPlatformFilter(platform, btn) {
    _catalogPlatform = platform;
    document.querySelectorAll('.pf-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderCatalog();
  }

  function setCategoryFilter(cat, btn) {
    _catalogCategory = cat;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderCatalog();
  }

  function renderCategoryFilters() {
    const all = [{ id: 'all', label: 'All' }].concat(
      CATALOG_CATEGORIES.map(c => ({ id: c, label: c }))
    );
    document.getElementById('categoryFilters').innerHTML = all.map(c =>
      `<button class="cat-btn ${c.id === _catalogCategory ? 'active' : ''}" onclick="UI.setCategoryFilter('${c.id}', this)">${c.label}</button>`
    ).join('');
  }

  function renderCatalog() {
    const query = document.getElementById('catalogSearch')?.value || '';
    const apps = filterCatalog({ query, platform: _catalogPlatform, category: _catalogCategory });
    const grid = document.getElementById('catalogGrid');

    if (!apps.length) {
      grid.innerHTML = `<div class="catalog-empty">No apps match your search.</div>`;
      return;
    }

    grid.innerHTML = apps.map(app => {
      const tracked = Store.isTracked(app.id);
      return `
        <div class="catalog-card ${tracked ? 'is-tracked' : ''}">
          <div class="catalog-card-icon">${app.icon}</div>
          <div class="catalog-card-body">
            <div class="catalog-card-name">${app.name}</div>
            <div class="catalog-card-desc">${app.desc}</div>
            <div class="catalog-card-meta">
              <span class="catalog-cat-tag">${app.category}</span>
              ${app.platforms.map(p => `<span class="platform-badge platform-${p}">${p === 'mac' ? 'Mac' : 'Win'}</span>`).join('')}
            </div>
          </div>
          <button class="btn catalog-track-btn ${tracked ? 'tracked' : 'primary'}"
                  onclick="App.toggleApp('${app.id}', this)">
            ${tracked ? '✓ Tracked' : '+ Track'}
          </button>
        </div>`;
    }).join('');
  }

  // ── Shared status bar helpers ────────────────────────────────────────────────
  function setScanStatus(html)  { document.getElementById('scanStatusText').innerHTML = html; }
  function setProgress(pct)    {
    const wrap = document.getElementById('scanProgressWrap');
    wrap.style.display = pct >= 0 ? 'block' : 'none';
    document.getElementById('scanBar').style.width = Math.round(pct) + '%';
  }
  function setSpinner(v)       { document.getElementById('scanSpinner').style.display = v ? 'block' : 'none'; }
  function setScanBtn(d)       { const b = document.getElementById('scanAllBtn'); if (b) b.disabled = d; }
  function setRefreshBtn(d)    { document.getElementById('refreshBtn').disabled = d; }
  function showBanner(msg)     {
    const b = document.getElementById('serverBanner');
    b.style.display = msg ? 'block' : 'none';
    if (msg) b.innerHTML = msg;
  }

  return {
    renderStats, renderDashboard, renderInstalledList,
    openCatalog, closeCatalog, closeCatalogOnBg, renderCatalog,
    setPlatformFilter, setCategoryFilter,
    setScanStatus, setProgress, setSpinner, setScanBtn, setRefreshBtn, showBanner,
  };
})();
