// ============================================================================
// firebaseConfig.js — Firebase v10 initialization module using CDN imports.
// Configures Auth, Firestore, and lockstep consensus multiplayer verification.
// ============================================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

let currentUser = null;

export async function initFirebaseAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        currentUser = user;
        console.log('[Firebase] Authenticated user UID:', user.uid);
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          currentUser = cred.user;
          console.log('[Firebase] Signed in anonymously with UID:', currentUser.uid);
          resolve(currentUser);
        } catch (err) {
          console.warn('[Firebase] Anonymous Auth error:', err);
          resolve(null);
        }
      }
    });
  });
}

export function getCurrentUser() {
  return currentUser;
}

/**
 * Computes deterministic SHA-256 state hash for lockstep verification consensus.
 * - Balls x and y coordinates are rounded to 3 decimal places.
 * - Active balls, pocketed balls, and current turn ID are sorted.
 */
export async function computeStateHash(balls, nextTurn) {
  const roundedBalls = balls.map((b) => ({
    id: b.id,
    x: Math.round(b.x * 1000) / 1000,
    y: Math.round(b.y * 1000) / 1000,
    pocketed: !!b.pocketed
  })).sort((a, b) => a.id - b.id);

  const payload = JSON.stringify({
    balls: roundedBalls,
    nextTurn: nextTurn
  });

  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Submits shot parameters (angle, power, spin) to Firestore for active match turn.
 */
export async function submitShotParameters(matchId, shotIndex, shotParams) {
  try {
    const matchRef = doc(db, 'matches', matchId);
    await updateDoc(matchRef, {
      latestShotParameters: {
        shotIndex,
        angle: shotParams.angle,
        power: shotParams.power,
        englishX: shotParams.englishX || 0.0,
        englishY: shotParams.englishY || 0.0,
        shotMode: shotParams.shotMode || 'NORMAL',
        timestamp: Date.now()
      }
    });
    console.log('[Firebase] Submitted shot parameters for shotIndex:', shotIndex);
  } catch (err) {
    console.warn('[Firebase] submitShotParameters notice:', err.message);
  }
}

/**
 * Submits state hash calculation to verifications subcollection for lockstep consensus.
 */
export async function submitVerificationHash(matchId, shotIndex, playerId, hash) {
  try {
    const verifRef = doc(db, 'matches', matchId, 'verifications', `${shotIndex}_${playerId}`);
    await setDoc(verifRef, {
      playerId,
      hash,
      shotIndex,
      timestamp: Date.now()
    });
    console.log('[Firebase] Submitted lockstep verification hash for player:', playerId, hash);
  } catch (err) {
    console.warn('[Firebase] submitVerificationHash notice:', err.message);
  }
}

/**
 * Subscribes to real-time turns and shot parameters for active match.
 */
export function listenToMatch(matchId, onShotReceived) {
  const matchRef = doc(db, 'matches', matchId);
  return onSnapshot(matchRef, (snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.data();
    if (data.latestShotParameters) {
      onShotReceived(data.latestShotParameters);
    }
  });
}

/**
 * Subscribes to verification submissions to verify consensus between playerA and playerB.
 */
export function listenToVerifications(matchId, shotIndex, playerA, playerB, onConsensusResult) {
  const verifACef = doc(db, 'matches', matchId, 'verifications', `${shotIndex}_${playerA}`);
  const verifBCef = doc(db, 'matches', matchId, 'verifications', `${shotIndex}_${playerB}`);

  let hashA = null;
  let hashB = null;

  const unsubA = onSnapshot(verifACef, (snap) => {
    if (snap.exists()) {
      hashA = snap.data().hash;
      checkConsensus();
    }
  });

  const unsubB = onSnapshot(verifBCef, (snap) => {
    if (snap.exists()) {
      hashB = snap.data().hash;
      checkConsensus();
    }
  });

  function checkConsensus() {
    if (hashA && hashB) {
      const match = hashA === hashB;
      console.log(`[Firebase Consensus] Shot ${shotIndex} Verification - PlayerA: ${hashA}, PlayerB: ${hashB}, Match: ${match}`);
      onConsensusResult({ match, hashA, hashB });
      unsubA();
      unsubB();
    }
  }
}

export {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  updateDoc
};
