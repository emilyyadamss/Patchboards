// PatchBoards · store.js
// myApps   — catalog IDs the admin tracks, each storing the version they have deployed
// releases — per-app dual-platform latest-version cache { mac: {…}, win: {…} }

const MY_APPS_KEY      = 'patchboards_myapps_v3';
const RELEASES_KEY     = 'patchboards_releases_v2';
const CUSTOM_KEY       = 'patchboards_custom_v1';
const MANUAL_CHECKS_KEY = 'patchboards_manual_checks_v1';

const Store = (() => {

  // ── My Apps ──────────────────────────────────────────────────────────────────
  // Each entry: { id, addedAt, currentVersion }
  // currentVersion — the version the admin says they have deployed (null if not set)
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

  function addApp(id, currentVersion = null, channel = null) {
    if (myApps.find(a => a.id === id)) return;
    const now = Date.now();
    myApps.push({ id, addedAt: now, currentVersion: currentVersion || null, channel: channel || null, versionSetAt: currentVersion ? now : null });
    saveMyApps();
  }

  function removeApp(id) {
    myApps = myApps.filter(a => a.id !== id);
    saveMyApps();
  }

  function isTracked(id) { return myApps.some(a => a.id === id); }

  function getMyApps() { return myApps; }

  function setCurrentVersion(id, version) {
    const e = myApps.find(a => a.id === id);
    if (e) { e.currentVersion = version || null; e.versionSetAt = version ? Date.now() : null; saveMyApps(); }
  }

  function setChannel(id, channel) {
    const e = myApps.find(a => a.id === id);
    if (e) { e.channel = channel || null; saveMyApps(); }
  }

  // ── Custom Apps ──────────────────────────────────────────────────────────────
  let customApps = [];

  function loadCustomApps() {
    try {
      const s = localStorage.getItem(CUSTOM_KEY);
      if (s) customApps = JSON.parse(s);
    } catch { customApps = []; }
  }

  function saveCustomApps() {
    try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(customApps)); } catch {}
  }

  function addCustomApp(app) {
    customApps.push(app);
    saveCustomApps();
  }

  function removeCustomApp(id) {
    customApps = customApps.filter(a => a.id !== id);
    saveCustomApps();
  }

  function getCustomApps() { return customApps; }

  // ── Manual checks ─────────────────────────────────────────────────────────────
  // manualChecks[id] = timestamp (ms) of last manual check
  let manualChecks = {};

  function loadManualChecks() {
    try {
      const s = localStorage.getItem(MANUAL_CHECKS_KEY);
      if (s) manualChecks = JSON.parse(s);
    } catch { manualChecks = {}; }
  }

  function saveManualChecks() {
    try { localStorage.setItem(MANUAL_CHECKS_KEY, JSON.stringify(manualChecks)); } catch {}
  }

  function setManualCheck(id) {
    manualChecks[id] = Date.now();
    saveManualChecks();
  }

  function getManualCheck(id) { return manualChecks[id] || null; }

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
    saveReleases();
  }

  function getRelease(id) { return releases[id] || null; }

  // ── Comparison logic ─────────────────────────────────────────────────────────
  // Returns true if the latest version on this platform is newer than currentVersion.
  function isNewRelease(entry, rel, platform) {
    if (!rel || !entry.currentVersion) return false;
    const latest = rel[platform]?.version;
    return !!(latest && latest !== entry.currentVersion);
  }

  function getDashboardStats() {
    let newReleases = 0, upToDate = 0, unknown = 0;
    for (const entry of myApps) {
      if (!entry.currentVersion) { unknown++; continue; }
      const rel = releases[entry.id];
      if (!rel) { unknown++; continue; }
      if (isNewRelease(entry, rel, 'mac') || isNewRelease(entry, rel, 'win')) {
        newReleases++;
      } else if (rel.mac?.version || rel.win?.version) {
        upToDate++;
      } else {
        unknown++;
      }
    }
    return { tracked: myApps.length, newReleases, upToDate, unknown };
  }

  // ── Bootstrap ────────────────────────────────────────────────────────────────
  function load() {
    loadMyApps();
    loadReleases();
    loadCustomApps();
    loadManualChecks();
  }

  return {
    load,
    addApp, removeApp, isTracked, getMyApps, setCurrentVersion, setChannel,
    setRelease, getRelease, getDashboardStats, isNewRelease,
    addCustomApp, removeCustomApp, getCustomApps,
    setManualCheck, getManualCheck,
  };
})();
