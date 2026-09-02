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
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="100%" height="100%">
  <defs>
    <!-- Vertical gradient for horizontal rails (Top/Bottom) -->
    <linearGradient id="mahogany-vert" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1b0802" />
      <stop offset="15%" stop-color="#3d180a" />
      <stop offset="50%" stop-color="#662f18" />
      <stop offset="85%" stop-color="#3d180a" />
      <stop offset="100%" stop-color="#120401" />
    </linearGradient>

    <!-- Horizontal gradient for vertical rails (Left/Right) -->
    <linearGradient id="mahogany-horiz" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#1b0802" />
      <stop offset="15%" stop-color="#3d180a" />
      <stop offset="50%" stop-color="#662f18" />
      <stop offset="85%" stop-color="#3d180a" />
      <stop offset="100%" stop-color="#120401" />
    </linearGradient>

    <!-- Metallic Chrome Bezels (Linear Gradients) -->
    <linearGradient id="chrome-bezel" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2d3238" />
      <stop offset="15%" stop-color="#e6ebf0" />
      <stop offset="30%" stop-color="#8a939e" />
      <stop offset="45%" stop-color="#ffffff" />
      <stop offset="65%" stop-color="#4c535c" />
      <stop offset="85%" stop-color="#f0f4f7" />
      <stop offset="100%" stop-color="#1b1e21" />
    </linearGradient>

    <!-- SVG Filter Specifications: Purple Neon Glow -->
    <filter id="neon-glow-filter" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur-wide" />
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur-med" />
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur-sharp" />
      <feComponentTransfer in="blur-wide" result="glow-boosted">
        <feFuncA type="linear" slope="1.5"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode in="glow-boosted" />
        <feMergeNode in="blur-med" />
        <feMergeNode in="blur-sharp" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Diamond Sight Marker -->
    <polygon id="diamond-sight" points="0,-7 4,0 0,7 -4,0" fill="#f0e2cc" stroke="#3d1c0e" stroke-width="1" />
  </defs>

  <!-- Main Outer Rail Frame with Center Cutout (fill-rule="evenodd") -->
  <path d="M 100,100 L 1500,100 L 1500,800 L 100,800 Z M 240,180 L 750,180 A 50,50 0 0,0 850,180 L 1360,180 A 60,60 0 0,0 1420,240 L 1420,660 A 60,60 0 0,0 1360,720 L 850,720 A 50,50 0 0,0 750,720 L 240,720 A 60,60 0 0,0 180,660 L 180,240 A 60,60 0 0,0 240,180 Z" fill="url(#mahogany-vert)" fill-rule="evenodd" />

  <!-- Chrome Bezels (6 Pocket Caps) -->
  <!-- Top-Left Corner Bezel -->
  <path d="M 100,160 C 100,120 120,100 160,100 L 180,100 A 60,60 0 0,0 100,180 Z" fill="url(#chrome-bezel)" stroke="#ffffff" stroke-width="0.5" />
  <!-- Top-Right Corner Bezel -->
  <path d="M 1440,100 C 1480,100 1500,120 1500,160 L 1500,180 A 60,60 0 0,0 1420,100 Z" fill="url(#chrome-bezel)" stroke="#ffffff" stroke-width="0.5" />
  <!-- Bottom-Left Corner Bezel -->
  <path d="M 100,720 A 60,60 0 0,0 180,800 L 160,800 C 120,800 100,780 100,740 Z" fill="url(#chrome-bezel)" stroke="#ffffff" stroke-width="0.5" />
  <!-- Bottom-Right Corner Bezel -->
  <path d="M 1420,800 A 60,60 0 0,0 1500,720 L 1500,740 C 1500,780 1480,800 1440,800 Z" fill="url(#chrome-bezel)" stroke="#ffffff" stroke-width="0.5" />
  <!-- Top-Center Side Bezel -->
  <path d="M 740,100 L 860,100 L 850,180 A 50,50 0 0,0 750,180 Z" fill="url(#chrome-bezel)" stroke="#ffffff" stroke-width="0.5" />
  <!-- Bottom-Center Side Bezel -->
  <path d="M 740,800 L 860,800 L 850,720 A 50,50 0 0,0 750,720 Z" fill="url(#chrome-bezel)" stroke="#ffffff" stroke-width="0.5" />

  <!-- Purple Neon Glow Light Strips tucked under inner rail lips -->
  <path d="M 240,181 L 750,181 M 850,181 L 1360,181 M 1419,240 L 1419,660 M 850,719 L 1360,719 M 240,719 L 750,719 M 181,240 L 181,660" stroke="#f73bfa" stroke-width="3" stroke-linecap="round" filter="url(#neon-glow-filter)" fill="none" />

  <!-- Diamond Sights (Inlays) -->
  <!-- Left Vertical Rail (x=135; y=300, 450, 600) -->
  <use href="#diamond-sight" x="135" y="300" />
  <use href="#diamond-sight" x="135" y="450" />
  <use href="#diamond-sight" x="135" y="600" />

  <!-- Right Vertical Rail (x=1465; y=300, 450, 600) -->
  <use href="#diamond-sight" x="1465" y="300" />
  <use href="#diamond-sight" x="1465" y="450" />
  <use href="#diamond-sight" x="1465" y="600" />

  <!-- Top Horizontal Rail - Left Half (y=135; x=320, 460, 600) -->
  <use href="#diamond-sight" x="320" y="135" />
  <use href="#diamond-sight" x="460" y="135" />
  <use href="#diamond-sight" x="600" y="135" />

  <!-- Top Horizontal Rail - Right Half (y=135; x=1000, 1140, 1280) -->
  <use href="#diamond-sight" x="1000" y="135" />
  <use href="#diamond-sight" x="1140" y="135" />
  <use href="#diamond-sight" x="1280" y="135" />

  <!-- Bottom Horizontal Rail - Left Half (y=765; x=320, 460, 600) -->
  <use href="#diamond-sight" x="320" y="765" />
  <use href="#diamond-sight" x="460" y="765" />
  <use href="#diamond-sight" x="600" y="765" />

  <!-- Bottom Horizontal Rail - Right Half (y=765; x=1000, 1140, 1280) -->
  <use href="#diamond-sight" x="1000" y="765" />
  <use href="#diamond-sight" x="1140" y="765" />
  <use href="#diamond-sight" x="1280" y="765" />
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
        "pool_table_frame.svg": gen_frame_svg(),
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
