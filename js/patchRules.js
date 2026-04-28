// PatchBoards · patchRules.js
// Single source of truth for per-app patch scheduling policy.
//
// PATCH_RULES — static config. Edit schedules here.
// PatchRules  — runtime module. Handles expedite overrides (localStorage)
//               and the decision function.
//
// schedule values:
//   'immediate'    → patch as soon as a release is detected
//   'end-of-month' → defer to the next monthly patch window
//   'cyber-review' → route to cyber team before patching

const PATCH_RULES = {

  // ── Exceptions to immediate (defer to monthly cycle) ─────────────────────────
  'google-chrome':      { schedule: 'end-of-month' },

  // ── Requires cyber team approval before patching ─────────────────────────────
  'tor-browser':        { schedule: 'cyber-review' },
  'wireshark':          { schedule: 'cyber-review' },
  'malwarebytes':       { schedule: 'cyber-review' },
  'keepassxc':          { schedule: 'cyber-review' },
  'little-snitch':      { schedule: 'cyber-review' },
  'nordvpn':            { schedule: 'cyber-review' },
  'expressvpn':         { schedule: 'cyber-review' },
  'veracrypt':          { schedule: 'cyber-review' },

  // ── Default: patch as soon as a new release is detected ──────────────────────
  _default:             { schedule: 'immediate' },
};

const EXPEDITE_KEY = 'patchboards_expedite_v1';

const PatchRules = (() => {
  let _expedites = {};

  function load() {
    try {
      const s = localStorage.getItem(EXPEDITE_KEY);
      if (s) _expedites = JSON.parse(s);
    } catch { _expedites = {}; }
  }

  function _save() {
    try { localStorage.setItem(EXPEDITE_KEY, JSON.stringify(_expedites)); } catch {}
  }

  function setExpedite(appId, value) {
    _expedites[appId] = !!value;
    _save();
  }

  // Returns { action, label, reason, isExpedited }
  // action is one of: 'patch-now' | 'defer' | 'route-cyber'
  function decide(appId) {
    const rule = PATCH_RULES[appId] ?? PATCH_RULES._default;
    const isExpedited = !!_expedites[appId];

    if (isExpedited) {
      return { action: 'patch-now', label: 'Patch Now', reason: 'Expedited by cyber team', isExpedited: true };
    }

    if (rule.schedule === 'immediate') {
      return { action: 'patch-now', label: 'Patch Now', reason: 'Scheduled: immediate deployment', isExpedited: false };
    }

    if (rule.schedule === 'end-of-month') {
      return { action: 'defer', label: 'Defer', reason: 'Scheduled: end-of-month patch cycle', isExpedited: false };
    }

    if (rule.schedule === 'cyber-review') {
      return { action: 'route-cyber', label: 'Cyber Review', reason: 'Requires cyber team approval', isExpedited: false };
    }

    return { action: 'defer', label: 'Defer', reason: 'No rule matched — defaulting to defer', isExpedited: false };
  }

  return { load, setExpedite, decide };
})();
