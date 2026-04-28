// PatchBoards · ui.js

let _catalogPlatform = 'all';
let _catalogCategory = 'all';

// Tracks which app the version modal is acting on, and whether it's an edit
let _modalAppId   = null;
let _modalIsEdit  = false;

const UI = (() => {

  // ── Stats bar ────────────────────────────────────────────────────────────────
  function renderStats() {
    const s = Store.getDashboardStats();
    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card"><div class="stat-label">Tracked apps</div><div class="stat-value">${s.tracked}</div></div>
      <div class="stat-card"><div class="stat-label">New releases</div><div class="stat-value ${s.newReleases ? 'new-releases' : ''}">${s.newReleases}</div></div>
      <div class="stat-card"><div class="stat-label">Up to date</div><div class="stat-value ${s.upToDate && !s.newReleases ? 'success' : ''}">${s.upToDate}</div></div>
      <div class="stat-card"><div class="stat-label">Unavailable</div><div class="stat-value">${s.unknown}</div></div>
    `;
  }

  // ── Platform version row ─────────────────────────────────────────────────────
  function platformVersionRow(platform, data, currentVersion, app, labelOverride) {
    const label = labelOverride || (platform === 'mac' ? 'Mac' : 'Windows');
    const pkg   = platform === 'mac' ? app.brew : app.winget;

    if (!pkg) return '';

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

    const isNew = currentVersion && data.version !== currentVersion;

    let versionHtml;
    if (currentVersion && isNew) {
      // User's version → latest available
      versionHtml = `
        <span class="vpill v-cur" title="Your current version">${currentVersion}</span>
        <span class="v-arr">→</span>
        <span class="vpill v-upd" title="Latest available">${data.version}</span>`;
    } else if (currentVersion) {
      // User's version matches latest — up to date
      versionHtml = `<span class="vpill v-ok">${data.version}</span>`;
    } else {
      // No version entered — just show latest
      versionHtml = `<span class="vpill v-cur" title="Latest available">${data.version}</span>`;
    }

    return `
      <div class="plat-row ${isNew ? 'has-update' : ''}">
        <span class="plat-label">${label}</span>
        <span class="plat-version">${versionHtml}</span>
      </div>`;
  }

  // ── App card ─────────────────────────────────────────────────────────────────
  function appCard(entry, app, release) {
    const macNew = Store.isNewRelease(entry, release, 'mac');
    const winNew = Store.isNewRelease(entry, release, 'win');
    const anyNew = macNew || winNew;

    let badgeHtml;
    if (!release) {
      badgeHtml = `<span class="badge b-loading">checking…</span>`;
    } else if (!entry.currentVersion) {
      badgeHtml = `<span class="badge b-default">no version set</span>`;
    } else if (anyNew) {
      badgeHtml = `<span class="badge b-upd">new release</span>`;
    } else {
      badgeHtml = `<span class="badge b-ok">up to date</span>`;
    }

    // Show channel badge when a non-default channel is active
    const channelBadge = (() => {
      if (!app.channels || !entry.channel) return '';
      const ch = app.channels.find(c => c.id === entry.channel);
      if (!ch || ch.id === app.channels[0].id) return '';
      return `<span class="badge b-channel">${ch.label}</span>`;
    })();

    const cv = entry.currentVersion;
    const versionLabel = cv
      ? `Your version: <strong>${cv}</strong>`
      : `<span class="muted">No version set</span>`;

    const macData = release?.mac || null;
    const winData = release?.win || null;
    const versionsMatch = macData && winData &&
      !macData.error && !winData.error &&
      macData.version && winData.version &&
      macData.version === winData.version;
    const macRow = versionsMatch
      ? platformVersionRow('mac', macData, cv, app, 'Mac & Windows')
      : platformVersionRow('mac', macData, cv, app);
    const winRow = versionsMatch ? '' : platformVersionRow('win', winData, cv, app);

    let patchHtml = '';
    if (!entry.currentVersion) {
      patchHtml = `
        <div class="app-card-patch">
          <span class="patch-label">Patch decision</span>
          <span class="patch-action pa-unavailable">Unavailable</span>
          <span class="patch-reason">Set a version to enable patch tracking</span>
        </div>`;
    } else if (anyNew) {
      const decision = PatchRules.decide(app.id);
      const expediteLabel = decision.isExpedited ? 'Remove expedite' : 'Expedite';
      patchHtml = `
        <div class="app-card-patch">
          <span class="patch-label">Patch decision</span>
          <span class="patch-action pa-${decision.action}">${decision.label}</span>
          <span class="patch-reason">${decision.reason}</span>
          <button class="btn btn-sm patch-expedite-btn${decision.isExpedited ? ' active' : ''}"
                  onclick="PatchRules.setExpedite('${app.id}', ${!decision.isExpedited}); App.render();">
            ${expediteLabel}
          </button>
        </div>`;
    }

    return `
      <div class="app-card ${anyNew ? 'card-has-update' : ''}" id="appcard-${app.id}">
        <div class="app-card-header">
          <div class="app-card-icon">${app.name.charAt(0)}</div>
          <div class="app-card-meta">
            <div class="app-card-name-row">
              <span class="app-card-name">${app.name}</span>
              ${badgeHtml}
              ${channelBadge}
            </div>
            <div class="app-card-category">${app.category}</div>
          </div>
          <button class="btn app-remove-btn" title="Remove from dashboard" onclick="App.removeApp('${app.id}')">×</button>
        </div>
        <div class="app-platforms">
          ${macRow}${winRow}
        </div>
        <div class="app-card-footer">
          <span class="current-version-label">${versionLabel}</span>
          <button class="btn btn-sm" onclick="UI.openVersionModal('${app.id}', true)">Edit version</button>
        </div>
        ${patchHtml}
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

  // ── Version modal ─────────────────────────────────────────────────────────────
  // Used both when first adding an app (isEdit=false) and editing later (isEdit=true).
  function openVersionModal(catalogId, isEdit = false) {
    const app = getCatalogApp(catalogId);
    if (!app) return;
    _modalAppId  = catalogId;
    _modalIsEdit = isEdit;

    document.getElementById('versionModalName').textContent  = app.name;
    document.getElementById('versionModalAction').textContent = isEdit ? 'Update version' : 'Add to Dashboard';

    const entry = Store.getMyApps().find(a => a.id === catalogId);
    const existing = entry?.currentVersion || '';
    const input = document.getElementById('versionModalInput');
    input.value = existing;
    input.placeholder = getVersionPlaceholder(app);

    // Channel selector — only shown for apps that define multiple channels
    const channelRow = document.getElementById('versionModalChannelRow');
    const channelSel  = document.getElementById('versionModalChannel');
    if (app.channels && app.channels.length > 1) {
      channelSel.innerHTML = app.channels
        .map(ch => `<option value="${ch.id}">${ch.label}</option>`).join('');
      channelSel.value = entry?.channel || app.channels[0].id;
      channelRow.style.display = 'flex';
    } else {
      channelRow.style.display = 'none';
    }

    document.getElementById('versionModal').style.display = 'flex';
    input.focus();
    input.select();
  }

  function closeVersionModal() {
    document.getElementById('versionModal').style.display = 'none';
    _modalAppId  = null;
    _modalIsEdit = false;
  }

  function closeVersionModalOnBg(e) {
    if (e.target === document.getElementById('versionModal')) closeVersionModal();
  }

  function getVersionPlaceholder(app) {
    // Show a contextual example version based on the app
    const examples = {
      'google-chrome': '126.0.6478.127',
      'firefox':       '127.0.2',
      'visual-studio-code': '1.91.0',
      'slack':         '4.38.125',
      'zoom':          '6.1.1.610',
    };
    return examples[app.id] || 'e.g. 1.0.0';
  }

  // Called by the modal's confirm button
  function confirmVersionModal() {
    if (!_modalAppId) return;
    const version = document.getElementById('versionModalInput').value.trim();
    const channelRow = document.getElementById('versionModalChannelRow');
    const channel = channelRow.style.display !== 'none'
      ? document.getElementById('versionModalChannel').value
      : undefined;
    App.confirmVersion(_modalAppId, version, _modalIsEdit, channel);
    closeVersionModal();
  }

  // Allow Enter key to submit the modal
  function versionModalKeydown(e) {
    if (e.key === 'Enter') confirmVersionModal();
    if (e.key === 'Escape') closeVersionModal();
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
        `<span class="platform-badge platform-${p}">${p === 'mac' ? 'Mac' : 'Win'}</span>`
      ).join('');
      return `
        <div class="catalog-card ${tracked ? 'is-tracked' : ''}">
          <div class="catalog-card-icon">${app.name.charAt(0)}</div>
          <div class="catalog-card-body">
            <div class="catalog-card-name">${app.name}</div>
            <div class="catalog-card-desc">${app.desc}</div>
            <div class="catalog-card-meta">
              <span class="catalog-cat-tag">${app.category}</span>
              ${platBadges}
            </div>
          </div>
          ${tracked
            ? `<button class="btn catalog-track-btn tracked" onclick="App.removeApp('${app.id}'); UI.renderCatalog(); App.render();">Tracked</button>`
            : `<button class="btn catalog-track-btn primary"  onclick="UI.openVersionModal('${app.id}', false)">Track</button>`
          }
        </div>`;
    }).join('');
  }

  // ── Verify Releases panel ────────────────────────────────────────────────
  function openVerifyPanel() {
    const searchEl = document.getElementById('verifySearch');
    if (searchEl) searchEl.value = '';
    renderVerifyPanel();
    document.getElementById('verifyOverlay').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if (searchEl) searchEl.focus();
  }

  function closeVerifyPanel() {
    document.getElementById('verifyOverlay').style.display = 'none';
    document.body.style.overflow = '';
  }

  function closeVerifyPanelOnBg(e) {
    if (e.target === document.getElementById('verifyOverlay')) closeVerifyPanel();
  }

  function resolveChannelApp(app, entry) {
    if (!entry?.channel || !app.channels) return app;
    const ch = app.channels.find(c => c.id === entry.channel);
    if (!ch) return app;
    return {
      ...app,
      brew:   ch.brew   !== undefined ? ch.brew   : app.brew,
      winget: ch.winget !== undefined ? ch.winget : app.winget,
    };
  }

  function buildVerifyLinks(app, entry) {
    const effective = resolveChannelApp(app, entry);
    const links = [];
    if (app.github) {
      links.push({ label: 'GitHub Releases', sub: `github.com/${app.github}`, href: `https://github.com/${app.github}/releases` });
    }
    if (effective.brew) {
      const type = effective.brewType === 'formula' ? 'formula' : 'cask';
      links.push({ label: 'Homebrew', sub: effective.brew, href: `https://formulae.brew.sh/${type}/${effective.brew}` });
    }
    if (effective.winget) {
      const parts = effective.winget.split('.');
      if (parts.length >= 2) {
        const [pub, ...rest] = parts;
        links.push({ label: 'Winget', sub: effective.winget, href: `https://winget.run/pkg/${pub}/${rest.join('.')}` });
      }
    }
    if (app.homepage) {
      let hostname = app.homepage;
      try { hostname = new URL(app.homepage).hostname; } catch {}
      links.push({ label: 'Official Site', sub: hostname, href: app.homepage });
    }
    return links;
  }

  function verifyAppCard(entry, app, release) {
    const macNew = Store.isNewRelease(entry, release, 'mac');
    const winNew = Store.isNewRelease(entry, release, 'win');
    const cv = entry.currentVersion;

    const platformRows = [];
    const macValid = app.brew && release?.mac && !release.mac.error && release.mac.version;
    const winValid = app.winget && release?.win && !release.win.error && release.win.version;
    const verifyVersionsMatch = macValid && winValid && release.mac.version === release.win.version;

    if (macValid) {
      const label = verifyVersionsMatch ? 'Mac & Win' : 'Mac';
      const isNew = verifyVersionsMatch ? (macNew || winNew) : macNew;
      const vHtml = isNew && cv
        ? `<span class="vpill v-cur">${cv}</span><span class="v-arr">→</span><span class="vpill v-upd">${release.mac.version}</span>`
        : `<span class="vpill v-ok">${release.mac.version}</span>`;
      platformRows.push(`<div class="verify-plat-row ${isNew ? 'has-update' : ''}"><span class="plat-label">${label}</span><span class="plat-version">${vHtml}</span></div>`);
    }
    if (winValid && !verifyVersionsMatch) {
      const vHtml = winNew && cv
        ? `<span class="vpill v-cur">${cv}</span><span class="v-arr">→</span><span class="vpill v-upd">${release.win.version}</span>`
        : `<span class="vpill v-ok">${release.win.version}</span>`;
      platformRows.push(`<div class="verify-plat-row ${winNew ? 'has-update' : ''}"><span class="plat-label">Win</span><span class="plat-version">${vHtml}</span></div>`);
    }

    const links = buildVerifyLinks(app, entry);
    const linksHtml = links.map(l =>
      `<a href="${l.href}" target="_blank" rel="noopener" class="verify-link">
        <span class="verify-link-label">${l.label}</span>
        <span class="verify-link-sub">${l.sub}</span>
      </a>`
    ).join('');

    return `
      <div class="verify-app-card">
        <div class="verify-app-header">
          <div class="app-card-icon">${app.name.charAt(0)}</div>
          <div class="verify-app-meta">
            <div class="verify-app-name">${app.name}</div>
            <div class="app-card-category">${app.category}</div>
          </div>
        </div>
        ${platformRows.length ? `<div class="verify-plat-rows">${platformRows.join('')}</div>` : ''}
        ${linksHtml ? `<div class="verify-links-section"><div class="verify-links-label">Official sources</div><div class="verify-links">${linksHtml}</div></div>` : ''}
      </div>`;
  }

  function renderVerifyPanel() {
    const myApps = Store.getMyApps();
    const content = document.getElementById('verifyContent');
    const query = (document.getElementById('verifySearch')?.value || '').toLowerCase().trim();

    const appsWithUpdates = myApps.filter(entry => {
      const release = Store.getRelease(entry.id);
      return Store.isNewRelease(entry, release, 'mac') || Store.isNewRelease(entry, release, 'win');
    });

    if (!appsWithUpdates.length) {
      content.innerHTML = `
        <div class="verify-empty">
          <div class="verify-empty-title">All apps up to date</div>
          <div class="verify-empty-desc">No new releases detected. When updates are available, official source links will appear here for manual verification.</div>
        </div>`;
      return;
    }

    const filtered = query
      ? appsWithUpdates.filter(entry => {
          const app = getCatalogApp(entry.id);
          return app && (app.name.toLowerCase().includes(query) || app.category.toLowerCase().includes(query));
        })
      : appsWithUpdates;

    if (!filtered.length) {
      content.innerHTML = `
        <div class="verify-empty">
          <div class="verify-empty-title">No matching apps</div>
          <div class="verify-empty-desc">No apps with updates match your search.</div>
        </div>`;
      return;
    }

    content.innerHTML = `<div class="verify-list">${
      filtered.map(entry => {
        const app = getCatalogApp(entry.id);
        const release = Store.getRelease(entry.id);
        return app ? verifyAppCard(entry, app, release) : '';
      }).join('')
    }</div>`;
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
    openVersionModal, closeVersionModal, closeVersionModalOnBg,
    confirmVersionModal, versionModalKeydown,
    openVerifyPanel, closeVerifyPanel, closeVerifyPanelOnBg,
    setScanStatus, setProgress, setSpinner, setRefreshBtn, showBanner,
  };
})();
