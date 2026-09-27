// lib/ratelimit.js
// Simple in-memory cooldown tracker. Not persisted — resets on restart, which is fine
// for a per-session rate limit like this.

const lastUsed = new Map(); // key -> timestamp of last allowed use

// Returns { allowed: true } if enough time has passed since this key's last use
// (and records this use), or { allowed: false, waitMs } if still on cooldown.
function checkCooldown(key, cooldownMs) {
  const now = Date.now();
  const last = lastUsed.get(key) || 0;
  const elapsed = now - last;

  if (elapsed < cooldownMs) {
    return { allowed: false, waitMs: cooldownMs - elapsed };
  }

  lastUsed.set(key, now);
  return { allowed: true };
}

module.exports = { checkCooldown };
