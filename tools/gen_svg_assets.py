#!/usr/bin/env python3
"""Generate native vector SVG assets for Gateway 9-Ball.
Output: assets/*.svg
"""
import os

ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")

BALL_COLORS = {
    0: "#f8f7f0",
    1: "#f5c518",  # yellow
    2: "#1f4ed8",  # blue
    3: "#d6271c",  # red
    4: "#5b2a9e",  # purple
    5: "#e8741a",  # orange
    6: "#1f7a34",  # green
    7: "#7a2e1a",  # maroon
    8: "#1a1a1a",  # black
    9: "#f5c518",  # yellow stripe
}

def gen_felt_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500" width="100%" height="100%">
  <defs>
    <radialGradient id="feltVignette" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#7c2635" />
      <stop offset="50%" stop-color="#6b1f2b" />
      <stop offset="85%" stop-color="#521621" />
      <stop offset="100%" stop-color="#3a0e16" />
    </radialGradient>
    <filter id="clothGrain" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" result="noise" />
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.05 0" />
      <feBlend mode="multiply" in="SourceGraphic" result="blend" />
    </filter>
  </defs>
  <rect width="1000" height="500" fill="url(#feltVignette)" />
  <rect width="1000" height="500" fill="#000" filter="url(#clothGrain)" opacity="0.6" style="mix-blend-mode: overlay;" />
</svg>"""

def gen_rail_wood_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 180" width="100%" height="100%">
  <defs>
    <linearGradient id="woodBase" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8c4e2d" />
      <stop offset="15%" stop-color="#a45e36" />
      <stop offset="30%" stop-color="#7a4124" />
      <stop offset="50%" stop-color="#9a5631" />
      <stop offset="70%" stop-color="#6e391e" />
      <stop offset="85%" stop-color="#9e5a33" />
      <stop offset="100%" stop-color="#824627" />
    </linearGradient>
    <linearGradient id="topSheen" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff0dc" stop-opacity="0.35" />
      <stop offset="40%" stop-color="#fff0dc" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.35" />
    </linearGradient>
    <pattern id="grainPattern" width="120" height="180" patternUnits="userSpaceOnUse">
      <path d="M 0,20 Q 30,10 60,25 T 120,20 M 0,60 Q 40,75 80,55 T 120,65 M 0,110 Q 30,95 70,115 T 120,105 M 0,150 Q 50,165 90,145 T 120,155" fill="none" stroke="#522513" stroke-width="1.5" opacity="0.3" />
    </pattern>
  </defs>
  <rect width="1200" height="180" fill="url(#woodBase)" />
  <rect width="1200" height="180" fill="url(#grainPattern)" />
  <rect width="1200" height="180" fill="url(#topSheen)" />
</svg>"""

def gen_pocket_well_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <radialGradient id="wellGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#020202" stop-opacity="1" />
      <stop offset="65%" stop-color="#0d0507" stop-opacity="1" />
      <stop offset="85%" stop-color="#3c1216" stop-opacity="0.95" />
      <stop offset="95%" stop-color="#180608" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
  </defs>
  <circle cx="256" cy="256" r="240" fill="url(#wellGrad)" />
</svg>"""

def gen_pocket_plate_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <radialGradient id="brassGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#ffe2a0" />
      <stop offset="30%" stop-color="#d4af66" />
      <stop offset="60%" stop-color="#9a7638" />
      <stop offset="85%" stop-color="#5a421b" />
      <stop offset="100%" stop-color="#2c1f0b" />
    </radialGradient>
    <linearGradient id="metalHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.7" />
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>
  </defs>
  <!-- Brass ring: Outer R=240, Inner R=150 -->
  <path d="M 256,16 A 240,240 0 1 0 256,496 A 240,240 0 1 0 256,16 Z M 256,106 A 150,150 0 1 1 256,406 A 150,150 0 1 1 256,106 Z" fill="url(#brassGrad)" fill-rule="evenodd" />
  <!-- Inner bevel shadow -->
  <circle cx="256" cy="256" r="150" fill="none" stroke="#1a1207" stroke-width="6" opacity="0.8" />
  <!-- Outer bevel highlight -->
  <circle cx="256" cy="256" r="238" fill="none" stroke="url(#metalHighlight)" stroke-width="4" />
</svg>"""

def gen_ball_shadow_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 128" width="100%" height="100%">
  <defs>
    <radialGradient id="ballShadowGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.75" />
      <stop offset="45%" stop-color="#000000" stop-opacity="0.45" />
      <stop offset="75%" stop-color="#000000" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
  </defs>
  <ellipse cx="128" cy="64" rx="112" ry="48" fill="url(#ballShadowGrad)" />
</svg>"""

def gen_cushion_shadow_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 64" width="100%" height="100%">
  <defs>
    <linearGradient id="cushionShadowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.6" />
      <stop offset="40%" stop-color="#000000" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </linearGradient>
  </defs>
  <rect width="512" height="64" fill="url(#cushionShadowGrad)" />
</svg>"""

def gen_shadow_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="100%" height="100%">
  <defs>
    <radialGradient id="shadowGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.7" />
      <stop offset="50%" stop-color="#000000" stop-opacity="0.35" />
      <stop offset="80%" stop-color="#000000" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
  </defs>
  <circle cx="128" cy="128" r="120" fill="url(#shadowGrad)" />
</svg>"""

def gen_frame_svg():
    # Table dimensions: Outer 1150 x 650. Rail thickness = 75. Inner play area 1000 x 500 (offset x=75, y=75).
    # Cutout center rectangle: x=75, y=75, w=1000, h=500.
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1150 650" width="100%" height="100%">
  <defs>
    <!-- Cherry Wood Rail Linear Gradients -->
    <linearGradient id="railWoodH" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8c4e2d" />
      <stop offset="20%" stop-color="#a45e36" />
      <stop offset="40%" stop-color="#7a4124" />
      <stop offset="60%" stop-color="#9a5631" />
      <stop offset="80%" stop-color="#6e391e" />
      <stop offset="100%" stop-color="#8c4e2d" />
    </linearGradient>
    <linearGradient id="railWoodV" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#8c4e2d" />
      <stop offset="25%" stop-color="#a45e36" />
      <stop offset="50%" stop-color="#7a4124" />
      <stop offset="75%" stop-color="#9a5631" />
      <stop offset="100%" stop-color="#8c4e2d" />
    </linearGradient>

    <!-- Outer Sheen / Shadow -->
    <linearGradient id="railBevelTop" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.4" />
    </linearGradient>

    <!-- Cushion Rubber Bevel & Shadow -->
    <linearGradient id="cushionTop" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0d2e18" />
      <stop offset="40%" stop-color="#1a5a31" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.6" />
    </linearGradient>
    <linearGradient id="cushionBottom" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#0d2e18" />
      <stop offset="40%" stop-color="#1a5a31" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.6" />
    </linearGradient>
    <linearGradient id="cushionLeft" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0d2e18" />
      <stop offset="40%" stop-color="#1a5a31" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.6" />
    </linearGradient>
    <linearGradient id="cushionRight" x1="100%" y1="0%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#0d2e18" />
      <stop offset="40%" stop-color="#1a5a31" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.6" />
    </linearGradient>

    <!-- Brass Pocket Plate Gradient -->
    <radialGradient id="brassPocket" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#ffe8a8" />
      <stop offset="35%" stop-color="#d8b268" />
      <stop offset="70%" stop-color="#8e682e" />
      <stop offset="100%" stop-color="#3a280e" />
    </radialGradient>

    <!-- Diamond Sight Inlay -->
    <polygon id="diamond" points="0,-6 5,0 0,6 -5,0" fill="#e8b75a" stroke="#fff" stroke-width="0.8" />
  </defs>

  <!-- Main Outer Rail Frame with Center Cutout -->
  <path d="M 0,0 L 1150,0 L 1150,650 L 0,650 Z M 75,75 L 75,575 L 1075,575 L 1075,75 Z" fill="url(#railWoodH)" fill-rule="evenodd" />
  <rect width="1150" height="650" fill="url(#railBevelTop)" opacity="0.6" pointer-events="none" />

  <!-- Rubber Cushion Edges along inner play area -->
  <!-- Top Cushion -->
  <polygon points="75,60 1075,60 1060,75 90,75" fill="url(#cushionTop)" />
  <!-- Bottom Cushion -->
  <polygon points="75,590 1075,590 1060,575 90,575" fill="url(#cushionBottom)" />
  <!-- Left Cushion -->
  <polygon points="60,75 60,575 75,560 75,90" fill="url(#cushionLeft)" />
  <!-- Right Cushion -->
  <polygon points="1090,75 1090,575 1075,560 1075,90" fill="url(#cushionRight)" />

  <!-- Cushion Inner Boundary Line -->
  <rect x="75" y="75" width="1000" height="500" fill="none" stroke="#0a0a0a" stroke-width="2" />

  <!-- Brass Pocket Plates & Pocket Cutouts (4 Corners + 2 Side Mids) -->
  <!-- Corner TL -->
  <circle cx="75" cy="75" r="48" fill="url(#brassPocket)" />
  <circle cx="75" cy="75" r="32" fill="#050505" stroke="#12080a" stroke-width="3" />

  <!-- Corner TR -->
  <circle cx="1075" cy="75" r="48" fill="url(#brassPocket)" />
  <circle cx="1075" cy="75" r="32" fill="#050505" stroke="#12080a" stroke-width="3" />

  <!-- Corner BL -->
  <circle cx="75" cy="575" r="48" fill="url(#brassPocket)" />
  <circle cx="75" cy="575" r="32" fill="#050505" stroke="#12080a" stroke-width="3" />

  <!-- Corner BR -->
  <circle cx="1075" cy="575" r="48" fill="url(#brassPocket)" />
  <circle cx="1075" cy="575" r="32" fill="#050505" stroke="#12080a" stroke-width="3" />

  <!-- Side Mid Top -->
  <circle cx="575" cy="65" r="42" fill="url(#brassPocket)" />
  <circle cx="575" cy="65" r="28" fill="#050505" stroke="#12080a" stroke-width="3" />

  <!-- Side Mid Bottom -->
  <circle cx="575" cy="585" r="42" fill="url(#brassPocket)" />
  <circle cx="575" cy="585" r="28" fill="#050505" stroke="#12080a" stroke-width="3" />

  <!-- Diamond Sight Markers on Wood Rails -->
  <!-- Top Rail Sights (x = 325, 575, 825; y = 32) -->
  <use href="#diamond" x="325" y="32" />
  <use href="#diamond" x="575" y="32" />
  <use href="#diamond" x="825" y="32" />

  <!-- Bottom Rail Sights (x = 325, 575, 825; y = 618) -->
  <use href="#diamond" x="325" y="618" />
  <use href="#diamond" x="575" y="618" />
  <use href="#diamond" x="825" y="618" />

  <!-- Left Rail Sights (x = 32; y = 200, 325, 450) -->
  <use href="#diamond" x="32" y="200" />
  <use href="#diamond" x="32" y="325" />
  <use href="#diamond" x="32" y="450" />

  <!-- Right Rail Sights (x = 1118; y = 200, 325, 450) -->
  <use href="#diamond" x="1118" y="200" />
  <use href="#diamond" x="1118" y="325" />
  <use href="#diamond" x="1118" y="450" />
</svg>"""

def gen_ui_sidebar_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 1000" preserveAspectRatio="none" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#101a2e" />
      <stop offset="50%" stop-color="#0b1220" />
      <stop offset="100%" stop-color="#060911" />
    </linearGradient>
    <linearGradient id="goldBorder" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#e8b75a" stop-opacity="0.8" />
      <stop offset="30%" stop-color="#ffe8a8" stop-opacity="0.95" />
      <stop offset="70%" stop-color="#c4933a" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#7a5218" stop-opacity="0.6" />
    </linearGradient>
    <radialGradient id="sideGlow" cx="0%" cy="50%" r="80%">
      <stop offset="0%" stop-color="#e8b75a" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
  </defs>
  <!-- Background -->
  <rect width="200" height="1000" fill="url(#bgGrad)" />
  <!-- Subtle Glow -->
  <rect width="200" height="1000" fill="url(#sideGlow)" />
  <!-- Left Metallic Gold Accent Border -->
  <rect x="0" y="0" width="3" height="1000" fill="url(#goldBorder)" />
</svg>"""

def gen_ball_template_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="100%" height="100%">
  <defs>
    <radialGradient id="sphereShade" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.45" />
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.0" />
      <stop offset="85%" stop-color="#000000" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.75" />
    </radialGradient>
    <radialGradient id="specularGlow" cx="32%" cy="25%" r="30%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.75" />
      <stop offset="40%" stop-color="#ffffff" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0" />
    </radialGradient>
  </defs>
  <!-- Ball Sphere Circle -->
  <circle cx="128" cy="128" r="120" fill="url(#sphereShade)" />
  <!-- Glossy Specular Highlight -->
  <ellipse cx="90" cy="80" rx="55" ry="32" fill="url(#specularGlow)" transform="rotate(-20 90 80)" />
</svg>"""

def gen_ball_svg(bid):
    base_color = BALL_COLORS[bid]
    is_cue = (bid == 0)
    is_stripe = (bid == 9)

    svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="100%" height="100%">']
    svg.append('  <defs>')
    svg.append('    <radialGradient id="ballShade" cx="35%" cy="30%" r="65%">')
    svg.append('      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.4" />')
    svg.append('      <stop offset="55%" stop-color="#ffffff" stop-opacity="0.0" />')
    svg.append('      <stop offset="85%" stop-color="#000000" stop-opacity="0.3" />')
    svg.append('      <stop offset="100%" stop-color="#000000" stop-opacity="0.65" />')
    svg.append('    </radialGradient>')
    svg.append('    <radialGradient id="specular" cx="32%" cy="25%" r="28%">')
    svg.append('      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.7" />')
    svg.append('      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.15" />')
    svg.append('      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0" />')
    svg.append('    </radialGradient>')
    if is_stripe:
        svg.append('    <clipPath id="ballClip">')
        svg.append('      <circle cx="128" cy="128" r="120" />')
        svg.append('    </clipPath>')
    svg.append('  </defs>')

    if is_cue:
        # White / Ivory Cue Ball
        svg.append('  <circle cx="128" cy="128" r="120" fill="#f8f7f0" />')
    elif is_stripe:
        # Base White Sphere
        svg.append('  <circle cx="128" cy="128" r="120" fill="#f8f7f0" />')
        # Stripe Band clipped to sphere
        svg.append(f'  <rect x="0" y="72" width="256" height="112" fill="{base_color}" clip-path="url(#ballClip)" />')
    else:
        # Solid Color Sphere
        svg.append(f'  <circle cx="128" cy="128" r="120" fill="{base_color}" />')

    # Number Circle & Digit (Non-cue)
    if not is_cue:
        svg.append('  <circle cx="128" cy="128" r="52" fill="#ffffff" stroke="#d0d0d0" stroke-width="2" />')
        svg.append(f'  <text x="128" y="140" font-family="Inter, system-ui, sans-serif" font-weight="bold" font-size="52" fill="#111111" text-anchor="middle">{bid}</text>')
        if bid in (6, 9):
            # Underline bar for 6 and 9
            svg.append('  <line x1="106" y1="152" x2="150" y2="152" stroke="#111111" stroke-width="4" stroke-linecap="round" />')

    # Sphere 3D Shading & Specular Overlay
    svg.append('  <circle cx="128" cy="128" r="120" fill="url(#ballShade)" />')
    svg.append('  <ellipse cx="90" cy="80" rx="50" ry="28" fill="url(#specular)" transform="rotate(-20 90 80)" />')
    svg.append('</svg>')

    return "\n".join(svg)

def build_all():
    os.makedirs(ASSETS_DIR, exist_ok=True)
    files = {
        "felt.svg": gen_felt_svg(),
        "rail-wood.svg": gen_rail_wood_svg(),
        "pocket-well.svg": gen_pocket_well_svg(),
        "pocket-plate.svg": gen_pocket_plate_svg(),
        "ball-shadow.svg": gen_ball_shadow_svg(),
        "cushion-shadow.svg": gen_cushion_shadow_svg(),
        "shadow.svg": gen_shadow_svg(),
        "frame.svg": gen_frame_svg(),
        "ui_sidebar.svg": gen_ui_sidebar_svg(),
        "ball_template.svg": gen_ball_template_svg(),
    }
    for b in range(10):
        files[f"ball-{b}.svg"] = gen_ball_svg(b)

    for filename, content in files.items():
        path = os.path.join(ASSETS_DIR, filename)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Generated {path}")

if __name__ == "__main__":
    build_all()
