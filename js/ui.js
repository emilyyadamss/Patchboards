// PatchBoards · ui.js

let _catalogPlatform = 'all';
let _catalogCategory = 'all';

const UI = (() => {

  // ── Stats bar ────────────────────────────────────────────────────────────────
  function renderStats() {
    const s = Store.getDashboardStats();
    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card"><div class="stat-label">Tracked apps</div><div class="stat-value">${s.tracked}</div></div>
      <div class="stat-card"><div class="stat-label">New releases</div><div class="stat-value ${s.newReleases ? 'warning' : ''}">${s.newReleases}</div></div>
      <div class="stat-card"><div class="stat-label">Up to date</div><div class="stat-value ${s.upToDate && !s.newReleases ? 'success' : ''}">${s.upToDate}</div></div>
      <div class="stat-card"><div class="stat-label">Unavailable</div><div class="stat-value">${s.unknown}</div></div>
    `;
  }

  // ── Platform version row ─────────────────────────────────────────────────────
  function platformVersionRow(platform, data, seen, app) {
    const label  = platform === 'mac' ? '🍎 Mac' : '🪟 Windows';
    const pkg    = platform === 'mac' ? app.brew : app.winget;
    const mgr    = platform === 'mac'
      ? (app.brewType === 'formula' ? 'homebrew' : 'homebrew-cask')
      : 'winget';

    if (!pkg) return '';   // app doesn't support this platform

    if (!data) {
      return `
        <div class="plat-row loading">
          <span class="plat-label">${label}</span>
          <span class="plat-version muted">loading…</span>
        </div>`;
    }

    if (data.error || !data.version) {
      return `
        <div class="plat-row unavailable">
          <span class="plat-label">${label}</span>
          <span class="plat-version muted">unavailable</span>
        </div>`;
    }

    const isNew = seen && data.version !== seen;
    const versionHtml = isNew
      ? `<span class="vpill v-cur">${seen}</span><span class="v-arr">→</span><span class="vpill v-upd">${data.version}</span>`
      : `<span class="vpill v-ok">${data.version}</span>`;

    const cmd = mgr === 'homebrew-cask'
      ? `brew upgrade --cask ${pkg}`
      : mgr === 'homebrew'
      ? `brew upgrade ${pkg}`
      : `winget upgrade ${pkg}`;

    const link = data.sourceUrl
      ? `<a href="${data.sourceUrl}" target="_blank" rel="noopener" class="plat-link">release notes ↗</a>`
      : '';

    return `
      <div class="plat-row ${isNew ? 'has-update' : ''}">
        <span class="plat-label">${label}</span>
        <span class="plat-version">${versionHtml}</span>
        <span class="plat-meta">${link}</span>
        <code class="plat-cmd">${cmd}</code>
      </div>`;
  }

  // ── App card ─────────────────────────────────────────────────────────────────
  function appCard(entry, app, release) {
    const macNew = Store.isNewRelease(entry, release, 'mac');
    const winNew = Store.isNewRelease(entry, release, 'win');
    const anyNew = macNew || winNew;

    const badgeHtml = anyNew
      ? `<span class="badge b-upd">new release</span>`
      : (release
          ? `<span class="badge b-ok">up to date</span>`
          : `<span class="badge b-loading">checking…</span>`);

    const macRow = platformVersionRow('mac', release?.mac || null, entry.seenMac, app);
    const winRow = platformVersionRow('win', release?.win || null, entry.seenWin, app);

    const markSeenBtn = anyNew
      ? `<button class="btn btn-sm" onclick="App.markSeen('${app.id}')">Mark all as seen</button>`
      : '';

    return `
      <div class="app-card ${anyNew ? 'card-has-update' : ''}" id="appcard-${app.id}">
        <div class="app-card-header">
          <div class="app-card-icon">${app.icon}</div>
          <div class="app-card-meta">
            <div class="app-card-name-row">
              <span class="app-card-name">${app.name}</span>
              ${badgeHtml}
            </div>
            <div class="app-card-category">${app.category}</div>
          </div>
          <button class="btn app-remove-btn" title="Remove from dashboard" onclick="App.removeApp('${app.id}')">×</button>
        </div>
        <div class="app-platforms">
          ${macRow}${winRow}
        </div>
        ${markSeenBtn ? `<div class="app-card-footer">${markSeenBtn}</div>` : ''}
      </div>`;
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────
  function renderDashboard(query) {
    const myApps = Store.getMyApps();
    const q = (query || '').toLowerCase().trim();
    const el    = document.getElementById('appGrid');
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
        return app && (app.name.toLowerCase().includes(q) || app.category.toLowerCase().includes(q));
      });
    }

    // Sort: apps with new releases first, then alphabetical
    filtered = [...filtered].sort((a, b) => {
      const ra = Store.getRelease(a.id);
      const rb = Store.getRelease(b.id);
      const aNew = (Store.isNewRelease(a, ra, 'mac') || Store.isNewRelease(a, ra, 'win')) ? 0 : 1;
      const bNew = (Store.isNewRelease(b, rb, 'mac') || Store.isNewRelease(b, rb, 'win')) ? 0 : 1;
      if (aNew !== bNew) return aNew - bNew;
      return (getCatalogApp(a.id)?.name || '').localeCompare(getCatalogApp(b.id)?.name || '');
    });

    el.innerHTML = filtered.map(entry => {
      const app = getCatalogApp(entry.id);
      return app ? appCard(entry, app, Store.getRelease(entry.id)) : '';
    }).join('');

    document.getElementById('dashboardTitle').textContent = `My Apps (${myApps.length})`;
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
    const all = [{ id: 'all', label: 'All' }]
      .concat(CATALOG_CATEGORIES.map(c => ({ id: c, label: c })));
    document.getElementById('categoryFilters').innerHTML = all.map(c =>
      `<button class="cat-btn ${c.id === _catalogCategory ? 'active' : ''}" onclick="UI.setCategoryFilter('${c.id}', this)">${c.label}</button>`
    ).join('');
  }

  function renderCatalog() {
    const query = document.getElementById('catalogSearch')?.value || '';
    const apps  = filterCatalog({ query, platform: _catalogPlatform, category: _catalogCategory });
    const grid  = document.getElementById('catalogGrid');

    if (!apps.length) {
      grid.innerHTML = `<div class="catalog-empty">No apps match your search.</div>`;
      return;
    }

    grid.innerHTML = apps.map(app => {
      const tracked = Store.isTracked(app.id);
      const platBadges = app.platforms.map(p =>
        `<span class="platform-badge platform-${p}">${p === 'mac' ? '🍎 Mac' : '🪟 Win'}</span>`
      ).join('');
      return `
        <div class="catalog-card ${tracked ? 'is-tracked' : ''}">
          <div class="catalog-card-icon">${app.icon}</div>
          <div class="catalog-card-body">
            <div class="catalog-card-name">${app.name}</div>
            <div class="catalog-card-desc">${app.desc}</div>
            <div class="catalog-card-meta">
              <span class="catalog-cat-tag">${app.category}</span>
              ${platBadges}
            </div>
          </div>
          <button class="btn catalog-track-btn ${tracked ? 'tracked' : 'primary'}"
                  onclick="App.toggleApp('${app.id}', this)">
            ${tracked ? '✓ Tracked' : '+ Track'}
          </button>
        </div>`;
    }).join('');
  }

  // ── Status bar helpers ───────────────────────────────────────────────────────
  function setScanStatus(html) { document.getElementById('scanStatusText').innerHTML = html; }
  function setProgress(pct) {
    const w = document.getElementById('scanProgressWrap');
    w.style.display = pct >= 0 ? 'block' : 'none';
    document.getElementById('scanBar').style.width = Math.round(pct) + '%';
  }
  function setSpinner(v)    { document.getElementById('scanSpinner').style.display = v ? 'block' : 'none'; }
  function setRefreshBtn(d) { document.getElementById('refreshBtn').disabled = d; }
  function showBanner(msg)  {
    const b = document.getElementById('serverBanner');
    b.style.display = msg ? 'block' : 'none';
    if (msg) b.innerHTML = msg;
  }

  return {
    renderStats, renderDashboard,
    openCatalog, closeCatalog, closeCatalogOnBg, renderCatalog,
    setPlatformFilter, setCategoryFilter,
    setScanStatus, setProgress, setSpinner, setRefreshBtn, showBanner,
  };
})();
