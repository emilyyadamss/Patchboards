// PatchBoards fetcher.js
// Fetches latest release versions for catalog apps. No local agent required.
//
// Mac for Homebrew public API   (no auth needed)
//         https://formulae.brew.sh/api/cask/{name}.json
//         https://formulae.brew.sh/api/formula/{name}.json
//
// Win for Priority chain per app:
//   1. GitHub Releases API  (apps with catalog.github field)
//         https://api.github.com/repos/{owner}/{repo}/releases/latest
//   2. winget.run public API  (apps with catalog.winget field, no auth)
//         https://winget.run/api/v2/packages/{Publisher}/{Name}
//   3. winget-pkgs repo listing  (fallback)
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

  function cleanVersion(tagName) {
    if (!tagName) return null;
    let v = tagName.replace(/^[vV]/, '');
    v = v.replace(/\.windows\.\d+$/, '');
    return v || null;
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

  // ── GitHub Releases (Windows — open-source apps) ────────────────────────────
  async function fetchGitHubRelease(repoPath) {
    const headers = { Accept: 'application/vnd.github.v3+json' };
    if (CONFIG.GITHUB_TOKEN) headers['Authorization'] = `token ${CONFIG.GITHUB_TOKEN}`;

    const res = await fetch(
      `https://api.github.com/repos/${repoPath}/releases/latest`,
      { headers, signal: AbortSignal.timeout(10000) }
    );

    if (res.status === 404) throw new Error('No releases found on GitHub');
    if (res.status === 403) throw new Error('GitHub rate limit — add GITHUB_TOKEN in config.js');
    if (!res.ok)            throw new Error(`GitHub Releases API ${res.status}`);

    const d = await res.json();
    if (!d.tag_name)  throw new Error('No tag_name in response');
    if (d.prerelease) throw new Error('Latest release is a pre-release');

    return {
      version:   cleanVersion(d.tag_name),
      sourceUrl: d.html_url || `https://github.com/${repoPath}/releases`,
    };
  }

  // ── winget.run public API (Windows — commercial apps) ───────────────────────
  async function fetchWingetRun(packageId) {
    if (!packageId) throw new Error('No winget ID');
    const dot = packageId.indexOf('.');
    if (dot < 0) throw new Error('Invalid winget package ID for winget.run');
    const publisher = packageId.slice(0, dot);
    const pkg       = packageId.slice(dot + 1);

    const res = await fetch(
      `https://winget.run/api/v2/packages/${encodeURIComponent(publisher)}/${encodeURIComponent(pkg)}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (res.status === 404) throw new Error('Package not found on winget.run');
    if (!res.ok)            throw new Error(`winget.run API ${res.status}`);

    const d = await res.json();
    const versions = (d.Versions || []).map(v => v.PackageVersion).filter(Boolean);
    const latest   = pickLatest(versions);
    if (!latest) throw new Error('No versions found on winget.run');

    return {
      version:   latest,
      sourceUrl: `https://winget.run/pkg/${publisher}/${pkg}`,
    };
  }

  // ── winget-pkgs GitHub repo (Windows — fallback) ─────────────────────────────
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

  // ── Windows version dispatch: GitHub Releases → winget.run → winget-pkgs ────
  async function fetchWindowsVersion(catalogApp) {
    if (catalogApp.github) {
      try { return await fetchGitHubRelease(catalogApp.github); }
      catch (e) { console.debug(`[GH Releases] ${catalogApp.id}: ${e.message}`); }
    }

    if (catalogApp.winget) {
      try { return await fetchWingetRun(catalogApp.winget); }
      catch (e) { console.debug(`[winget.run] ${catalogApp.id}: ${e.message}`); }
    }

    if (catalogApp.winget) {
      return await fetchWinget(catalogApp.winget);
    }

    throw new Error('No Windows source available');
  }

  // ── Fetch both platforms in parallel ────────────────────────────────────────
  async function fetchBoth(catalogApp, entry = null) {
    // Resolve channel-specific brew/winget overrides when applicable
    let effectiveApp = catalogApp;
    if (entry?.channel && catalogApp.channels) {
      const ch = catalogApp.channels.find(c => c.id === entry.channel);
      if (ch) {
        effectiveApp = {
          ...catalogApp,
          brew:   ch.brew   !== undefined ? ch.brew   : catalogApp.brew,
          winget: ch.winget !== undefined ? ch.winget : catalogApp.winget,
        };
      }
    }

    const [macResult, winResult] = await Promise.allSettled([
      effectiveApp.brew
        ? (effectiveApp.brewType === 'formula'
            ? fetchBrewFormula(effectiveApp.brew)
            : fetchBrewCask(effectiveApp.brew))
        : Promise.reject(new Error('No brew package')),

      (effectiveApp.winget || effectiveApp.github)
        ? fetchWindowsVersion(effectiveApp)
        : Promise.reject(new Error('No Windows package')),
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
      const result = await fetchBoth(app, entry);
      if (onProgress) onProgress(entry.id, result);
    }
  }

  return { fetchBoth, fetchAll };
})();
