// ============================================================================
// resolverClient.js — Adapter that picks the authoritative shot resolver.
//
// In the sandbox preview a backend server runs on a local port and the
// deploy step rewrites __PORT_8787__ to the proxy URL that reaches it, so the
// preview is genuinely server-authoritative. On a static host (e.g. GitHub
// Pages) there is no backend, so we fall back to the in-browser resolveShot —
// the same deterministic function the server runs — keeping the game playable.
//
// NOTE: This is an MVP local mock. The client currently sends the pre-shot
// state + shot intent and trusts the returned outcome. True anti-cheat (server
// holds the canonical match state and the client only sends shot intent) is a
// production phase.
// ============================================================================

import { resolveShot } from './rules.js';

// Placeholder rewritten by deploy_website to the sandbox proxy URL.
// Left as the literal token when there is no backend (static host).
const RESOLVER_URL = '__PORT_8787__';
const HAS_BACKEND = typeof RESOLVER_URL === 'string' && !RESOLVER_URL.startsWith('__');

let _online = HAS_BACKEND; // optimistic; set false on first failure

export function hasBackend() {
  return HAS_BACKEND;
}

export function isOnline() {
  return _online && HAS_BACKEND;
}

// Resolve a shot. Always resolves (never throws): tries the server, falls
// back to the local resolver. Returns the same shape as resolveShot().
export async function resolveShotRemote(input) {
  if (HAS_BACKEND && _online) {
    try {
      const r = await fetch(RESOLVER_URL.replace(/\/$/, '') + '/resolve-shot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!r.ok) throw new Error('http ' + r.status);
      const j = await r.json();
      return j;
    } catch {
      _online = false; // stop retrying; use local for the rest of the session
    }
  }
  // Fallback: identical deterministic resolver, runs in-page.
  return resolveShot(input);
}
