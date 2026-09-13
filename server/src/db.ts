import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface TransactionRecord {
  id: string;
  type: string;
  amount: number;
  fee: number;
  balanceAfter: number;
  ts: string;
}

export interface UserProfile {
  id: string;
  username: string;
  avatar: string; // preset ID (e.g. 'JP', 'avatar1') or base64 data URI
  token: string;
  balance: number;
  history: TransactionRecord[];
  createdAt: number;
}

interface DatabaseSchema {
  users: Record<string, UserProfile>; // token -> UserProfile
}

const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

function ensureDataDir() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadDb(): DatabaseSchema {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const initial: DatabaseSchema = { users: {} };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading db.json, reinitializing:', err);
    return { users: {} };
  }
}

function saveDb(data: DatabaseSchema) {
  ensureDataDir();
  const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

export class Database {
  private static db: DatabaseSchema = loadDb();

  public static createUser(username: string, avatar: string): UserProfile {
    const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;
    const token = `tok_${crypto.randomBytes(16).toString('hex')}`;
    const newUser: UserProfile = {
      id: userId,
      username: username.trim() || 'Player',
      avatar: avatar || 'JP',
      token,
      balance: 0.0, // Strictly initialized at $0.00
      history: [],
      createdAt: Date.now(),
    };
    this.db.users[token] = newUser;
    saveDb(this.db);
    return newUser;
  }

  public static getUserByToken(token: string): UserProfile | null {
    if (!token) return null;
    return this.db.users[token] || null;
  }

  public static updateUserProfile(token: string, updates: { username?: string; avatar?: string }): UserProfile | null {
    const user = this.getUserByToken(token);
    if (!user) return null;
    if (updates.username !== undefined && updates.username.trim() !== '') {
      user.username = updates.username.trim();
    }
    if (updates.avatar !== undefined && updates.avatar !== '') {
      user.avatar = updates.avatar;
    }
    saveDb(this.db);
    return user;
  }

  public static deposit(token: string, amount: number, fee: number): { user: UserProfile; tx: TransactionRecord } | null {
    const user = this.getUserByToken(token);
    if (!user) return null;

    user.balance = Math.round((user.balance + amount) * 100) / 100;
    const tx: TransactionRecord = {
      id: `tx_${crypto.randomBytes(6).toString('hex')}`,
      type: 'Deposit',
      amount,
      fee,
      balanceAfter: user.balance,
      ts: new Date().toLocaleTimeString(),
    };
    user.history.unshift(tx);
    saveDb(this.db);
    return { user, tx };
  }

  public static withdraw(token: string, amount: number, fee: number): { user: UserProfile; tx: TransactionRecord; payout: number } | null {
    const user = this.getUserByToken(token);
    if (!user) return null;
    if (user.balance < amount) return null;

    const payout = Math.round((amount - fee) * 100) / 100;
    user.balance = Math.round((user.balance - amount) * 100) / 100;
    const tx: TransactionRecord = {
      id: `tx_${crypto.randomBytes(6).toString('hex')}`,
      type: 'Withdraw',
      amount,
      fee,
      balanceAfter: user.balance,
      ts: new Date().toLocaleTimeString(),
    };
    user.history.unshift(tx);
    saveDb(this.db);
    return { user, tx, payout };
  }

  public static charge(token: string, amount: number, label: string = 'Buy-in'): { user: UserProfile; tx: TransactionRecord } | null {
    const user = this.getUserByToken(token);
    if (!user) return null;
    if (user.balance < amount) return null;

    user.balance = Math.round((user.balance - amount) * 100) / 100;
    const tx: TransactionRecord = {
      id: `tx_${crypto.randomBytes(6).toString('hex')}`,
      type: label,
      amount,
      fee: 0,
      balanceAfter: user.balance,
      ts: new Date().toLocaleTimeString(),
    };
    user.history.unshift(tx);
    saveDb(this.db);
    return { user, tx };
  }

  public static credit(token: string, amount: number, label: string = 'Winnings'): { user: UserProfile; tx: TransactionRecord } | null {
    const user = this.getUserByToken(token);
    if (!user) return null;

    user.balance = Math.round((user.balance + amount) * 100) / 100;
    const tx: TransactionRecord = {
      id: `tx_${crypto.randomBytes(6).toString('hex')}`,
      type: label,
      amount,
      fee: 0,
      balanceAfter: user.balance,
      ts: new Date().toLocaleTimeString(),
    };
    user.history.unshift(tx);
    saveDb(this.db);
    return { user, tx };
  }
}
