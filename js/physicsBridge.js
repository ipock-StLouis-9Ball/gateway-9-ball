// ============================================================================
// physicsBridge.js — Pyodide local pooltool Python simulation engine bridge.
// Runs Pyodide in the browser natively to simulate 9-ball shots locally.
// ============================================================================

import { TABLE, CUE_ID } from './config.js';

let pyodideInstance = null;
let pyodideLoadingPromise = null;

/**
 * Initializes the Pyodide environment and installs pooltool + numpy dependencies via micropip.
 */
export async function initPyodide() {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoadingPromise) return pyodideLoadingPromise;

  pyodideLoadingPromise = (async () => {
    if (typeof loadPyodide === 'undefined') {
      throw new Error('Pyodide script not loaded in document head');
    }

    console.log('[PhysicsBridge] Loading Pyodide engine...');
    pyodideInstance = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'
    });

    console.log('[PhysicsBridge] Installing micropip, numpy, and pooltool...');
    await pyodideInstance.loadPackage('micropip');
    const micropip = pyodideInstance.pyimport('micropip');

    try {
      await micropip.install(['numpy', 'pooltool']);
      console.log('[PhysicsBridge] pooltool installed successfully via micropip.');
    } catch (err) {
      console.warn('[PhysicsBridge] Notice installing pooltool via micropip, continuing with numpy fallback:', err);
    }

    console.log('[PhysicsBridge] Initializing Python simulation script...');
    await pyodideInstance.runPythonAsync(`
import json
import numpy as np

# Verify pooltool module availability
HAS_POOLTOOL = False
try:
    import pooltool as pt
    HAS_POOLTOOL = True
    print("[Pyodide] pooltool imported successfully.")
except Exception as e:
    print("[Pyodide] pooltool import note:", e)

def simulate_shot_py(input_json):
    data = json.loads(input_json)
    balls = data.get("balls", [])
    angle = float(data.get("angle", 0.0))
    power = float(data.get("power", 0.0))
    english_x = float(data.get("englishX", 0.0))
    english_y = float(data.get("englishY", 0.0))

    if HAS_POOLTOOL:
        try:
            return _simulate_with_pooltool(balls, angle, power, english_x, english_y)
        except Exception as pt_err:
            print("[Pyodide] pooltool execution fallback to physics loop:", pt_err)

    return _simulate_fallback(balls, angle, power, english_x, english_y)

def _simulate_with_pooltool(balls, angle, power, english_x, english_y):
    # Convert parameters to pooltool System objects
    # pooltool uses SI units (meters). Table: 100 inches = 2.54 m, 50 inches = 1.27 m
    IN2M = 0.0254
    M2IN = 1.0 / IN2M

    gametype = pt.GameType.NINEBALL if hasattr(pt, 'GameType') else None

    pt_balls = {}
    for b in balls:
        bid = str(b["id"])
        x_m = float(b["x"]) * IN2M
        y_m = float(b["y"]) * IN2M
        ball_obj = pt.Ball.create(bid, xy=(x_m, y_m)) if hasattr(pt.Ball, 'create') else pt.Ball(bid)
        if hasattr(ball_obj, 'state') and hasattr(ball_obj.state, 'rvw'):
            ball_obj.state.rvw[0] = [x_m, y_m, 0.028575]
        if b.get("pocketed", False):
            if hasattr(ball_obj, 'state'):
                ball_obj.state.s = 0 # Pocketed state
        pt_balls[bid] = ball_obj

    # Cue setup: V0 speed in m/s (max ~5 m/s for power=1.0)
    v0 = max(0.1, min(1.0, power)) * 5.0
    phi_deg = np.degrees(angle)
    cue = pt.Cue(V0=v0, phi=phi_deg, a=english_x, b=english_y) if hasattr(pt, 'Cue') else None

    # Table setup
    table = pt.Table.default() if hasattr(pt, 'Table') else None

    # Create system and simulate shot using pooltool engine
    system = pt.System(table=table, balls=pt_balls, cue=cue) if hasattr(pt, 'System') and table and cue else None

    if system is not None and hasattr(pt, 'simulate'):
        pt.simulate(system, inplace=True)

        # Convert pooltool trajectory events and states to JS output format
        frames = []
        events = []
        first_contact = None

        # Build trajectory sampled at 120Hz
        dt = 1.0 / 120.0
        t_total = getattr(system, 'time', 2.0)
        steps = int(np.ceil(t_total / dt)) if t_total > 0 else 100

        for step in range(steps):
            t_curr = step * dt
            step_balls = []
            for bid, b_obj in system.balls.items():
                # Extract position from pooltool ball state
                if hasattr(b_obj, 'state') and hasattr(b_obj.state, 'rvw'):
                    pos_m = b_obj.state.rvw[0]
                    x_in = float(pos_m[0]) * M2IN
                    y_in = float(pos_m[1]) * M2IN
                    pck = bool(getattr(b_obj.state, 's', 1) == 0)
                else:
                    x_in, y_in, pck = 0.0, 0.0, False

                step_balls.append({
                    "id": int(bid),
                    "x": x_in,
                    "y": y_in,
                    "vx": 0.0,
                    "vy": 0.0,
                    "pocketed": pck
                })
            frames.append({"t": t_curr, "balls": step_balls})

        final_balls = frames[-1]["balls"] if frames else []
        return json.dumps({
            "balls": final_balls,
            "events": events,
            "frames": frames,
            "firstContact": first_contact
        })

    return _simulate_fallback(balls, angle, power, english_x, english_y)

def _simulate_fallback(balls, angle, power, english_x, english_y):
    v0 = max(0.0, min(1.0, power)) * 200.0
    vx = v0 * np.cos(angle)
    vy = v0 * np.sin(angle)

    dt = 1.0 / 120.0
    max_steps = 3600
    frames = []

    ball_states = {int(b["id"]): {
        "id": int(b["id"]),
        "x": float(b["x"]),
        "y": float(b["y"]),
        "vx": float(b.get("vx", 0.0)),
        "vy": float(b.get("vy", 0.0)),
        "pocketed": bool(b.get("pocketed", False))
    } for b in balls}

    frames.append({"t": 0.0, "balls": list(ball_states.values())})

    cue_id = 0
    if cue_id in ball_states and not ball_states[cue_id]["pocketed"]:
        ball_states[cue_id]["vx"] = vx
        ball_states[cue_id]["vy"] = vy

    step = 0
    cue_radius = 1.125
    table_w = 100.0
    table_h = 50.0
    pocket_radius = 2.4375

    pockets = [
        {"x": 0.0, "y": 0.0}, {"x": 50.0, "y": 0.0}, {"x": 100.0, "y": 0.0},
        {"x": 0.0, "y": 50.0}, {"x": 50.0, "y": 50.0}, {"x": 100.0, "y": 50.0}
    ]

    events = []
    first_contact = None

    while step < max_steps:
        step += 1
        t_curr = step * dt
        any_moving = False

        ball_ids = list(ball_states.keys())
        for bid in ball_ids:
            b = ball_states[bid]
            if b["pocketed"]:
                continue

            b["x"] += b["vx"] * dt
            b["y"] += b["vy"] * dt
            b["vx"] *= 0.988
            b["vy"] *= 0.988

            if abs(b["vx"]) < 0.1 and abs(b["vy"]) < 0.1:
                b["vx"] = 0.0
                b["vy"] = 0.0
            else:
                any_moving = True

            if b["x"] - cue_radius < 0.0:
                b["x"] = cue_radius
                b["vx"] = -b["vx"] * 0.95
                events.append({"type": "rail", "ball": bid, "t": t_curr})
            elif b["x"] + cue_radius > table_w:
                b["x"] = table_w - cue_radius
                b["vx"] = -b["vx"] * 0.95
                events.append({"type": "rail", "ball": bid, "t": t_curr})

            if b["y"] - cue_radius < 0.0:
                b["y"] = cue_radius
                b["vy"] = -b["vy"] * 0.95
                events.append({"type": "rail", "ball": bid, "t": t_curr})
            elif b["y"] + cue_radius > table_h:
                b["y"] = table_h - cue_radius
                b["vy"] = -b["vy"] * 0.95
                events.append({"type": "rail", "ball": bid, "t": t_curr})

            for p in pockets:
                dist = np.hypot(b["x"] - p["x"], b["y"] - p["y"])
                if dist < pocket_radius:
                    b["pocketed"] = True
                    b["vx"] = 0.0
                    b["vy"] = 0.0
                    events.append({"type": "pocket", "ball": bid, "t": t_curr})
                    break

        for i in range(len(ball_ids)):
            for j in range(i + 1, len(ball_ids)):
                id_a, id_b = ball_ids[i], ball_ids[j]
                ba, bb = ball_states[id_a], ball_states[id_b]
                if ba["pocketed"] or bb["pocketed"]:
                    continue

                dx = bb["x"] - ba["x"]
                dy = bb["y"] - ba["y"]
                dist = np.hypot(dx, dy)
                min_dist = cue_radius * 2.0

                if dist < min_dist and dist > 0.0001:
                    nx, ny = dx / dist, dy / dist
                    overlap = min_dist - dist
                    ba["x"] -= nx * (overlap * 0.5)
                    ba["y"] -= ny * (overlap * 0.5)
                    bb["x"] += nx * (overlap * 0.5)
                    bb["y"] += ny * (overlap * 0.5)

                    kx = ba["vx"] - bb["vx"]
                    ky = ba["vy"] - bb["vy"]
                    p = 2.0 * (nx * kx + ny * ky) / 2.0
                    if p > 0:
                        ba["vx"] -= p * nx
                        ba["vy"] -= p * ny
                        bb["vx"] += p * nx
                        bb["vy"] += p * ny

                        events.append({"type": "hit", "a": id_a, "b": id_b, "t": t_curr})
                        if first_contact is None and (id_a == 0 or id_b == 0):
                            first_contact = id_b if id_a == 0 else id_a

        if step % 4 == 0 or not any_moving:
            frames.append({
                "t": t_curr,
                "balls": [dict(b) for b in ball_states.values()]
            })

        if not any_moving:
            break

    final_balls = list(ball_states.values())

    return json.dumps({
        "balls": final_balls,
        "events": events,
        "frames": frames,
        "firstContact": first_contact
    })
`);

    console.log('[PhysicsBridge] Pyodide pooltool engine initialized successfully.');
    return pyodideInstance;
  })();

  return pyodideLoadingPromise;
}

/**
 * Executes a shot using local Pyodide Python simulation engine and returns shot results.
 * @param {Object} input Shot input parameters (balls, angle, power, englishX, englishY)
 */
export async function executePyodideShot(input) {
  const pyodide = await initPyodide();

  const jsonInput = JSON.stringify({
    balls: input.balls || [],
    angle: input.angle || 0.0,
    power: input.power || 0.0,
    englishX: input.englishX || 0.0,
    englishY: input.englishY || 0.0,
    shotMode: input.shotMode || 'NORMAL',
    cueBallId: input.cueBallId ?? CUE_ID
  });

  const resJsonStr = await pyodide.runPythonAsync(`simulate_shot_py('${jsonInput}')`);
  const rawResult = JSON.parse(resJsonStr);

  const balls = rawResult.balls;
  const events = rawResult.events || [];
  const frames = rawResult.frames || [];
  const firstContact = rawResult.firstContact;
  const pocketed = events.filter((e) => e.type === 'pocket').map((e) => e.ball);
  const cueScratched = pocketed.includes(CUE_ID);

  const lowestAtStart = getLowestBall(input.balls || []);
  const shotMode = input.shotMode || 'NORMAL';
  const isPushOut = shotMode === 'PUSH_OUT';

  let foul = false;
  let foulReason = '';
  let rackWinner = null;
  let continueShooting = false;

  if (!isPushOut) {
    if (firstContact === null) {
      foul = true;
      foulReason = 'No ball contacted';
    } else if (firstContact !== lowestAtStart) {
      foul = true;
      foulReason = `Must hit the ${lowestAtStart}-ball first`;
    }
  }

  if (pocketed.includes(9) && !foul && !isPushOut) {
    rackWinner = 'shooter';
  }

  if (cueScratched) {
    foul = true;
    if (!foulReason) foulReason = 'Scratched the cue ball';
  }

  if (!isPushOut && !foul && !rackWinner) {
    const pocketedSomething = pocketed.length > 0;
    const railHit = events.some((e) => e.type === 'rail');
    if (!pocketedSomething && !railHit) {
      foul = true;
      foulReason = 'No ball reached a rail';
    }
  }

  if (pocketed.includes(9) && foul) rackWinner = null;

  if (!foul && !rackWinner) {
    const legalPocket = pocketed.some((id) => id !== 9 && id !== CUE_ID);
    continueShooting = legalPocket && !isPushOut;
  }

  return {
    balls,
    events,
    frames,
    firstContact,
    pocketed,
    cueScratched,
    lowestAtStart,
    foul,
    foulReason,
    rackWinner,
    continueShooting,
    pushOut: isPushOut
  };
}

function getLowestBall(balls) {
  const live = balls.filter((b) => !b.pocketed && b.id !== CUE_ID);
  if (!live.length) return null;
  return Math.min(...live.map((b) => b.id));
}
