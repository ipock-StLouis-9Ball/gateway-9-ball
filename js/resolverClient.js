// ============================================================================
// resolverClient.js — Client-side local shot resolution interface.
// ============================================================================

import { executePyodideShot } from './physicsBridge.js';

export function hasBackend() {
  return false;
}

export function isOnline() {
  return false;
}

export async function resolveShotRemote(input) {
  // Direct execution via Pyodide pooltool simulation engine
  return await executePyodideShot(input);
}
