// PatchBoards · fetcher.js
// Fetches latest version data for catalog apps.
//
// Mac apps:  Homebrew public API (no server needed)
//            https://formulae.brew.sh/api/cask/{name}.json
//            https://formulae.brew.sh/api/formula/{name}.json
// Win apps:  Local server endpoint /winget-version?package={id}

const Fetcher = (() => {

  async function fetchBrewCask(caskName) {
    const res = await fetch(
      `https://formulae.brew.sh/api/cask/${encodeURIComponent(caskName)}.json`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error(`Homebrew API ${res.status}`);
    const data = await res.json();
    return {
      version:   data.version || null,
      homepage:  data.homepage || null,
      sourceUrl: `https://formulae.brew.sh/cask/${caskName}`,
    };
  }

  async function fetchBrewFormula(formulaName) {
    const res = await fetch(
      `https://formulae.brew.sh/api/formula/${encodeURIComponent(formulaName)}.json`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error(`Homebrew API ${res.status}`);
    const data = await res.json();
    return {
      version:   data.versions?.stable || data.version || null,
      homepage:  data.homepage || null,
      sourceUrl: `https://formulae.brew.sh/formula/${formulaName}`,
    };
  }

  async function fetchWinget(packageId) {
    const res = await fetch(
      `${CONFIG.SERVER_URL}/winget-version?package=${encodeURIComponent(packageId)}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) throw new Error(`Server ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return {
      version:   data.version || null,
      sourceUrl: data.sourceUrl || null,
    };
  }

  // Fetch latest version for a catalog app.
  // Returns { version, sourceUrl, manager } or throws.
  async function fetchAppVersion(catalogApp) {
    // Prefer brew (works without local server for Mac apps)
    if (catalogApp.brew) {
      const type = catalogApp.brewType === 'formula' ? 'formula' : 'cask';
      const result = type === 'formula'
        ? await fetchBrewFormula(catalogApp.brew)
        : await fetchBrewCask(catalogApp.brew);
      return { ...result, manager: type === 'formula' ? 'homebrew' : 'homebrew-cask' };
    }

    // Fall back to winget via local server
    if (catalogApp.winget) {
      const result = await fetchWinget(catalogApp.winget);
      return { ...result, manager: 'winget' };
    }

    throw new Error('No package source available');
  }

  // Fetch versions for all tracked apps, calling onProgress(id, result) after each.
  async function fetchAll(myApps, onProgress) {
    const results = {};
    for (const entry of myApps) {
      const app = getCatalogApp(entry.id);
      if (!app) continue;
      try {
        const data = await fetchAppVersion(app);
        results[entry.id] = { ...data, error: null };
      } catch (err) {
        results[entry.id] = { version: null, error: err.message };
      }
      if (onProgress) onProgress(entry.id, results[entry.id]);
    }
    return results;
  }

  return { fetchAppVersion, fetchAll };
})();
