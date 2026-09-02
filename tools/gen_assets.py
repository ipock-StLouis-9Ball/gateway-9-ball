#!/usr/bin/env python3
"""Generate high-res 2D sprite/texture assets for the pool table renderer.
All assets are anti-aliased (rendered at SS=4x then downscaled with LANCZOS).
Output: assets/*.png (transparent backgrounds where appropriate).
"""
import math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SS = 4  # supersample factor
random.seed(2026)

def lerp(a, b, t): return a + (b - a) * t
def mix(c1, c2, t): return tuple(int(lerp(c1[i], c2[i], t)) for i in range(3))

def finalize(img):
    """Supersample down to 1x with LANCZOS for crisp anti-aliasing."""
    return img.resize((img.width // SS, img.height // SS), Image.LANCZOS)

def _to_img(arr):
    """uint8 (H,W,3) RGB -> PIL RGB at SSx."""
    h, w = arr.shape[:2]
    return Image.fromarray(np.repeat(np.repeat(arr, SS, axis=0), SS, axis=1), "RGB")

# --------------------------------------------------------------------------
# Felt: maroon cloth with fine noise + smooth radial vignette (no hard circle).
# --------------------------------------------------------------------------
def gen_felt():
    W, H = 1000, 500
    base = np.array([107, 31, 43], dtype=np.float32)  # maroon
    # coordinate grids
    xs = np.arange(W, dtype=np.float32)
    ys = np.arange(H, dtype=np.float32)
    xx, yy = np.meshgrid(xs, ys)
    cx, cy = W / 2, H / 2
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / math.hypot(cx, cy)  # 0..1
    # vignette: slightly lighter near center, darker toward edges
    vig = 1.0 + 0.06 * (0.5 - d) - 0.22 * np.clip(d - 0.35, 0, 1)
    # fine cloth noise
    noise = np.random.randint(-9, 10, size=(H, W, 1)).astype(np.float32)
    arr = base[None, None, :] * vig[:, :, None] + noise
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    return finalize(_to_img(arr))

# --------------------------------------------------------------------------
# Cherry wood rail texture: organic multi-frequency grain with streaks.
# --------------------------------------------------------------------------
def gen_wood():
    W, H = 1200, 180
    base = np.array([150, 86, 54], dtype=np.float32)  # light cherry
    xs = np.arange(W, dtype=np.float32)
    ys = np.arange(H, dtype=np.float32)
    xx, yy = np.meshgrid(xs, ys)
    # multi-frequency sine grain (warp + intensity)
    warp = np.sin(yy / 11.0 + np.sin(xx / 90.0) * 2.2) * 6.0
    g = (np.sin((xx + warp) / 24.0) * 0.5
         + np.sin((xx + warp) / 9.0) * 0.25
         + np.sin((xx + warp) / 53.0) * 0.25)
    # streaks: occasional darker/lighter bands
    streak = np.sin(xx / 130.0 + np.sin(yy / 20.0) * 3.0)
    intensity = np.clip(g * 22 + streak * 14, -40, 30)
    noise = np.random.randint(-7, 8, size=(H, W, 1)).astype(np.float32)
    arr = np.stack([
        base[0] + intensity + noise[:, :, 0],
        base[1] + intensity + noise[:, :, 0],
        base[2] + intensity * 0.5 + noise[:, :, 0],
    ], axis=2)
    # top sheen
    sheen = np.clip(70 * (1 - yy / (H * 0.4)), 0, 255)[:, :, None]
    sheen_col = np.array([255, 240, 220], dtype=np.float32)
    arr = arr * (1 - sheen / 255 * 0.5) + sheen_col * (sheen / 255 * 0.5)
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    return finalize(_to_img(arr))

# --------------------------------------------------------------------------
# Pocket well: dark radial hole, transparent outside.
# --------------------------------------------------------------------------
def gen_pocket_well():
    S = 512
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = S / 2
    R = S * 0.46
    for r in range(int(R), 0, -1):
        t = r / R
        a = int(255 * (1 - (1 - t) * 0.15))  # mostly opaque black center
        col = mix((0, 0, 0), (60, 18, 22), t * 0.6)
        d.ellipse([cx - r, cx - r, cx + r, cx + r], fill=(*col, 255 if t > 0.9 else int(255 * (1 - (1 - t) * 0.1))))
    # soft outer fade
    img.putalpha(img.split()[3].filter(ImageFilter.GaussianBlur(6)))
    return finalize(img.resize((S * SS, S * SS), Image.NEAREST))

# --------------------------------------------------------------------------
# Metal pocket plate: polished brass ring with hole center.
# --------------------------------------------------------------------------
def gen_plate():
    S = 512
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = S / 2
    Router, Rinner = S * 0.48, S * 0.30
    # ring
    for r in range(int(Router), int(Rinner), -1):
        t = (r - Rinner) / (Router - Rinner)  # 0 inner -> 1 outer
        # metallic: light-dark-light across the band
        b = math.sin(t * math.pi)
        col = mix((90, 70, 40), (240, 220, 170), b)
        col = mix(col, (180, 150, 95), 0.3)
        d.ellipse([cx - r, cx - r, cx + r, cx + r], fill=(*col, 255))
    # cut inner hole (transparent)
    d.ellipse([cx - Rinner, cx - Rinner, cx + Rinner, cx + Rinner], fill=(0, 0, 0, 0))
    # specular highlight arc (upper-left)
    hl = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hl)
    hd.ellipse([cx - Router, cx - Router, cx + Router, cx + Router], outline=(255, 250, 235, 120), width=10)
    hl = hl.filter(ImageFilter.GaussianBlur(4))
    img = Image.alpha_composite(img, hl)
    return finalize(img.resize((S * SS, S * SS), Image.NEAREST))

# --------------------------------------------------------------------------
# Ball sprites (0 = cue, 1..9). Shaded sphere + number; 9 is a stripe.
# --------------------------------------------------------------------------
BALL_COLORS = {
    0: (248, 247, 240),
    1: (245, 197, 24),   # yellow
    2: (31, 78, 216),    # blue
    3: (214, 39, 28),    # red
    4: (91, 42, 158),   # purple
    5: (232, 116, 26),  # orange
    6: (31, 122, 52),   # green
    7: (122, 46, 26),  # maroon
    8: (26, 26, 26),    # black
    9: (245, 197, 24),  # yellow stripe
}
STRIPED = {9}

def gen_ball(bid):
    S = 256
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = S / 2
    R = S * 0.46
    base = BALL_COLORS[bid]
    # sphere shading via concentric ellipses offset toward highlight (upper-left)
    hl_off = (-R * 0.32, -R * 0.32)
    for r in range(int(R), 0, -1):
        t = r / R  # 1 edge -> 0 center
        # edge dark, center light (offset highlight)
        light = mix(base, (255, 255, 255), 0.55 * (1 - t))
        dark = mix(base, (0, 0, 0), 0.5)
        col = mix(dark, light, 1 - t)
        ox, oy = hl_off[0] * (1 - t), hl_off[1] * (1 - t)
        d.ellipse([cx - r + ox, cx - r + oy, cx + r + ox, cx + r + oy], fill=(*col, 255))
    # clip to ball circle
    mask = Image.new("L", (S, S), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([cx - R, cx - R, cx + R, cx + R], fill=255)
    img.putalpha(mask)
    # stripe for 9
    if bid in STRIPED:
        band = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        bd = ImageDraw.Draw(band)
        bd.rectangle([0, cx - R * 0.42, S, cx + R * 0.42], fill=(248, 247, 240, 255))
        band.putalpha(Image.composite(band.split()[3], Image.new("L", (S, S), 0), mask))
        img = Image.alpha_composite(img, band)
    # number circle + number (not on cue)
    if bid != 0:
        nr = R * 0.42
        d2 = ImageDraw.Draw(img)
        d2.ellipse([cx - nr, cx - nr, cx + nr, cx + nr], fill=(248, 247, 240, 255))
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(nr * 1.1))
        except Exception:
            font = ImageFont.load_default()
        tb = d2.textbbox((0, 0), str(bid), font=font)
        tw, th = tb[2] - tb[0], tb[3] - tb[1]
        d2.text((cx - tw / 2 - tb[0], cx - th / 2 - tb[1]), str(bid), fill=(26, 26, 26, 255), font=font)
    # glossy specular highlight
    spec = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    sd = ImageDraw.Draw(spec)
    sd.ellipse([cx - R * 0.55, cx - R * 0.6, cx - R * 0.05, cx - R * 0.25], fill=(255, 255, 255, 150))
    spec = spec.filter(ImageFilter.GaussianBlur(3))
    spec.putalpha(Image.composite(spec.split()[3], Image.new("L", (S, S), 0), mask))
    img = Image.alpha_composite(img, spec)
    return finalize(img.resize((S * SS, S * SS), Image.NEAREST))

# --------------------------------------------------------------------------
# Ball drop shadow: soft elliptical, squashed, transparent falloff.
# --------------------------------------------------------------------------
def gen_ball_shadow():
    S = 256
    img = Image.new("RGBA", (S, S // 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = S / 2, S / 4
    Rx, Ry = S * 0.40, S * 0.15
    d.ellipse([cx - Rx, cy - Ry, cx + Rx, cy + Ry], fill=(0, 0, 0, 150))
    # heavy blur gives a soft, natural alpha falloff
    return finalize(img.resize((S * SS, (S // 2) * SS), Image.NEAREST).filter(ImageFilter.GaussianBlur(4)))

# --------------------------------------------------------------------------
# Cushion/rail inner shadow strip (soft dark gradient) for grounded depth.
# --------------------------------------------------------------------------
def gen_cushion_shadow():
    W, H = 512, 64
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for y in range(H):
        a = int(110 * (1 - y / H))
        d.rectangle([0, y, W, y + 1], fill=(0, 0, 0, a))
    return finalize(img.resize((W * SS, H * SS), Image.NEAREST))

if __name__ == "__main__":
    import os
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")
    os.makedirs(out, exist_ok=True)
    print("felt..."); gen_felt().save(os.path.join(out, "felt.png"))
    print("wood..."); gen_wood().save(os.path.join(out, "rail-wood.png"))
    print("pocket-well..."); gen_pocket_well().save(os.path.join(out, "pocket-well.png"))
    print("plate..."); gen_plate().save(os.path.join(out, "pocket-plate.png"))
    print("ball-shadow..."); gen_ball_shadow().save(os.path.join(out, "ball-shadow.png"))
    print("cushion-shadow..."); gen_cushion_shadow().save(os.path.join(out, "cushion-shadow.png"))
    for bid in range(0, 10):
        gen_ball(bid).save(os.path.join(out, f"ball-{bid}.png"))
        print(f"ball-{bid}...")
    print("done ->", out)
