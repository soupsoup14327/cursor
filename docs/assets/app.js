(() => {
  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const formatInt = (n) => {
    const num = typeof n === "number" ? n : Number(n);
    return num.toLocaleString("en-US");
  };

  function setupReveal() {
    const els = Array.from(document.querySelectorAll("[data-reveal]"));
    if (els.length === 0) return;

    if (prefersReducedMotion) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 }
    );

    els.forEach((el) => io.observe(el));
  }

  function setupAnnouncement() {
    const bar = document.getElementById("announcement");
    const btn = document.getElementById("announcementClose");
    if (!bar || !btn) return;
    btn.addEventListener("click", () => bar.classList.add("is-hidden"));
  }

  function setupFab() {
    const fab = document.getElementById("fabTop");
    if (!fab) return;

    const toggle = () => {
      if (window.scrollY > 400) fab.classList.add("is-visible");
      else fab.classList.remove("is-visible");
    };

    window.addEventListener("scroll", toggle, { passive: true });
    toggle();

    fab.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  }

  function setupCounters() {
    const stats = Array.from(document.querySelectorAll("[data-counter]:not([data-counter-scroll])"));
    if (stats.length === 0) return;

    const findValueEl = (el) => el.querySelector(".stat-line__val") || el.querySelector(".stat__value");

    const runFor = (el) => {
      const target = Number(el.dataset.counter || 0);
      const valueEl = findValueEl(el);
      if (!valueEl) return;

      if (prefersReducedMotion) {
        valueEl.textContent = formatInt(target);
        return;
      }

      const start = performance.now();
      const duration = 1000;

      const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const current = Math.round(target * eased);
        valueEl.textContent = formatInt(current);
        if (t < 1) requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    };

    if (prefersReducedMotion) {
      stats.forEach(runFor);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            runFor(e.target);
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.25 }
    );

    stats.forEach((s) => io.observe(s));
  }

  function setupStatsScroll() {
    const root = document.getElementById("stats");
    if (!root) return;

    const lines = Array.from(root.querySelectorAll("[data-stat-line]"));

    const runCounterOnce = (line) => {
      if (line.dataset.counted === "1") return;
      line.dataset.counted = "1";
      const target = Number(line.dataset.counter || 0);
      const valueEl = line.querySelector(".stat-line__val");
      if (!valueEl) return;

      if (prefersReducedMotion) {
        valueEl.textContent = formatInt(target);
        return;
      }

      const start = performance.now();
      const duration = 1100;

      const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        valueEl.textContent = formatInt(Math.round(target * eased));
        if (t < 1) requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    };

    if (prefersReducedMotion) {
      root.classList.add("stats-orbit--kicker-in", "stats-orbit--complete");
      lines.forEach((line) => {
        line.classList.add("is-visible");
        runCounterOnce(line);
      });
      return;
    }

    const onScroll = () => {
      const vh = window.innerHeight;
      const h = root.offsetHeight;
      const start = root.offsetTop - vh * 0.88;
      const end = root.offsetTop + h - vh * 0.32;
      const y = window.scrollY;
      let p = (y - start) / (end - start);
      p = Math.max(0, Math.min(1, p));
      root.style.setProperty("--stats-progress", p.toFixed(4));

      if (p > 0.04) root.classList.add("stats-orbit--kicker-in");
      else root.classList.remove("stats-orbit--kicker-in");

      const thresholds = [0.1, 0.38, 0.64];
      lines.forEach((line, i) => {
        const threshold = thresholds[i] ?? 0.9;
        if (p >= threshold) {
          line.classList.add("is-visible");
          runCounterOnce(line);
        }
      });

      if (p >= 0.94) root.classList.add("stats-orbit--complete");
      else root.classList.remove("stats-orbit--complete");
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
  }

  function setupSmoothScroll() {
    const buttons = Array.from(document.querySelectorAll("[data-scroll]"));
    if (buttons.length === 0) return;

    buttons.forEach((b) => {
      b.addEventListener("click", () => {
        const sel = b.getAttribute("data-scroll");
        if (!sel) return;
        const target = document.querySelector(sel);
        if (!target) return;
        target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
      });
    });
  }

  function setupPrototypeModal() {
    const modal = document.getElementById("prototypeModal");
    if (!modal) return;

    const flowMock = document.querySelector("[data-flow-hotspots]");
    const pageStepBtns = Array.from(document.querySelectorAll("[data-step]"));

    const stepNodes = Array.from(modal.querySelectorAll("[data-modal-step]"));
    const titleEl = modal.querySelector(".modal__title");
    const bodyEl = modal.querySelector(".modal__body");
    const prevBtn = modal.querySelector("[data-modal-prev]");
    const nextBtn = modal.querySelector("[data-modal-next]");
    const closeEls = Array.from(modal.querySelectorAll("[data-modal-close]"));

    const steps = [
      { title: "Welcome", body: "Landing step: first impression, hierarchy, and spacing." },
      { title: "Account Setup", body: "Structured questions and clear grouping." },
      { title: "Subscription", body: "Paywall patterns and plan comparison." },
      { title: "Checkout", body: "Confirmation, summary, and next actions." },
    ];

    let index = 0;
    const clampIndex = (v) => Math.max(0, Math.min(steps.length - 1, v));

    const setActive = (nextIndex, { openModalNow = false } = {}) => {
      index = clampIndex(nextIndex);
      const s = steps[index];
      if (titleEl) titleEl.textContent = s.title;
      if (bodyEl) bodyEl.textContent = s.body;

      stepNodes.forEach((n) => {
        const nodeIdx = Number(n.getAttribute("data-modal-step") || 0);
        n.classList.toggle("modalStep--active", nodeIdx === index);
      });

      if (flowMock) flowMock.setAttribute("data-step", String(index));
      pageStepBtns.forEach((b) => {
        const btnIdx = Number(b.getAttribute("data-step") || 0);
        b.classList.toggle("is-active", btnIdx === index);
      });

      if (openModalNow) {
        modal.hidden = false;
        document.body.style.overflow = "hidden";
      }
    };

    const open = (nextIndex = 0) => setActive(nextIndex, { openModalNow: true });

    const close = () => {
      modal.hidden = true;
      document.body.style.overflow = "";
    };

    document.getElementById("openPrototype")?.addEventListener("click", () => open(0));

    Array.from(document.querySelectorAll("[data-hotspot]")).forEach((h) => {
      h.addEventListener("click", () => {
        const idx = Number(h.getAttribute("data-hotspot") || 0);
        open(idx);
      });
    });

    pageStepBtns.forEach((b) => {
      b.addEventListener("click", () => {
        const idx = Number(b.getAttribute("data-step") || 0);
        open(idx);
      });
    });

    prevBtn?.addEventListener("click", () => setActive(index - 1));
    nextBtn?.addEventListener("click", () => setActive(index + 1));

    closeEls.forEach((el) => el.addEventListener("click", close));
    modal.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.getAttribute && t.getAttribute("data-modal-close") !== null) close();
    });

    document.addEventListener("keydown", (e) => {
      if (modal.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") setActive(index - 1);
      if (e.key === "ArrowRight") setActive(index + 1);
    });

    setActive(0);
  }

  function setupSlider() {
    const slider = document.querySelector("[data-slider]");
    if (!slider) return;

    const track = slider.querySelector("[data-slider-track]");
    const dotsWrap = slider.querySelector("[data-slider-dots]");
    const slides = Array.from(slider.querySelectorAll("[data-quote]"));
    const prevBtn = slider.querySelector("[data-slider-prev]");
    const nextBtn = slider.querySelector("[data-slider-next]");

    if (!track || slides.length === 0 || !dotsWrap) return;

    let index = 0;
    const slideCount = slides.length;

    slides.forEach((s) => {
      s.style.flex = "0 0 100%";
    });

    const dots = [];
    dotsWrap.innerHTML = "";
    for (let i = 0; i < slideCount; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "dot";
      btn.setAttribute("aria-label", `Slide ${i + 1}`);
      btn.addEventListener("click", () => go(i));
      dotsWrap.appendChild(btn);
      dots.push(btn);
    }

    const go = (next) => {
      index = (next + slideCount) % slideCount;
      track.style.transform = `translateX(${-index * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle("is-active", i === index));
    };

    prevBtn?.addEventListener("click", () => go(index - 1));
    nextBtn?.addEventListener("click", () => go(index + 1));

    let autoTimer = null;
    const setupAuto = () => {
      if (prefersReducedMotion) return;
      if (autoTimer) clearInterval(autoTimer);
      autoTimer = window.setInterval(() => go(index + 1), 6500);
    };

    slider.addEventListener("mouseenter", () => {
      if (autoTimer) clearInterval(autoTimer);
    });
    slider.addEventListener("mouseleave", () => setupAuto());

    go(0);
    setupAuto();
  }

  function setupPatternTabs() {
    const wrap = document.querySelector(".pattern-tabs");
    if (!wrap) return;
    const btns = Array.from(wrap.querySelectorAll(".pattern-tabs__btn"));
    btns.forEach((b) => {
      b.addEventListener("click", () => {
        btns.forEach((x) => {
          x.classList.toggle("is-active", x === b);
          x.setAttribute("aria-selected", x === b ? "true" : "false");
        });
      });
    });
  }

  setupReveal();
  setupAnnouncement();
  setupFab();
  setupCounters();
  setupStatsScroll();
  setupSmoothScroll();
  setupPrototypeModal();
  setupSlider();
  setupPatternTabs();
})();
