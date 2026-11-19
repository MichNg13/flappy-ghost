# Boo Flap 👻

A neon, Flappy Bird–style arcade game: a little ghost floats between glowing graves under a midnight moon. It is built for touchscreens and installs on your phone as a Progressive Web App (PWA), so it works offline after the first visit.

![Boo Flap icon](icons/icon-192.png)

## Features

- **Tap to float**: tap or click anywhere, or press <kbd>Space</kbd> / <kbd>↑</kbd> / <kbd>W</kbd>. <kbd>P</kbd> pauses and <kbd>M</kbd> mutes.
- **Ramping difficulty**: the graves speed up and the gaps narrow as your score rises, up to a cap.
- **Forgiving physics**: floaty gravity, a hitbox smaller than the sprite, and no death at the ceiling.
- **Power-ups**: a **Shield** survives one hit, and **Phase** lets you drift through graves for 5 seconds.
- **Sound**: Web Audio effects and an ambient synth loop, with separate music and effects toggles.
- **Best score** and sound settings are saved on the device.
- **PWA**: installable, launches full screen, works offline, and pauses itself when you switch apps.

## Project structure

```
index.html            Page markup, PWA meta tags
style.css             Layout, overlays and HUD styles
game.js               Game loop, physics, rendering, audio, input
pwa.js                Service-worker registration and the "Install app" button
sw.js                 Service worker (offline cache)
manifest.webmanifest  App name, colours, icons and screenshots
icons/                App icon (SVG source plus PNG sizes, maskable and Apple touch icons)
screenshots/          Install-sheet screenshots used by the manifest
vercel.json           Vercel headers for the service worker and manifest
```

It's plain HTML, CSS and JavaScript, with no build step and no dependencies.

## Run locally

Service workers need `http://localhost` or HTTPS, so serve the folder rather than opening the file directly:

```bash
npx serve .
# or
python3 -m http.server 8080
```

## Deploy to Vercel

**From the dashboard:** go to [vercel.com/new](https://vercel.com/new), import this GitHub repo, and leave the defaults:

- Framework preset: **Other**
- Build command: *(none)*
- Output directory: *(project root)*

**From the CLI:**

```bash
npm i -g vercel
vercel        # preview deployment
vercel --prod # production deployment
```

Vercel serves over HTTPS, which the PWA install needs.

## Install on your phone

- **Android (Chrome, Edge, Samsung Internet):** open the site and tap **Install app** on the title screen. You can also use the browser menu → **Install app** / **Add to Home screen**.
- **iPhone / iPad (Safari):** tap **Share**, then **Add to Home Screen**. The title screen shows this hint on iOS.

Once installed, the game opens full screen from its own icon and plays offline.

## Shipping updates

The service worker fetches fresh files whenever you're online and falls back to the cache when you're offline. After you change any file, bump `VERSION` in `sw.js` (for example `boo-flap-v2`) so old caches get cleared, then redeploy.

## Editing the icon

`icons/icon.svg` is the source. The PNGs (`icon-192/512`, `maskable-192/512`, `apple-touch-icon`, `favicon-32`) were rendered from it. Keep the artwork inside the central 80% circle so Android's maskable crop doesn't clip the ghost.
