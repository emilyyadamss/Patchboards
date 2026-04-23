// Copy this to config.js and fill in your values.
// config.js is gitignored — never commit real tokens here.

const CONFIG = {
  // GitHub personal access token — optional but recommended.
  // Without it: 60 API requests/hour. With it: 5 000/hour.
  // Create at https://github.com/settings/tokens/new (no scopes needed).
  GITHUB_TOKEN: '',

  // Anthropic API key — optional, only needed for AI CVE scanning.
  ANTHROPIC_API_KEY: 'YOUR_API_KEY_HERE',

  // Local server URL — optional, only needed for installed-package scanning.
  SERVER_URL: 'http://localhost:4242',

  MODEL: 'claude-sonnet-4-20250514',
  MAX_TOKENS: 512,
};
