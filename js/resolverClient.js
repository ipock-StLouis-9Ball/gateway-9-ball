// ============================================================================
// resolverClient.js — Adapter that picks the authoritative shot resolver.
// ============================================================================

import { resolveShot } from './rules.js';

const RESOLVER_URL = '__PORT_8787__';
const HAS_BACKEND = typeof RESOLVER_URL === 'string' && !RESOLVER_URL.startsWith('__');

let _online = HAS_BACKEND;

export function hasBackend() {
  return HAS_BACKEND;
}

export function isOnline() {
  return _online && HAS_BACKEND;
}

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
      _online = false;
    }
  }
  return await resolveShot(input);
}
