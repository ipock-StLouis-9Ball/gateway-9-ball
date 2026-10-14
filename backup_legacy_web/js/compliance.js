// Startup compliance gate. It runs before app.js because index.html imports it first.
const RESTRICTED_STATES = Object.freeze(['AR', 'CT', 'DE', 'LA', 'SD']);
const state = new URLSearchParams(location.search).get('state') || localStorage.getItem('player_state') || window.__PLAYER_STATE__ || '';
const restricted = RESTRICTED_STATES.includes(String(state).trim().toUpperCase());
window.__complianceLocked = restricted;
window.__restrictedStates = RESTRICTED_STATES;
if (restricted) {
  const show = () => document.getElementById('compliance-lock')?.classList.remove('hidden');
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, { once: true }); else show();
}
export { RESTRICTED_STATES, restricted };
