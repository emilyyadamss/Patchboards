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

const CATEGORY_ICONS = {
  Browser: '🌐', Developer: '⚙️', Productivity: '📝',
  Media: '🎵', Security: '🔒', System: '💻', Other: '📦',
  formula: '⚙️', cask: '🖥️', winget: '🪟',
};

const UI = (() => {

  function renderStats() {
    const s = Store.getStats();
    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card"><div class="stat-label">Total packages</div><div class="stat-value">${s.total}</div></div>
      <div class="stat-card"><div class="stat-label">Security patches</div><div class="stat-value danger">${s.security}</div></div>
      <div class="stat-card"><div class="stat-label">Updates available</div><div class="stat-value warning">${s.updates}</div></div>
      <div class="stat-card"><div class="stat-label">Up to date</div><div class="stat-value success">${s.ok}</div></div>
      <div class="stat-card"><div class="stat-label">Unscanned</div><div class="stat-value">${s.unscanned}</div></div>
    `;
  }

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
    return `${cur}<span class="v-arr">→</span><span class="${newCls}">${p.latest}</span>`;
  }

  function mgrTag(manager) {
    const s = MGR_STYLES[manager] || { color: '#888', label: manager };
    return `<span class="mgr-tag" style="background:${s.color}18;color:${s.color};">${s.label}</span>`;
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

  function renderList(tab, isScanning, query) {
    let list = Store.getAll();
    const q = (query || '').toLowerCase().trim();

    if (q) list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.manager || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.cves || []).some(c => c.toLowerCase().includes(q))
    );

    if (tab === 'action')   list = list.filter(p => p.status === 'security' || p.status === 'update');
    if (tab === 'security') list = list.filter(p => p.status === 'security');
    if (tab === 'ok')       list = list.filter(p => p.status === 'ok');
    if (tab === 'unscanned')list = list.filter(p => p.status === 'unscanned' || p.status === 'scanning');

    const order = { security: 0, update: 1, scanning: 2, unscanned: 3, ok: 4 };
    list.sort((a, b) => (order[a.status] ?? 5) - (order[b.status] ?? 5));

    const titles = { all:'All packages', action:'Needs action', security:'Security patches', ok:'Up to date', unscanned:'Not yet scanned' };
    document.getElementById('sectionTitle').textContent = titles[tab] || 'Packages';

    const el = document.getElementById('pkgList');
    el.innerHTML = list.length
      ? list.map(p => pkgRow(p, isScanning)).join('')
      : `<div class="empty">No packages in this view.</div>`;
  }

  function setScanStatus(html) { document.getElementById('scanStatusText').innerHTML = html; }
  function setProgress(pct)    { document.getElementById('scanProgressWrap').style.display = pct >= 0 ? 'block' : 'none'; document.getElementById('scanBar').style.width = Math.round(pct) + '%'; }
  function setSpinner(v)       { document.getElementById('scanSpinner').style.display = v ? 'block' : 'none'; }
  function setScanBtn(d)       { document.getElementById('scanAllBtn').disabled = d; }
  function setRefreshBtn(d)    { document.getElementById('refreshBtn').disabled = d; }
  function showBanner(msg)     { const b = document.getElementById('serverBanner'); b.style.display = msg ? 'block' : 'none'; if (msg) b.innerHTML = msg; }

  return { renderStats, renderList, setScanStatus, setProgress, setSpinner, setScanBtn, setRefreshBtn, showBanner };
})();
