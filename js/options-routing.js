// Options routing is isolated so the legacy app router remains compatible.
const screens = ['menu', 'lobby', 'store', 'wallet', 'options', 'game'];
function openOptions() {
  if (window.__complianceLocked) return;
  screens.forEach((name) => document.getElementById(`screen-${name}`)?.classList.toggle('hidden', name !== 'options'));
}
document.addEventListener('click', (event) => {
  const target = event.target.closest?.('[data-goto="options"]');
  if (target) { event.preventDefault(); event.stopImmediatePropagation(); openOptions(); }
}, true);
