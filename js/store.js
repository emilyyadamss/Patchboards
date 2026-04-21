// PatchBoards · store.js
// In-memory + localStorage package state.

const STORAGE_KEY = 'patchboards_v2';

const Store = (() => {
  let packages = [];

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) packages = JSON.parse(saved);
    } catch { packages = []; }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(packages)); } catch {}
  }

  // Replace the entire package list (called after a system refresh)
  function setAll(pkgs) {
    packages = pkgs;
    save();
  }

  function getAll() { return packages; }

  function getById(id) { return packages.find(p => p.id === id); }

  function update(id, changes) {
    const idx = packages.findIndex(p => p.id === id);
    if (idx === -1) return;
    packages[idx] = { ...packages[idx], ...changes };
    save();
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

  return { load, save, setAll, getAll, getById, update, getStats };
})();
