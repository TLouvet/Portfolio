# Thomas Louvet — Portfolio

A flashy, fully animated single-page portfolio built with **plain HTML / CSS / JS** — no build step, ready for **GitHub Pages**.

## ✨ Features
- **Three.js** background scene: drifting multi-color starfield + nebula dust, a floating reactive wireframe icosahedron with an orbiting ring, mouse parallax & scroll-driven camera.
- **GSAP + ScrollTrigger**: hero entrance timeline, per-character split title reveals, scroll reveals, animated counters, scrubbed parallax.
- **Custom cursor** with a smooth-follow ring and hover states.
- **Magnetic buttons**, **3D tilt card**, **glitch text**, **typed subtitle**, **infinite marquee**, **grain overlay**, **scroll progress bar**.
- Animated **preloader** with fake boot sequence.
- Fully **responsive** + honors `prefers-reduced-motion`.

## 📦 Libraries (CDN — no install)
- [Three.js](https://threejs.org/) `0.160.0` via import map
- [GSAP](https://gsap.com/) `3.12.5` (ScrollTrigger, ScrollToPlugin, TextPlugin)
- Google Fonts: Space Grotesk, Syne, JetBrains Mono

## 🚀 Run locally
Because it uses ES modules + an import map, serve over HTTP (don't open `file://`):

```bash
# any static server, e.g.
npx serve .
# or
python -m http.server 8000
```

Then open http://localhost:8000

## 🌐 Deploy to GitHub Pages
1. Push these files to a repo (e.g. `tlouvet/portfolio`).
2. Repo **Settings → Pages → Source: Deploy from a branch → `main` / root**.
3. Done. (`.nojekyll` is included so asset folders are served untouched.)

## 📁 Structure
```
index.html
css/style.css
js/scene.js     # Three.js background (ES module)
js/main.js      # GSAP + interactions
.nojekyll
```
