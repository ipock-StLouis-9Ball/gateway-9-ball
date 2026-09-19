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
      <stop offset="0%" stop-color="#F2E3CA" />
      <stop offset="60%" stop-color="#E8D5B5" />
      <stop offset="88%" stop-color="#D8C2A0" />
      <stop offset="100%" stop-color="#C5AF8D" />
    </radialGradient>
    <filter id="clothGrain" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" result="noise" />
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.04 0" />
      <feBlend mode="multiply" in="SourceGraphic" result="blend" />
    </filter>
  </defs>
  <rect width="1000" height="500" fill="url(#feltVignette)" />
  <rect width="1000" height="500" fill="#000" filter="url(#clothGrain)" opacity="0.4" style="mix-blend-mode: overlay;" />
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
  <path d="M 256,16 A 240,240 0 1 0 256,496 A 240,240 0 1 0 256,16 Z M 256,106 A 150,150 0 1 1 256,406 A 150,150 0 1 1 256,106 Z" fill="url(#brassGrad)" fill-rule="evenodd" />
  <circle cx="256" cy="256" r="150" fill="none" stroke="#1a1207" stroke-width="6" opacity="0.8" />
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
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6400 3600" width="100%" height="100%" shape-rendering="geometricPrecision">
  <defs>
    <!-- Brushed Charcoal Metallic Rail Gradient -->
    <linearGradient id="charcoalMetal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1c1e22"/>
      <stop offset="20%" stop-color="#2e3238"/>
      <stop offset="40%" stop-color="#181a1d"/>
      <stop offset="60%" stop-color="#3a3e46"/>
      <stop offset="80%" stop-color="#22252a"/>
      <stop offset="100%" stop-color="#121316"/>
    </linearGradient>

    <!-- Cyan Glow Gradient for Inner Rail Accents -->
    <linearGradient id="cyanGlowGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#00E5FF" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#80F3FF" stop-opacity="1.0"/>
      <stop offset="100%" stop-color="#00E5FF" stop-opacity="0.9"/>
    </linearGradient>

    <!-- Transparent Glass Pocket Depth Radial Gradient -->
    <radialGradient id="glassPocketGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.95"/>
      <stop offset="50%" stop-color="#00E5FF" stop-opacity="0.25"/>
      <stop offset="80%" stop-color="#001824" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#00E5FF" stop-opacity="0.8"/>
    </radialGradient>

    <!-- Ruby Red Diamond Inlay -->
    <g id="ruby-diamond">
      <polygon points="0,-24 16,0 0,24 -16,0" fill="#00E5FF" opacity="0.6"/>
      <polygon points="0,-20 13,0 0,20 -13,0" fill="#E0115F"/>
      <polygon points="0,-16 8,-2 0,0 -6,-8" fill="#FF7BA9" opacity="0.9"/>
    </g>
  </defs>

  <!-- Layer 1: Outer Soft Shadow -->
  <rect x="220" y="120" width="5960" height="3360" rx="180" ry="180" fill="#000000" opacity="0.7" filter="blur(20px)"/>

  <!-- Layer 2: Outer Brushed Charcoal Metallic Frame Body with Playing Area Cutout -->
  <path d="M 400 200 H 6000 Q 6200 200 6200 400 V 3200 Q 6200 3400 6000 3400 H 400 Q 200 3400 200 3200 V 400 Q 200 200 400 200 Z M 1200 1000 H 5200 V 2600 H 1200 Z" fill="url(#charcoalMetal)" fill-rule="evenodd" stroke="#101214" stroke-width="16"/>

  <!-- Layer 3: Cyan Glow Accent Lines along Rail-Felt Junction -->
  <path d="M 1200 985 H 3080 M 3320 985 H 5200" stroke="#00E5FF" stroke-width="12" fill="none"/>
  <path d="M 1200 2615 H 3080 M 3320 2615 H 5200" stroke="#00E5FF" stroke-width="12" fill="none"/>
  <path d="M 1185 1000 V 2600 M 5215 1000 V 2600" stroke="#00E5FF" stroke-width="12" fill="none"/>

  <!-- Layer 4: Transparent Glass Pockets with Depth Shading -->
  <!-- Top-Left Corner -->
  <circle cx="1100" cy="900" r="140" fill="url(#glassPocketGrad)" stroke="#00E5FF" stroke-width="8"/>
  <!-- Top-Right Corner -->
  <circle cx="5300" cy="900" r="140" fill="url(#glassPocketGrad)" stroke="#00E5FF" stroke-width="8"/>
  <!-- Bottom-Left Corner -->
  <circle cx="1100" cy="2700" r="140" fill="url(#glassPocketGrad)" stroke="#00E5FF" stroke-width="8"/>
  <!-- Bottom-Right Corner -->
  <circle cx="5300" cy="2700" r="140" fill="url(#glassPocketGrad)" stroke="#00E5FF" stroke-width="8"/>
  <!-- Top-Center Side -->
  <circle cx="3200" cy="880" r="130" fill="url(#glassPocketGrad)" stroke="#00E5FF" stroke-width="8"/>
  <!-- Bottom-Center Side -->
  <circle cx="3200" cy="2720" r="130" fill="url(#glassPocketGrad)" stroke="#00E5FF" stroke-width="8"/>

  <!-- Layer 5: Ruby Diamond Inlays (18 Total) -->
  <!-- Top Left Rail Diamonds -->
  <use href="#ruby-diamond" x="1550" y="600"/>
  <use href="#ruby-diamond" x="2060" y="600"/>
  <use href="#ruby-diamond" x="2570" y="600"/>

  <!-- Top Right Rail Diamonds -->
  <use href="#ruby-diamond" x="3830" y="600"/>
  <use href="#ruby-diamond" x="4340" y="600"/>
  <use href="#ruby-diamond" x="4850" y="600"/>

  <!-- Bottom Left Rail Diamonds -->
  <use href="#ruby-diamond" x="1550" y="3000"/>
  <use href="#ruby-diamond" x="2060" y="3000"/>
  <use href="#ruby-diamond" x="2570" y="3000"/>

  <!-- Bottom Right Rail Diamonds -->
  <use href="#ruby-diamond" x="3830" y="3000"/>
  <use href="#ruby-diamond" x="4340" y="3000"/>
  <use href="#ruby-diamond" x="4850" y="3000"/>

  <!-- Left Rail Diamonds -->
  <use href="#ruby-diamond" x="600" y="1420"/>
  <use href="#ruby-diamond" x="600" y="1800"/>
  <use href="#ruby-diamond" x="600" y="2180"/>

  <!-- Right Rail Diamonds -->
  <use href="#ruby-diamond" x="5800" y="1420"/>
  <use href="#ruby-diamond" x="5800" y="1800"/>
  <use href="#ruby-diamond" x="5800" y="2180"/>
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
  <circle cx="128" cy="128" r="120" fill="url(#sphereShade)" />
  <ellipse cx="90" cy="80" rx="55" ry="32" fill="url(#specularGlow)" transform="rotate(-20 90 80)" />
</svg>"""

def gen_ball_svg(bid):
    base_color = BALL_COLORS[bid]
    is_cue = (bid == 0)
    is_stripe = (bid == 9)

    svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="100%" height="100%" shape-rendering="geometricPrecision">']
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
        svg.append('  <circle cx="128" cy="128" r="120" fill="#f8f7f0" />')
    elif is_stripe:
        svg.append('  <circle cx="128" cy="128" r="120" fill="#f8f7f0" />')
        svg.append(f'  <rect x="0" y="72" width="256" height="112" fill="{base_color}" clip-path="url(#ballClip)" />')
    else:
        svg.append(f'  <circle cx="128" cy="128" r="120" fill="{base_color}" />')

    if not is_cue:
        svg.append('  <circle cx="128" cy="128" r="52" fill="#ffffff" stroke="#d0d0d0" stroke-width="2" />')
        svg.append(f'  <text x="128" y="140" font-family="Inter, system-ui, sans-serif" font-weight="bold" font-size="52" fill="#111111" text-anchor="middle">{bid}</text>')
        if bid in (6, 9):
            svg.append('  <line x1="106" y1="152" x2="150" y2="152" stroke="#111111" stroke-width="4" stroke-linecap="round" />')

    svg.append('  <circle cx="128" cy="128" r="120" fill="url(#ballShade)" />')
    svg.append('  <ellipse cx="90" cy="80" rx="50" ry="28" fill="url(#specular)" transform="rotate(-20 90 80)" />')
    svg.append('</svg>')

    return "\n".join(svg)

# --- NEW BALL SCHEMES (1-9) ---

# 1. High Roller Ball Scheme
def gen_high_roller_ball_svg(bid):
    base_color = BALL_COLORS[bid]
    is_stripe = (bid == 9)

    svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="100%" height="100%" shape-rendering="geometricPrecision">']
    svg.append('  <defs>')
    svg.append('    <radialGradient id="goldCoinGrad" cx="35%" cy="35%" r="65%">')
    svg.append('      <stop offset="0%" stop-color="#fff4cc" />')
    svg.append('      <stop offset="40%" stop-color="#e8c258" />')
    svg.append('      <stop offset="80%" stop-color="#b88a28" />')
    svg.append('      <stop offset="100%" stop-color="#6e4f10" />')
    svg.append('    </radialGradient>')
    svg.append('    <radialGradient id="ballShade" cx="35%" cy="30%" r="65%">')
    svg.append('      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35" />')
    svg.append('      <stop offset="60%" stop-color="#ffffff" stop-opacity="0.0" />')
    svg.append('      <stop offset="85%" stop-color="#000000" stop-opacity="0.4" />')
    svg.append('      <stop offset="100%" stop-color="#000000" stop-opacity="0.8" />')
    svg.append('    </radialGradient>')
    svg.append('    <radialGradient id="specular" cx="32%" cy="25%" r="28%">')
    svg.append('      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.75" />')
    svg.append('      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.15" />')
    svg.append('      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0" />')
    svg.append('    </radialGradient>')
    if is_stripe:
        svg.append('    <clipPath id="ballClip">')
        svg.append('      <circle cx="128" cy="128" r="120" />')
        svg.append('    </clipPath>')
    svg.append('  </defs>')

    # Outer Clay Chip Body
    if is_stripe:
        svg.append('  <circle cx="128" cy="128" r="120" fill="#181818" />')
        svg.append(f'  <rect x="0" y="68" width="256" height="120" fill="{base_color}" clip-path="url(#ballClip)" />')
    else:
        svg.append(f'  <circle cx="128" cy="128" r="120" fill="{base_color}" />')

    # Poker Chip Outer Edge Notches / Dashed Rim
    svg.append('  <circle cx="128" cy="128" r="108" fill="none" stroke="#ffffff" stroke-width="12" stroke-dasharray="18 18" opacity="0.8" />')
    svg.append('  <circle cx="128" cy="128" r="98" fill="none" stroke="#000000" stroke-width="3" opacity="0.4" />')

    # Central Metallic Gold Coin Inlay
    svg.append('  <circle cx="128" cy="128" r="54" fill="url(#goldCoinGrad)" stroke="#3a2808" stroke-width="3" />')
    svg.append('  <circle cx="128" cy="128" r="46" fill="none" stroke="#fff1bd" stroke-width="1.5" opacity="0.8" />')

    # Number
    svg.append(f'  <text x="128" y="142" font-family="Inter, system-ui, sans-serif" font-weight="900" font-size="48" fill="#261a05" text-anchor="middle">{bid}</text>')
    if bid in (6, 9):
        svg.append('  <line x1="108" y1="152" x2="148" y2="152" stroke="#261a05" stroke-width="4" stroke-linecap="round" />')

    svg.append('  <circle cx="128" cy="128" r="120" fill="url(#ballShade)" />')
    svg.append('  <ellipse cx="90" cy="80" rx="50" ry="28" fill="url(#specular)" transform="rotate(-20 90 80)" />')
    svg.append('</svg>')

    return "\n".join(svg)


# 2. Polished Metallic Ball Scheme
METALLIC_COLORS = {
    1: "#e6c622", # Anodized Gold
    2: "#226be6", # Titanium Cobalt
    3: "#e62232", # Anodized Crimson
    4: "#8022e6", # Deep Purple Metallic
    5: "#e66822", # Copper Orange
    6: "#22a652", # Emerald Metallic
    7: "#8e2632", # Metallic Ruby
    8: "#282a30", # Metallic Onyx
    9: "#e6c622", # Metallic Gold Stripe
}

def gen_metallic_ball_svg(bid):
    base_color = METALLIC_COLORS[bid]
    is_stripe = (bid == 9)

    svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="100%" height="100%" shape-rendering="geometricPrecision">']
    svg.append('  <defs>')
    svg.append('    <linearGradient id="metalBody" x1="0%" y1="0%" x2="100%" y2="100%">')
    svg.append(f'      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6" />')
    svg.append(f'      <stop offset="30%" stop-color="{base_color}" />')
    svg.append(f'      <stop offset="70%" stop-color="#10141a" />')
    svg.append(f'      <stop offset="100%" stop-color="{base_color}" />')
    svg.append('    </linearGradient>')
    svg.append('    <radialGradient id="chromePlate" cx="35%" cy="35%" r="65%">')
    svg.append('      <stop offset="0%" stop-color="#ffffff" />')
    svg.append('      <stop offset="50%" stop-color="#d0d8e0" />')
    svg.append('      <stop offset="80%" stop-color="#707880" />')
    svg.append('      <stop offset="100%" stop-color="#202428" />')
    svg.append('    </radialGradient>')
    svg.append('    <radialGradient id="sharpSpecular" cx="30%" cy="22%" r="22%">')
    svg.append('      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />')
    svg.append('      <stop offset="35%" stop-color="#ffffff" stop-opacity="0.5" />')
    svg.append('      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0" />')
    svg.append('    </radialGradient>')
    if is_stripe:
        svg.append('    <clipPath id="ballClip">')
        svg.append('      <circle cx="128" cy="128" r="120" />')
        svg.append('    </clipPath>')
    svg.append('  </defs>')

    if is_stripe:
        svg.append('  <circle cx="128" cy="128" r="120" fill="url(#chromePlate)" />')
        svg.append(f'  <rect x="0" y="70" width="256" height="116" fill="url(#metalBody)" clip-path="url(#ballClip)" />')
    else:
        svg.append('  <circle cx="128" cy="128" r="120" fill="url(#metalBody)" />')

    # Titanium Chrome Ring & Etched Number Plate
    svg.append('  <circle cx="128" cy="128" r="54" fill="url(#chromePlate)" stroke="#11151a" stroke-width="3" />')
    svg.append('  <circle cx="128" cy="128" r="46" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.9" />')

    # Etched Metallic Number
    svg.append(f'  <text x="128" y="142" font-family="Inter, system-ui, sans-serif" font-weight="900" font-size="48" fill="#0d1117" text-anchor="middle">{bid}</text>')
    if bid in (6, 9):
        svg.append('  <line x1="108" y1="152" x2="148" y2="152" stroke="#0d1117" stroke-width="4" stroke-linecap="round" />')

    svg.append('  <ellipse cx="85" cy="72" rx="45" ry="22" fill="url(#sharpSpecular)" transform="rotate(-25 85 72)" />')
    svg.append('</svg>')

    return "\n".join(svg)


# 3. Pearlescent Ball Scheme
PEARL_COLORS = {
    1: "#f0d556",
    2: "#4a83f0",
    3: "#f04a56",
    4: "#9b4af0",
    5: "#f0854a",
    6: "#38b865",
    7: "#b83848",
    8: "#282a36",
    9: "#f0d556",
}

def gen_pearl_ball_svg(bid):
    base_color = PEARL_COLORS[bid]
    is_stripe = (bid == 9)

    svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="100%" height="100%" shape-rendering="geometricPrecision">']
    svg.append('  <defs>')
    svg.append('    <radialGradient id="pearlBody" cx="30%" cy="25%" r="75%">')
    svg.append('      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />')
    svg.append(f'      <stop offset="35%" stop-color="{base_color}" />')
    svg.append('      <stop offset="70%" stop-color="#181c2b" />')
    svg.append(f'      <stop offset="100%" stop-color="{base_color}" />')
    svg.append('    </radialGradient>')
    svg.append('    <radialGradient id="pearlInlay" cx="35%" cy="35%" r="65%">')
    svg.append('      <stop offset="0%" stop-color="#ffffff" />')
    svg.append('      <stop offset="60%" stop-color="#f0f4f8" />')
    svg.append('      <stop offset="100%" stop-color="#c8d2de" />')
    svg.append('    </radialGradient>')
    svg.append('    <radialGradient id="softPearlGlow" cx="32%" cy="25%" r="40%">')
    svg.append('      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85" />')
    svg.append('      <stop offset="50%" stop-color="#e8f4ff" stop-opacity="0.3" />')
    svg.append('      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0" />')
    svg.append('    </radialGradient>')
    if is_stripe:
        svg.append('    <clipPath id="ballClip">')
        svg.append('      <circle cx="128" cy="128" r="120" />')
        svg.append('    </clipPath>')
    svg.append('  </defs>')

    if is_stripe:
        svg.append('  <circle cx="128" cy="128" r="120" fill="url(#pearlInlay)" />')
        svg.append(f'  <rect x="0" y="70" width="256" height="116" fill="url(#pearlBody)" clip-path="url(#ballClip)" />')
    else:
        svg.append('  <circle cx="128" cy="128" r="120" fill="url(#pearlBody)" />')

    # Pearl Central Inlay
    svg.append('  <circle cx="128" cy="128" r="52" fill="url(#pearlInlay)" stroke="#8090a0" stroke-width="2" />')
    svg.append('  <circle cx="128" cy="128" r="46" fill="none" stroke="#ffffff" stroke-width="1.5" />')

    # Typography
    svg.append(f'  <text x="128" y="142" font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="48" fill="#1e2430" text-anchor="middle">{bid}</text>')
    if bid in (6, 9):
        svg.append('  <line x1="108" y1="152" x2="148" y2="152" stroke="#1e2430" stroke-width="4" stroke-linecap="round" />')

    svg.append('  <ellipse cx="90" cy="78" rx="52" ry="28" fill="url(#softPearlGlow)" transform="rotate(-20 90 78)" />')
    svg.append('</svg>')

    return "\n".join(svg)


# --- STORE CUE STICKS (viewBox="0 0 800 50", horizontal layout, Tip at x=0..20, Butt at x=800) ---

# 1. The Newtonian (`cue_newtonian`) — Solid oak wood grain gradient with inlaid brass-gold physics equations.
def gen_cue_newtonian_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 50" width="100%" height="100%" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="oakGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f2d199" />
      <stop offset="35%" stop-color="#dca868" />
      <stop offset="70%" stop-color="#9e662c" />
      <stop offset="100%" stop-color="#54300c" />
    </linearGradient>
    <linearGradient id="brassGold" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff1b0" />
      <stop offset="50%" stop-color="#d4af37" />
      <stop offset="100%" stop-color="#806214" />
    </linearGradient>
    <linearGradient id="cueSheen" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.4" />
      <stop offset="30%" stop-color="#ffffff" stop-opacity="0.05" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.35" />
    </linearGradient>
  </defs>

  <!-- Cue Stick Tapered Body (Tip height ~8px at x=15 to Butt height ~28px at x=795) -->
  <polygon points="15,21 795,11 795,39 15,29" fill="url(#oakGrad)" />
  <polygon points="15,21 795,11 795,39 15,29" fill="url(#cueSheen)" />

  <!-- Leather Tip & Ferrule (x=0..15) -->
  <rect x="0" y="21.5" width="5" height="7" rx="1" fill="#4a2e1b" />
  <rect x="5" y="21" width="10" height="8" fill="#f8f8f0" stroke="#d0d0c0" stroke-width="0.5" />

  <!-- Inlaid Brass Physics Equations on Forearm & Butt -->
  <text x="120" y="27" font-family="serif" font-style="italic" font-size="9" fill="url(#brassGold)" opacity="0.85">F = ma</text>
  <text x="220" y="27" font-family="serif" font-style="italic" font-size="9" fill="url(#brassGold)" opacity="0.85">p = mv</text>
  <text x="340" y="28" font-family="serif" font-style="italic" font-size="10" fill="url(#brassGold)" opacity="0.85">E = ½mv²</text>
  <text x="500" y="29" font-family="serif" font-style="italic" font-size="11" fill="url(#brassGold)" opacity="0.9">L = r × p</text>
  <text x="640" y="30" font-family="serif" font-style="italic" font-size="12" fill="url(#brassGold)" opacity="0.9">τ = r × F</text>

  <!-- Brass Accent Rings -->
  <rect x="420" y="17" width="6" height="16" fill="url(#brassGold)" />
  <rect x="580" y="14" width="8" height="22" fill="url(#brassGold)" />

  <!-- Rubber Butt Cap -->
  <rect x="795" y="10" width="5" height="30" rx="2" fill="#151515" />
</svg>"""

# 2. The Hustler (`cue_hustler`) — Distressed wood texture, silver-gray duct-taped grip, slightly offset/misaligned ferrule.
def gen_cue_hustler_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 50" width="100%" height="100%" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="distressedWood" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#b08453" />
      <stop offset="30%" stop-color="#734d28" />
      <stop offset="65%" stop-color="#523418" />
      <stop offset="100%" stop-color="#301c0a" />
    </linearGradient>
    <linearGradient id="ductTapeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#e0e0e0" />
      <stop offset="50%" stop-color="#a0a8b0" />
      <stop offset="100%" stop-color="#606870" />
    </linearGradient>
  </defs>

  <!-- Tapered Main Shaft Body -->
  <polygon points="15,21 795,11 795,39 15,29" fill="url(#distressedWood)" />

  <!-- Distressed Wood Scratches & Wear Stains -->
  <path d="M 80,22 L 200,24 M 140,20 L 280,22 M 350,18 L 450,21" stroke="#221205" stroke-width="1.2" opacity="0.6" />

  <!-- Misaligned / Slightly Offset Ferrule (x=5..15 tilted slightly) -->
  <rect x="0" y="21" width="5" height="7" fill="#3a2215" transform="rotate(1.5 5 24)" />
  <polygon points="5,20.5 15,22 15,30 5,28.5" fill="#e8e0d0" stroke="#807868" stroke-width="0.5" />

  <!-- Duct-Taped Textured Silver-Gray Grip Wrap (x=480..680) -->
  <g id="duct-tape-wrap">
    <polygon points="480,16 680,13 680,37 480,34" fill="url(#ductTapeGrad)" />
    <!-- Wrinkle & Seam Lines on Tape -->
    <path d="M 500,16 L 515,34 M 540,15 L 555,35 M 580,15 L 595,36 M 620,14 L 635,36 M 660,13 L 672,37" stroke="#ffffff" stroke-width="1.5" opacity="0.6" />
    <path d="M 508,16 L 523,34 M 548,15 L 563,35 M 588,15 L 603,36 M 628,14 L 643,36" stroke="#404850" stroke-width="1" opacity="0.5" />
  </g>

  <!-- Chipped Rubber Butt Cap -->
  <polygon points="795,11 800,12 798,38 795,39" fill="#202020" />
</svg>"""

# 3. The Sovereign (`cue_sovereign`) — Deep royal finish with ornate golden filigree scrolls and a micro-dot crushed velvet wrap.
def gen_cue_sovereign_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 50" width="100%" height="100%" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="royalFinish" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f5e6cc" />
      <stop offset="30%" stop-color="#5a1224" />
      <stop offset="65%" stop-color="#2b050e" />
      <stop offset="100%" stop-color="#120105" />
    </linearGradient>
    <linearGradient id="goldFiligree" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff3b0" />
      <stop offset="40%" stop-color="#ffd700" />
      <stop offset="80%" stop-color="#da9100" />
      <stop offset="100%" stop-color="#7a5000" />
    </linearGradient>
    <pattern id="crushedVelvet" width="8" height="8" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" fill="#3b0813" />
      <circle cx="2" cy="2" r="1.2" fill="#8a1830" opacity="0.8" />
      <circle cx="6" cy="6" r="1.2" fill="#e03050" opacity="0.5" />
    </pattern>
    <linearGradient id="sovereignSheen" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.5" />
      <stop offset="40%" stop-color="#ffffff" stop-opacity="0.0" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.5" opacity="0.8" />
    </linearGradient>
  </defs>

  <!-- Main Body -->
  <polygon points="15,21 795,11 795,39 15,29" fill="url(#royalFinish)" />

  <!-- Ivory Ferrule with Gold Ring -->
  <rect x="0" y="21.5" width="4" height="7" fill="#1f1008" />
  <rect x="4" y="21" width="11" height="8" fill="#fffdfa" />
  <rect x="15" y="21" width="3" height="8" fill="url(#goldFiligree)" />

  <!-- Gold Filigree Scroll Points on Forearm (x=200..450) -->
  <path d="M 220,23 Q 260,18 300,24 T 380,20 L 380,30 Q 300,32 260,26 Z" fill="url(#goldFiligree)" opacity="0.85" />
  <path d="M 250,22 Q 280,20 310,23 L 310,27 Q 280,30 250,28 Z" fill="#2b050e" />

  <!-- Crushed Velvet Wrap (x=480..680) -->
  <polygon points="480,16 680,13 680,37 480,34" fill="url(#crushedVelvet)" stroke="url(#goldFiligree)" stroke-width="1.5" />

  <!-- Ornate Butt Filigree Rings -->
  <rect x="690" y="12.5" width="8" height="25" fill="url(#goldFiligree)" />
  <rect x="750" y="11.5" width="12" height="27" fill="url(#goldFiligree)" />

  <polygon points="15,21 795,11 795,39 15,29" fill="url(#sovereignSheen)" />

  <!-- Crowned Gold Butt Cap -->
  <rect x="795" y="10" width="5" height="30" rx="2" fill="url(#goldFiligree)" />
</svg>"""

# 4. The Void (`cue_void`) — Ultra-matte reflectionless dark charcoal body with stealth grip grooves and zero specular glare.
def gen_cue_void_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 50" width="100%" height="100%" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="voidBody" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#2a2d32" />
      <stop offset="40%" stop-color="#181a1d" />
      <stop offset="100%" stop-color="#0a0b0d" />
    </linearGradient>
  </defs>

  <!-- Ultra-Matte Dark Body -->
  <polygon points="15,21 795,11 795,39 15,29" fill="url(#voidBody)" />

  <!-- Stealth Black Tip & Carbon Ferrule -->
  <rect x="0" y="21.5" width="5" height="7" fill="#0d0d0d" />
  <rect x="5" y="21" width="10" height="8" fill="#1c1e24" stroke="#000000" stroke-width="0.5" />

  <!-- Stealth Precision Grip Grooves (x=460..680) -->
  <g stroke="#050506" stroke-width="2">
    <line x1="470" y1="16" x2="470" y2="34" />
    <line x1="485" y1="16" x2="485" y2="34" />
    <line x1="500" y1="15" x2="500" y2="35" />
    <line x1="515" y1="15" x2="515" y2="35" />
    <line x1="530" y1="15" x2="530" y2="35" />
    <line x1="545" y1="15" x2="545" y2="35" />
    <line x1="560" y1="14" x2="560" y2="36" />
    <line x1="575" y1="14" x2="575" y2="36" />
    <line x1="590" y1="14" x2="590" y2="36" />
    <line x1="605" y1="14" x2="605" y2="36" />
    <line x1="620" y1="13" x2="620" y2="37" />
    <line x1="635" y1="13" x2="635" y2="37" />
    <line x1="650" y1="13" x2="650" y2="37" />
    <line x1="665" y1="13" x2="665" y2="37" />
  </g>

  <!-- Matte Dark Charcoal Ring Accents -->
  <rect x="420" y="17" width="4" height="16" fill="#121317" />
  <rect x="720" y="12" width="6" height="26" fill="#121317" />

  <!-- Flat Black Rubber Cap -->
  <rect x="795" y="10" width="5" height="30" rx="1" fill="#050505" />
</svg>"""

# 5. The Industrialist (`cue_industrialist`) — Brushed industrial steel shaft, rivet accents, and a tight cross-hatched raw leather wrap.
def gen_cue_industrialist_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 50" width="100%" height="100%" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="brushedSteel" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="20%" stop-color="#b0b8c0" />
      <stop offset="50%" stop-color="#788088" />
      <stop offset="80%" stop-color="#a0a8b0" />
      <stop offset="100%" stop-color="#404850" />
    </linearGradient>
    <pattern id="rawLeatherCrosshatch" width="10" height="10" patternUnits="userSpaceOnUse">
      <rect width="10" height="10" fill="#6e4a28" />
      <path d="M 0,0 L 10,10 M 10,0 L 0,10" stroke="#3b2410" stroke-width="1.2" />
    </pattern>
    <radialGradient id="rivetGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="60%" stop-color="#808890" />
      <stop offset="100%" stop-color="#202428" />
    </radialGradient>
  </defs>

  <!-- Brushed Industrial Steel Tapered Shaft -->
  <polygon points="15,21 795,11 795,39 15,29" fill="url(#brushedSteel)" />

  <!-- Hardened Steel Ferrule & Tip -->
  <rect x="0" y="21.5" width="5" height="7" fill="#202020" />
  <rect x="5" y="21" width="10" height="8" fill="#d8e0e8" stroke="#505860" stroke-width="0.5" />

  <!-- Exposed Steel Joint & Rivet Accents (x=380..420) -->
  <rect x="380" y="17.5" width="30" height="15" fill="#303840" />
  <circle cx="390" cy="21" r="2" fill="url(#rivetGrad)" />
  <circle cx="390" cy="29" r="2" fill="url(#rivetGrad)" />
  <circle cx="400" cy="21" r="2" fill="url(#rivetGrad)" />
  <circle cx="400" cy="29" r="2" fill="url(#rivetGrad)" />
  <circle cx="410" cy="21" r="2" fill="url(#rivetGrad)" />
  <circle cx="410" cy="29" r="2" fill="url(#rivetGrad)" />

  <!-- Cross-Hatched Raw Leather Grip Wrap (x=480..680) -->
  <polygon points="480,16 680,13 680,37 480,34" fill="url(#rawLeatherCrosshatch)" stroke="#382010" stroke-width="1.5" />

  <!-- Steel Butt Collar with Rivet Ring -->
  <rect x="710" y="12" width="20" height="26" fill="#303840" />
  <circle cx="720" cy="18" r="2.2" fill="url(#rivetGrad)" />
  <circle cx="720" cy="25" r="2.2" fill="url(#rivetGrad)" />
  <circle cx="720" cy="32" r="2.2" fill="url(#rivetGrad)" />

  <!-- Heavy Steel End Cap -->
  <rect x="795" y="10" width="5" height="30" rx="1" fill="#252a30" />
</svg>"""


def build_all():
    os.makedirs(ASSETS_DIR, exist_ok=True)

    # Root Assets
    files = {
        "felt.svg": gen_felt_svg(),
        "rail-wood.svg": gen_rail_wood_svg(),
        
        "ball-shadow.svg": gen_ball_shadow_svg(),
        "cushion-shadow.svg": gen_cushion_shadow_svg(),
        "shadow.svg": gen_shadow_svg(),
    
        
        "uisidebar.png": gen_uisidebar.png(),
        "ball_template.svg": gen_ball_template_svg(),
    }
    for b in range(10):
        files[f"ball-{b}.svg"] = gen_ball_svg(b)

    for filename, content in files.items():
        path = os.path.join(ASSETS_DIR, filename)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Generated {path}")

    # Subdirectory Ball Schemes (1 to 9 only)
    schemes = {
        "high_roller": gen_high_roller_ball_svg,
        "balls_metallic": gen_metallic_ball_svg,
        "balls_pearl": gen_pearl_ball_svg,
    }

    for scheme_name, gen_fn in schemes.items():
        scheme_dir = os.path.join(ASSETS_DIR, "balls", scheme_name)
        os.makedirs(scheme_dir, exist_ok=True)
        for b in range(1, 10):
            ball_path = os.path.join(scheme_dir, f"ball-{b}.svg")
            with open(ball_path, "w", encoding="utf-8") as f:
                f.write(gen_fn(b))
            print(f"Generated {ball_path}")

    # Subdirectory Cue Stick SVGs
    cues_dir = os.path.join(ASSETS_DIR, "cues")
    os.makedirs(cues_dir, exist_ok=True)
    cues = {
        "cue_newtonian.svg": gen_cue_newtonian_svg(),
        "cue_hustler.svg": gen_cue_hustler_svg(),
        "cue_sovereign.svg": gen_cue_sovereign_svg(),
        "cue_void.svg": gen_cue_void_svg(),
        "cue_industrialist.svg": gen_cue_industrialist_svg(),
    }

    for cue_filename, cue_content in cues.items():
        cue_path = os.path.join(cues_dir, cue_filename)
        with open(cue_path, "w", encoding="utf-8") as f:
            f.write(cue_content)
        print(f"Generated {cue_path}")

if __name__ == "__main__":
    build_all()
