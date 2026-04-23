// PatchBoards · fetcher.js
// Fetches latest release versions for catalog apps — no local agent required.
//
// Mac  → Homebrew public API   (no auth needed)
//         https://formulae.brew.sh/api/cask/{name}.json
//         https://formulae.brew.sh/api/formula/{name}.json
//
// Win  → GitHub winget-pkgs repo directory listing
//         https://api.github.com/repos/microsoft/winget-pkgs/contents/manifests/…
//         60 req/hr unauthenticated → set CONFIG.GITHUB_TOKEN for 5 000/hr

const Fetcher = (() => {

  // ── Version sorting ──────────────────────────────────────────────────────────
  function compareVersions(a, b) {
    const toNums = s => s.replace(/[^0-9.]/g, '').split('.').map(Number);
    const aN = toNums(a), bN = toNums(b);
    for (let i = 0; i < Math.max(aN.length, bN.length); i++) {
      const d = (aN[i] || 0) - (bN[i] || 0);
      if (d !== 0) return d;
    }
    return 0;
  }

  function pickLatest(versions) {
    // Prefer stable releases over pre-releases
    const stable = versions.filter(v =>
      !/[-](alpha|beta|rc|pre|canary|nightly)/i.test(v) &&
      !/preview|insider/i.test(v)
    );
    return [...(stable.length ? stable : versions)]
      .sort((a, b) => compareVersions(b, a))[0] || null;
  }

  // ── Homebrew (Mac) ───────────────────────────────────────────────────────────
  async function fetchBrewCask(caskName) {
    const res = await fetch(
      `https://formulae.brew.sh/api/cask/${encodeURIComponent(caskName)}.json`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error(`Homebrew API ${res.status}`);
    const d = await res.json();
    return {
      version:   d.version || null,
      sourceUrl: `https://formulae.brew.sh/cask/${caskName}`,
    };
  }

  async function fetchBrewFormula(formulaName) {
    const res = await fetch(
      `https://formulae.brew.sh/api/formula/${encodeURIComponent(formulaName)}.json`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error(`Homebrew API ${res.status}`);
    const d = await res.json();
    return {
      version:   d.versions?.stable || d.version || null,
      sourceUrl: `https://formulae.brew.sh/formula/${formulaName}`,
    };
  }

  // ── winget-pkgs GitHub repo (Windows) ───────────────────────────────────────
  // Package ID "Google.Chrome" → manifests/g/Google/Chrome
  function wingetIdToPath(packageId) {
    const dot = packageId.indexOf('.');
    if (dot < 0) return null;
    const publisher = packageId.slice(0, dot);
    const pkg       = packageId.slice(dot + 1);
    return `manifests/${publisher[0].toLowerCase()}/${publisher}/${pkg}`;
  }

  async function fetchWinget(packageId) {
    const path = wingetIdToPath(packageId);
    if (!path) throw new Error('Invalid winget package ID');

    const headers = { Accept: 'application/vnd.github.v3+json' };
    if (CONFIG.GITHUB_TOKEN) headers['Authorization'] = `token ${CONFIG.GITHUB_TOKEN}`;

    const res = await fetch(
      `https://api.github.com/repos/microsoft/winget-pkgs/contents/${path}`,
      { headers, signal: AbortSignal.timeout(10000) }
    );

    if (res.status === 404) throw new Error('Package not found in winget-pkgs');
    if (res.status === 403) throw new Error('GitHub rate limit — add GITHUB_TOKEN in config.js');
    if (!res.ok)            throw new Error(`GitHub API ${res.status}`);

    const items    = await res.json();
    const versions = items.filter(i => i.type === 'dir').map(i => i.name);
    const latest   = pickLatest(versions);
    if (!latest) throw new Error('No stable versions found');

    return {
      version:   latest,
      sourceUrl: `https://github.com/microsoft/winget-pkgs/tree/master/${path}/${latest}`,
    };
  }

  // ── Fetch both platforms in parallel ────────────────────────────────────────
  async function fetchBoth(catalogApp) {
    const [macResult, winResult] = await Promise.allSettled([
      catalogApp.brew
        ? (catalogApp.brewType === 'formula'
            ? fetchBrewFormula(catalogApp.brew)
            : fetchBrewCask(catalogApp.brew))
        : Promise.reject(new Error('No brew package')),

      catalogApp.winget
        ? fetchWinget(catalogApp.winget)
        : Promise.reject(new Error('No winget package')),
    ]);

    return {
      mac: macResult.status === 'fulfilled'
        ? { ...macResult.value,  error: null }
        : { version: null, sourceUrl: null, error: macResult.reason?.message },
      win: winResult.status === 'fulfilled'
        ? { ...winResult.value,  error: null }
        : { version: null, sourceUrl: null, error: winResult.reason?.message },
    };
  }

  // Fetch all tracked apps sequentially, calling onProgress after each
  async function fetchAll(myApps, onProgress) {
    for (const entry of myApps) {
      const app = getCatalogApp(entry.id);
      if (!app) continue;
      const result = await fetchBoth(app);
      if (onProgress) onProgress(entry.id, result);
    }
  }

  return { fetchBoth, fetchAll };
})();
