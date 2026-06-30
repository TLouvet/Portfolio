// =========================================================
//  Three.js background scene
//  - drifting starfield / particle nebula
//  - floating reactive wireframe icosahedron
//  - mouse parallax + scroll reaction
// =========================================================
import * as THREE from "three";

const canvas = document.getElementById("bg-canvas");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// shared warp state (0 = at rest, 1 = full hyperspace). main.js drives this
// during the "scroll into space" intro. Created defensively so either file
// can initialize it depending on script execution order.
window.PVX_WARP = window.PVX_WARP || { value: 0 };
let warpSpin = 0;

// comet shower state: `boost` is a short-lived burst timer, `sustain` keeps a
// steady shower going while a section (e.g. Skills) is in view. main.js drives both.
window.PVX_COMETS = window.PVX_COMETS || { boost: 0, sustain: false };
// doges only fly while the Skills section is in view (main.js toggles `active`)
window.PVX_DOGES = window.PVX_DOGES || { active: false };
// landing: 0 = travelling, 1 = arrived at the new solar system (Contact). main.js scrubs it.
window.PVX_LAND = window.PVX_LAND || { value: 0 };

let renderer, scene, camera;
let particles, nebula, core, coreWire, ring;
let field; // interactive mouse-reactive particle field
let cursorLight; // point light that tracks the cursor in 3D
let sun, sunGlow, sunCorona, sunGroup; // glowing sun (reused as the landing star)
let landingSystem; // the new solar system you land on at Contact (planets/rings)
const landingPlanets = [];
const SUN_HOME = new THREE.Vector3(-34, 20, -45); // the sun's resting corner spot
const _center = new THREE.Vector3();
const comets = []; // shooting stars / meteorites
const doges = []; // spinning doge "meteorites" (loaded from public/doge.png)
const clock = new THREE.Clock();
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
let scrollY = 0;

// mouse projected into the z=0 world plane (for particle repulsion)
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2(0, 0);
const mouseWorld = new THREE.Vector3(9999, 9999, 0);
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const _fwd = new THREE.Vector3(); // reused: camera forward direction
let pointerActive = false;
let pointerDown = false; // click = stronger blast

const COLORS = {
  cyan: new THREE.Color(0x00f0ff),
  magenta: new THREE.Color(0xff2bd6),
  violet: new THREE.Color(0xb14bff),
  green: new THREE.Color(0x5cff9d),
};

// performance tier — drives particle counts, pixel ratio and antialiasing
const PERF = (function () {
  const cores = navigator.hardwareConcurrency || 8;
  const mem = navigator.deviceMemory || 8;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = window.innerWidth < 760;
  const mobile = coarse || small;            // phones/tablets: drop counts hard
  const low = mobile || cores <= 4 || mem <= 4;
  return { low, mobile, coarse, small };
})();
let maxDPR = PERF.low ? 1 : 1.75; // FPS guard may lower this further

function init() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !PERF.low, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDPR));
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05060a, 0.035);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 18);

  buildStarfield();
  buildNebula();
  buildField();
  buildSun();
  buildComets();
  buildDoges();
  buildLanding();
  buildCore();
  buildLights();

  window.addEventListener("resize", onResize);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerdown", () => { pointerDown = true; });
  window.addEventListener("pointerup", () => { pointerDown = false; });
  window.addEventListener("pointerleave", () => { pointerActive = false; });
  window.addEventListener("touchend", () => { pointerActive = false; });
  window.addEventListener("scroll", () => { scrollY = window.scrollY; }, { passive: true });

  animate();
}

// ---- drifting starfield ----
function buildStarfield() {
  const count = PERF.mobile ? 300 : (PERF.low ? 600 : 1400);
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const palette = [COLORS.cyan, COLORS.magenta, COLORS.violet, COLORS.green];

  for (let i = 0; i < count; i++) {
    const r = 30 + Math.random() * 60;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
    const c = palette[(Math.random() * palette.length) | 0];
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

  const mat = new THREE.PointsMaterial({ size: 0.18, vertexColors: true, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
  particles = new THREE.Points(geo, mat);
  scene.add(particles);
}

// ---- closer "nebula" of cyan dust ----
function buildNebula() {
  const count = PERF.mobile ? 100 : (PERF.low ? 250 : 600);
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 50;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 30 - 5;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size: 0.07, color: 0x00f0ff, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false });
  nebula = new THREE.Points(geo, mat);
  scene.add(nebula);
}

// ---- INTERACTIVE MOUSE-REACTIVE PARTICLE FIELD ----
// A dense slab of particles sitting on the z=0 plane. The cursor is
// projected into the same plane and shoves nearby particles outward;
// each particle springs back to its home with damping. Click = shockwave.
function buildField() {
  // scale particle budget to the performance tier — phones get a tiny field
  const COUNT = PERF.mobile ? 900 : (PERF.low ? 4000 : 16000);

  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(COUNT * 3);
  const col = new Float32Array(COUNT * 3);
  const palette = [COLORS.cyan, COLORS.magenta, COLORS.violet, COLORS.green];

  // CPU-side simulation buffers
  const home = new Float32Array(COUNT * 3); // rest position
  const vel = new Float32Array(COUNT * 3);  // velocity

  const W = 60, H = 38; // field spread in world units
  for (let i = 0; i < COUNT; i++) {
    const x = (Math.random() - 0.5) * W;
    const y = (Math.random() - 0.5) * H;
    const z = (Math.random() - 0.5) * 6;
    pos[i * 3] = home[i * 3] = x;
    pos[i * 3 + 1] = home[i * 3 + 1] = y;
    pos[i * 3 + 2] = home[i * 3 + 2] = z;
    // color: blend by horizontal position for a gradient feel
    const c = palette[(Math.random() * palette.length) | 0];
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }

  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

  // round, soft, glowing sprite texture (generated, no asset needed)
  const mat = new THREE.PointsMaterial({
    size: 0.16, map: makeDotTexture(), vertexColors: true, transparent: true,
    opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, alphaTest: 0.01,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // `draw` = how many particles are currently simulated/rendered (FPS guard may shrink it)
  field = { points, pos, home, vel, count: COUNT, draw: COUNT };
}

// generate a soft radial dot sprite on a canvas
function makeDotTexture() {
  const s = 64;
  const cvs = document.createElement("canvas");
  cvs.width = cvs.height = s;
  const ctx = cvs.getContext("2d");
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.8)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cvs);
  tex.needsUpdate = true;
  return tex;
}

// per-frame particle physics: repel from cursor, spring home, damp
function updateField(dt) {
  if (!field) return;
  const { pos, home, vel, draw } = field;

  // tuning
  const radius = pointerActive ? (pointerDown ? 14 : 9) : 0; // influence radius
  const r2 = radius * radius;
  const force = pointerDown ? 130 : 70;                       // push strength
  const spring = 3.2;                                         // pull back to home
  const damp = Math.exp(-4.2 * dt);                           // velocity decay
  const mx = mouseWorld.x, my = mouseWorld.y;

  for (let i = 0; i < draw; i++) {
    const ix = i * 3, iy = ix + 1, iz = ix + 2;
    let px = pos[ix], py = pos[iy], pz = pos[iz];

    // --- cursor repulsion ---
    if (radius > 0) {
      const dx = px - mx, dy = py - my;
      const d2 = dx * dx + dy * dy;
      if (d2 < r2 && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const f = (1 - d / radius) * force; // stronger when closer
        vel[ix] += (dx / d) * f * dt;
        vel[iy] += (dy / d) * f * dt;
        vel[iz] += (Math.random() - 0.5) * f * 0.4 * dt; // pop in z
      }
    }

    // --- spring back home ---
    vel[ix] += (home[ix] - px) * spring * dt;
    vel[iy] += (home[iy] - py) * spring * dt;
    vel[iz] += (home[iz] - pz) * spring * dt;

    // --- damping ---
    vel[ix] *= damp; vel[iy] *= damp; vel[iz] *= damp;

    // --- integrate ---
    pos[ix] = px + vel[ix] * dt;
    pos[iy] = py + vel[iy] * dt;
    pos[iz] = pz + vel[iz] * dt;
  }

  field.points.geometry.attributes.position.needsUpdate = true;
}

// ---- GLOWING SUN (far top-left; reused as the landing star) ----
function buildSun() {
  const group = new THREE.Group();
  group.position.copy(SUN_HOME);
  sunGroup = group;

  // core sphere
  const coreGeo = new THREE.SphereGeometry(4, 32, 32);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffd66b, fog: false });
  sun = new THREE.Mesh(coreGeo, coreMat);
  group.add(sun);

  // additive glow halo (sprite)
  const glowMat = new THREE.SpriteMaterial({
    map: makeGlowTexture(["rgba(255,240,200,1)", "rgba(255,160,60,0.7)", "rgba(255,90,30,0)"]),
    color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  });
  sunGlow = new THREE.Sprite(glowMat);
  sunGlow.scale.set(34, 34, 1);
  group.add(sunGlow);

  // faint outer corona
  const coronaMat = new THREE.SpriteMaterial({
    map: makeGlowTexture(["rgba(255,120,40,0.5)", "rgba(255,60,160,0.18)", "rgba(255,0,120,0)"]),
    color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  });
  sunCorona = new THREE.Sprite(coronaMat);
  sunCorona.scale.set(64, 64, 1);
  group.add(sunCorona);

  // light cast by the sun
  const sunLight = new THREE.PointLight(0xffb347, 60, 120); sunLight.position.set(0, 0, 4);
  group.add(sunLight);

  scene.add(group);
}

// radial gradient sprite texture from a list of color stops
function makeGlowTexture(stops) {
  const s = 256;
  const cvs = document.createElement("canvas");
  cvs.width = cvs.height = s;
  const ctx = cvs.getContext("2d");
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cvs); tex.needsUpdate = true;
  return tex;
}

// ---- COMETS / SHOOTING STARS ----
function buildComets() {
  const tailTex = makeCometTailTexture();
  const headTex = makeGlowTexture(["rgba(255,255,255,1)", "rgba(120,230,255,0.8)", "rgba(80,120,255,0)"]);
  const COUNT = PERF.mobile ? 3 : (PERF.low ? 5 : 10);

  for (let i = 0; i < COUNT; i++) {
    const group = new THREE.Group();

    const head = new THREE.Sprite(new THREE.SpriteMaterial({
      map: headTex, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    head.scale.set(2.4, 2.4, 1);

    // tail = a plane stretched along -X (group is rotated to face travel dir)
    const tailMat = new THREE.MeshBasicMaterial({
      map: tailTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
    });
    const tail = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.1), tailMat);
    tail.position.x = -7; // extends behind the head

    group.add(head); group.add(tail);
    group.visible = false;
    scene.add(group);

    comets.push({ group, head, tail, vel: new THREE.Vector3(), life: 0, maxLife: 0, delay: 1 + Math.random() * 6 });
  }
}

function makeCometTailTexture() {
  const w = 256, h = 32;
  const cvs = document.createElement("canvas"); cvs.width = w; cvs.height = h;
  const ctx = cvs.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, "rgba(120,230,255,0)");
  g.addColorStop(0.7, "rgba(150,220,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,1)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // soften vertically
  const v = ctx.createLinearGradient(0, 0, 0, h);
  v.addColorStop(0, "rgba(0,0,0,1)"); v.addColorStop(0.5, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,1)");
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(cvs); tex.needsUpdate = true;
  return tex;
}

function launchComet(c) {
  // spawn from a random point above/left, fly down-right across the view
  const fromLeft = Math.random() > 0.5;
  const startX = fromLeft ? -50 : (Math.random() - 0.5) * 60;
  const startY = 28 + Math.random() * 10;
  const z = -10 - Math.random() * 25;
  c.group.position.set(startX, startY, z);

  const speed = 26 + Math.random() * 22;
  const angle = (-Math.PI / 4) + (Math.random() - 0.5) * 0.5; // down-right-ish
  c.vel.set(Math.cos(angle) * speed, Math.sin(angle) * speed, 0);

  // rotate group so the tail trails behind the velocity
  c.group.rotation.z = Math.atan2(c.vel.y, c.vel.x);

  const scale = 0.6 + Math.random() * 1.1;
  c.group.scale.setScalar(scale);
  c.maxLife = 2.6 + Math.random() * 1.4;
  c.life = 0;
  c.group.visible = true;
}

function updateComets(dt) {
  const cs = window.PVX_COMETS;
  cs.boost = Math.max(0, cs.boost - dt);
  const showering = cs.sustain || cs.boost > 0;
  for (const c of comets) {
    if (!c.group.visible) {
      c.delay -= dt;
      if (c.delay <= 0) { launchComet(c); c.delay = showering ? (0.2 + Math.random() * 0.8) : (2 + Math.random() * 7); }
      continue;
    }
    c.life += dt;
    c.group.position.addScaledVector(c.vel, dt);
    // fade in then out over its life
    const k = c.life / c.maxLife;
    const fade = Math.sin(Math.min(k, 1) * Math.PI);
    c.head.material.opacity = fade;
    c.tail.material.opacity = fade * 0.9;
    if (c.life >= c.maxLife || c.group.position.y < -34) c.group.visible = false;
  }
}

// ---- SPINNING DOGE METEORITES ----
// Loads public/doge.png and spawns a handful of sprites that drift through
// space while constantly spinning. Silently does nothing if the image is absent.
function buildDoges() {
  const isMobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 760;
  const COUNT = isMobile ? 2 : 3;
  const BX = 34, BY = 22, BZ = 14; // wrap-around bounds

  new THREE.TextureLoader().load(
    "./public/doge_mini.png",
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      for (let i = 0; i < COUNT; i++) {
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false });
        const sprite = new THREE.Sprite(mat);
        const size = 2.4 + Math.random() * 2.6;
        sprite.scale.set(size, size, 1);
        sprite.position.set((Math.random() - 0.5) * BX * 2, (Math.random() - 0.5) * BY * 2, (Math.random() - 0.5) * BZ - 3);
        scene.add(sprite);
        // drift at a moderate pace (~11–21 u/s) in a random direction; wrap-around keeps them coming
        const speed = 11 + Math.random() * 10;
        const ang = Math.random() * Math.PI * 2;
        doges.push({
          sprite,
          vel: new THREE.Vector3(Math.cos(ang) * speed, Math.sin(ang) * speed, (Math.random() - 0.5) * 4),
          spin: (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 1.6),
          bob: Math.random() * Math.PI * 2,
        });
      }
    },
    undefined,
    () => { /* no doge.png yet — skip silently */ }
  );

  buildDoges._bounds = { BX, BY, BZ };
}

function updateDoges(dt, t) {
  const b = buildDoges._bounds; if (!b) return;
  const active = window.PVX_DOGES.active;
  for (const d of doges) {
    if (d.sprite.visible !== active) d.sprite.visible = active;
    if (!active) continue; // only fly while Skills is in view
    const p = d.sprite.position;
    p.addScaledVector(d.vel, dt);
    p.y += Math.sin(t * 0.8 + d.bob) * dt * 0.6; // gentle bob
    // wrap around the bounds so they never leave the void
    if (p.x > b.BX) p.x = -b.BX; else if (p.x < -b.BX) p.x = b.BX;
    if (p.y > b.BY) p.y = -b.BY; else if (p.y < -b.BY) p.y = b.BY;
    d.sprite.material.rotation += d.spin * dt; // constant spin
  }
}

// fire an immediate barrage of comets (staggered), e.g. when entering a section
window.PVX_cometBurst = function (count = 9) {
  window.PVX_COMETS.boost = 2.4;
  let i = 0;
  for (const c of comets) {
    if (!c.group.visible) { c.delay = 0.07 * i; if (++i >= count) break; }
  }
};

// ---- THE NEW SOLAR SYSTEM (landed on at Contact) ----
// Bound to the camera each frame and faded in by PVX_LAND, so it's always
// framed regardless of how far the scroll has pushed the camera back.
function buildLanding() {
  landingSystem = new THREE.Group(); // just the planets + orbit rings — the star is the reused sun
  landingSystem.visible = false;

  const defs = [
    { r: 7, size: 0.5, color: 0x00f0ff, speed: 0.8 },
    { r: 10, size: 0.85, color: 0xff2bd6, speed: 0.55 },
    { r: 13.5, size: 0.4, color: 0x5cff9d, speed: 0.42 },
    { r: 17, size: 1.05, color: 0xb14bff, speed: 0.3 },
  ];
  defs.forEach((d, i) => {
    // faint orbit ring (lies in the XY plane → faces the camera)
    const ring = new THREE.Mesh(new THREE.RingGeometry(d.r - 0.03, d.r + 0.03, 80),
      new THREE.MeshBasicMaterial({ color: 0x6688aa, transparent: true, opacity: 0.28, side: THREE.DoubleSide, fog: false }));
    landingSystem.add(ring);

    // planet on a pivot so rotating the pivot orbits it
    const pivot = new THREE.Group();
    const planet = new THREE.Mesh(new THREE.SphereGeometry(d.size, 20, 20),
      new THREE.MeshBasicMaterial({ color: d.color, fog: false }));
    planet.position.x = d.r;
    const pglow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(["rgba(255,255,255,.9)", "rgba(180,220,255,.4)", "rgba(0,0,0,0)"]),
      color: d.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    pglow.position.x = d.r; pglow.scale.set(d.size * 6, d.size * 6, 1);
    pivot.add(planet); pivot.add(pglow);
    pivot.userData = { speed: d.speed, phase: i * 1.7 };
    landingSystem.add(pivot);
    landingPlanets.push(pivot);
  });

  scene.add(landingSystem);
}

// ---- floating reactive core ----
function buildCore() {
  const geo = new THREE.IcosahedronGeometry(4, 1);

  const mat = new THREE.MeshStandardMaterial({ color: 0x0a0c14, metalness: 0.9, roughness: 0.25,
    emissive: 0x07212a, flatShading: true, transparent: true, opacity: 0.92 });
  core = new THREE.Mesh(geo, mat);
  core.position.set(8, 1, -2);
  scene.add(core);

  const wireMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.25 });
  coreWire = new THREE.Mesh(new THREE.IcosahedronGeometry(4.25, 1), wireMat);
  coreWire.position.copy(core.position);
  scene.add(coreWire);

  const ringGeo = new THREE.TorusGeometry(6.5, 0.04, 16, 120);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff2bd6, transparent: true, opacity: 0.5 });
  ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.copy(core.position);
  ring.rotation.x = Math.PI / 2.3;
  scene.add(ring);
}

function buildLights() {
  scene.add(new THREE.AmbientLight(0x223355, 1.2));
  const p1 = new THREE.PointLight(0x00f0ff, 120, 60); p1.position.set(12, 6, 6); scene.add(p1);
  const p2 = new THREE.PointLight(0xff2bd6, 90, 60); p2.position.set(2, -6, 4); scene.add(p2);
  const p3 = new THREE.PointLight(0xb14bff, 70, 80); p3.position.set(-14, 4, -6); scene.add(p3);

  // bright white light riding the cursor — lights up particles + the core
  cursorLight = new THREE.PointLight(0xffffff, 0, 40, 1.6);
  cursorLight.position.set(0, 0, 6);
  scene.add(cursorLight);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMove(e) {
  mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;

  // project cursor onto the z=0 plane so particles can react in world space
  ndc.x = mouse.tx;
  ndc.y = -mouse.ty;
  pointerActive = true;
}

// re-project each frame (camera moves with parallax, so recompute)
function projectMouse() {
  raycaster.setFromCamera(ndc, camera);
  raycaster.ray.intersectPlane(dragPlane, mouseWorld);
}

let _fpsAccum = 0, _fpsFrames = 0;

function animate() {
  requestAnimationFrame(animate);
  // pause all work while the tab is hidden (saves CPU/GPU/battery)
  if (document.hidden) return;

  // getDelta() advances the clock; read elapsedTime after (calling
  // getElapsedTime() too would double-advance and zero out dt).
  const dt = Math.min(clock.getDelta(), 0.05); // clamp to avoid blow-ups on tab refocus
  const t = clock.elapsedTime;
  const sp = reduceMotion ? 0.15 : 1;

  // ---- adaptive FPS guard: keep shedding load (step by step) until it's smooth ----
  _fpsAccum += dt; _fpsFrames++;
  if (_fpsAccum >= 2) {
    const fps = _fpsFrames / _fpsAccum;
    if (fps < 45) {
      if (maxDPR > 1) { maxDPR = 1; renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1)); }
      if (field && field.draw > field.count * 0.25) {
        field.draw = Math.max(Math.floor(field.count * 0.25), Math.floor(field.draw * 0.6));
        field.points.geometry.setDrawRange(0, field.draw);
      }
    }
    _fpsAccum = 0; _fpsFrames = 0;
  }

  // smooth mouse follow
  mouse.x += (mouse.tx - mouse.x) * 0.05;
  mouse.y += (mouse.ty - mouse.y) * 0.05;

  // interactive particle field reacts to the cursor
  projectMouse();
  updateField(dt);

  // sun breathing + comets
  if (sun) {
    sun.rotation.y = t * 0.1;
    const s = 1 + Math.sin(t * 1.5) * 0.04;
    if (sunGlow) sunGlow.scale.set(34 * s, 34 * s, 1);
    if (sunCorona) { sunCorona.scale.set(64 * s, 64 * s, 1); sunCorona.material.rotation = t * 0.05; }
  }
  updateComets(dt);
  updateDoges(dt, t);

  // cursor light tracks the projected mouse point, floating toward the camera
  if (cursorLight) {
    const targetI = pointerActive ? (pointerDown ? 380 : 200) : 0;
    cursorLight.intensity += (targetI - cursorLight.intensity) * 0.12;
    if (pointerActive) {
      cursorLight.position.x += (mouseWorld.x - cursorLight.position.x) * 0.2;
      cursorLight.position.y += (mouseWorld.y - cursorLight.position.y) * 0.2;
      cursorLight.position.z = 6 + Math.sin(t * 3) * 0.5;
    }
  }

  // ---- WARP (scroll-into-space intro) ----
  const warp = window.PVX_WARP.value || 0;
  const land = window.PVX_LAND.value || 0; // 0..1 arrival at the new solar system
  warpSpin += warp * dt * 3.2; // accumulated swirl so it never jumps

  if (particles) { particles.rotation.y = t * 0.02 * sp; particles.rotation.x = t * 0.01 * sp; particles.rotation.z = warpSpin; }
  if (nebula) { nebula.rotation.y = -t * 0.03 * sp; nebula.position.y = Math.sin(t * 0.2) * 1.2; nebula.rotation.z = -warpSpin * 0.6; }
  if (field) field.points.rotation.z = warpSpin * 0.4;

  // core (and its wire/ring) shrink away as we land on the new system
  const coreVis = 1 - land;
  if (core) {
    core.rotation.x = t * 0.15 * sp;
    core.rotation.y = t * 0.22 * sp;
    core.position.y = 1 + Math.sin(t * 0.6) * 0.8;
    const pulse = 1 + Math.sin(t * 2) * 0.03;
    core.scale.setScalar(pulse * coreVis);
  }
  if (coreWire) {
    coreWire.rotation.x = -t * 0.1 * sp;
    coreWire.rotation.y = -t * 0.18 * sp;
    coreWire.position.copy(core.position);
    coreWire.scale.setScalar(coreVis);
  }
  if (ring) {
    ring.rotation.z = t * 0.3 * sp;
    ring.position.copy(core.position);
    ring.scale.setScalar(coreVis);
  }

  // camera parallax from mouse + scroll, with warp dive toward the field
  camera.position.x += (mouse.x * 3 - camera.position.x) * 0.04;
  camera.position.y += (-mouse.y * 2 - camera.position.y) * 0.04;
  const targetZ = 18 - warp * 22 + scrollY * 0.002; // dives forward as warp -> 1
  camera.position.z += (targetZ - camera.position.z) * 0.12;
  camera.lookAt(0, 0, 0);

  // ---- LANDING: the existing sun flies in to become the new system's star ----
  if (sunGroup) {
    // a point 62 units in front of the camera = the system centre
    camera.getWorldDirection(_fwd);
    _center.copy(camera.position).addScaledVector(_fwd, 62);
    sunGroup.position.lerpVectors(SUN_HOME, _center, land); // corner -> centre as we land
    sunGroup.scale.setScalar(1 - land * 0.62);              // shrink to a tidy central star
  }
  if (landingSystem) {
    if (land > 0.002) {
      landingSystem.visible = true;
      if (sunGroup) landingSystem.position.copy(sunGroup.position); // planets orbit the sun
      landingSystem.quaternion.copy(camera.quaternion);             // face the camera (circular orbits)
      landingSystem.scale.setScalar(0.25 + land * 0.95);
      for (const p of landingPlanets) p.rotation.z = t * p.userData.speed + p.userData.phase;
    } else if (landingSystem.visible) {
      landingSystem.visible = false;
    }
  }

  // widen FOV with warp for a speed-rush feel
  const fov = 60 + warp * 26;
  if (Math.abs(camera.fov - fov) > 0.02) { camera.fov = fov; camera.updateProjectionMatrix(); }

  renderer.render(scene, camera);
}

if (canvas) {
  try { init(); }
  catch (err) { console.warn("WebGL scene failed, continuing without 3D background:", err); }
}
