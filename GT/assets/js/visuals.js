/* ==========================================================================
   GEEKS TECHNOLOGIES — generative visuals
   Two bespoke canvas scenes: an intelligence topology for the hero and a
   connected ecosystem constellation for the technology section.
   Both are decorative, pausable and reduced-motion aware.
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var TAU = Math.PI * 2;

  function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(min, max) { return min + Math.random() * (max - min); }

  /* Creates a DPR-aware render surface with visibility pausing and an
     animation callback that receives { width, height, time, dt }. */
  function createSurface(canvas, draw) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return null;

    var width = 0;
    var height = 0;
    var dpr = 1;
    var running = false;
    var visible = true;
    var frame = null;
    var last = 0;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      dpr = clamp(window.devicePixelRatio || 1, 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!running) draw({ width: width, height: height, time: 0, dt: 0, ctx: ctx });
    }

    function step(now) {
      if (!running) return;
      var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now;
      draw({ width: width, height: height, time: now / 1000, dt: dt, ctx: ctx });
      frame = window.requestAnimationFrame(step);
    }

    function start() {
      if (running) return;
      running = true;
      last = 0;
      frame = window.requestAnimationFrame(step);
    }

    function stop() {
      running = false;
      if (frame) window.cancelAnimationFrame(frame);
      frame = null;
    }

    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(resize);
      ro.observe(canvas);
    } else {
      window.addEventListener("resize", resize);
    }

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && !reduceMotion.matches) start(); else stop();
        if (visible && reduceMotion.matches) draw({ width: width, height: height, time: 0, dt: 0, ctx: ctx });
      }, { threshold: 0.02 });
      io.observe(canvas);
    } else {
      visible = true;
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else if (visible && !reduceMotion.matches) start();
    });

    resize();

    var api = {
      start: function () { if (!reduceMotion.matches) start(); },
      refresh: resize,
      get size() { return { width: width, height: height }; }
    };

    reduceMotion.addEventListener("change", function () {
      if (reduceMotion.matches) {
        stop();
        draw({ width: width, height: height, time: 0, dt: 0, ctx: ctx });
      } else if (visible) {
        start();
      }
    });

    return api;
  }

  /* ======================================================================
     Hero — intelligence topology
     A slowly rotating volumetric mesh of nodes with data pulses travelling
     along its edges, lit by a drifting aurora field.
     ====================================================================== */
  function initHero() {
    var canvas = document.getElementById("hero-canvas");
    if (!canvas) return;

    var nodes = [];
    var edges = [];
    var pulses = [];
    var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    var rotation = 0;
    var built = false;

    function build(width, height) {
      var density = clamp(Math.round((width * height) / 6200), 48, 130);
      nodes = [];
      edges = [];
      pulses = [];

      for (var i = 0; i < density; i++) {
        var radius = Math.cbrt(Math.random());
        var theta = Math.random() * TAU;
        var phi = Math.acos(rand(-0.9, 0.9));
        var hub = Math.random() < 0.14;
        nodes.push({
          x: radius * Math.sin(phi) * Math.cos(theta),
          y: radius * Math.sin(phi) * Math.sin(theta) * 0.74,
          z: radius * Math.cos(phi),
          hub: hub,
          weight: hub ? rand(1.5, 2.4) : rand(0.55, 1.15)
        });
      }

      var maxEdges = Math.round(density * 1.7);
      for (var a = 0; a < nodes.length && edges.length < maxEdges; a++) {
        var best = null;
        for (var b = 0; b < nodes.length; b++) {
          if (a === b) continue;
          var dx = nodes[a].x - nodes[b].x;
          var dy = nodes[a].y - nodes[b].y;
          var dz = nodes[a].z - nodes[b].z;
          var dist = dx * dx + dy * dy + dz * dz;
          if (dist < 0.1 && (!best || dist < best.dist)) best = { index: b, dist: dist };
        }
        if (best) {
          var duplicate = edges.some(function (e) {
            return (e.a === a && e.b === best.index) || (e.a === best.index && e.b === a);
          });
          if (!duplicate) edges.push({ a: a, b: best.index });
        }
      }

      var pulseCount = clamp(Math.round(density / 2.4), 14, 34);
      for (var p = 0; p < pulseCount; p++) {
        pulses.push({
          edge: Math.floor(Math.random() * edges.length),
          t: Math.random(),
          speed: rand(0.14, 0.42),
          teal: Math.random() < 0.45
        });
      }

      built = true;
    }

    var surface = createSurface(canvas, render);
    if (!surface) return;

    function render(frame) {
      var ctx = frame.ctx;
      var w = frame.width;
      var h = frame.height;
      if (w < 2 || h < 2) return;

      if (!built || nodes.length === 0) build(w, h);

      pointer.x = lerp(pointer.x, pointer.tx, 0.045);
      pointer.y = lerp(pointer.y, pointer.ty, 0.045);
      rotation = reduceMotion.matches ? 0.6 : frame.time * 0.055;

      ctx.clearRect(0, 0, w, h);

      /* Aurora field ------------------------------------------------------ */
      var drift = reduceMotion.matches ? 0 : Math.sin(frame.time * 0.16) * 0.06;
      var auroraA = ctx.createRadialGradient(
        w * (0.68 + drift), h * 0.3, 0,
        w * (0.68 + drift), h * 0.3, Math.max(w, h) * 0.62
      );
      auroraA.addColorStop(0, "rgba(47, 107, 255, 0.40)");
      auroraA.addColorStop(0.55, "rgba(47, 107, 255, 0.07)");
      auroraA.addColorStop(1, "rgba(47, 107, 255, 0)");
      ctx.fillStyle = auroraA;
      ctx.fillRect(0, 0, w, h);

      var auroraB = ctx.createRadialGradient(
        w * (0.26 - drift), h * 0.74, 0,
        w * (0.26 - drift), h * 0.74, Math.max(w, h) * 0.5
      );
      auroraB.addColorStop(0, "rgba(47, 212, 182, 0.28)");
      auroraB.addColorStop(0.6, "rgba(47, 212, 182, 0.05)");
      auroraB.addColorStop(1, "rgba(47, 212, 182, 0)");
      ctx.fillStyle = auroraB;
      ctx.fillRect(0, 0, w, h);

      /* 3D projection ----------------------------------------------------- */
      var cx = w * 0.5 + pointer.x * w * 0.05;
      var cy = h * 0.5 + pointer.y * h * 0.05;
      var radius = Math.min(w, h) * 0.44;
      var focal = 2.45;
      var cos = Math.cos(rotation);
      var sin = Math.sin(rotation);
      var projected = new Array(nodes.length);

      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        var rx = n.x * cos - n.z * sin;
        var rz = n.x * sin + n.z * cos;
        var depth = focal / (focal + rz * 0.85);
        projected[i] = {
          x: cx + rx * radius * depth,
          y: cy + n.y * radius * depth,
          depth: depth,
          scale: depth,
          hub: n.hub,
          weight: n.weight
        };
      }

      /* Edges ------------------------------------------------------------- */
      ctx.lineWidth = 1;
      for (var e = 0; e < edges.length; e++) {
        var edge = edges[e];
        var p1 = projected[edge.a];
        var p2 = projected[edge.b];
        var alpha = clamp(0.075 + ((p1.depth + p2.depth) / 2 - 0.68) * 1.15, 0.04, 0.62);
        ctx.strokeStyle = "rgba(158, 186, 255, " + alpha.toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      /* Data pulses ------------------------------------------------------- */
      for (var pi = 0; pi < pulses.length; pi++) {
        var pulse = pulses[pi];
        if (!reduceMotion.matches) {
          pulse.t += frame.dt * pulse.speed;
          if (pulse.t > 1) {
            pulse.t = 0;
            pulse.edge = Math.floor(Math.random() * edges.length);
            pulse.speed = rand(0.14, 0.42);
          }
        }
        var pe = edges[pulse.edge];
        if (!pe) continue;
        var a = projected[pe.a];
        var b = projected[pe.b];
        var t = pulse.t;
        /* Accelerate through the middle of the edge, ease at both ends. */
        var eased = t * t * (3 - 2 * t);
        var px = lerp(a.x, b.x, eased);
        var py = lerp(a.y, b.y, eased);
        var fade = Math.sin(t * Math.PI);
        var size = 1.6 * fade + 0.6;

        ctx.beginPath();
        ctx.fillStyle = pulse.teal
          ? "rgba(47, 212, 182, " + (0.85 * fade).toFixed(3) + ")"
          : "rgba(122, 168, 255, " + (0.85 * fade).toFixed(3) + ")";
        ctx.arc(px, py, size, 0, TAU);
        ctx.fill();

        if (fade > 0.35) {
          ctx.beginPath();
          ctx.fillStyle = pulse.teal
            ? "rgba(47, 212, 182, 0.12)"
            : "rgba(122, 168, 255, 0.12)";
          ctx.arc(px, py, size * 4.5, 0, TAU);
          ctx.fill();
        }
      }

      /* Nodes ------------------------------------------------------------- */
      for (var k = 0; k < projected.length; k++) {
        var node = projected[k];
        var base = clamp((node.depth - 0.5) * 1.2, 0.26, 1);
        var r = (node.hub ? 3.6 : 2.0) * node.scale;

        if (node.hub) {
          ctx.beginPath();
          ctx.fillStyle = "rgba(47, 212, 182, 0.14)";
          ctx.arc(node.x, node.y, r * 7, 0, TAU);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.fillStyle = node.hub
          ? "rgba(127, 240, 210, " + clamp(base + 0.15, 0, 1).toFixed(3) + ")"
          : "rgba(214, 226, 255, " + (base * 0.9).toFixed(3) + ")";
        ctx.arc(node.x, node.y, r, 0, TAU);
        ctx.fill();
      }

      /* Vignette --------------------------------------------------------- */
      var vignette = ctx.createRadialGradient(cx, cy, radius * 0.95, cx, cy, radius * 1.9);
      vignette.addColorStop(0, "rgba(5, 7, 12, 0)");
      vignette.addColorStop(1, "rgba(5, 7, 12, 0.62)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    }

    /* Pointer parallax on the enclosing frame --------------------------- */
    var host = canvas.closest("[data-tilt]") || canvas.parentElement;
    if (host && !reduceMotion.matches) {
      host.addEventListener("pointermove", function (event) {
        var rect = host.getBoundingClientRect();
        pointer.tx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        pointer.ty = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      });
      host.addEventListener("pointerleave", function () {
        pointer.tx = 0;
        pointer.ty = 0;
      });
    }

    window.addEventListener("resize", function () { built = false; });
    surface.start();
  }

  /* ======================================================================
     Ecosystem — connected constellation
     Spokes reach from each capability cluster into the platform core, with
     data flowing inward. The spoke of the currently active theme brightens.
     ====================================================================== */
  function initEcosystem() {
    var canvas = document.getElementById("eco-canvas");
    var stage = document.querySelector("[data-constellation]");
    if (!canvas || !stage) return;

    var spokes = [
      { theme: "ai", x: 0.20, y: 0.22 },
      { theme: "cloud", x: 0.78, y: 0.20 },
      { theme: "data", x: 0.82, y: 0.60 },
      { theme: "app", x: 0.62, y: 0.82 },
      { theme: "ent", x: 0.18, y: 0.78 }
    ];
    var particles = [];
    var hue = { ai: "#2FD4B6", cloud: "#5A8BFF", data: "#7FF0D2", app: "#9FB6FF", ent: "#8A93A8" };
    var ready = false;

    var surface = createSurface(canvas, render);
    if (!surface) return;

    function seed() {
      particles = [];
      for (var s = 0; s < spokes.length; s++) {
        for (var i = 0; i < 5; i++) {
          particles.push({
            spoke: s,
            t: Math.random(),
            speed: rand(0.16, 0.5),
            alpha: rand(0.35, 0.95)
          });
        }
      }
      ready = true;
    }

    function activeTheme() {
      var active = stage.querySelector(".eco-node.is-active");
      return active ? active.getAttribute("data-theme") : null;
    }

    function render(frame) {
      var ctx = frame.ctx;
      var w = frame.width;
      var h = frame.height;
      if (w < 2 || h < 2) return;
      if (!ready) seed();

      var cx = w / 2;
      var cy = h / 2;
      var coreR = Math.min(w, h) * 0.17;
      var active = activeTheme();
      var motion = !reduceMotion.matches;

      ctx.clearRect(0, 0, w, h);

      /* Ambient core glow ------------------------------------------------- */
      var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.55);
      glow.addColorStop(0, "rgba(47, 107, 255, 0.22)");
      glow.addColorStop(0.45, "rgba(47, 107, 255, 0.05)");
      glow.addColorStop(1, "rgba(47, 107, 255, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      /* Concentric rings -------------------------------------------------- */
      var ringR = Math.min(w, h) * 0.44;
      for (var r = 1; r <= 3; r++) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255, 255, 255, " + (0.06 / r).toFixed(3) + ")";
        ctx.lineWidth = 1;
        ctx.arc(cx, cy, (ringR * r) / 3, 0, TAU);
        ctx.stroke();
      }

      /* Slow outer sweep -------------------------------------------------- */
      if (motion) {
        var sweep = (frame.time * 0.12) % TAU;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(127, 240, 210, 0.14)";
        ctx.lineWidth = 1;
        ctx.arc(cx, cy, ringR * 0.88, sweep, sweep + 0.5);
        ctx.stroke();
      }

      /* Spokes ------------------------------------------------------------ */
      for (var s = 0; s < spokes.length; s++) {
        var spoke = spokes[s];
        var ex = spoke.x * w;
        var ey = spoke.y * h;
        var isActive = active === spoke.theme;
        var dim = active && !isActive ? 0.28 : 1;

        ctx.beginPath();
        ctx.strokeStyle = "rgba(255, 255, 255, " + (0.13 * dim).toFixed(3) + ")";
        ctx.lineWidth = 1;
        ctx.moveTo(ex, ey);
        ctx.lineTo(cx, cy);
        ctx.stroke();

        /* Node marker at the spoke endpoint */
        ctx.beginPath();
        ctx.fillStyle = hue[spoke.theme] || "#2FD4B6";
        ctx.globalAlpha = (isActive ? 0.85 : 0.45) * dim;
        ctx.arc(ex, ey, isActive ? 3.2 : 2.2, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (isActive) {
          ctx.beginPath();
          ctx.fillStyle = hexToRgba(hue[spoke.theme] || "#2FD4B6", 0.16);
          ctx.arc(ex, ey, 14, 0, TAU);
          ctx.fill();
        }
      }

      /* Inbound data particles -------------------------------------------- */
      for (var p = 0; p < particles.length; p++) {
        var part = particles[p];
        var spokeRef = spokes[part.spoke];
        if (!spokeRef) continue;
        if (motion) {
          part.t += frame.dt * part.speed * (active === spokeRef.theme ? 1.7 : 1);
          if (part.t > 1) {
            part.t -= 1;
            part.speed = rand(0.16, 0.5);
            part.alpha = rand(0.35, 0.95);
          }
        }
        var isSpokeActive = active === spokeRef.theme;
        var dim2 = active && !isSpokeActive ? 0.2 : 1;
        var sx = lerp(spokeRef.x * w, cx, part.t);
        var sy = lerp(spokeRef.y * h, cy, part.t);
        var fade2 = Math.sin(part.t * Math.PI);

        ctx.beginPath();
        ctx.fillStyle = hexToRgba(hue[spokeRef.theme] || "#2FD4B6", part.alpha * fade2 * dim2);
        ctx.arc(sx, sy, isSpokeActive ? 2.6 : 1.9, 0, TAU);
        ctx.fill();
      }

      /* Core ring ---------------------------------------------------------- */
      ctx.beginPath();
      ctx.strokeStyle = "rgba(47, 212, 182, 0.42)";
      ctx.lineWidth = 1;
      ctx.arc(cx, cy, coreR, 0, TAU);
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = "rgba(47, 107, 255, 0.34)";
      ctx.arc(cx, cy, coreR * 1.22, 0, TAU);
      ctx.stroke();
    }

    window.addEventListener("resize", function () { surface.refresh(); });
    surface.start();
  }

  function hexToRgba(hex, alpha) {
    var value = hex.replace("#", "");
    if (value.length === 3) {
      value = value.split("").map(function (c) { return c + c; }).join("");
    }
    var num = parseInt(value, 16);
    var r = (num >> 16) & 255;
    var g = (num >> 8) & 255;
    var b = num & 255;
    return "rgba(" + r + ", " + g + ", " + b + ", " + clamp(alpha, 0, 1).toFixed(3) + ")";
  }

  function boot() {
    initHero();
    initEcosystem();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
