# Stitch references

Project: VolleyStream Broadcast Dashboard
ID: `2735153766398769450`

Downloaded with `curl -L` on 2026-06-14.

## Screens

- `broadcast-configuration.html`
  - Screen: ProVolley Live - Broadcast Configuration
  - ID: `6e7789c1138240458d7234a21a08476a`
- `broadcast-configuration.png`
  - Hosted screenshot for the same screen.
- `controller-overlay-switcher.html`
  - Screen: ProVolley Live - Controller with Overlay Switcher
  - ID: `7ebc036e296946a9ad8b3aafc03f63dc`
- `controller-overlay-switcher.jpg`
  - Hosted screenshot for the same screen.

## Design extraction

- App shell: broadcast-suite layout with top navigation, left rail, live court status, and admin canvas.
- Palette: deep navy background `#031427`, layered surfaces `#0b1c30`, `#102034`, `#1b2b3f`, outline `#45464d`, cyan accent `#7bd0ff`, red/pink alert accent `#ffb2b7`.
- Typography: Inter, dense dashboard scale, compact labels, score display at very heavy weight.
- Controller: OBS preview frame with checkerboard background, glassmorphism scoreboard bar, overlay switcher, match controls, timeout controls, set history.
- Configuration: two team cards, short code, primary color, logo upload, tournament metadata, sponsor logo, background style, lower thirds style.
- Implementation note: these files are references only. The Vue app implements the behavior natively instead of copying the generated HTML.
