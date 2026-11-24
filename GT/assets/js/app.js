/* ==========================================================================
   GEEKS TECHNOLOGIES — interface behaviour
   Sticky glass header, progressive reveals, animated metrics, rails,
   enquiry validation and dialog handling. No dependencies.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };

  /* ------------------------------------------------------- Sticky header */
  function initHeader() {
    var header = $("[data-header]");
    if (!header) return;
    var progress = $("[data-scroll-progress]");
    var stuck = false;
    var ticking = false;

    function update() {
      var y = window.scrollY || window.pageYOffset;
      var nowStuck = y > 24;
      if (nowStuck !== stuck) {
        stuck = nowStuck;
        header.classList.toggle("is-stuck", stuck);
      }
      if (progress) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var ratio = max > 0 ? Math.min(y / max, 1) : 0;
        progress.style.transform = "scaleX(" + ratio.toFixed(4) + ")";
      }
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
  }

  /* -------------------------------------------------------- Mobile drawer */
  function initDrawer() {
    var toggle = $("[data-nav-toggle]");
    var drawer = $("[data-drawer]");
    if (!toggle || !drawer) return;

    var lastFocus = null;

    function focusables() {
      return $$("a[href], button:not([disabled])", drawer).filter(function (el) {
        return el.offsetParent !== null;
      });
    }

    function open() {
      lastFocus = document.activeElement;
      drawer.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      toggle.querySelector(".visually-hidden").textContent = "Close menu";
      document.body.style.overflow = "hidden";
      var first = focusables()[0];
      if (first) first.focus();
    }

    function close(restoreFocus) {
      drawer.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.querySelector(".visually-hidden").textContent = "Open menu";
      document.body.style.overflow = "";
      if (restoreFocus !== false) {
        (lastFocus || toggle).focus();
      }
    }

    toggle.addEventListener("click", function () {
      if (drawer.hidden) open(); else close();
    });

    $$("[data-drawer-link]", drawer).forEach(function (link) {
      link.addEventListener("click", function () { close(false); });
    });

    document.addEventListener("keydown", function (event) {
      if (drawer.hidden) return;
      if (event.key === "Escape") { close(); return; }
      if (event.key !== "Tab") return;
      var items = focusables();
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    window.addEventListener("resize", function () {
      if (!drawer.hidden && window.innerWidth > 1024) close(false);
    });
  }

  /* ------------------------------------------------------ Progressive reveal */
  function initReveals() {
    var items = $$("[data-reveal]");
    if (!items.length) return;

    function reveal(el) {
      if (el.classList.contains("is-revealed")) return;
      var delay = parseInt(el.getAttribute("data-reveal-delay") || "0", 10);
      el.style.transitionDelay = delay + "ms";
      el.classList.add("is-revealed");
    }

    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.remove("data-reveal"); reveal(el); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        reveal(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });

    /* Cards that live inside a horizontally scrolling rail are off-screen
       sideways, so they would never intersect on their own. Reveal them as a
       staggered group once their rail enters the viewport instead. */
    var railSelector = "[data-rail], [data-model-track], .work-stack.is-rail";
    var groups = [];

    items.forEach(function (el) {
      var rail = el.closest(railSelector);
      if (rail && rail.scrollWidth > rail.clientWidth + 4) {
        var group = groups.filter(function (g) { return g.rail === rail; })[0];
        if (!group) {
          group = { rail: rail, items: [] };
          groups.push(group);
        }
        group.items.push(el);
      } else {
        observer.observe(el);
      }
    });

    groups.forEach(function (group) {
      var groupObserver = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        groupObserver.disconnect();
        group.items.forEach(function (el, index) {
          el.style.transitionDelay = index * 90 + "ms";
          el.classList.add("is-revealed");
        });
      }, { threshold: 0.05 });
      groupObserver.observe(group.rail);
    });
  }

  /* -------------------------------------------------------- Animated counters */
  function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  function animateCount(el, to, duration) {
    var start = performance.now();
    function frame(now) {
      var t = Math.min((now - start) / duration, 1);
      var value = Math.round(easeOutExpo(t) * to);
      el.textContent = value >= 1000 ? value.toLocaleString("en-US") : String(value);
      if (t < 1) window.requestAnimationFrame(frame);
      else el.textContent = to >= 1000 ? to.toLocaleString("en-US") : String(to);
    }
    window.requestAnimationFrame(frame);
  }

  function initCounters() {
    var counters = $$("[data-count-to]");
    var heroMetrics = $$("[data-metric]");
    if (!counters.length && !heroMetrics.length) return;

    function setFinal(el) {
      var target = parseInt(el.getAttribute("data-count-to") || el.getAttribute("data-metric") || "0", 10);
      el.textContent = target >= 1000 ? target.toLocaleString("en-US") : String(target);
    }

    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      counters.concat(heroMetrics).forEach(setFinal);
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        observer.unobserve(el);
        var target = parseInt(el.getAttribute("data-count-to") || el.getAttribute("data-metric") || "0", 10);
        animateCount(el, target, 1500);
      });
    }, { threshold: 0.4 });

    counters.concat(heroMetrics).forEach(function (el) { observer.observe(el); });
  }

  /* ------------------------------------------------------------- Logo marquee */
  function initMarquee() {
    var track = $("[data-marquee] .marquee-track");
    if (!track) return;
    var set = $(".logo-set", track);
    if (!set) return;

    var clone = set.cloneNode(true);
    clone.removeAttribute("aria-label");
    clone.setAttribute("aria-hidden", "true");
    $$("[role='img']", clone).forEach(function (svg) {
      svg.removeAttribute("role");
      svg.removeAttribute("aria-label");
    });
    track.appendChild(clone);
  }

  /* ------------------------------------------------------- Rails / scrollers */
  function initRails() {
    var viewport = $("[data-rail]");
    if (viewport) {
      var step = function () {
        var card = $(".industry-card", viewport);
        if (!card) return viewport.clientWidth * 0.8;
        var gap = parseFloat(getComputedStyle(viewport.querySelector(".rail-track")).columnGap) || 16;
        return card.offsetWidth + gap;
      };
      var prev = $("[data-rail-prev]");
      var next = $("[data-rail-next]");
      if (prev) prev.addEventListener("click", function () { viewport.scrollBy({ left: -step(), behavior: "smooth" }); });
      if (next) next.addEventListener("click", function () { viewport.scrollBy({ left: step(), behavior: "smooth" }); });
      enableDrag(viewport);
    }

    var modelTrack = $("[data-model-track]");
    var modelRail = $("[data-model-progress]");
    if (modelTrack && modelRail) {
      var sync = function () {
        var max = modelTrack.scrollWidth - modelTrack.clientWidth;
        var ratio = max > 0 ? modelTrack.scrollLeft / max : 1;
        modelRail.style.transform = "scaleX(" + Math.max(0.2, ratio).toFixed(4) + ")";
      };
      modelTrack.addEventListener("scroll", sync, { passive: true });
      window.addEventListener("resize", sync);
      sync();
      enableDrag(modelTrack);
    }
  }

  /* On narrow viewports the editorial case studies become one-at-a-time
     swipe panels; on wider screens they stay a stacked narrative. */
  function initWorkRail() {
    var stack = $(".work-stack");
    if (!stack) return;
    var query = window.matchMedia("(max-width: 860px)");

    function apply() {
      var mobile = query.matches;
      stack.classList.toggle("is-rail", mobile);
      if (mobile) enableDrag(stack);
      else stack.scrollLeft = 0;
    }

    apply();
    if (query.addEventListener) query.addEventListener("change", apply);
    else query.addListener(apply);
  }

  /* Pointer drag-to-scroll, so rails feel natural with a mouse as well as touch */
  function enableDrag(el) {
    if (el.dataset.dragReady === "true") return;
    el.dataset.dragReady = "true";
    var active = false;
    var startX = 0;
    var startScroll = 0;
    var moved = 0;

    el.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "touch") return;
      if (el.scrollWidth <= el.clientWidth + 4) return;
      active = true;
      moved = 0;
      startX = event.clientX;
      startScroll = el.scrollLeft;
      el.classList.add("is-dragging");
      el.style.userSelect = "none";
    });

    el.addEventListener("pointermove", function (event) {
      if (!active) return;
      var delta = event.clientX - startX;
      moved = Math.abs(delta);
      if (moved > 4) event.preventDefault();
      el.scrollLeft = startScroll - delta;
    });

    function end() {
      if (!active) return;
      active = false;
      el.classList.remove("is-dragging");
      el.style.userSelect = "";
    }

    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("pointerleave", end);
    el.addEventListener("click", function (event) {
      if (moved > 6) { event.preventDefault(); event.stopPropagation(); }
    }, true);
  }

  /* ---------------------------------------------------------- Motion accent */
  function initTilt() {
    var frame = $("[data-tilt]");
    if (!frame || reduceMotion.matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    var raf = null;
    var target = { x: 0, y: 0 };

    function apply() {
      raf = null;
      frame.style.transform =
        "perspective(1100px) rotateY(" + target.y.toFixed(2) + "deg) rotateX(" +
        target.x.toFixed(2) + "deg) translateY(" + (Math.abs(target.y) * 0.25).toFixed(2) + "px)";
    }

    frame.addEventListener("pointermove", function (event) {
      var rect = frame.getBoundingClientRect();
      var px = (event.clientX - rect.left) / rect.width - 0.5;
      var py = (event.clientY - rect.top) / rect.height - 0.5;
      target.y = px * 5;
      target.x = -py * 5;
      if (!raf) raf = window.requestAnimationFrame(apply);
    });

    frame.addEventListener("pointerleave", function () {
      target.x = 0;
      target.y = 0;
      if (!raf) raf = window.requestAnimationFrame(apply);
    });
  }

  /* ------------------------------------------------------- Ecosystem legend */
  function initEcosystem() {
    var stage = $("[data-constellation]");
    if (!stage) return;
    var nodes = $$(".eco-node", stage);
    var legends = $$(".legend-item", stage);
    if (!nodes.length || !legends.length) return;

    function activate(theme) {
      nodes.forEach(function (node) {
        node.classList.toggle("is-active", node.getAttribute("data-theme") === theme);
      });
      legends.forEach(function (item) {
        item.classList.toggle("is-active", item.getAttribute("data-legend") === theme);
      });
    }

    function clear() {
      nodes.forEach(function (node) { node.classList.remove("is-active"); });
      legends.forEach(function (item) { item.classList.remove("is-active"); });
    }

    function themeFromEvent(event) {
      var node = event.target.closest ? event.target.closest(".eco-node") : null;
      return node ? node.getAttribute("data-theme") : null;
    }

    /* Delegated so a pointer, a keyboard focus or a tap all resolve identically. */
    stage.addEventListener("mouseover", function (event) {
      var theme = themeFromEvent(event);
      if (theme) activate(theme);
    });
    stage.addEventListener("focusin", function (event) {
      var theme = themeFromEvent(event);
      if (theme) activate(theme);
    });
    stage.addEventListener("mouseleave", clear);

    stage.addEventListener("click", function (event) {
      var theme = themeFromEvent(event);
      if (!theme) return;
      activate(theme);
      if (window.innerWidth <= 1024) {
        var legend = legends.filter(function (l) { return l.getAttribute("data-legend") === theme; })[0];
        if (legend) {
          legend.scrollIntoView({ block: "center", behavior: reduceMotion.matches ? "auto" : "smooth" });
        }
      }
    });
  }

  /* ------------------------------------------------------------- Video modal */
  function initModal() {
    var modal = $("[data-video-modal]");
    var opener = $("[data-video-open]");
    if (!modal || !opener) return;

    var panel = $(".video-modal-panel", modal);
    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      modal.hidden = false;
      document.body.style.overflow = "hidden";
      var close = $(".video-modal-close", modal);
      if (close) close.focus();
    }

    function close() {
      modal.hidden = true;
      document.body.style.overflow = "";
      (lastFocus || opener).focus();
    }

    opener.addEventListener("click", open);
    $$("[data-video-close]", modal).forEach(function (el) {
      el.addEventListener("click", close);
    });

    modal.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { close(); return; }
      if (event.key !== "Tab") return;
      var items = $$("a[href], button:not([disabled])", panel);
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }

  /* -------------------------------------------------------------- Enquiries */
  function initForm() {
    var form = $("[data-inquiry]");
    if (!form) return;
    var status = $("[data-form-status]", form);

    var rules = [
      { id: "inq-name", message: "Please tell us your name." },
      { id: "inq-email", message: "Please enter a work email address.", validate: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
      } },
      { id: "inq-company", message: "Please add your company or organisation." },
      { id: "inq-detail", message: "A sentence or two about the outcome you need is enough." },
      { id: "inq-consent", message: "Please confirm we may contact you about this enquiry.", checkbox: true }
    ];

    function errorFor(rule) {
      return form.querySelector('[data-error-for="' + rule.id + '"]');
    }

    function setError(rule, message) {
      var field = document.getElementById(rule.id);
      var box = errorFor(rule);
      if (field) field.setAttribute("aria-invalid", "true");
      if (box) {
        box.textContent = message;
        box.hidden = false;
      }
    }

    function clearError(rule) {
      var field = document.getElementById(rule.id);
      var box = errorFor(rule);
      if (field) field.removeAttribute("aria-invalid");
      if (box) {
        box.textContent = "";
        box.hidden = true;
      }
    }

    rules.forEach(function (rule) {
      var field = document.getElementById(rule.id);
      if (!field) return;
      var event = rule.checkbox || field.tagName === "SELECT" ? "change" : "input";
      field.addEventListener(event, function () {
        if (field.getAttribute("aria-invalid") === "true") {
          if (passes(rule)) clearError(rule);
        }
      });
    });

    function passes(rule) {
      var field = document.getElementById(rule.id);
      if (!field) return true;
      if (rule.checkbox) return field.checked;
      var value = field.value || "";
      if (!value.trim()) return false;
      return rule.validate ? rule.validate(value) : true;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var firstInvalid = null;

      rules.forEach(function (rule) {
        if (passes(rule)) {
          clearError(rule);
        } else {
          setError(rule, rule.message);
          if (!firstInvalid) firstInvalid = rule;
        }
      });

      if (firstInvalid) {
        var field = document.getElementById(firstInvalid.id);
        if (field) field.focus();
        if (status) {
          status.textContent = "Please review the highlighted fields.";
          status.style.color = "#FF9C8F";
        }
        return;
      }

      if (status) {
        status.style.color = "";
        status.textContent = "Thank you — your enquiry has been logged. A Geeks Technologies engineer will respond within one business day.";
      }
      form.reset();
    });
  }

  /* ------------------------------------------------------------------ Misc */
  function initYear() {
    $$("[data-year]").forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  function boot() {
    initHeader();
    initDrawer();
    initMarquee();
    initRails();
    initWorkRail();
    initReveals();
    initCounters();
    initTilt();
    initEcosystem();
    initModal();
    initForm();
    initYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
