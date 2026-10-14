# Gateway 9-Ball Serverless Architecture

## Active Runtime

- **Frontend & UI:** Vanilla HTML5, CSS3, ES modules, and 2D Canvas (`index.html`, `styles.css`, `js/`).
- **Local Physics Engine:** Pyodide (Python compiled to WebAssembly) running `pooltool` natively in the browser via `js/physicsBridge.js`.
- **Multiplayer & Synchronization:** Firebase v10 Web SDK (Auth & Firestore) for lockstep consensus and real-time turn state synchronization (`/matches/{matchId}`).

## Lockstep Consensus & Anti-Cheat

- Clients communicate shot execution solely via shot parameters (angle, power, english).
- Both clients independently execute the physics simulation locally using Pyodide and `pooltool`.
- Ball coordinates are rounded to 3 decimal places before producing a SHA-256 digest (`crypto.subtle.digest`).
- Hashes are submitted to `/matches/{matchId}/verifications`. Firestore security rules block match progression if hashes mismatch ("Desync").
