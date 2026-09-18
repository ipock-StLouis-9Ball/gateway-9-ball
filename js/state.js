// ============================================================================
// state.js — Client-side state manager and API client for Authoritative Backend.
// Stores session token in localStorage; balances/profiles live on the backend.
// ============================================================================

import { STORE_ITEMS } from './config.js';

const API_BASE = window.location.origin.includes(':8787')
  ? window.location.origin
  : 'http://localhost:8787';

const TOKEN_STORAGE_KEY = 'stlouis_session_token';

export const State = {
  token: null,
  wallet: {
    balance: 0.0,
    history: [], // {id, type, amount, fee, balanceAfter, ts}
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
    id: '',
    name: 'Player',
    avatar: 'JP', // initials or base64 data URI
    registered: false,
    hasDeposited: false,
  },
  opponent: {
    name: 'Breaker AI',
    avatar: 'AI',
  },
  match: null, // set when a wager match starts
};

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (State.token) {
    headers['Authorization'] = `Bearer ${State.token}`;
  }
  return headers;
}

function saveTokenLocally(token) {
  State.token = token;
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (err) {
    console.warn('localStorage not accessible, session in memory only');
  }
}

function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (err) {
    return null;
  }
}

export const Auth = {
  async initSession() {
    const stored = getStoredToken();
    if (!stored) return false;
    State.token = stored;
    try {
      const res = await fetch(`${API_BASE}/api/profile/me`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.ok && data.profile) {
        this._updateStateFromProfile(data.profile);
        return true;
      }
    } catch (err) {
      console.error('Failed to authenticate stored token:', err);
    }
    // Token invalid or server error
    State.token = null;
    return false;
  },

  async register(username, avatar) {
    try {
      const res = await fetch(`${API_BASE}/api/profile/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, avatar }),
      });
      const data = await res.json();
      if (data.ok && data.token && data.profile) {
        saveTokenLocally(data.token);
        this._updateStateFromProfile(data.profile);
        return { ok: true, profile: data.profile };
      }
      return { ok: false, error: data.error || 'Registration failed' };
    } catch (err) {
      return { ok: false, error: 'Network error during registration' };
    }
  },

  async updateProfile(username, avatar) {
    try {
      const res = await fetch(`${API_BASE}/api/profile/update`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ username, avatar }),
      });
      const data = await res.json();
      if (data.ok && data.profile) {
        this._updateStateFromProfile(data.profile);
        return { ok: true, profile: data.profile };
      }
      return { ok: false, error: data.error || 'Profile update failed' };
    } catch (err) {
      return { ok: false, error: 'Network error during profile update' };
    }
  },

  _updateStateFromProfile(prof) {
    State.profile.id = prof.id;
    State.profile.name = prof.username;
    State.profile.avatar = prof.avatar;
    State.profile.registered = true;
    State.wallet.balance = prof.balance;
    State.wallet.history = prof.history || [];
    if (State.wallet.history.some((h) => h.type === 'Deposit')) {
      State.profile.hasDeposited = true;
    }
  },
};

export const Wallet = {
  balance() {
    return State.wallet.balance;
  },
  canAfford(amount) {
    return State.wallet.balance >= amount;
  },
  async deposit(amount) {
    try {
      const res = await fetch(`${API_BASE}/api/wallet/deposit`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (data.ok) {
        State.wallet.balance = data.balance;
        State.wallet.history = data.history;
        return { ok: true, balance: data.balance };
      }
      return { ok: false, error: data.error || 'Deposit failed' };
    } catch (err) {
      return { ok: false, error: 'Network error during deposit' };
    }
  },
  async withdraw(amount) {
    try {
      const res = await fetch(`${API_BASE}/api/wallet/withdraw`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (data.ok) {
        State.wallet.balance = data.balance;
        State.wallet.history = data.history;
        return { ok: true, balance: data.balance, payout: data.payout, fee: data.tx.fee };
      }
      return { ok: false, error: data.error || 'Withdrawal failed' };
    } catch (err) {
      return { ok: false, error: 'Network error during withdrawal' };
    }
  },
  async charge(amount, label = 'Buy-in') {
    try {
      const res = await fetch(`${API_BASE}/api/wallet/charge`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ amount, label }),
      });
      const data = await res.json();
      if (data.ok) {
        State.wallet.balance = data.balance;
        State.wallet.history = data.history;
        return { ok: true, balance: data.balance };
      }
      return { ok: false, error: data.error || 'Charge failed' };
    } catch (err) {
      return { ok: false, error: 'Network error during charge' };
    }
  },
  async credit(amount, label = 'Winnings') {
    try {
      const res = await fetch(`${API_BASE}/api/wallet/credit`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ amount, label }),
      });
      const data = await res.json();
      if (data.ok) {
        State.wallet.balance = data.balance;
        State.wallet.history = data.history;
        return { ok: true, balance: data.balance };
      }
      return { ok: false, error: data.error || 'Credit failed' };
    } catch (err) {
      return { ok: false, error: 'Network error during credit' };
    }
  },
};

// --- Store / cosmetics ------------------------------------------------------
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
  async buy(category, id) {
    if (this.isOwned(category, id)) return { ok: true };
    const price = this.price(category, id);
    if (!Wallet.canAfford(price))
      return { ok: false, error: 'Insufficient balance' };

    const res = await Wallet.charge(price, `Store: ${id}`);
    if (!res.ok) return res;

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
