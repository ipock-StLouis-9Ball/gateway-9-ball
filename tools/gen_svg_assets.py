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

def gen_flet_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="100%" height="100%">
  <defs>
    <!-- Vignette Shadowing for Pocket Cavity depth -->
    <filter id="pocket-depth" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000000" flood-opacity="0.85"/>
    </filter>

    <radialGradient id="maroon-lighting" cx="50%" cy="50%" r="75%">
      <stop offset="0%" stop-color="#a44f59" />
      <stop offset="25%" stop-color="#7d343e" />
      <stop offset="65%" stop-color="#3d1217" />
      <stop offset="100%" stop-color="#180406" />
    </radialGradient>

    <pattern id="cloth-weave" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="2" height="2" fill="#000000" fill-opacity="0.15" />
      <rect x="2" y="2" width="2" height="2" fill="#000000" fill-opacity="0.15" />
    </pattern>
  </defs>

  <!-- Ground Layer: Deep Black Pocket Void Wells -->
  <g id="black-pocket-wells" fill="#0b0304" filter="url(#pocket-depth)">
    <circle cx="80" cy="80" r="42" />
    <circle cx="1840" cy="80" r="42" />
    <circle cx="80" cy="1000" r="42" />
    <circle cx="1840" cy="1000" r="42" />
    <circle cx="960" cy="70" r="44" />
    <circle cx="960" cy="1010" r="44" />
  </g>

  <!-- 🛠️ FIXED MAIN FELT BED: Rect boundary with pocket holes subtracted procedurally -->
  <path d="M 40,40 L 1880,40 L 1880,1040 L 40,1040 Z
           M 38,80 A 42,42 0 1,0 122,80 A 42,42 0 1,0 38,80 Z
           M 1798,80 A 42,42 0 1,0 1882,80 A 42,42 0 1,0 1798,80 Z
           M 38,1000 A 42,42 0 1,0 122,1000 A 42,42 0 1,0 38,1000 Z
           M 1798,1000 A 42,42 0 1,0 1882,1000 A 42,42 0 1,0 1798,1000 Z
           M 916,70 A 44,44 0 1,0 1004,70 A 44,44 0 1,0 916,70 Z
           M 916,1010 A 44,44 0 1,0 1004,1010 A 44,44 0 1,0 916,1010 Z"
        fill="url(#maroon-lighting)" fill-rule="evenodd" />

  <!-- Textured overlay following identical cutout matrix -->
  <path d="M 40,40 L 1880,40 L 1880,1040 L 40,1040 Z
           M 38,80 A 42,42 0 1,0 122,80 A 42,42 0 1,0 38,80 Z
           M 1798,80 A 42,42 0 1,0 1882,80 A 42,42 0 1,0 1798,80 Z
           M 38,1000 A 42,42 0 1,0 122,1000 A 42,42 0 1,0 38,1000 Z
           M 1798,1000 A 42,42 0 1,0 1882,1000 A 42,42 0 1,0 1798,1000 Z
           M 916,70 A 44,44 0 1,0 1004,70 A 44,44 0 1,0 916,70 Z
           M 916,1010 A 44,44 0 1,0 1004,1010 A 44,44 0 1,0 916,1010 Z"
        fill="url(#cloth-weave)" fill-rule="evenodd" style="mix-blend-mode: multiply;" />
</svg>"""

def gen_master_table_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700" width="100%" height="100%">
  <defs>
    <!-- Lighting Gradients for Felt Bed -->
    <radialGradient id="felt-lighting" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#9a3040" />
      <stop offset="35%" stop-color="#721f2b" />
      <stop offset="70%" stop-color="#461019" />
      <stop offset="100%" stop-color="#1d0408" />
    </radialGradient>

    <!-- Cloth Weave Texture Pattern -->
    <pattern id="cloth-weave-pattern" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="2" height="2" fill="#000000" fill-opacity="0.18" />
      <rect x="2" y="2" width="2" height="2" fill="#000000" fill-opacity="0.18" />
    </pattern>

    <!-- Wood Grain for Rails -->
    <pattern id="oak-wood-grain" width="120" height="700" patternUnits="userSpaceOnUse">
      <path d="M 0,50 Q 30,20 60,60 T 120,40 M 0,180 Q 40,210 80,170 T 120,190 M 0,350 Q 30,320 70,360 T 120,340 M 0,520 Q 50,550 90,500 T 120,530" fill="none" stroke="#685542" stroke-width="1.2" opacity="0.35" />
    </pattern>

    <!-- Wood Rail Base Gradient -->
    <linearGradient id="rail-wood-base" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ab9680" />
      <stop offset="25%" stop-color="#cca885" />
      <stop offset="50%" stop-color="#9e856e" />
      <stop offset="75%" stop-color="#c4a27f" />
      <stop offset="100%" stop-color="#8a725c" />
    </linearGradient>

    <!-- Metallic Gold Corner Trim Gradient -->
    <linearGradient id="gold-corner" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff2a8" />
      <stop offset="25%" stop-color="#d4af37" />
      <stop offset="50%" stop-color="#aa820a" />
      <stop offset="75%" stop-color="#f5d061" />
      <stop offset="100%" stop-color="#6e5000" />
    </linearGradient>

    <!-- Chrome/Silver Side Bezel Gradient -->
    <linearGradient id="silver-bezel" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#e6ecf2" />
      <stop offset="30%" stop-color="#929ca6" />
      <stop offset="50%" stop-color="#ffffff" />
      <stop offset="70%" stop-color="#555d66" />
      <stop offset="100%" stop-color="#24292e" />
    </linearGradient>

    <!-- Neon Rail Glow Filter -->
    <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur-wide" />
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur-sharp" />
      <feMerge>
        <feMergeNode in="blur-wide" />
        <feMergeNode in="blur-sharp" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Shadow for Pocket Cavity depth -->
    <filter id="pocket-depth-shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.9" />
    </filter>

    <!-- Ruby Diamond Inlay Marker -->
    <g id="ruby-diamond-inlay">
      <polygon points="0,-6 5,0 0,6 -5,0" fill="#cc1122" stroke="#ffe0a0" stroke-width="0.8" />
      <polygon points="0,-3 2.5,0 0,3 -2.5,0" fill="#ff6677" opacity="0.6" />
    </g>

    <!-- Cushion Backdraft Inner Shadow -->
    <linearGradient id="cushion-shadow-top" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="cushion-shadow-bottom" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="cushion-shadow-left" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="cushion-shadow-right" x1="100%" y1="0%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </linearGradient>
  </defs>

  <!-- LAYER 1: Table Base & Wood Frame Rails -->
  <!-- Outer Frame Box: (0,0) to (1200,700) -->
  <rect x="0" y="0" width="1200" height="700" fill="url(#rail-wood-base)" rx="12" ry="12" />
  <rect x="0" y="0" width="1200" height="700" fill="url(#oak-wood-grain)" rx="12" ry="12" />

  <!-- Wood Miter Rail Division Lines -->
  <path d="M 0,0 L 100,100 M 1200,0 L 1100,100 M 1200,700 L 1100,600 M 0,700 L 100,600" stroke="#5a4838" stroke-width="2" opacity="0.6" />

  <!-- LAYER 2: Deep Dark Pocket Wells -->
  <g id="master-pocket-wells" fill="#050102" filter="url(#pocket-depth-shadow)">
    <!-- Corner Pockets (R=36) -->
    <circle cx="100" cy="100" r="36" />
    <circle cx="1100" cy="100" r="36" />
    <circle cx="100" cy="600" r="36" />
    <circle cx="1100" cy="600" r="36" />
    <!-- Side Pockets (R=34) -->
    <circle cx="600" cy="92" r="34" />
    <circle cx="600" cy="608" r="34" />
  </g>

  <!-- LAYER 3: Maroon Felt Playing Surface with Pocket Cutouts -->
  <!-- Felt boundary rect (100,100) to (1100,600), minus pocket circles -->
  <path d="M 100,100 L 1100,100 L 1100,600 L 100,600 Z
           M 64,100 A 36,36 0 1,0 136,100 A 36,36 0 1,0 64,100 Z
           M 1064,100 A 36,36 0 1,0 1136,100 A 36,36 0 1,0 1064,100 Z
           M 64,600 A 36,36 0 1,0 136,600 A 36,36 0 1,0 64,600 Z
           M 1064,600 A 36,36 0 1,0 1136,600 A 36,36 0 1,0 1064,600 Z
           M 566,92 A 34,34 0 1,0 634,92 A 34,34 0 1,0 566,92 Z
           M 566,608 A 34,34 0 1,0 634,608 A 34,34 0 1,0 566,608 Z"
        fill="url(#felt-lighting)" fill-rule="evenodd" />

  <!-- Felt Weave Texture Overlay -->
  <path d="M 100,100 L 1100,100 L 1100,600 L 100,600 Z
           M 64,100 A 36,36 0 1,0 136,100 A 36,36 0 1,0 64,100 Z
           M 1064,100 A 36,36 0 1,0 1136,100 A 36,36 0 1,0 1064,100 Z
           M 64,600 A 36,36 0 1,0 136,600 A 36,36 0 1,0 64,600 Z
           M 1064,600 A 36,36 0 1,0 1136,600 A 36,36 0 1,0 1064,600 Z
           M 566,92 A 34,34 0 1,0 634,92 A 34,34 0 1,0 566,92 Z
           M 566,608 A 34,34 0 1,0 634,608 A 34,34 0 1,0 566,608 Z"
        fill="url(#cloth-weave-pattern)" fill-rule="evenodd" style="mix-blend-mode: multiply;" />

  <!-- LAYER 4: Cushion Shadow Backdraft (Inner bevel gradient) -->
  <rect x="100" y="100" width="1000" height="20" fill="url(#cushion-shadow-top)" />
  <rect x="100" y="580" width="1000" height="20" fill="url(#cushion-shadow-bottom)" />
  <rect x="100" y="100" width="20" height="500" fill="url(#cushion-shadow-left)" />
  <rect x="1080" y="100" width="20" height="500" fill="url(#cushion-shadow-right)" />

  <!-- LAYER 5: Red Neon Glow Trim Lines along inner cushion rail edges -->
  <path d="M 136,101 L 566,101 M 634,101 L 1064,101 M 1099,136 L 1099,564 M 634,599 L 1064,599 M 136,599 L 566,599 M 101,136 L 101,564"
        stroke="#ff2244" stroke-width="2.5" stroke-linecap="round" filter="url(#neon-glow)" fill="none" />

  <!-- LAYER 6: Inlaid Diamond Sights (Ruby Diamonds along rails) -->
  <!-- Top Rail (y=50): 6 diamonds -->
  <use href="#ruby-diamond-inlay" x="225" y="50" />
  <use href="#ruby-diamond-inlay" x="350" y="50" />
  <use href="#ruby-diamond-inlay" x="475" y="50" />
  <use href="#ruby-diamond-inlay" x="725" y="50" />
  <use href="#ruby-diamond-inlay" x="850" y="50" />
  <use href="#ruby-diamond-inlay" x="975" y="50" />

  <!-- Bottom Rail (y=650): 6 diamonds -->
  <use href="#ruby-diamond-inlay" x="225" y="650" />
  <use href="#ruby-diamond-inlay" x="350" y="650" />
  <use href="#ruby-diamond-inlay" x="475" y="650" />
  <use href="#ruby-diamond-inlay" x="725" y="650" />
  <use href="#ruby-diamond-inlay" x="850" y="650" />
  <use href="#ruby-diamond-inlay" x="975" y="650" />

  <!-- Left Rail (x=50): 3 diamonds -->
  <use href="#ruby-diamond-inlay" x="50" y="225" />
  <use href="#ruby-diamond-inlay" x="50" y="350" />
  <use href="#ruby-diamond-inlay" x="50" y="475" />

  <!-- Right Rail (x=1150): 3 diamonds -->
  <use href="#ruby-diamond-inlay" x="1150" y="225" />
  <use href="#ruby-diamond-inlay" x="1150" y="350" />
  <use href="#ruby-diamond-inlay" x="1150" y="475" />

  <!-- LAYER 7: Metal Pocket Corner & Side Hardware Bezels -->
  <!-- Top-Left Corner Gold Cap -->
  <path d="M 0,30 C 0,10 10,0 30,0 L 90,0 A 36,36 0 0,0 0,90 Z" fill="url(#gold-corner)" stroke="#fff" stroke-width="0.5" />
  <!-- Top-Right Corner Gold Cap -->
  <path d="M 1170,0 C 1190,0 1200,10 1200,30 L 1200,90 A 36,36 0 0,0 1110,0 Z" fill="url(#gold-corner)" stroke="#fff" stroke-width="0.5" />
  <!-- Bottom-Left Corner Gold Cap -->
  <path d="M 0,610 A 36,36 0 0,0 90,700 L 30,700 C 10,700 0,690 0,670 Z" fill="url(#gold-corner)" stroke="#fff" stroke-width="0.5" />
  <!-- Bottom-Right Corner Gold Cap -->
  <path d="M 1110,700 A 36,36 0 0,0 1200,610 L 1200,670 C 1200,690 1190,700 1170,700 Z" fill="url(#gold-corner)" stroke="#fff" stroke-width="0.5" />

  <!-- Top-Center Side Silver Pocket Hardware -->
  <path d="M 550,0 L 650,0 L 634,92 A 34,34 0 0,0 566,92 Z" fill="url(#silver-bezel)" stroke="#fff" stroke-width="0.5" />
  <!-- Bottom-Center Side Silver Pocket Hardware -->
  <path d="M 550,700 L 650,700 L 634,608 A 34,34 0 0,0 566,608 Z" fill="url(#silver-bezel)" stroke="#fff" stroke-width="0.5" />
</svg>"""

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
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6400 3600" width="100%" height="100%" shape-rendering="geometricPrecision">
  <defs>
    <!-- Polished Brass Linear Gradient -->
    <linearGradient id="polishedBrass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2b1800"/>
      <stop offset="0.08" stop-color="#8e5100"/>
      <stop offset="0.18" stop-color="#f6ba20"/>
      <stop offset="0.29" stop-color="#fff9c8"/>
      <stop offset="0.39" stop-color="#ffd750"/>
      <stop offset="0.57" stop-color="#a45d00"/>
      <stop offset="0.73" stop-color="#3b2000"/>
      <stop offset="0.88" stop-color="#d68b08"/>
      <stop offset="1" stop-color="#ffde64"/>
    </linearGradient>

    <!-- Polished Brass Vertical Gradient -->
    <linearGradient id="polishedBrassV" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2b1800"/>
      <stop offset="0.1" stop-color="#8e5100"/>
      <stop offset="0.2" stop-color="#f6ba20"/>
      <stop offset="0.3" stop-color="#fff9c8"/>
      <stop offset="0.4" stop-color="#ffd750"/>
      <stop offset="0.6" stop-color="#a45d00"/>
      <stop offset="0.75" stop-color="#3b2000"/>
      <stop offset="0.9" stop-color="#d68b08"/>
      <stop offset="1" stop-color="#ffde64"/>
    </linearGradient>

    <!-- Maple Horizontal Gradient -->
    <linearGradient id="mapleHorizontal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4c2b13"/>
      <stop offset="0.035" stop-color="#d5a861"/>
      <stop offset="0.090" stop-color="#fff7d2"/>
      <stop offset="0.245" stop-color="#f3d79a"/>
      <stop offset="0.430" stop-color="#8e5b28"/>
      <stop offset="0.525" stop-color="#e9c783"/>
      <stop offset="0.690" stop-color="#fff3c7"/>
      <stop offset="0.835" stop-color="#b1783a"/>
      <stop offset="0.950" stop-color="#f8dda0"/>
      <stop offset="1" stop-color="#43230f"/>
    </linearGradient>

    <!-- Maple Vertical Gradient -->
    <linearGradient id="mapleVertical" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#43230f"/>
      <stop offset="0.040" stop-color="#d6a960"/>
      <stop offset="0.105" stop-color="#fff7d1"/>
      <stop offset="0.255" stop-color="#efd497"/>
      <stop offset="0.460" stop-color="#8e5b28"/>
      <stop offset="0.560" stop-color="#e8c27a"/>
      <stop offset="0.715" stop-color="#fff3c5"/>
      <stop offset="0.865" stop-color="#a66c32"/>
      <stop offset="0.955" stop-color="#f1d497"/>
      <stop offset="1" stop-color="#43230f"/>
    </linearGradient>

    <!-- Micro Wood Grain Filter -->
    <filter id="microWoodGrain" x="-5%" y="-10%" width="110%" height="120%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise"
                    baseFrequency="0.013 1.8"
                    numOctaves="2"
                    seed="831"
                    result="noise"/>
      <feColorMatrix in="noise"
                     type="matrix"
                     values="
                       0.38 0 0 0 0.28
                       0 0.18 0 0 0.10
                       0 0 0.06 0 0.02
                       0 0 0 0.26 0"
                     result="grain"/>
      <feComposite in="grain"
                   in2="SourceGraphic"
                   operator="in"/>
      <feBlend in="SourceGraphic" in2="grain" mode="multiply"/>
    </filter>

    <!-- Soft Cast Shadow Filter -->
    <filter id="outerShadow" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="25" stdDeviation="30" flood-color="#000000" flood-opacity="0.65"/>
    </filter>

    <filter id="elbowShadow" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000000" flood-opacity="0.5"/>
    </filter>

    <!-- Diamond Sight Marker Definition -->
    <g id="rubyDiamondSight">
      <polygon points="0,-22 14,0 0,22 -14,0" fill="#fff9d8" stroke="#1c0a02" stroke-width="4"/>
      <polygon points="0,-14 9,0 0,14 -9,0" fill="#cc1122" stroke="#ffa8b0" stroke-width="2"/>
    </g>

    <!-- Rail Clip Paths -->
    <clipPath id="clipTopLeftRail">
      <path d="M1040 420 H3030 L2970 950 H1040 Z"/>
    </clipPath>
    <clipPath id="clipTopRightRail">
      <path d="M3370 420 H5360 Q5470 420 5470 530 V950 H3430 Z"/>
    </clipPath>
    <clipPath id="clipBottomLeftRail">
      <path d="M1040 2650 H2970 L3030 3180 H1040 Z"/>
    </clipPath>
    <clipPath id="clipBottomRightRail">
      <path d="M3430 2650 H5470 V3070 Q5470 3180 5360 3180 H3370 Z"/>
    </clipPath>
    <clipPath id="clipLeftRail">
      <path d="M420 1040 V2560 H950 V1040 Z"/>
    </clipPath>
    <clipPath id="clipRightRail">
      <path d="M5450 1040 V2560 H5980 V1040 Z"/>
    </clipPath>
  </defs>

  <!-- Visual Stack Order -->
  <!-- 1. Transparent Canvas (root) -->

  <!-- 2. Dark outer frame shadow -->
  <rect x="360" y="360" width="5680" height="2880" rx="200" ry="200" fill="#000" filter="url(#outerShadow)" opacity="0.7"/>

  <!-- 3. Heavy black structural base with central opening cut out by fill-rule="evenodd" -->
  <path d="M 380,380 H 6020 V 3220 H 380 Z M 1200,1000 H 5200 V 2600 H 1200 Z" fill="#120904" stroke="#000000" stroke-width="16" fill-rule="evenodd"/>

  <!-- 4. Deep red recessed rail reveal cut around central opening -->
  <path d="M 400,400 H 6000 V 3200 H 400 Z M 1170,970 H 5230 V 2630 H 1170 Z" fill="#2c0b08" stroke="#ef1927" stroke-width="6" opacity="0.9" fill-rule="evenodd"/>

  <!-- 5. Broad wood rail-cap sections interrupted by pocket openings -->

  <!-- TOP LEFT RAIL -->
  <g id="topLeftWoodRail">
    <path d="M1040 420 H3030 L2970 950 H1040 Z" fill="#321907" stroke="#170b03" stroke-width="24"/>
    <path d="M1070 447 H3010 L2950 916 H1070 Z" fill="url(#mapleHorizontal)" stroke="#b17a37" stroke-width="8"/>
    <g clip-path="url(#clipTopLeftRail)">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M980 514 C1390 476 1640 548 2050 510 S2720 474 3200 525" stroke="#75431c" stroke-width="9" opacity="0.64"/>
        <path d="M980 569 C1320 606 1670 526 1990 574 S2630 612 3120 550" stroke="#fff2c4" stroke-width="7" opacity="0.58"/>
        <path d="M980 647 C1440 590 1720 683 2200 634 S3040 586 3200 659" stroke="#6e3c18" stroke-width="13" opacity="0.69"/>
        <path d="M980 703 C1240 747 1600 658 1970 714 S2720 764 3200 700" stroke="#b97836" stroke-width="16" opacity="0.52"/>
        <path d="M980 783 C1380 739 1840 826 2310 765 S3030 718 3200 792" stroke="#623313" stroke-width="8" opacity="0.60"/>
        <path d="M980 858 C1300 813 1540 895 1930 846 S2670 811 3200 876" stroke="#fff6d4" stroke-width="10" opacity="0.48"/>
      </g>
    </g>
    <path d="M1070 447 H3010 L2950 916 H1070 Z" fill="url(#mapleHorizontal)" opacity="0.14" filter="url(#microWoodGrain)"/>
    <path d="M1095 473 H2990" fill="none" stroke="#fff8d9" stroke-width="18" stroke-linecap="round" opacity="0.74"/>
    <path d="M1070 924 H2950" fill="none" stroke="#351009" stroke-width="42"/>
    <path d="M1080 921 H2940" fill="none" stroke="#ef1927" stroke-width="12" opacity="0.90"/>
  </g>

  <!-- TOP RIGHT RAIL -->
  <g id="topRightWoodRail">
    <path d="M3370 420 H5360 Q5470 420 5470 530 V950 H3430 Z" fill="#321907" stroke="#170b03" stroke-width="24"/>
    <path d="M3390 447 H5336 Q5442 447 5442 553 V916 H3450 Z" fill="url(#mapleHorizontal)" stroke="#b17a37" stroke-width="8"/>
    <g clip-path="url(#clipTopRightRail)">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3200 514 C3600 476 3950 548 4350 510 S5000 474 5450 525" stroke="#75431c" stroke-width="9" opacity="0.64"/>
        <path d="M3200 569 C3550 606 3900 526 4250 574 S4900 612 5450 550" stroke="#fff2c4" stroke-width="7" opacity="0.58"/>
        <path d="M3200 647 C3650 590 3950 683 4400 634 S5100 586 5450 659" stroke="#6e3c18" stroke-width="13" opacity="0.69"/>
        <path d="M3200 703 C3500 747 3850 658 4200 714 S4950 764 5450 700" stroke="#b97836" stroke-width="16" opacity="0.52"/>
        <path d="M3200 783 C3600 739 4050 826 4500 765 S5200 718 5450 792" stroke="#623313" stroke-width="8" opacity="0.60"/>
      </g>
    </g>
    <path d="M3390 447 H5336 Q5442 447 5442 553 V916 H3450 Z" fill="url(#mapleHorizontal)" opacity="0.14" filter="url(#microWoodGrain)"/>
    <path d="M3410 473 H5318" fill="none" stroke="#fff8d9" stroke-width="18" stroke-linecap="round" opacity="0.74"/>
    <path d="M3450 924 H5438" fill="none" stroke="#351009" stroke-width="42"/>
    <path d="M3460 921 H5430" fill="none" stroke="#ef1927" stroke-width="12" opacity="0.90"/>
  </g>

  <!-- BOTTOM LEFT RAIL -->
  <g id="bottomLeftWoodRail">
    <path d="M1040 2650 H2970 L3030 3180 H1040 Z" fill="#321907" stroke="#170b03" stroke-width="24"/>
    <path d="M1070 2684 H2950 L3010 3153 H1070 Z" fill="url(#mapleHorizontal)" stroke="#b17a37" stroke-width="8"/>
    <g clip-path="url(#clipBottomLeftRail)">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M980 2740 C1390 2700 1640 2780 2050 2740 S2720 2700 3200 2750" stroke="#75431c" stroke-width="9" opacity="0.64"/>
        <path d="M980 2850 C1440 2800 1720 2890 2200 2840 S3040 2800 3200 2860" stroke="#6e3c18" stroke-width="13" opacity="0.69"/>
        <path d="M980 2980 C1380 2940 1840 3020 2310 2960 S3030 2920 3200 2990" stroke="#623313" stroke-width="8" opacity="0.60"/>
        <path d="M980 3080 C1300 3030 1540 3110 1930 3060 S2670 3030 3200 3080" stroke="#fff6d4" stroke-width="10" opacity="0.48"/>
      </g>
    </g>
    <path d="M1070 2684 H2950 L3010 3153 H1070 Z" fill="url(#mapleHorizontal)" opacity="0.14" filter="url(#microWoodGrain)"/>
    <path d="M1095 3127 H2990" fill="none" stroke="#fff8d9" stroke-width="18" stroke-linecap="round" opacity="0.74"/>
    <path d="M1070 2676 H2950" fill="none" stroke="#351009" stroke-width="42"/>
    <path d="M1080 2679 H2940" fill="none" stroke="#ef1927" stroke-width="12" opacity="0.90"/>
  </g>

  <!-- BOTTOM RIGHT RAIL -->
  <g id="bottomRightWoodRail">
    <path d="M3430 2650 H5470 V3070 Q5470 3180 5360 3180 H3370 Z" fill="#321907" stroke="#170b03" stroke-width="24"/>
    <path d="M3450 2684 H5442 V3047 Q5442 3153 5336 3153 H3390 Z" fill="url(#mapleHorizontal)" stroke="#b17a37" stroke-width="8"/>
    <g clip-path="url(#clipBottomRightRail)">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3200 2740 C3600 2700 3950 2780 4350 2740 S5000 2700 5450 2750" stroke="#75431c" stroke-width="9" opacity="0.64"/>
        <path d="M3200 2850 C3650 2800 3950 2890 4400 2840 S5100 2800 5450 2860" stroke="#6e3c18" stroke-width="13" opacity="0.69"/>
        <path d="M3200 2980 C3600 2940 4050 3020 4500 2960 S5200 2920 5450 2990" stroke="#623313" stroke-width="8" opacity="0.60"/>
      </g>
    </g>
    <path d="M3450 2684 H5442 V3047 Q5442 3153 5336 3153 H3390 Z" fill="url(#mapleHorizontal)" opacity="0.14" filter="url(#microWoodGrain)"/>
    <path d="M3410 3127 H5318" fill="none" stroke="#fff8d9" stroke-width="18" stroke-linecap="round" opacity="0.74"/>
    <path d="M3450 2676 H5438" fill="none" stroke="#351009" stroke-width="42"/>
    <path d="M3460 2679 H5430" fill="none" stroke="#ef1927" stroke-width="12" opacity="0.90"/>
  </g>

  <!-- LEFT RAIL -->
  <g id="leftWoodRail">
    <path d="M420 1040 V2560 H950 V1040 Z" fill="#321907" stroke="#170b03" stroke-width="24"/>
    <path d="M447 1070 V2530 H916 V1070 Z" fill="url(#mapleVertical)" stroke="#b17a37" stroke-width="8"/>
    <g clip-path="url(#clipLeftRail)">
      <g fill="none" stroke-linecap="round">
        <path d="M530 1030 C484 1370 558 1650 510 2040 S474 2700 526 2990" stroke="#6d3b17" stroke-width="11" opacity="0.65"/>
        <path d="M600 1010 C648 1360 566 1650 620 1980 S654 2600 605 2990" stroke="#fff3cc" stroke-width="8" opacity="0.58"/>
        <path d="M690 1020 C642 1410 730 1700 672 2070 S640 2650 700 2990" stroke="#714018" stroke-width="16" opacity="0.60"/>
        <path d="M790 1040 C836 1350 752 1710 816 2060 S850 2640 790 2990" stroke="#b87937" stroke-width="18" opacity="0.50"/>
      </g>
    </g>
    <path d="M447 1070 V2530 H916 V1070 Z" fill="url(#mapleVertical)" opacity="0.14" filter="url(#microWoodGrain)"/>
    <path d="M473 1095 V2505" fill="none" stroke="#fff8d9" stroke-width="18" stroke-linecap="round" opacity="0.74"/>
    <path d="M924 1070 V2530" fill="none" stroke="#351009" stroke-width="42"/>
    <path d="M921 1080 V2520" fill="none" stroke="#ef1927" stroke-width="12" opacity="0.90"/>
  </g>

  <!-- RIGHT RAIL -->
  <g id="rightWoodRail">
    <path d="M5450 1040 V2560 H5980 V1040 Z" fill="#321907" stroke="#170b03" stroke-width="24"/>
    <path d="M5484 1070 V2530 H5953 V1070 Z" fill="url(#mapleVertical)" stroke="#b17a37" stroke-width="8"/>
    <g clip-path="url(#clipRightRail)">
      <g fill="none" stroke-linecap="round">
        <path d="M5530 1030 C5484 1370 5558 1650 5510 2040 S5474 2700 5526 2990" stroke="#6d3b17" stroke-width="11" opacity="0.65"/>
        <path d="M5600 1010 C5648 1360 5566 1650 5620 1980 S5654 2600 5605 2990" stroke="#fff3cc" stroke-width="8" opacity="0.58"/>
        <path d="M5690 1020 C5642 1410 5730 1700 5672 2070 S5640 2650 5700 2990" stroke="#714018" stroke-width="16" opacity="0.60"/>
        <path d="M5790 1040 C5836 1350 5752 1710 5816 2060 S5850 2640 5790 2990" stroke="#b87937" stroke-width="18" opacity="0.50"/>
      </g>
    </g>
    <path d="M5484 1070 V2530 H5953 V1070 Z" fill="url(#mapleVertical)" opacity="0.14" filter="url(#microWoodGrain)"/>
    <path d="M5927 1095 V2505" fill="none" stroke="#fff8d9" stroke-width="18" stroke-linecap="round" opacity="0.74"/>
    <path d="M5476 1070 V2530" fill="none" stroke="#351009" stroke-width="42"/>
    <path d="M5479 1080 V2520" fill="none" stroke="#ef1927" stroke-width="12" opacity="0.90"/>
  </g>

  <!-- 6. Dark red cushion-nose strip, precisely broken at every pocket mouth -->
  <!-- Top Left Cushion Nose -->
  <path d="M 1200,980 L 2930,980 L 2910,1000 L 1220,1000 Z" fill="#880e18" stroke="#ef1927" stroke-width="4"/>
  <!-- Top Right Cushion Nose -->
  <path d="M 3470,980 L 5200,980 L 5180,1000 L 3490,1000 Z" fill="#880e18" stroke="#ef1927" stroke-width="4"/>
  <!-- Bottom Left Cushion Nose -->
  <path d="M 1200,2620 L 2930,2620 L 2910,2600 L 1220,2600 Z" fill="#880e18" stroke="#ef1927" stroke-width="4"/>
  <!-- Bottom Right Cushion Nose -->
  <path d="M 3470,2620 L 5200,2620 L 5180,2600 L 3490,2600 Z" fill="#880e18" stroke="#ef1927" stroke-width="4"/>
  <!-- Left Cushion Nose -->
  <path d="M 980,1200 L 980,2400 L 1000,2380 L 1000,1220 Z" fill="#880e18" stroke="#ef1927" stroke-width="4"/>
  <!-- Right Cushion Nose -->
  <path d="M 5420,1200 L 5420,2400 L 5400,2380 L 5400,1220 Z" fill="#880e18" stroke="#ef1927" stroke-width="4"/>

  <!-- 7. Pocket voids, facings, and top-view shelf regions -->
  <!-- Top-Left Pocket Mouth -->
  <path d="M 950,950 L 1200,980 L 1200,1000 L 1000,1200 L 980,1200 Z" fill="#120506" stroke="#2b0a0e" stroke-width="8"/>
  <!-- Top-Right Pocket Mouth -->
  <path d="M 5450,950 L 5200,980 L 5200,1000 L 5400,1200 L 5420,1200 Z" fill="#120506" stroke="#2b0a0e" stroke-width="8"/>
  <!-- Bottom-Left Pocket Mouth -->
  <path d="M 950,2650 L 1200,2620 L 1200,2600 L 1000,2400 L 980,2400 Z" fill="#120506" stroke="#2b0a0e" stroke-width="8"/>
  <!-- Bottom-Right Pocket Mouth -->
  <path d="M 5450,2650 L 5200,2620 L 5200,2600 L 5400,2400 L 5420,2400 Z" fill="#120506" stroke="#2b0a0e" stroke-width="8"/>
  <!-- Side Top Pocket Mouth -->
  <path d="M 2930,980 L 3470,980 L 3430,950 L 2970,950 Z" fill="#120506" stroke="#2b0a0e" stroke-width="8"/>
  <!-- Side Bottom Pocket Mouth -->
  <path d="M 2930,2620 L 3470,2620 L 3430,2650 L 2970,2650 Z" fill="#120506" stroke="#2b0a0e" stroke-width="8"/>

  <!-- 8. Heavy brass corner elbows over outer corner transitions -->

  <!-- Top-Left Brass Corner Elbow -->
  <g id="topLeftElbow" filter="url(#elbowShadow)">
    <path d="M 380,1040 C 380,500 500,380 1040,380 L 1040,650 C 750,650 650,750 650,1040 Z" fill="url(#polishedBrass)" stroke="#1a0f00" stroke-width="12"/>
    <!-- Surface Cues -->
    <path d="M 410,1000 C 410,540 540,410 1000,410" fill="none" stroke="#fff9d8" stroke-width="18" stroke-linecap="round" opacity="0.85"/>
    <path d="M 650,1035 C 650,760 760,650 1035,650" fill="none" stroke="#2b1800" stroke-width="10" opacity="0.90"/>
    <path d="M 660,1040 C 660,770 770,660 1040,660" fill="none" stroke="#000000" stroke-width="16" opacity="0.30"/>
    <ellipse cx="580" cy="580" rx="45" ry="25" fill="#ffffff" opacity="0.9" transform="rotate(-45 580 580)"/>
  </g>

  <!-- Top-Right Brass Corner Elbow -->
  <g id="topRightElbow" filter="url(#elbowShadow)">
    <path d="M 6020,1040 C 6020,500 5900,380 5360,380 L 5360,650 C 5650,650 5750,750 5750,1040 Z" fill="url(#polishedBrass)" stroke="#1a0f00" stroke-width="12"/>
    <!-- Surface Cues -->
    <path d="M 5990,1000 C 5990,540 5860,410 5400,410" fill="none" stroke="#fff9d8" stroke-width="18" stroke-linecap="round" opacity="0.85"/>
    <path d="M 5750,1035 C 5750,760 5640,650 5365,650" fill="none" stroke="#2b1800" stroke-width="10" opacity="0.90"/>
    <path d="M 5740,1040 C 5740,770 5630,660 5360,660" fill="none" stroke="#000000" stroke-width="16" opacity="0.30"/>
    <ellipse cx="5820" cy="580" rx="45" ry="25" fill="#ffffff" opacity="0.9" transform="rotate(45 5820 580)"/>
  </g>

  <!-- Bottom-Left Brass Corner Elbow -->
  <g id="bottomLeftElbow" filter="url(#elbowShadow)">
    <path d="M 380,2560 C 380,3100 500,3220 1040,3220 L 1040,2950 C 750,2950 650,2850 650,2560 Z" fill="url(#polishedBrass)" stroke="#1a0f00" stroke-width="12"/>
    <!-- Surface Cues -->
    <path d="M 410,2600 C 410,3060 540,3190 1000,3190" fill="none" stroke="#fff9d8" stroke-width="18" stroke-linecap="round" opacity="0.85"/>
    <path d="M 650,2565 C 650,2840 760,2950 1035,2950" fill="none" stroke="#2b1800" stroke-width="10" opacity="0.90"/>
    <path d="M 660,2560 C 660,2830 770,2940 1040,2940" fill="none" stroke="#000000" stroke-width="16" opacity="0.30"/>
    <ellipse cx="580" cy="3020" rx="45" ry="25" fill="#ffffff" opacity="0.9" transform="rotate(45 580 3020)"/>
  </g>

  <!-- Bottom-Right Brass Corner Elbow -->
  <g id="bottomRightElbow" filter="url(#elbowShadow)">
    <path d="M 6020,2560 C 6020,3100 5900,3220 5360,3220 L 5360,2950 C 5650,2950 5750,2850 5750,2560 Z" fill="url(#polishedBrass)" stroke="#1a0f00" stroke-width="12"/>
    <!-- Surface Cues -->
    <path d="M 5990,2600 C 5990,3060 5860,3190 5400,3190" fill="none" stroke="#fff9d8" stroke-width="18" stroke-linecap="round" opacity="0.85"/>
    <path d="M 5750,2565 C 5750,2840 5640,2950 5365,2950" fill="none" stroke="#2b1800" stroke-width="10" opacity="0.90"/>
    <path d="M 5740,2560 C 5740,2830 5630,2940 5360,2940" fill="none" stroke="#000000" stroke-width="16" opacity="0.30"/>
    <ellipse cx="5820" cy="3020" rx="45" ry="25" fill="#ffffff" opacity="0.9" transform="rotate(-45 5820 3020)"/>
  </g>

  <!-- Side Top Pocket Hardware / Bezel -->
  <g id="sideTopHardware" filter="url(#elbowShadow)">
    <path d="M 2910,380 H 3490 V 680 H 2910 Z" fill="url(#polishedBrass)" stroke="#1a0f00" stroke-width="10"/>
    <path d="M 2930,400 H 3470" stroke="#fff9d8" stroke-width="16" stroke-linecap="round" opacity="0.85"/>
  </g>

  <!-- Side Bottom Pocket Hardware / Bezel -->
  <g id="sideBottomHardware" filter="url(#elbowShadow)">
    <path d="M 2910,2920 H 3490 V 3220 H 2910 Z" fill="url(#polishedBrass)" stroke="#1a0f00" stroke-width="10"/>
    <path d="M 2930,3200 H 3470" stroke="#fff9d8" stroke-width="16" stroke-linecap="round" opacity="0.85"/>
  </g>

  <!-- 9. Diamond inlays and final high-gloss highlights -->
  <!-- Top Left Rail Sights (3) -->
  <use href="#rubyDiamondSight" x="1520" y="680"/>
  <use href="#rubyDiamondSight" x="2000" y="680"/>
  <use href="#rubyDiamondSight" x="2480" y="680"/>

  <!-- Top Right Rail Sights (3) -->
  <use href="#rubyDiamondSight" x="3920" y="680"/>
  <use href="#rubyDiamondSight" x="4400" y="680"/>
  <use href="#rubyDiamondSight" x="4880" y="680"/>

  <!-- Bottom Left Rail Sights (3) -->
  <use href="#rubyDiamondSight" x="1520" y="2920"/>
  <use href="#rubyDiamondSight" x="2000" y="2920"/>
  <use href="#rubyDiamondSight" x="2480" y="2920"/>

  <!-- Bottom Right Rail Sights (3) -->
  <use href="#rubyDiamondSight" x="3920" y="2920"/>
  <use href="#rubyDiamondSight" x="4400" y="2920"/>
  <use href="#rubyDiamondSight" x="4880" y="2920"/>

  <!-- Left Rail Sights (3) -->
  <use href="#rubyDiamondSight" x="680" y="1400"/>
  <use href="#rubyDiamondSight" x="680" y="1800"/>
  <use href="#rubyDiamondSight" x="680" y="2200"/>

  <!-- Right Rail Sights (3) -->
  <use href="#rubyDiamondSight" x="5720" y="1400"/>
  <use href="#rubyDiamondSight" x="5720" y="1800"/>
  <use href="#rubyDiamondSight" x="5720" y="2200"/>
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
        "flet.svg": gen_flet_svg(),
        "pool_table_master.svg": gen_master_table_svg(),
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
