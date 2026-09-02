// ============================================================================
// state.js — In-memory global state (sandbox blocks localStorage).
// Wallet, owned cosmetics, settings, current match. Reset on reload.
// ============================================================================

import { ECONOMY, STORE_ITEMS } from './config.js';

export const State = {
  wallet: {
    balance: ECONOMY.startingBalance,
    history: [], // {type, amount, fee, balanceAfter, ts}
  },
  owned: {
    tables: ['classic', 'maroon'],
    cues: ['maple'],
    balls: ['classic'],
  },
  settings: {
    table: 'maroon',
    cue: 'maple',
    balls: 'classic',
    sound: true,
  },
  profile: {
    name: 'You',
    avatar: 'JP', // initials for the avatar circle
  },
  opponent: {
    name: 'Breaker AI',
    avatar: 'AI',
  },
  match: null, // set when a wager match starts
};

export const Wallet = {
  balance() {
    return State.wallet.balance;
  },
  canAfford(amount) {
    return State.wallet.balance >= amount;
  },
  deposit(amount) {
    // Gateway fee (2.9% + $0.30) is passed to the user at checkout: they pay
    // amount + fee externally, and the FULL `amount` is credited to the balance.
    const fee = ECONOMY.depositFee(amount);
    State.wallet.balance += amount;
    this._log('Deposit', amount, fee);
  },
  // Simulated withdrawal. No real money. Returns {ok, fee, payout}.
  withdraw(amount) {
    if (amount < ECONOMY.withdrawMin)
      return { ok: false, error: `Minimum withdrawal is DB$${ECONOMY.withdrawMin.toFixed(2)}` };
    if (amount > State.wallet.balance)
      return { ok: false, error: 'Insufficient balance' };
    const fee = ECONOMY.withdrawFee(amount);
    const payout = amount - fee;
    State.wallet.balance -= amount;
    this._log('Withdraw', amount, fee);
    return { ok: true, fee, payout };
  },
  // Charge a buy-in; returns true if affordable.
  charge(amount) {
    if (State.wallet.balance < amount) return false;
    State.wallet.balance -= amount;
    this._log('Buy-in', amount, 0);
    return true;
  },
  credit(amount, label = 'Winnings') {
    State.wallet.balance += amount;
    this._log(label, amount, 0);
  },
  _log(type, amount, fee) {
    State.wallet.history.unshift({
      type, amount, fee,
      balanceAfter: State.wallet.balance,
      ts: new Date().toLocaleTimeString(),
    });
  },
};

// --- Store / cosmetics ------------------------------------------------------
// category (tables/cues/balls) -> settings key (table/cue/balls)
const SETTING_KEY = { tables: 'table', cues: 'cue', balls: 'balls' };

export const Store = {
  items: STORE_ITEMS,
  isOwned(category, id) {
    return State.owned[category].includes(id);
  },
  price(category, id) {
    const item = this.items[category].find((i) => i.id === id);
    return item ? item.price : 0;
  },
  isEquipped(category, id) {
    return State.settings[SETTING_KEY[category]] === id;
  },
  buy(category, id) {
    if (this.isOwned(category, id)) return { ok: true };
    const price = this.price(category, id);
    if (!Wallet.canAfford(price))
      return { ok: false, error: 'Insufficient balance' };
    Wallet.charge(price);
    State.owned[category].push(id);
    State.settings[SETTING_KEY[category]] = id;
    return { ok: true };
  },
  equip(category, id) {
    if (!this.isOwned(category, id))
      return { ok: false, error: 'Not owned' };
    State.settings[SETTING_KEY[category]] = id;
    return { ok: true };
  },
};
