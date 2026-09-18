// Geo-compliance is checked before the menu is shown.
const RESTRICTED_STATES = ['AR', 'CT', 'DE', 'LA', 'SD'];
let complianceLocked = false;
function getLocationState() {
  const params = new URLSearchParams(window.location.search);
  return (params.get('state') || window.localStorage.getItem('player_state') || window.__PLAYER_STATE__ || '').trim().toUpperCase();
}
function enforceGeolock() {
  const state = getLocationState();
  if (!RESTRICTED_STATES.includes(state)) return false;
  complianceLocked = true;
  document.getElementById('compliance-lock')?.classList.remove('hidden');
  return true;
}
function bindOptions() {
  document.getElementById('sound-toggle')?.addEventListener('change', (e) => { State.settings.sound = e.target.checked; });
  document.getElementById('master-volume')?.addEventListener('input', (e) => { State.settings.volume = Number(e.target.value); });
  document.getElementById('language-select')?.addEventListener('change', (e) => { State.settings.language = e.target.value; });
}
// Replace the existing screen list with the options screen included in the production menu.
const originalShow = show;
show = function(name) { if (complianceLocked) return; return originalShow(name); };
document.querySelectorAll('[data-goto]').forEach((el) => el.addEventListener('click', (e) => { if (complianceLocked) { e.preventDefault(); e.stopImmediatePropagation(); } }));
const appBoot = boot;
boot = async function() { if (enforceGeolock()) return; bindOptions(); await appBoot(); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => enforceGeolock()); else enforceGeolock();
