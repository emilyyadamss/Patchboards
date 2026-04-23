// PatchBoards · store.js
// Manages two independent data stores:
//   myApps   — catalog IDs the user has added to their dashboard
//   releases — latest version data per catalog ID (fetched & cached)
//   packages — installed packages from the local server (existing functionality)

const STORAGE_KEY    = 'patchboards_v3';
const MY_APPS_KEY    = 'patchboards_myapps';
const RELEASES_KEY   = 'patchboards_releases';

const Store = (() => {
  // ── Installed packages (from server) ────────────────────────────────────────
  let packages = [];

  function loadPackages() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) packages = JSON.parse(saved);
    } catch { packages = []; }
  }

  function savePackages() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(packages)); } catch {}
  }

  function setAll(pkgs) { packages = pkgs; savePackages(); }
  function getAll()     { return packages; }

  function getById(id) { return packages.find(p => p.id === id); }

  function updatePkg(id, changes) {
    const idx = packages.findIndex(p => p.id === id);
    if (idx === -1) return;
    packages[idx] = { ...packages[idx], ...changes };
    savePackages();
  }

  function getStats() {
    return {
      total:     packages.length,
      security:  packages.filter(p => p.status === 'security').length,
      updates:   packages.filter(p => p.status === 'update').length,
      ok:        packages.filter(p => p.status === 'ok').length,
      unscanned: packages.filter(p => p.status === 'unscanned').length,
    };
  }

  // ── My Apps (dashboard catalog selections) ───────────────────────────────────
  // Each entry: { id, addedAt, seenVersion }
  let myApps = [];

  function loadMyApps() {
    try {
      const saved = localStorage.getItem(MY_APPS_KEY);
      if (saved) myApps = JSON.parse(saved);
    } catch { myApps = []; }
  }

  function saveMyApps() {
    try { localStorage.setItem(MY_APPS_KEY, JSON.stringify(myApps)); } catch {}
  }

  function addApp(catalogId) {
    if (myApps.find(a => a.id === catalogId)) return;
    myApps.push({ id: catalogId, addedAt: Date.now(), seenVersion: null });
    saveMyApps();
  }

  function removeApp(catalogId) {
    myApps = myApps.filter(a => a.id !== catalogId);
    saveMyApps();
  }

  function isTracked(catalogId) {
    return myApps.some(a => a.id === catalogId);
  }

  function getMyApps() { return myApps; }

  function markSeen(catalogId, version) {
    const entry = myApps.find(a => a.id === catalogId);
    if (entry) {
      entry.seenVersion = version;
      saveMyApps();
    }
  }

  // ── Release data cache ───────────────────────────────────────────────────────
  // { [catalogId]: { version, fetchedAt, error } }
  let releases = {};

  function loadReleases() {
    try {
      const saved = localStorage.getItem(RELEASES_KEY);
      if (saved) releases = JSON.parse(saved);
    } catch { releases = {}; }
  }

  function saveReleases() {
    try { localStorage.setItem(RELEASES_KEY, JSON.stringify(releases)); } catch {}
  }

  function setRelease(catalogId, data) {
    releases[catalogId] = { ...data, fetchedAt: Date.now() };
    saveReleases();
  }

  function getRelease(catalogId) {
    return releases[catalogId] || null;
  }

  function getDashboardStats() {
    const tracked = myApps.length;
    let newReleases = 0;
    let upToDate = 0;
    let unknown = 0;
    for (const app of myApps) {
      const rel = releases[app.id];
      if (!rel || rel.error) { unknown++; continue; }
      const isNew = app.seenVersion && rel.version && rel.version !== app.seenVersion;
      const isFirst = !app.seenVersion && rel.version;
      if (isNew || isFirst) { newReleases++; } else { upToDate++; }
    }
    return { tracked, newReleases, upToDate, unknown };
  }

  // ── Bootstrap ────────────────────────────────────────────────────────────────
  function load() {
    loadPackages();
    loadMyApps();
    loadReleases();
  }

  return {
    load,
    // packages
    setAll, getAll, getById, update: updatePkg, getStats,
    // my apps
    addApp, removeApp, isTracked, getMyApps, markSeen,
    // releases
    setRelease, getRelease, getDashboardStats,
  };
})();
