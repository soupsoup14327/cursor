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
      { threshold: 0.16 }
    );

    els.forEach((el) => io.observe(el));
  }

  function setupThemeToggle() {
    const btn = document.getElementById("themeToggle");
    if (!btn) return;

    const root = document.documentElement;
    const stored = localStorage.getItem("theme");
    const systemDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

    const theme = stored || (systemDark ? "dark" : "light");
    root.dataset.theme = theme;

    btn.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      localStorage.setItem("theme", next);
    });
  }

  function setupCounters() {
    const stats = Array.from(document.querySelectorAll("[data-counter]"));
    if (stats.length === 0) return;

    const runFor = (el) => {
      const target = Number(el.dataset.counter || 0);
      const valueEl = el.querySelector(".stat__value");
      if (!valueEl) return;

      if (prefersReducedMotion) {
        valueEl.textContent = formatInt(target);
        return;
      }

      const start = performance.now();
      const duration = 900;

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
      { threshold: 0.2 }
    );

    stats.forEach((s) => io.observe(s));
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
      { title: "Welcome", body: "Landing step showing the main entry point and the “first impression” rhythm." },
      { title: "Account Setup", body: "Step with a structured flow: short copy + clear grouping and spacing." },
      { title: "Subscription", body: "Paywall context and transitions represented as a reusable step model." },
      { title: "Checkout", body: "Final step: confirmation, ordering summary, and clear next actions." },
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

      // Sync the page flow panel selection (hotspot model + step buttons)
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

    const openPrototype = document.getElementById("openPrototype");
    if (openPrototype) openPrototype.addEventListener("click", () => open(0));

    const hotspots = Array.from(document.querySelectorAll("[data-hotspot]"));
    hotspots.forEach((h) => {
      h.addEventListener("click", () => {
        const idx = Number(h.getAttribute("data-hotspot") || 0);
        // Map main hotspots to modal steps (we keep a compact 0..2 set).
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
      if (e.target && e.target.getAttribute && e.target.getAttribute("data-modal-close") !== null) close();
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

    // Ensure slides are exactly one viewport wide.
    slides.forEach((s) => {
      s.style.flex = "0 0 100%";
    });

    const dots = [];
    dotsWrap.innerHTML = "";
    for (let i = 0; i < slideCount; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "dot";
      btn.setAttribute("aria-label", `Go to slide ${i + 1}`);
      btn.dataset.dot = String(i);
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

    slider.addEventListener("mouseenter", () => {
      if (autoTimer) clearInterval(autoTimer);
    });

    slider.addEventListener("mouseleave", () => {
      setupAuto();
    });

    let autoTimer = null;
    const setupAuto = () => {
      if (prefersReducedMotion) return;
      if (autoTimer) clearInterval(autoTimer);
      autoTimer = window.setInterval(() => go(index + 1), 6500);
    };

    document.addEventListener("keydown", (e) => {
      if (document.activeElement && slider.contains(document.activeElement)) {
        if (e.key === "ArrowLeft") go(index - 1);
        if (e.key === "ArrowRight") go(index + 1);
      }
    });

    go(0);
    setupAuto();
  }

  setupReveal();
  setupThemeToggle();
  setupCounters();
  setupSmoothScroll();
  setupPrototypeModal();
  setupSlider();
})();

