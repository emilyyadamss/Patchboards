// PatchBoards · store.js
// myApps   — catalog IDs the admin has added to the dashboard
// releases — per-app dual-platform version cache { mac: {…}, win: {…} }

const MY_APPS_KEY  = 'patchboards_myapps_v2';
const RELEASES_KEY = 'patchboards_releases_v2';

const Store = (() => {

  // ── My Apps ──────────────────────────────────────────────────────────────────
  // Each entry: { id, addedAt, seenMac, seenWin }
  let myApps = [];

  function loadMyApps() {
    try {
      const s = localStorage.getItem(MY_APPS_KEY);
      if (s) myApps = JSON.parse(s);
    } catch { myApps = []; }
  }

  function saveMyApps() {
    try { localStorage.setItem(MY_APPS_KEY, JSON.stringify(myApps)); } catch {}
  }

  function addApp(id) {
    if (myApps.find(a => a.id === id)) return;
    myApps.push({ id, addedAt: Date.now(), seenMac: null, seenWin: null });
    saveMyApps();
  }

  function removeApp(id) {
    myApps = myApps.filter(a => a.id !== id);
    saveMyApps();
  }

  function isTracked(id) { return myApps.some(a => a.id === id); }

  function getMyApps() { return myApps; }

  function markSeenMac(id, version) {
    const e = myApps.find(a => a.id === id);
    if (e) { e.seenMac = version; saveMyApps(); }
  }

  function markSeenWin(id, version) {
    const e = myApps.find(a => a.id === id);
    if (e) { e.seenWin = version; saveMyApps(); }
  }

  function markSeenAll(id) {
    const e = myApps.find(a => a.id === id);
    const rel = releases[id];
    if (e && rel) {
      if (rel.mac?.version) e.seenMac = rel.mac.version;
      if (rel.win?.version) e.seenWin = rel.win.version;
      saveMyApps();
    }
  }

  // ── Release cache ────────────────────────────────────────────────────────────
  // releases[id] = { mac: { version, sourceUrl, error } | null,
  //                  win: { version, sourceUrl, error } | null,
  //                  fetchedAt }
  let releases = {};

  function loadReleases() {
    try {
      const s = localStorage.getItem(RELEASES_KEY);
      if (s) releases = JSON.parse(s);
    } catch { releases = {}; }
  }

  function saveReleases() {
    try { localStorage.setItem(RELEASES_KEY, JSON.stringify(releases)); } catch {}
  }

  function setRelease(id, data) {
    releases[id] = { ...data, fetchedAt: Date.now() };
    // First-time baseline: auto-set seenMac/seenWin so we don't flag everything as "new" on first load
    const entry = myApps.find(a => a.id === id);
    if (entry) {
      if (entry.seenMac === null && data.mac?.version) entry.seenMac = data.mac.version;
      if (entry.seenWin === null && data.win?.version) entry.seenWin = data.win.version;
      saveMyApps();
    }
    saveReleases();
  }

  function getRelease(id) { return releases[id] || null; }

  // ── Cross-platform stats ─────────────────────────────────────────────────────
  function isNewRelease(entry, rel, platform) {
    if (!rel) return false;
    const data = rel[platform];
    const seen = entry[platform === 'mac' ? 'seenMac' : 'seenWin'];
    return !!(data?.version && seen && data.version !== seen);
  }

  function getDashboardStats() {
    let newReleases = 0, upToDate = 0, unknown = 0;
    for (const entry of myApps) {
      const rel = releases[entry.id];
      if (!rel) { unknown++; continue; }
      const macNew = isNewRelease(entry, rel, 'mac');
      const winNew = isNewRelease(entry, rel, 'win');
      if (macNew || winNew) newReleases++;
      else if (rel.mac?.version || rel.win?.version) upToDate++;
      else unknown++;
    }
    return { tracked: myApps.length, newReleases, upToDate, unknown };
  }

  // ── Bootstrap ────────────────────────────────────────────────────────────────
  function load() {
    loadMyApps();
    loadReleases();
  }

  return {
    load,
    addApp, removeApp, isTracked, getMyApps, markSeenMac, markSeenWin, markSeenAll,
    setRelease, getRelease, getDashboardStats, isNewRelease,
  };
})();
