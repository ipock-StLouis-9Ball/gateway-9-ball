// ============================================================================
// app.js — Screen routing, store/wallet UI, SVG sidebar HUD controls, bootstrap.
// ============================================================================

import { State, Wallet, Store } from './state.js';
import { Renderer } from './renderer.js';
import { Game } from './game.js';
import { ECONOMY, STORE_ITEMS, TABLE_COLORS, BALL_SKINS, CUE_STICKS } from './config.js';

// ---------- Screen routing ----------
const screens = ['menu', 'lobby', 'store', 'wallet', 'game'];
function show(name) {
  screens.forEach((s) => document.getElementById('screen-' + s).classList.toggle('hidden', s !== name));
  const canvas = document.getElementById('game-canvas');
  if (canvas) canvas.classList.toggle('hidden', name !== 'game');
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

  // SVG Sidebar Player Names
  const p1Name = document.getElementById('svg-p1-name');
  if (p1Name) p1Name.textContent = State.profile.name.toUpperCase();
  const p2Name = document.getElementById('svg-p2-name');
  if (p2Name) p2Name.textContent = State.opponent.name.toUpperCase();

  document.getElementById('match-modal').classList.add('hidden');

  requestAnimationFrame(() => {
    renderer.resize();
    game.start();
  });

  window.__game = game;
  window.__renderer = renderer;
  bindGameControls();
}

function updateHud(hud) {
  const p1Score = document.getElementById('svg-p1-score');
  if (p1Score) p1Score.textContent = hud.match ? hud.match.racksWon[0] : '0';
  const p2Score = document.getElementById('svg-p2-score');
  if (p2Score) p2Score.textContent = hud.match ? hud.match.racksWon[1] : '0';

  const p1Bg = document.getElementById('svg-p1-bg');
  const p2Bg = document.getElementById('svg-p2-bg');
  if (p1Bg) p1Bg.classList.toggle('player-active', hud.currentPlayer === 0);
  if (p2Bg) p2Bg.classList.toggle('player-active', hud.currentPlayer === 1);

  const timerText = document.getElementById('svg-timer');
  if (timerText) {
    const sec = Math.max(0, Math.floor(hud.shotTimer));
    timerText.textContent = `00:${sec < 10 ? '0' : ''}${sec}`;
  }

  const timerArc = document.getElementById('svg-timer-arc');
  if (timerArc) {
    const totalDash = 301.59;
    const frac = Math.max(0, Math.min(1, hud.shotTimer / 45));
    timerArc.style.strokeDashoffset = (totalDash * (1 - frac)).toString();
    timerArc.setAttribute('stroke', hud.shotTimer <= 8 ? '#ff2e4e' : '#00f3ff');
  }

  if (!cueCharging) {
    updatePowerUI(0);
  }

  const banner = document.getElementById('msg-banner');
  if (hud.message) { banner.textContent = hud.message; banner.classList.remove('hidden'); }
  else banner.classList.add('hidden');

  const pushBtn = document.getElementById('pushout-btn');
  if (pushBtn) {
    pushBtn.classList.toggle('hidden', !hud.pushOutAvailable);
    pushBtn.disabled = !(hud.state === 'AIMING' && hud.currentPlayer === 0);
    if (!hud.pushOutAvailable) pushOutMode = false;
    pushBtn.classList.toggle('active', pushOutMode);
  }

  const pd = document.getElementById('push-decision');
  if (pd) pd.classList.toggle('hidden', !hud.pendingPushDecision);

  // Spin dot inside SVG spin controller
  const spinDot = document.getElementById('svg-spin-dot-group');
  if (spinDot) {
    const dx = hud.english.x * 28;
    const dy = -hud.english.y * 28;
    spinDot.setAttribute('transform', `translate(${300 + dx}, ${495 + dy})`);
  }
}

// ---------- Game controls ----------
let cueCharging = false;
let cueStartY = 0;
let pushOutMode = false;

function updatePowerUI(powerFrac) {
  const p = Math.max(0, Math.min(1, powerFrac));
  const cueStick = document.getElementById('cue-stick');
  const powerFill = document.getElementById('svg-power-fill');

  // Pull cue stick down in SVG coordinates (0 to 180px shift)
  if (cueStick) {
    cueStick.setAttribute('transform', `translate(1, ${p * 180})`);
  }
  // Fill power bar overlay upward
  if (powerFill) {
    const fillH = p * 600;
    powerFill.setAttribute('y', (755 - fillH).toString());
    powerFill.setAttribute('height', fillH.toString());
  }
}

function bindGameControls() {
  const leftPanel = document.getElementById('left-panel');

  const chargeFromEvent = (e) => {
    if (!game || game.state !== 'AIMING' || game.currentPlayer !== 0) return;
    const rect = leftPanel.getBoundingClientRect();
    const maxPull = rect.height * 0.45;
    const dy = Math.max(0, (e.clientY - cueStartY));
    let frac = Math.max(0, Math.min(1, dy / maxPull));
    for (const m of [0.25, 0.5, 0.75]) {
      if (Math.abs(frac - m) < 0.035) frac = m;
    }
    game.setPower(frac);
    updatePowerUI(frac);
  };

  if (leftPanel) {
    leftPanel.addEventListener('pointerdown', (e) => {
      if (!game || game.state !== 'AIMING' || game.currentPlayer !== 0) return;
      cueCharging = true;
      cueStartY = e.clientY;
      leftPanel.setPointerCapture(e.pointerId);
      chargeFromEvent(e);
    });

    leftPanel.addEventListener('pointermove', (e) => {
      if (cueCharging) chargeFromEvent(e);
    });

    const releaseCue = () => {
      if (!cueCharging) return;
      cueCharging = false;
      const firedPower = game.power;
      if (firedPower >= 0.10 && game.state === 'AIMING' && game.currentPlayer === 0) {
        if (pushOutMode) { pushOutMode = false; game.pushOut(); }
        else game.shoot();
      }
      updatePowerUI(0);
    };

    leftPanel.addEventListener('pointerup', releaseCue);
    leftPanel.addEventListener('pointercancel', releaseCue);
  }

  // Spin controller inside SVG
  const spinCtrl = document.getElementById('spin-controller');
  if (spinCtrl) {
    const setSpinFromEvent = (e) => {
      const rect = spinCtrl.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const ex = Math.max(-1, Math.min(1, cx / (rect.width * 0.35)));
      const ey = Math.max(-1, Math.min(1, -cy / (rect.height * 0.35)));
      if (game) game.setEnglish(ex, ey);
    };

    spinCtrl.addEventListener('pointerdown', (e) => {
      setSpinFromEvent(e);
      spinCtrl.setPointerCapture(e.pointerId);
    });
    spinCtrl.addEventListener('pointermove', (e) => {
      if (e.buttons) setSpinFromEvent(e);
    });
  }

  const pushBtn = document.getElementById('pushout-btn');
  if (pushBtn) {
    pushBtn.addEventListener('click', () => {
      if (!game || game.state !== 'AIMING' || game.currentPlayer !== 0) return;
      if (!game.pushOutAvailable) return;
      pushOutMode = !pushOutMode;
      pushBtn.classList.toggle('active', pushOutMode);
    });
  }

  document.getElementById('pd-take')?.addEventListener('click', () => game && game.takePush());
  document.getElementById('pd-pass')?.addEventListener('click', () => game && game.passPush());

  // Canvas aiming + ball-in-hand placement
  const canvas = document.getElementById('game-canvas');
  if (canvas) {
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
  }

  document.getElementById('game-menu')?.addEventListener('click', () => {
    if (game) game.stop();
    document.getElementById('match-modal').classList.add('hidden');
    show('menu');
  });

  document.querySelectorAll('#match-modal [data-goto]').forEach((b) => {
    b.addEventListener('click', () => {
      document.getElementById('match-modal').classList.add('hidden');
      if (game) game.stop();
    });
  });
}

function fmt(n) {
  return 'DB$' + (Math.round(n * 100) / 100).toFixed(2);
}
function alertMsg(msg) {
  const banner = document.getElementById('msg-banner');
  if (!banner) return;
  banner.textContent = msg;
  banner.classList.remove('hidden');
  setTimeout(() => banner.classList.add('hidden'), 2500);
}

window.addEventListener('resize', () => { if (renderer) renderer.resize(); });
show('menu');
