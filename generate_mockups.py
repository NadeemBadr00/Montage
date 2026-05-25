import os

out_dir = os.path.join("public", "images")
os.makedirs(out_dir, exist_ok=True)

# Phone SVG
phone_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1600" width="800" height="1600">
  <defs>
    <linearGradient id="phoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4a4a4a"/>
      <stop offset="50%" stop-color="#2c2c2c"/>
      <stop offset="100%" stop-color="#1a1a1a"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="15" dy="20" stdDeviation="15" flood-opacity="0.5"/>
    </filter>
    <mask id="holeMaskPhone">
      <rect width="100%" height="100%" fill="white"/>
      <rect x="75" y="75" width="650" height="1450" rx="30" ry="30" fill="black"/>
    </mask>
  </defs>
  <g mask="url(#holeMaskPhone)">
      <rect x="50" y="50" width="700" height="1500" rx="100" ry="100" fill="url(#phoneGrad)" filter="url(#shadow)"/>
      <rect x="60" y="60" width="680" height="1480" rx="90" ry="90" fill="#000000"/>
      <path d="M 280 75 Q 300 75 300 110 L 300 130 Q 300 150 320 150 L 480 150 Q 500 150 500 130 L 500 110 Q 500 75 520 75 Z" fill="#000000"/>
      <circle cx="400" cy="110" r="10" fill="#1a1a1a"/>
      <circle cx="400" cy="110" r="4" fill="#003366"/>
      <rect x="330" y="105" width="40" height="10" rx="5" ry="5" fill="#333333"/>
      <rect x="35" y="300" width="15" height="100" rx="5" ry="5" fill="#2c2c2c"/>
      <rect x="35" y="450" width="15" height="100" rx="5" ry="5" fill="#2c2c2c"/>
      <rect x="750" y="350" width="15" height="150" rx="5" ry="5" fill="#2c2c2c"/>
  </g>
</svg>"""

with open(os.path.join(out_dir, "frame_phone.svg"), "w") as f:
    f.write(phone_svg)

# Laptop SVG
laptop_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1200" width="1600" height="1200">
  <defs>
    <linearGradient id="macGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#b0b5b9"/>
      <stop offset="100%" stop-color="#808589"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="20" stdDeviation="20" flood-opacity="0.4"/>
    </filter>
    <mask id="holeMaskLaptop">
      <rect width="100%" height="100%" fill="white"/>
      <rect x="180" y="130" width="1240" height="780" fill="black"/>
    </mask>
  </defs>
  <g mask="url(#holeMaskLaptop)">
      <rect x="150" y="100" width="1300" height="850" rx="40" ry="40" fill="#111111" filter="url(#shadow)"/>
      <rect x="155" y="105" width="1290" height="840" rx="35" ry="35" fill="none" stroke="#222" stroke-width="2"/>
      <circle cx="800" cy="115" r="8" fill="#000000"/>
      <circle cx="800" cy="115" r="3" fill="#102040"/>
  </g>
  <path d="M 50 950 L 1550 950 Q 1580 950 1580 970 L 1560 1020 Q 1550 1050 1500 1050 L 100 1050 Q 50 1050 40 1020 L 20 970 Q 20 950 50 950 Z" fill="url(#macGrad)" filter="url(#shadow)"/>
  <rect x="650" y="970" width="300" height="70" rx="10" ry="10" fill="#a0a5a9"/>
  <rect x="680" y="945" width="240" height="10" rx="5" ry="5" fill="#606569"/>
</svg>"""

with open(os.path.join(out_dir, "frame_laptop.svg"), "w") as f:
    f.write(laptop_svg)

# Monitor SVG
monitor_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1400" width="1920" height="1400">
  <defs>
    <linearGradient id="baseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#dddddd"/>
      <stop offset="100%" stop-color="#999999"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="30" stdDeviation="25" flood-opacity="0.3"/>
    </filter>
    <mask id="holeMaskMonitor">
      <rect width="100%" height="100%" fill="white"/>
      <rect x="140" y="140" width="1640" height="880" fill="black"/>
    </mask>
  </defs>
  <path d="M 800 1350 Q 750 1350 700 1370 L 1220 1370 Q 1170 1350 1120 1350 Z" fill="#bbbbbb" filter="url(#shadow)"/>
  <rect x="900" y="1050" width="120" height="300" fill="url(#baseGrad)"/>
  <g mask="url(#holeMaskMonitor)">
      <rect x="100" y="100" width="1720" height="980" rx="20" ry="20" fill="#e8e8e8" filter="url(#shadow)"/>
      <rect x="120" y="120" width="1680" height="940" fill="#111111"/>
      <rect x="120" y="1020" width="1680" height="40" fill="#e8e8e8"/>
      <circle cx="960" cy="1040" r="10" fill="#bbbbbb"/>
  </g>
</svg>"""

with open(os.path.join(out_dir, "frame_monitor.svg"), "w") as f:
    f.write(monitor_svg)

# TV SVG
tv_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 1200" width="2000" height="1200">
  <defs>
    <filter id="shadow">
      <feDropShadow dx="0" dy="25" stdDeviation="20" flood-opacity="0.5"/>
    </filter>
    <mask id="holeMaskTV">
      <rect width="100%" height="100%" fill="white"/>
      <rect x="70" y="120" width="1860" height="960" fill="black"/>
    </mask>
  </defs>
  <path d="M 300 1100 L 250 1180 L 280 1180 L 320 1100 Z" fill="#222"/>
  <path d="M 340 1100 L 380 1180 L 410 1180 L 360 1100 Z" fill="#222"/>
  <path d="M 1600 1100 L 1550 1180 L 1580 1180 L 1620 1100 Z" fill="#222"/>
  <path d="M 1640 1100 L 1680 1180 L 1710 1180 L 1660 1100 Z" fill="#222"/>
  <g mask="url(#holeMaskTV)">
      <rect x="50" y="100" width="1900" height="1000" rx="10" ry="10" fill="#222" stroke="#444" stroke-width="4" filter="url(#shadow)"/>
      <rect x="70" y="1080" width="1860" height="15" fill="#111"/>
  </g>
</svg>"""

with open(os.path.join(out_dir, "frame_tv.svg"), "w") as f:
    f.write(tv_svg)

# Tablet SVG
tablet_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600" width="1200" height="1600">
  <defs>
    <filter id="shadow">
      <feDropShadow dx="10" dy="15" stdDeviation="15" flood-opacity="0.3"/>
    </filter>
    <mask id="holeMaskTablet">
      <rect width="100%" height="100%" fill="white"/>
      <rect x="180" y="180" width="840" height="1240" rx="10" ry="10" fill="black"/>
    </mask>
  </defs>
  <g mask="url(#holeMaskTablet)">
      <rect x="100" y="100" width="1000" height="1400" rx="80" ry="80" fill="#d9d9d9" filter="url(#shadow)"/>
      <rect x="120" y="120" width="960" height="1360" rx="60" ry="60" fill="#111111"/>
      <circle cx="600" cy="150" r="8" fill="#222222"/>
  </g>
</svg>"""

with open(os.path.join(out_dir, "frame_tablet.svg"), "w") as f:
    f.write(tablet_svg)

print("SVGs generated successfully.")
