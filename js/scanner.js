// PatchBoards · scanner.js
// Uses the Anthropic API + web search to check for CVEs and security advisories.
// This supplements the native package manager data (which doesn't flag CVEs).

const Scanner = (() => {

  function buildPrompt(name, version, latest, channelLabel) {
    const hasUpdate = latest && latest !== version;
    // Qualify the display name with the channel when it differs from the default release
    // e.g. "Mozilla Firefox" + "ESR (Extended Support Release)" → "Mozilla Firefox ESR (Extended Support Release)"
    const isNonDefaultChannel = channelLabel && !/^standard|^release$/i.test(channelLabel);
    const displayName = isNonDefaultChannel ? `${name} ${channelLabel}` : name;

    const channelNote = isNonDefaultChannel
      ? `\nIMPORTANT: This is the "${channelLabel}" channel, which follows its own versioning track separate from the standard release. Only consider CVEs and advisories that apply specifically to this channel and version — do not conflate with the standard release version numbers.`
      : '';

    return `You are a software security researcher. For the software "${displayName}" (installed: ${version}${hasUpdate ? `, available: ${latest}` : ''}):${channelNote}

1. Is there a known CVE or security vulnerability in version ${version}?
2. If an update to ${latest || 'a newer version'} is available, does it patch any security issues?

Respond ONLY with a valid JSON object — no markdown, no explanation:
{
  "isSecurity": true or false,
  "cves": ["CVE-2024-XXXX"],
  "note": "One sentence summary. Include CVE IDs if relevant.",
  "sourceUrl": "https://official-security-advisory-or-changelog-url"
}

Rules:
- "isSecurity" is true only if there is a confirmed CVE or security advisory
- "cves" is an empty array if none apply
- "sourceUrl" should be an official advisory, GitHub security release, or NVD link`;
  }

  async function checkPackage(name, version, latest, channelLabel = null) {
    const apiKey = CONFIG.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      throw new Error('No API key set in js/config.js');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: CONFIG.MODEL,
        max_tokens: CONFIG.MAX_TOKENS,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: buildPrompt(name, version, latest, channelLabel) }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Could not parse AI response');

    const result = JSON.parse(match[0]);
    return {
      isSecurity: !!result.isSecurity,
      cves:       result.cves || [],
      note:       result.note || '',
      sourceUrl:  result.sourceUrl || '',
    };
  }

  return { checkPackage };
})();
