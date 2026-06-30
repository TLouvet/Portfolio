/* =========================================================
   Thomas Louvet — interactions
   preloader · custom cursor · GSAP reveals · typed text ·
   counters · magnetic buttons · 3D tilt · nav
   (GSAP loaded via CDN <script defer>)
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lowPerf = document.documentElement.classList.contains("low-perf"); // set by the head script
  const hasGSAP = typeof window.gsap !== "undefined";
  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- PRELOADER ---------- */
  runPreloader();

  function runPreloader() {
    const pre = document.getElementById("preloader");
    const bar = document.getElementById("preloader-progress");
    const count = document.getElementById("preloader-count");
    const status = document.getElementById("preloader-status");
    const stages = ["booting kernel…", "spawning particles…", "compiling shaders…", "hydrating dom…", "ready."];
    let p = 0;
    const tick = setInterval(() => {
      p += Math.random() * 14 + 4;
      if (p >= 100) p = 100;
      bar.style.width = p + "%";
      count.textContent = Math.floor(p);
      status.textContent = stages[Math.min(stages.length - 1, Math.floor((p / 100) * stages.length))];
      if (p >= 100) {
        clearInterval(tick);
        setTimeout(() => {
          pre.classList.add("done");
          startSpaceIntro();
          setTimeout(() => pre.remove(), 1100);
        }, 350);
      }
    }, 140);
  }

  /* ---------- SPACE INTRO GATE ---------- */
  const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  window.PVX_WARP = window.PVX_WARP || { value: 0 };

  function startSpaceIntro() {
    const intro = document.getElementById("space-intro");
    const fill = document.getElementById("si-fill");
    const skip = document.getElementById("si-skip");
    const warp = window.PVX_WARP;

    // reduced-motion or missing markup -> skip straight to the site
    if (reduce || !intro) { finishIntro(); return; }

    document.documentElement.classList.add("intro-lock");

    let tripping = false;
    function startTrip() {
      if (tripping) return; tripping = true;
      if (skip) { skip.textContent = "warping…"; skip.disabled = true; }

      if (hasGSAP) {
        // auto-fly through the void: warp ramps up, then finishIntro eases it back
        const o = { p: 0 };
        gsap.to(o, {
          p: 1, duration: 2.8, ease: "power2.inOut",
          onUpdate: () => { warp.value = easeInOutCubic(o.p); if (fill) fill.style.width = o.p * 100 + "%"; },
          onComplete: finishIntro,
        });
      } else {
        warp.value = 1; if (fill) fill.style.width = "100%"; finishIntro();
      }
    }

    skip?.addEventListener("click", startTrip);
  }

  function finishIntro() {
    if (finishIntro._called) return; finishIntro._called = true;
    if (startSpaceIntro._cleanup) startSpaceIntro._cleanup();
    document.documentElement.classList.remove("intro-lock");
    document.body.classList.remove("intro-active");

    const intro = document.getElementById("space-intro");
    const warp = window.PVX_WARP;
    if (hasGSAP) {
      if (intro) gsap.to(intro, { opacity: 0, duration: 0.8, onComplete: () => intro.remove() });
      gsap.to(warp, { value: 0, duration: 1.6, ease: "power3.out" }); // camera flies back in = "arrival"
    } else {
      warp.value = 0;
      if (intro) intro.remove();
    }
    startEntrance();
  }

  /* ---------- HERO ENTRANCE ---------- */
  function startEntrance() {
    typeLine();
    if (!hasGSAP) { document.querySelectorAll(".reveal-up").forEach(el => { el.style.opacity = 1; el.style.transform = "none"; }); return; }

    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    // warp in from deep space: tiny + far + blurred -> rushes forward, scales up
    tl.from(".hero-title .word", {
        z: -1400, scale: 0.05, opacity: 0, filter: "blur(22px)",
        transformPerspective: 900, duration: 1.7, stagger: 0.35, ease: "power3.out",
        onComplete: () => gsap.set(".hero-title .word", { filter: "none" }),
      })
      .from("#nav", { y: -40, opacity: 0, duration: 0.8 }, "-=0.7")
      .to(".hero-eyebrow", { opacity: 1, y: 0, duration: 0.8 }, "-=0.6")
      .to(".hero-sub", { opacity: 1, y: 0, duration: 0.8 }, "-=0.6")
      .to(".hero-cta", { opacity: 1, y: 0, duration: 0.8 }, "-=0.6")
      .to(".scroll-hint", { opacity: 1, y: 0, duration: 0.8 }, "-=0.5");
    gsap.set([".hero-eyebrow", ".hero-sub", ".hero-cta", ".scroll-hint"], { y: 30 });
  }

  /* ---------- TYPED SUBTITLE ---------- */
  function typeLine() {
    const el = document.getElementById("typed-line");
    if (!el) return;
    const phrases = [
      "I turn complex business requirements into clean, durable software.",
      "Domain-Driven Design. Hexagonal Architecture. Zero regrets.",
      "TypeScript · React · NestJS · Azure.",
      "I lead teams, shape architecture, and ship things that last.",
    ];
    let pi = 0, ci = 0, deleting = false;
    function step() {
      const full = phrases[pi];
      el.textContent = deleting ? full.slice(0, ci--) : full.slice(0, ci++);
      let delay = deleting ? 28 : 55;
      if (!deleting && ci > full.length) { deleting = true; delay = 1800; }
      else if (deleting && ci < 0) { deleting = false; ci = 0; pi = (pi + 1) % phrases.length; delay = 350; }
      setTimeout(step, delay);
    }
    step();
  }

  /* ---------- SCROLL REVEALS ---------- */
  if (hasGSAP && window.ScrollTrigger && !reduce) {
    gsap.utils.toArray(".reveal-up").forEach((el) => {
      if (el.closest(".hero")) return; // hero handled by entrance timeline
      if (el.classList.contains("skill-cluster")) return; // gets its own 360 spin below
      gsap.fromTo(el, { y: 50, opacity: 0 }, {
        y: 0, opacity: 1, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%" },
      });
    });

    // skills cards: HORIZONTAL slide-in only (no vertical move = no overlap with
    // neighbours). The 360 spin + lean live on hover (CSS); we enable the transform
    // transition only once the entrance is done so it doesn't smear the slide-in.
    gsap.utils.toArray(".skill-cluster").forEach((card, i) => {
      gsap.fromTo(card, { xPercent: -55, opacity: 0 },
        {
          xPercent: 0, opacity: 1, duration: 0.7, ease: "power3.out", delay: i * 0.05,
          scrollTrigger: { trigger: card, start: "top 85%" },
          clearProps: "transform",
        });
    });

    // Skills section: rain meteors while it's in view (+ a burst on entry)
    const skillsSec = document.getElementById("skills");
    if (skillsSec) {
      ScrollTrigger.create({
        // active the whole time any part of Skills is on screen (not just centered)
        trigger: skillsSec, start: "top bottom", end: "bottom top",
        onToggle: (self) => {
          if (window.PVX_COMETS) window.PVX_COMETS.sustain = self.isActive;
          if (window.PVX_DOGES) window.PVX_DOGES.active = self.isActive;
          if (self.isActive && window.PVX_cometBurst) window.PVX_cometBurst(9);
        },
      });
    }

    /* ---- INTERSTITIALS: dive to dark -> scripted event -> reveal ---- */
    buildInterstitial({ spacerId: "dive-skills", stageId: "stage-skills", kind: "supernova" });
    buildDiveSequence(); // experience: meteor collision
    buildInterstitial({ spacerId: "dive-projects", stageId: "stage-projects", kind: "wormhole" });
    buildInterstitial({ spacerId: "dive-contact", stageId: "stage-contact", kind: "lightspeed" });

    // CONTACT: arrive at the new (3D) solar system — scrub PVX_LAND as it comes into view
    window.PVX_LAND = window.PVX_LAND || { value: 0 };
    gsap.timeline({ scrollTrigger: { trigger: "#contact", start: "top 90%", end: "top 30%", scrub: 0.6 } })
      .fromTo(window.PVX_LAND, { value: 0 }, { value: 1, ease: "none" });

    // split + stagger section titles
    document.querySelectorAll("[data-split]").forEach((title) => {
      const nodes = Array.from(title.childNodes);
      title.innerHTML = "";
      nodes.forEach((node) => {
        if (node.nodeName === "BR") { title.appendChild(document.createElement("br")); return; }
        (node.textContent || "").split(/(\s+)/).forEach((token) => {
          if (token === "") return;
          if (/^\s+$/.test(token)) { title.appendChild(document.createTextNode(" ")); return; } // breakable space
          const word = document.createElement("span");
          word.className = "split-word"; // keeps the word together (no mid-word break)
          [...token].forEach((ch) => {
            const s = document.createElement("span");
            s.className = "split-char";
            s.textContent = ch;
            word.appendChild(s);
          });
          title.appendChild(word);
        });
      });
      gsap.from(title.querySelectorAll(".split-char"), {
        yPercent: 110, opacity: 0, duration: 0.8, ease: "power4.out", stagger: 0.03,
        scrollTrigger: { trigger: title, start: "top 85%" },
      });

      // RGB-glitch the title while its section is in view (after the entrance)
      if (title.classList.contains("glitch")) {
        const sec = title.closest("section") || title;
        ScrollTrigger.create({
          trigger: sec, start: "top 55%", end: "bottom 45%",
          onToggle: (self) => title.classList.toggle("glitch-on", self.isActive),
        });
      }
    });

    // marquee speed reacts to scroll velocity
    gsap.to(".marquee-track", {
      xPercent: -50, repeat: -1, duration: 28, ease: "none",
    });

    // parallax on hero bg text already CSS; add core scroll dim
    gsap.to(".hero-bg-text", { xPercent: -8, scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

    // timeline dots draw-in
    gsap.utils.toArray(".tl-item").forEach((item) => {
      gsap.from(item.querySelector(".tl-dot"), {
        scale: 0, duration: 0.5, ease: "back.out(3)",
        scrollTrigger: { trigger: item, start: "top 85%" },
        clearProps: "transform", // let CSS .lit / :hover control the dot afterwards
      });
    });

    // EXPERIENCE: glowing beam fills the timeline + each milestone ignites as you pass
    const timelineEl = document.querySelector(".timeline");
    if (timelineEl) {
      const beam = timelineEl.querySelector(".tl-beam");
      if (beam) gsap.timeline({ scrollTrigger: { trigger: timelineEl, start: "top 60%", end: "bottom 80%", scrub: 0.6 } })
        .fromTo(beam, { scaleY: 0 }, { scaleY: 1, transformOrigin: "50% 0%", ease: "none" }, 0);

      gsap.utils.toArray(".tl-item").forEach((item) => {
        const dot = item.querySelector(".tl-dot");
        ScrollTrigger.create({
          trigger: item, start: "top 52%", end: "bottom 50%",
          onToggle: (self) => dot && dot.classList.toggle("lit", self.isActive),
        });
      });
    }

    // FLIGHT ROCKET: one persistent rocket. Phase 1 here = descend the left side through
    // Experience. Phase 2 (curve to centre + zoom + boom) lives in the Projects wormhole
    // timeline, starting from exactly where this leaves it, so it's one continuous flight.
    const flight = document.getElementById("flight-rocket");
    if (flight) {
      // measured X of the timeline's vertical line, so the rocket rides right on it
      const lineX = () => { const t = document.querySelector(".timeline"); return t ? t.getBoundingClientRect().left : innerWidth * 0.1; };
      gsap.set(flight, { xPercent: -50, yPercent: -50, rotation: 150, opacity: 0 });
      gsap.timeline({
        scrollTrigger: { trigger: "#experience", start: "top 75%", end: "bottom 60%", scrub: 0.6, invalidateOnRefresh: true },
      })
        .to(flight, { opacity: 1, duration: 0.12, ease: "none" }, 0)
        .fromTo(flight,
          { x: lineX, y: () => innerHeight * 0.15 },
          { x: lineX, y: () => innerHeight * 0.85, rotation: 150, scale: 1, ease: "none", duration: 1 }, 0);
    }

    /* ---- ABOUT: dynamic reveals ---- */
    // lead line: split into words, 3D flip-up stagger, key words highlighted
    document.querySelectorAll("[data-words]").forEach((el) => {
      const words = el.textContent.trim().split(/\s+/);
      el.innerHTML = "";
      words.forEach((w, i) => {
        const span = document.createElement("span");
        span.className = "word-r" + (/clean|durable|software/i.test(w) ? " hot" : "");
        span.textContent = w;
        el.appendChild(span);
        if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
      });
      gsap.from(el.querySelectorAll(".word-r"), {
        yPercent: 120, rotateX: -90, opacity: 0, transformOrigin: "50% 100%",
        duration: 0.9, ease: "power3.out", stagger: 0.05,
        scrollTrigger: { trigger: el, start: "top 85%" },
      });
    });

    // stat cards: pop in + animated count bar
    gsap.utils.toArray("[data-stat]").forEach((stat, i) => {
      gsap.from(stat, {
        y: 40, opacity: 0, duration: 0.7, ease: "power3.out", delay: (i % 2) * 0.06,
        scrollTrigger: { trigger: stat, start: "top 90%" },
      });
      gsap.to(stat.querySelector(".stat-bar"), {
        scaleX: 1, duration: 1.3, ease: "power2.out",
        scrollTrigger: { trigger: stat, start: "top 90%" },
      });
    });

    // holographic ID card: inner fade/scale + lines stagger in
    const aboutCard = document.getElementById("tilt-card");
    if (aboutCard) {
      gsap.from(aboutCard.querySelector(".about-card-inner"), {
        opacity: 0, y: 50, scale: 0.92, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: aboutCard, start: "top 82%" }, clearProps: "transform",
      });
      gsap.from(aboutCard.querySelectorAll(".about-card-line"), {
        x: 30, opacity: 0, duration: 0.55, ease: "power3.out", stagger: 0.1,
        scrollTrigger: { trigger: aboutCard, start: "top 78%" },
      });
    }
  } else {
    document.querySelectorAll(".reveal-up").forEach(el => { el.style.opacity = 1; el.style.transform = "none"; });
  }

  /* ---------- ANIMATED COUNTERS ---------- */
  document.querySelectorAll(".stat-num").forEach((el) => {
    const target = +el.dataset.count;
    const run = () => {
      const obj = { v: 0 };
      if (hasGSAP) gsap.to(obj, { v: target, duration: 1.6, ease: "power2.out", onUpdate: () => { el.textContent = Math.floor(obj.v); } });
      else el.textContent = target;
    };
    if (hasGSAP && window.ScrollTrigger) ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: run });
    else run();
  });

  /* ---------- CUSTOM CURSOR ---------- */
  const dot = document.getElementById("cursor-dot");
  const ring = document.getElementById("cursor-ring");
  const light = document.getElementById("cursor-light");
  if (dot && ring && window.matchMedia("(pointer: fine)").matches) {
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    let lx = mx, ly = my; // lagged light position
    let lastSpark = 0, lastX = mx, lastY = my;
    setTimeout(() => light && light.classList.add("on"), 400);

    window.addEventListener("pointermove", (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;

      // spawn a sparkle when the cursor moves fast enough (throttled; off on low-end)
      if (!reduce && !lowPerf) {
        const now = performance.now();
        const speed = Math.hypot(mx - lastX, my - lastY);
        if (now - lastSpark > 32 && speed > 4) { spawnSpark(mx, my); lastSpark = now; }
        lastX = mx; lastY = my;
      }
    });

    const loop = () => {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      // light follows with a softer lag for a "trailing glow" feel
      lx += (mx - lx) * 0.12; ly += (my - ly) * 0.12;
      if (light) light.style.transform = `translate(${lx}px, ${ly}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    };
    loop();

    // click = star burst + light flash
    window.addEventListener("pointerdown", () => {
      dot.classList.add("click");
      if (light) { light.classList.add("click"); }
      for (let i = 0; i < 8; i++) spawnSpark(mx, my, true);
    });
    window.addEventListener("pointerup", () => {
      dot.classList.remove("click");
      if (light) light.classList.remove("click");
    });

    document.querySelectorAll('[data-cursor="hover"], a, button').forEach((el) => {
      el.addEventListener("mouseenter", () => ring.classList.add("hover"));
      el.addEventListener("mouseleave", () => ring.classList.remove("hover"));
    });
  }

  // fading sparkle-star trail particle
  function spawnSpark(x, y, burst = false) {
    const s = document.createElement("div");
    s.className = "spark";
    const jx = (Math.random() - 0.5) * (burst ? 60 : 18);
    const jy = (Math.random() - 0.5) * (burst ? 60 : 18);
    const size = (burst ? 8 : 5) + Math.random() * 6;
    s.style.left = x + "px"; s.style.top = y + "px";
    s.style.width = s.style.height = size + "px";
    document.body.appendChild(s);
    if (hasGSAP) {
      gsap.to(s, {
        x: jx, y: jy + (burst ? 0 : 14), opacity: 0, scale: 0, rotation: Math.random() * 180,
        duration: burst ? 0.7 : 0.55, ease: "power2.out", onComplete: () => s.remove(),
      });
    } else {
      s.style.transition = "opacity .5s, transform .5s";
      requestAnimationFrame(() => { s.style.opacity = "0"; s.style.transform = `translate(-50%,-50%) translate(${jx}px,${jy}px) scale(0)`; });
      setTimeout(() => s.remove(), 550);
    }
  }

  /* ---------- DIVE INTERSTITIAL SEQUENCE ---------- */
  function buildDiveSequence() {
    const dive = document.getElementById("dive");
    const stage = document.getElementById("dive-stage");
    if (!dive || !stage) return;

    const dark = stage.querySelector(".dive-dark");
    const mA = stage.querySelector(".dive-meteor-a");
    const mB = stage.querySelector(".dive-meteor-b");
    const flash = stage.querySelector(".dive-flash");
    const ring = stage.querySelector(".dive-ring");
    const title = stage.querySelector(".dive-title");
    const shardWrap = stage.querySelector(".dive-shards");
    const warp = window.PVX_WARP;

    // build explosion shards once
    const shards = [];
    for (let i = 0; i < 18; i++) {
      const s = document.createElement("i");
      s.className = "dive-shard";
      shardWrap.appendChild(s);
      shards.push(s);
    }

    const vw = () => window.innerWidth;
    gsap.set([mA, mB], { opacity: 0 });

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: dive, start: "top top", end: "bottom bottom", scrub: 1 },
    });

    // 1) DIVE INTO THE DARK (+ a touch of camera warp)
    tl.fromTo(dark, { opacity: 0 }, { opacity: 1, ease: "power2.in", duration: 1.3 }, 0);
    tl.fromTo(warp, { value: 0 }, { value: 0.7, ease: "power2.in", duration: 1.3 }, 0);

    // 2) TWO METEORS CONVERGE FROM OPPOSITE SIDES
    tl.fromTo(mA, { x: () => -vw() * 0.62, y: -150, opacity: 1 },
                  { x: -14, y: -6, ease: "power1.in", duration: 1.4 }, 1.1);
    tl.fromTo(mB, { x: () => vw() * 0.62, y: 150, opacity: 1 },
                  { x: 14, y: 6, ease: "power1.in", duration: 1.4 }, 1.1);

    // 3) COLLISION! flash + shockwave ring + shards
    tl.set([mA, mB], { opacity: 0 });
    tl.fromTo(flash, { scale: 0, opacity: 1 }, { scale: 16, opacity: 0, ease: "power2.out", duration: 1.0 }, ">-0.05");
    tl.fromTo(ring, { scale: 0, opacity: 0.9 }, { scale: 22, opacity: 0, ease: "power2.out", duration: 1.2 }, "<");
    tl.fromTo(shards,
      { x: 0, y: 0, opacity: 1, scale: 1 },
      {
        x: (i) => Math.cos((i / shards.length) * Math.PI * 2) * (220 + (i % 5) * 70),
        y: (i) => Math.sin((i / shards.length) * Math.PI * 2) * (220 + (i % 5) * 70),
        opacity: 0, scale: 0, ease: "power2.out", duration: 1.1,
      }, "<");

    // 4) CHAPTER TITLE
    tl.fromTo(title, { opacity: 0, scale: 0.8, filter: "blur(12px)" },
                     { opacity: 1, scale: 1, filter: "blur(0px)", ease: "power3.out", duration: 0.9 }, ">-0.2");
    tl.to(title, { opacity: 0, scale: 1.1, filter: "blur(6px)", ease: "power2.in", duration: 0.9 }, ">0.5");

    // 5) SPACE + PARTICLES COME BACK (dark lifts, warp resets)
    tl.to(dark, { opacity: 0, ease: "power2.out", duration: 1.4 }, "<");
    tl.to(warp, { value: 0, ease: "power2.out", duration: 1.4 }, "<");
  }

  // generic interstitial: dive to dark -> scripted event (kind) -> title -> return
  function buildInterstitial({ spacerId, stageId, kind }) {
    const spacer = document.getElementById(spacerId);
    const stage = document.getElementById(stageId);
    if (!spacer || !stage) return;
    const dark = stage.querySelector(".dive-dark");
    const title = stage.querySelector(".dive-title");
    const warp = window.PVX_WARP;

    const mk = (cls) => { const d = document.createElement("div"); d.className = cls; stage.appendChild(d); return d; };
    const flash = mk("dive-flash");
    const ring = mk("dive-ring");

    // explosion shards anchored at center
    const makeShards = (n) => {
      const wrap = mk("dive-shards"); const arr = [];
      for (let i = 0; i < n; i++) { const s = document.createElement("i"); s.className = "dive-shard"; wrap.appendChild(s); arr.push(s); }
      return arr;
    };
    const detonate = (tl, shards, pos) => {
      tl.fromTo(flash, { scale: 0, opacity: 1 }, { scale: 16, opacity: 0, ease: "power2.out", duration: 1.0 }, pos);
      tl.fromTo(ring, { scale: 0, opacity: 0.9 }, { scale: 22, opacity: 0, ease: "power2.out", duration: 1.2 }, "<");
      if (shards.length) tl.fromTo(shards, { x: 0, y: 0, opacity: 1, scale: 1 }, {
        x: (i) => Math.cos((i / shards.length) * Math.PI * 2) * (220 + (i % 5) * 70),
        y: (i) => Math.sin((i / shards.length) * Math.PI * 2) * (220 + (i % 5) * 70),
        opacity: 0, scale: 0, ease: "power2.out", duration: 1.1,
      }, "<");
    };

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: spacer, start: "top top", end: "bottom bottom", scrub: 1 },
    });

    // shared: dive into the dark
    tl.fromTo(dark, { opacity: 0 }, { opacity: 1, ease: "power2.in", duration: 1.3 }, 0);
    tl.fromTo(warp, { value: 0 }, { value: 0.7, ease: "power2.in", duration: 1.3 }, 0);

    // scripted event
    if (kind === "supernova") {
      const core = mk("dive-core");
      const shards = makeShards(lowPerf ? 8 : 22);
      tl.fromTo(core, { scale: 0, opacity: 0 }, { scale: 7, opacity: 1, ease: "power1.in", duration: 1.3 }, 1.1); // swell
      tl.to(core, { scale: 0.15, ease: "power3.in", duration: 0.45 });                                            // implode
      tl.set(core, { opacity: 0 });
      detonate(tl, shards, ">-0.05");                                                                              // detonate
    } else if (kind === "wormhole") {
      const lineX = () => { const t = document.querySelector(".timeline"); return t ? t.getBoundingClientRect().left : innerWidth * 0.1; };
      // the screen-sized mix-blend vortex is the heaviest thing to composite — skip it on low-end
      if (!lowPerf) {
        const vortex = mk("dive-vortex");
        tl.fromTo(vortex, { opacity: 0, scale: 0.3, rotation: 0 },
                          { opacity: 0.7, scale: 1, rotation: 150, ease: "power1.inOut", duration: 2.6 }, 0.2);
        tl.to(vortex, { rotation: 240, scale: 1.4, opacity: 0, ease: "power1.inOut", duration: 1.2 }, ">-0.3");
      }

      // calmer ring tunnel (fewer rings + no glow on low-end)
      const palette = ["#00f0ff", "#b14bff"];
      const rings = [];
      const RING_COUNT = lowPerf ? 3 : 7;
      for (let i = 0; i < RING_COUNT; i++) {
        const r = mk("dive-portal-ring");
        r.style.borderColor = palette[i % palette.length];
        if (!lowPerf) r.style.boxShadow = `0 0 16px ${palette[i % palette.length]}`;
        rings.push(r);
      }
      tl.fromTo(rings,
        { scale: 0, opacity: 0.6 },
        { scale: 15, opacity: 0, rotate: (i) => (i % 2 ? 1 : -1) * 110, ease: "power1.out", duration: 2.6, stagger: 0.2 },
        0.8);

      const rocket = document.getElementById("flight-rocket");
      if (rocket) {
        // continue from the timeline line (where Experience left it) → slowly turn + curve to
        // the centre while zooming bigger, ARRIVING at centre exactly as the portal detonates
        tl.fromTo(rocket,
          { x: lineX, y: () => innerHeight * 0.85, scale: 1, rotation: 150, opacity: 1 },
          { x: () => innerWidth * 0.5, y: () => innerHeight * 0.5, scale: 3.6, rotation: 360, ease: "power1.inOut", duration: 2.4 },
          0.4);
        tl.to(rocket, { scale: 6.5, opacity: 0, ease: "power2.in", duration: 0.5 }, ">-0.05"); // vanish into the boom
        detonate(tl, [], "<");
      } else {
        detonate(tl, [], ">-0.4");
      }
    } else if (kind === "lightspeed") {
      const ufo = stage.querySelector(".dive-ufo");
      // hyperspace star streaks bursting radially from the centre
      const streaks = [];
      const STREAKS = lowPerf ? 22 : 64;
      for (let i = 0; i < STREAKS; i++) {
        const s = mk("ls-streak");
        gsap.set(s, { rotation: Math.random() * 360, transformOrigin: "0% 50%", scaleX: 0, opacity: 0 });
        streaks.push(s);
      }
      // accelerate: streaks stretch outward as you scroll in
      tl.fromTo(streaks,
        { scaleX: 0, opacity: 0 },
        { scaleX: () => 2 + Math.random() * 7, opacity: 1, ease: "power2.in", duration: 2.4,
          stagger: { each: 0.015, from: "random" } },
        0.6);
      if (ufo) {
        // UFO flies up to centre, then stretches + jumps to lightspeed
        tl.fromTo(ufo, { y: 130, scale: 0.6, opacity: 0 },
                       { y: 0, scale: 1, opacity: 1, ease: "power1.out", duration: 1.3 }, 0.5);
        tl.to(ufo, { scaleX: 7, scaleY: 1.2, opacity: 0, ease: "power3.in", duration: 0.55 }, ">0.2"); // smear into the jump
      }
      detonate(tl, [], ">-0.1"); // the jump flash
      tl.to(streaks, { scaleX: () => 11 + Math.random() * 6, opacity: 0, ease: "power2.out", duration: 0.6 }, "<");
    }

    // shared: chapter title + space returns
    tl.fromTo(title, { opacity: 0, scale: 0.8, filter: "blur(12px)" },
                     { opacity: 1, scale: 1, filter: "blur(0px)", ease: "power3.out", duration: 0.9 }, ">-0.1");
    tl.to(title, { opacity: 0, scale: 1.1, filter: "blur(6px)", ease: "power2.in", duration: 0.9 }, ">0.5");
    tl.to(dark, { opacity: 0, ease: "power2.out", duration: 1.4 }, "<");
    tl.to(warp, { value: 0, ease: "power2.out", duration: 1.4 }, "<");
  }

  /* ---------- SKILLS CARD: promote to screen-centre on hover ---------- */
  if (!reduce && hasGSAP) {
    const grid = document.querySelector(".skills-grid");
    if (grid) {
      let featured = null;

      const release = (card) => {
        if (featured === card) featured = null;
        card.classList.remove("featured");
        gsap.killTweensOf(card);
        // don't animate rotationY back (360 ≡ 0) so it doesn't spin in reverse; clearProps resets it
        gsap.to(card, {
          x: 0, y: 0, scale: 1, rotationX: 0, rotationZ: 0,
          duration: 0.6, ease: "power3.inOut",
          // keep pointer-events off until it's home, so it can't re-trigger its own
          // mouseenter as it flies back across the cursor
          onComplete: () => { card.style.zIndex = ""; card.style.pointerEvents = ""; gsap.set(card, { clearProps: "transform" }); },
        });
      };

      const feature = (card) => {
        if (featured === card) return;
        if (featured) release(featured);
        featured = card;
        card.classList.add("featured");
        card.style.zIndex = "200";
        card.style.pointerEvents = "none"; // let the cursor fall through the flown card
        gsap.killTweensOf(card);
        // target: translate the card's centre to the viewport centre (account for current offset)
        const cx = Number(gsap.getProperty(card, "x")) || 0;
        const cy = Number(gsap.getProperty(card, "y")) || 0;
        const r = card.getBoundingClientRect();
        const x = window.innerWidth / 2 - (r.left + r.width / 2) + cx;
        const y = window.innerHeight / 2 - (r.top + r.height / 2) + cy;
        // set perspective/origin INSTANTLY (animating transformPerspective from ~0 causes
        // the extreme-distortion "teleport" at the start of the hover)
        gsap.set(card, { transformPerspective: 900, transformOrigin: "center center" });
        // 1) spin 360 in place, then  2) glide to centre + scale + lean (overlapped, no pause)
        gsap.timeline()
          .to(card, { rotationY: 360, scale: 1.12, duration: 0.65, ease: "power2.inOut" })
          .to(card, { x, y, scale: 1.45, rotationX: 16, rotationZ: 6, duration: 0.7, ease: "power3.out" }, "-=0.12");
      };

      gsap.utils.toArray(".skill-cluster").forEach((card) => {
        card.addEventListener("mouseenter", () => feature(card));
      });
      // leaving the grid area releases the current featured card
      grid.addEventListener("mouseleave", () => { if (featured) release(featured); });
    }
  }

  /* ---------- PROJECTS: UFO follows the cursor & beams the project under it ---------- */
  if (!reduce && hasGSAP) {
    const section = document.getElementById("projects");
    const ufo = document.getElementById("ufo");
    if (section && ufo) {
      const xTo = gsap.quickTo(ufo, "x", { duration: 0.4, ease: "power3" });
      const yTo = gsap.quickTo(ufo, "y", { duration: 0.4, ease: "power3" }); // lag = floaty vertical follow
      let current = null, lastParticle = 0;

      const clearScan = () => {
        if (current) { current.classList.remove("scanned"); current = null; }
        ufo.classList.remove("scanning");
      };

      // a particle rising up into the beam (abduction)
      const spawnAbduct = (x, y) => {
        const p = document.createElement("i");
        p.className = "abduct";
        p.style.left = x + "px"; p.style.top = y + "px";
        section.appendChild(p);
        gsap.to(p, {
          y: -(45 + Math.random() * 35), x: (Math.random() - 0.5) * 26, opacity: 0, scale: 0,
          duration: 0.7 + Math.random() * 0.3, ease: "power1.out", onComplete: () => p.remove(),
        });
      };

      section.addEventListener("pointermove", (e) => {
        const sr = section.getBoundingClientRect();
        const lx = e.clientX - sr.left, ly = e.clientY - sr.top;
        xTo(lx - 18);       // craft floats just above the cursor
        yTo(ly - 64);
        const row = e.target.closest(".project");
        if (row !== current) {
          clearScan();
          if (row) { row.classList.add("scanned"); current = row; ufo.classList.add("scanning"); }
        }
        if (row && !lowPerf) {
          const now = performance.now();
          if (now - lastParticle > 80) { spawnAbduct(lx + (Math.random() - 0.5) * 30, ly + 10); lastParticle = now; }
        }
      });

      section.addEventListener("pointerleave", () => {
        clearScan();
        const r = section.getBoundingClientRect();
        xTo(r.width - 64); yTo(60); // drift back to the corner
      });

      gsap.set(ufo, { x: section.getBoundingClientRect().width - 64, y: 60 });
    }
  }

  /* ---------- MAGNETIC BUTTONS ---------- */
  if (!reduce) {
    document.querySelectorAll(".magnetic").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.3}px, ${y * 0.4}px)`;
      });
      el.addEventListener("mouseleave", () => { el.style.transform = "translate(0,0)"; });
    });
  }

  /* ---------- 3D TILT CARD ---------- */
  const tilt = document.getElementById("tilt-card");
  if (tilt && !reduce) {
    const inner = tilt.querySelector(".about-card-inner");
    tilt.addEventListener("mousemove", (e) => {
      const r = tilt.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      inner.style.transform = `rotateY(${px * 16}deg) rotateX(${-py * 16}deg) translateZ(20px)`;
    });
    tilt.addEventListener("mouseleave", () => { inner.style.transform = "rotateY(0) rotateX(0)"; });
  }

  /* ---------- NAV ---------- */
  const burger = document.getElementById("nav-burger");
  const links = document.querySelector(".nav-links");
  burger?.addEventListener("click", () => { burger.classList.toggle("open"); links.classList.toggle("open"); });
  document.querySelectorAll(".nav-links a").forEach((a) => a.addEventListener("click", () => {
    burger.classList.remove("open"); links.classList.remove("open");
  }));

  // smooth anchor scroll via GSAP
  if (hasGSAP && window.ScrollToPlugin) {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id.length > 1 && document.querySelector(id)) {
          e.preventDefault();
          gsap.to(window, { duration: 1.1, ease: "power3.inOut", scrollTo: { y: id, offsetY: 0 } });
        }
      });
    });
  }

  /* ---------- BACKGROUND MUSIC ---------- */
  (function audioControl() {
    const audio = document.getElementById("bg-audio");
    const btn = document.getElementById("sound-toggle");
    const label = btn?.querySelector(".sound-label");
    if (!audio || !btn) return;

    const TARGET_VOL = 0.45;
    audio.volume = 0;
    let wantSound = true;   // user intent
    let started = false;

    function fadeTo(vol, ms = 800) {
      if (hasGSAP) gsap.to(audio, { volume: vol, duration: ms / 1000, ease: "sine.inOut" });
      else audio.volume = vol;
    }

    function play() {
      audio.play().then(() => {
        started = true;
        removeGestureListeners();
        btn.classList.add("playing");
        if (label) label.textContent = "sound on";
        fadeTo(TARGET_VOL);
      }).catch(() => { /* blocked until a real gesture — will retry on next interaction */ });
    }

    function pause() {
      fadeTo(0, 400);
      setTimeout(() => audio.pause(), 420);
      btn.classList.remove("playing");
      if (label) label.textContent = "sound off";
    }

    // start on the first genuine user gesture (autoplay-with-audio is blocked;
    // a click always counts, scroll/wheel may not). Keep listening until a
    // play() call actually succeeds, then detach.
    const GESTURES = ["pointerdown", "keydown", "touchstart", "click"];
    function removeGestureListeners() { GESTURES.forEach((ev) => window.removeEventListener(ev, firstGesture)); }
    function firstGesture() {
      if (started) { removeGestureListeners(); return; }
      if (wantSound) play();
    }
    GESTURES.forEach((ev) => window.addEventListener(ev, firstGesture));

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      wantSound = audio.paused;
      if (wantSound) play(); else pause();
    });

    // pause when tab hidden, resume when back (respecting user intent)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { if (!audio.paused) audio.pause(); }
      else if (wantSound && started) play();
    });
  })();

  /* ---------- SCROLL PROGRESS BAR ---------- */
  const prog = document.getElementById("scroll-progress");
  window.addEventListener("scroll", () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    prog.style.width = (window.scrollY / h) * 100 + "%";
  }, { passive: true });
});
