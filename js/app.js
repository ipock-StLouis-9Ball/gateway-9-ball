// ============================================================================
// app.js — Screen routing, store/wallet UI, game HUD controls, bootstrap.
// ============================================================================

import { State, Wallet, Store } from './state.js';
import { Renderer } from './renderer.js';
import { Game } from './game.js';
import { ECONOMY, STORE_ITEMS, TABLE_COLORS, BALL_SKINS, CUE_STICKS } from './config.js';

// ---------- Screen routing ----------
const screens = ['menu', 'lobby', 'store', 'wallet', 'game'];
function show(name) {
  screens.forEach((s) => document.getElementById('screen-' + s).classList.toggle('hidden', s !== name));
  if (name === 'menu') refreshMenu();
  if (name === 'wallet') { document.getElementById('wd-result').textContent = ''; refreshWallet(); }
  if (name === 'store') refreshStore();
  if (name === 'lobby') refreshLobby();
}
document.querySelectorAll('[data-goto]').forEach((el) => {
  el.addEventListener('click', () => {
    const t = el.dataset.goto;
    if (t === 'practice') startGame({ practice: true });
    else show(t);
  });
});

// ---------- Menu ----------
function refreshMenu() {
  document.getElementById('menu-balance').textContent = fmt(Wallet.balance());
}
document.getElementById('menu-add').addEventListener('click', () => show('wallet'));

// ---------- Match lobby ----------
let selectedTier = null;
function refreshLobby() {
  const grid = document.getElementById('tier-grid');
  grid.innerHTML = '';
  ECONOMY.potTiers.forEach((pot) => {
    const buyIn = ECONOMY.buyInForPot(pot);
    const rake = ECONOMY.rakeForPot(pot);
    const card = document.createElement('div');
    card.className = 'tier-card';
    card.innerHTML = `<div class="tc-pot">DB$${pot}</div><div class="tc-buyin">DB$${buyIn.toFixed(2)} entry</div>`;
    card.addEventListener('click', () => {
      selectedTier = pot;
      [...grid.children].forEach((c) => c.classList.toggle('selected', c === card));
      updateLobbySummary();
    });
    grid.appendChild(card);
  });
  if (selectedTier == null) { selectedTier = ECONOMY.potTiers[0]; }
  [...grid.children].forEach((c, i) => c.classList.toggle('selected', ECONOMY.potTiers[i] === selectedTier));
  updateLobbySummary();
}
function updateLobbySummary() {
  const pot = selectedTier;
  const buyIn = ECONOMY.buyInForPot(pot);
  const rake = ECONOMY.rakeForPot(pot);
  const winner = pot - rake;
  const aff = Wallet.canAfford(buyIn);
  document.getElementById('lobby-summary').innerHTML = `
    <div class="row"><span>Match pot</span><span>DB$${pot.toFixed(2)}</span></div>
    <div class="row"><span>Your entry</span><span>DB$${buyIn.toFixed(2)}</span></div>
    <div class="row"><span>House rake</span><span>DB$${rake.toFixed(2)}</span></div>
    <div class="row"><span>Winner takes</span><span>DB$${winner.toFixed(2)}</span></div>`;
  const btn = document.getElementById('find-match');
  btn.disabled = !aff;
  btn.textContent = aff ? 'Find Match' : 'Insufficient balance';
}
document.getElementById('find-match').addEventListener('click', () => {
  const pot = selectedTier;
  const buyIn = ECONOMY.buyInForPot(pot);
  if (!Wallet.canAfford(buyIn)) return;
  Wallet.charge(buyIn);
  startGame({
    match: {
      pot, buyIn, rake: ECONOMY.rakeForPot(pot),
      bestOf: ECONOMY.bestOf,
      racksWon: [0, 0],
      result: null,
    },
  });
});

// ---------- Store ----------
let storeTab = 'tables';
function refreshStore() {
  document.getElementById('store-balance').textContent = fmt(Wallet.balance());
  document.querySelectorAll('.store-tabs .tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === storeTab));
  const grid = document.getElementById('store-grid');
  grid.innerHTML = '';
  STORE_ITEMS[storeTab].forEach((item) => {
    const owned = Store.isOwned(storeTab, item.id);
    const equipped = Store.isEquipped(storeTab, item.id);
    const div = document.createElement('div');
    div.className = 'store-item';
    // swatch preview
    let swatch = '';
    if (storeTab === 'tables') swatch = `<div class="swatch" style="background:${TABLE_COLORS[item.id].felt}"></div>`;
    else if (storeTab === 'cues') swatch = `<div class="swatch" style="background:linear-gradient(90deg,${CUE_STICKS[item.id].tip},${CUE_STICKS[item.id].shaft})"></div>`;
    else swatch = `<div class="swatch" style="background:${BALL_SKINS[item.id].colors[9]}"></div>`;
    let btnLabel, btnClass;
    if (equipped) { btnLabel = 'Equipped'; btnClass = 'equipped'; }
    else if (owned) { btnLabel = 'Equip'; btnClass = 'owned'; }
    else { btnLabel = `Buy DB$${item.price}`; btnClass = ''; }
    div.innerHTML = `${swatch}<div class="si-name">${item.name}</div><div class="si-price">${item.price ? 'DB$' + item.price.toFixed(2) : 'Free'}</div><button class="si-btn ${btnClass}">${btnLabel}</button>`;
    div.querySelector('.si-btn').addEventListener('click', () => {
      if (equipped) return;
      if (owned) { Store.equip(storeTab, item.id); }
      else {
        const r = Store.buy(storeTab, item.id);
        if (!r.ok) { alertMsg(r.error); return; }
      }
      refreshStore();
    });
    grid.appendChild(div);
  });
}
document.querySelectorAll('.store-tabs .tab').forEach((t) => t.addEventListener('click', () => { storeTab = t.dataset.tab; refreshStore(); }));

// ---------- Wallet ----------
function refreshWallet() {
  document.getElementById('wallet-balance').textContent = fmt(Wallet.balance());
  const dg = document.getElementById('dep-grid');
  dg.innerHTML = '';
  ECONOMY.depositOptions.forEach((amt) => {
    const fee = ECONOMY.depositFee(amt);
    const b = document.createElement('button');
    b.className = 'dep-btn';
    b.innerHTML = `<span class="dep-amt">+ DB$${amt.toFixed(2)}</span><span class="dep-fee">+ DB$${fee.toFixed(2)} fee</span>`;
    b.addEventListener('click', () => { Wallet.deposit(amt); refreshWallet(); });
    dg.appendChild(b);
  });
  document.getElementById('wd-amount').value = '';
  const hl = document.getElementById('history-list');
  hl.innerHTML = '';
  if (!State.wallet.history.length) hl.innerHTML = '<div class="muted small" style="padding:8px 0">No transactions yet</div>';
  State.wallet.history.slice(0, 20).forEach((h) => {
    const row = document.createElement('div');
    row.className = 'hist-row';
    let right;
    if (h.type === 'Deposit') {
      // Fee is a checkout cost paid externally; full amount is credited.
      right = `credit ${fmt(h.amount)} · fee DB$${h.fee.toFixed(2)} → ${fmt(h.balanceAfter)}`;
    } else if (h.type === 'Withdraw') {
      right = `${fmt(h.amount)} − fee DB$${h.fee.toFixed(2)} → ${fmt(h.balanceAfter)}`;
    } else {
      const fee = h.fee ? ` (fee DB$${h.fee.toFixed(2)})` : '';
      right = `${fmt(h.amount)}${fee} → ${fmt(h.balanceAfter)}`;
    }
    row.innerHTML = `<span>${h.type} · ${h.ts}</span><span>${right}</span>`;
    hl.appendChild(row);
  });
}
document.getElementById('wd-btn').addEventListener('click', () => {
  const amt = parseFloat(document.getElementById('wd-amount').value);
  const res = document.getElementById('wd-result');
  if (isNaN(amt)) { res.textContent = 'Enter an amount'; return; }
  const r = Wallet.withdraw(amt);
  if (!r.ok) { res.textContent = r.error; res.style.color = 'var(--cardinal-bright)'; return; }
  res.textContent = `Withdrew DB$${amt.toFixed(2)} — fee DB$${r.fee.toFixed(2)} — payout DB$${r.payout.toFixed(2)}`;
  res.style.color = 'var(--arch-gold)';
  refreshWallet();
});

// ---------- Game ----------
let game = null;
let renderer = null;

function startGame(opts) {
  show('game');
  // Apply owned cosmetics to renderer settings.
  const settings = { ...State.settings };
  const canvas = document.getElementById('game-canvas');
  renderer = new Renderer(canvas, settings);
  game = new Game(canvas, renderer, {
    practice: !!opts.practice,
    match: opts.match || null,
    wallet: Wallet,
    onHud: updateHud,
    onMatchOver: (m) => {
      const modal = document.getElementById('match-modal');
      document.getElementById('mm-title').textContent = m.result.winner === 0 ? 'Match Won' : 'Match Lost';
      const payout = m.result.winner === 0 ? `+DB$${m.result.payout.toFixed(2)} (rake DB$${m.result.rake.toFixed(2)})` : `Lost DB$${m.buyIn.toFixed(2)} entry`;
      document.getElementById('mm-detail').textContent = `Racks ${m.racksWon[0]}-${m.racksWon[1]} · ${payout}`;
      modal.classList.remove('hidden');
      refreshMenu();
    },
  });

  // Players
  document.getElementById('p1-name').textContent = State.profile.name;
  document.getElementById('p1-avatar').textContent = State.profile.avatar;
  document.getElementById('p2-name').textContent = State.opponent.name;
  document.getElementById('p2-avatar').textContent = State.opponent.avatar;
  document.getElementById('match-info').textContent = opts.practice ? 'Practice' : `Best of ${ECONOMY.bestOf} · Pot DB$${opts.match.pot.toFixed(2)}`;
  document.getElementById('match-modal').classList.add('hidden');

  // Resize after layout is visible.
  requestAnimationFrame(() => {
    renderer.resize();
    game.start();
  });

  window.__game = game;
  window.__renderer = renderer;
  bindGameControls();
}

function setFoulBadge(card, n) {
  let badge = card.querySelector('.foul-badge');
  if (n <= 0) { if (badge) badge.remove(); return; }
  if (!badge) { badge = document.createElement('div'); badge.className = 'foul-badge'; card.appendChild(badge); }
  badge.textContent = `Fouls ${n}/3`;
}

function updateHud(hud) {
  document.getElementById('p1-score').textContent = hud.match ? hud.match.racksWon[0] : '–';
  document.getElementById('p2-score').textContent = hud.match ? hud.match.racksWon[1] : '–';
  document.querySelector('.player-card.p1').classList.toggle('active', hud.currentPlayer === 0);
  document.querySelector('.player-card.p2').classList.toggle('active', hud.currentPlayer === 1);
  const t = document.getElementById('shot-timer');
  t.textContent = hud.shotTimer;
  t.parentElement.classList.toggle('warn', hud.shotTimer <= 8);
  // Cue-stick power fill mirrors the current charge (live during drag, synced here otherwise).
  if (!cueCharging) {
    document.getElementById('cue-power-fill').style.height = (hud.power * 100) + '%';
    positionCueStick(hud.power);
  }
  const banner = document.getElementById('msg-banner');
  if (hud.message) { banner.textContent = hud.message; banner.classList.remove('hidden'); }
  else banner.classList.add('hidden');
  // Push-out pill: only after a legal break, on your turn, while aiming.
  const pushBtn = document.getElementById('pushout-btn');
  pushBtn.classList.toggle('hidden', !hud.pushOutAvailable);
  pushBtn.disabled = !(hud.state === 'AIMING' && hud.currentPlayer === 0);
  if (!hud.pushOutAvailable) pushOutMode = false;
  pushBtn.classList.toggle('active', pushOutMode);
  // Push-out decision prompt (you are the chooser).
  const pd = document.getElementById('push-decision');
  pd.classList.toggle('hidden', !hud.pendingPushDecision);
  // Consecutive-foul badges.
  const p1 = document.querySelector('.player-card.p1');
  const p2 = document.querySelector('.player-card.p2');
  setFoulBadge(p1, hud.fouls ? hud.fouls[0] : 0);
  setFoulBadge(p2, hud.fouls ? hud.fouls[1] : 0);
  // English dot
  const dot = document.getElementById('eb-dot');
  dot.style.left = (50 + hud.english.x * 40) + '%';
  dot.style.top = (50 - hud.english.y * 40) + '%';
}

// ---------- Game controls ----------
let cueCharging = false;     // true while the player is pulling the cue stick
let cueStartY = 0;          // pointer Y at charge start
let cuePowerAtStart = 0;   // power when the current drag began
let pushOutMode = false;   // when true, the next release fires a push-out

// Translate the cue-stick graphic down to reflect the current charge.
function positionCueStick(powerFrac) {
  const stick = document.getElementById('cue-stick');
  const track = document.getElementById('cue-stick-track');
  if (!stick || !track) return;
  const maxPull = track.clientHeight * 0.26; // pullback range
  const pull = Math.max(0, Math.min(1, powerFrac)) * maxPull;
  stick.style.transform = `translate(-50%, ${pull}px)`;
}

function bindGameControls() {
  // --- Vertical cue-stick pullback mechanic ---
  // Drag DOWN on the stick to charge; release fires the spring-strike.
  const track = document.getElementById('cue-stick-track');
  const fill = document.getElementById('cue-power-fill');
  const chargeFromEvent = (e) => {
    if (!game || game.state !== 'AIMING' || game.currentPlayer !== 0) return;
    const rect = track.getBoundingClientRect();
    const maxPull = rect.height * 0.7; // drag range that maps to 0..100%
    const dy = Math.max(0, (e.clientY - cueStartY));
    let frac = Math.max(0, Math.min(1, dy / maxPull));
    // Snap to the 25/50/75 marks when very close, for tactile feel.
    for (const m of [0.25, 0.5, 0.75]) if (Math.abs(frac - m) < 0.035) frac = m;
    game.setPower(frac);
    fill.style.height = (frac * 100) + '%';
    positionCueStick(frac);
  };
  track.addEventListener('pointerdown', (e) => {
    if (!game || game.state !== 'AIMING' || game.currentPlayer !== 0) return;
    cueCharging = true;
    cueStartY = e.clientY;
    cuePowerAtStart = game.power;
    track.setPointerCapture(e.pointerId);
    chargeFromEvent(e);
  });
  track.addEventListener('pointermove', (e) => { if (cueCharging) chargeFromEvent(e); });
  const releaseCue = () => {
    if (!cueCharging) return;
    cueCharging = false;
    const firedPower = game.power;
    // Require a minimum pull so a tap doesn't fire a weak shot.
    if (firedPower >= 0.12 && game.state === 'AIMING' && game.currentPlayer === 0) {
      if (pushOutMode) { pushOutMode = false; game.pushOut(); }
      else game.shoot();
    }
    // Reset the stick graphic after the strike.
    setTimeout(() => { if (!cueCharging) { fill.style.height = '0%'; positionCueStick(0); } }, 220);
  };
  track.addEventListener('pointerup', releaseCue);
  track.addEventListener('pointercancel', releaseCue);

  // Push-out toggle pill: arms the next release as a push-out (after legal break).
  document.getElementById('pushout-btn').addEventListener('click', () => {
    if (!game || game.state !== 'AIMING' || game.currentPlayer !== 0) return;
    if (!game.pushOutAvailable) return;
    pushOutMode = !pushOutMode;
    document.getElementById('pushout-btn').classList.toggle('active', pushOutMode);
  });
  // Push-out decision: take or pass back
  document.getElementById('pd-take').addEventListener('click', () => game && game.takePush());
  document.getElementById('pd-pass').addEventListener('click', () => game && game.passPush());

  // English popover
  const pop = document.getElementById('english-pop');
  const epBall = document.querySelector('.ep-ball');
  document.getElementById('english-btn').addEventListener('click', (e) => { e.stopPropagation(); pop.classList.toggle('hidden'); });
  document.addEventListener('click', (e) => { if (!pop.contains(e.target) && e.target.id !== 'english-btn') pop.classList.add('hidden'); });
  const setEnglishFromEvent = (e) => {
    const rect = epBall.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left - rect.width / 2;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top - rect.height / 2;
    const ex = Math.max(-1, Math.min(1, cx / (rect.width / 2)));
    const ey = Math.max(-1, Math.min(1, -cy / (rect.height / 2)));
    if (game) game.setEnglish(ex, ey);
    document.getElementById('ep-dot').style.left = (50 + ex * 40) + '%';
    document.getElementById('ep-dot').style.top = (50 - ey * 40) + '%';
  };
  epBall.addEventListener('pointerdown', (e) => { setEnglishFromEvent(e); epBall.setPointerCapture(e.pointerId); });
  epBall.addEventListener('pointermove', (e) => { if (e.buttons) setEnglishFromEvent(e); });
  document.getElementById('ep-clear').addEventListener('click', () => { if (game) game.setEnglish(0, 0); });

  // Canvas aiming + ball-in-hand placement
  const canvas = document.getElementById('game-canvas');
  canvas.addEventListener('pointerdown', (e) => {
    if (!game) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    if (game.state === 'BALL_IN_HAND') {
      const inP = renderer.pxToIn(px, py);
      game.placeCueBall(inP.x, inP.y);
    } else {
      game.setAimFromPoint(px, py);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!game || game.state !== 'AIMING') return;
    if (!e.buttons) return;
    const rect = canvas.getBoundingClientRect();
    game.setAimFromPoint(e.clientX - rect.left, e.clientY - rect.top);
  });

  // Game menu -> back to menu (abandon match)
  document.getElementById('game-menu').addEventListener('click', () => {
    if (game) game.stop();
    document.getElementById('match-modal').classList.add('hidden');
    show('menu');
  });

  // Match modal buttons (rematch / menu) — data-goto already wired, but handle rematch
  document.querySelectorAll('#match-modal [data-goto]').forEach((b) => {
    b.addEventListener('click', () => {
      document.getElementById('match-modal').classList.add('hidden');
      if (game) game.stop();
    });
  });
}

// ---------- Helpers ----------
function fmt(n) {
  return 'DB$' + (Math.round(n * 100) / 100).toFixed(2);
}
function alertMsg(msg) {
  const banner = document.getElementById('msg-banner');
  banner.textContent = msg;
  banner.classList.remove('hidden');
  setTimeout(() => banner.classList.add('hidden'), 2500);
}

// ---------- Init ----------
window.addEventListener('resize', () => { if (renderer) renderer.resize(); });
show('menu');
