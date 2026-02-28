(() => {
  const STORAGE_KEY = "tg_theme";
  const root = document.documentElement;

  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    const btn = document.querySelector("[data-theme-toggle]");
    if (!btn) return;

    const iconSun = btn.querySelector('[data-icon="sun"]');
    const iconMoon = btn.querySelector('[data-icon="moon"]');
    const isDark = theme === "dark";

    if (iconSun && iconMoon) {
      iconSun.style.display = isDark ? "block" : "none";
      iconMoon.style.display = isDark ? "none" : "block";
    }

    btn.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    btn.setAttribute("title", isDark ? "Light mode" : "Dark mode");
  }

  function getInitialTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return systemPrefersDark() ? "dark" : "light";
  }

  // Apply on load (in case inline head script is removed)
  applyTheme(getInitialTheme());

  // Toggle
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-theme-toggle]");
    if (!btn) return;

    const current = root.getAttribute("data-theme") || getInitialTheme();
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  });

  // Keep in sync if user never chose a theme
  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener?.("change", () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark") return;
      applyTheme(getInitialTheme());
    });
  }

  
  // Mobile header social toggle (share icon -> social links)
  function initSocialToggle() {
    const actions = document.querySelector(".header__actions");
    const btn = document.querySelector("[data-social-toggle]");
    const iconbar = document.querySelector(".header__actions [data-social-links]");
    if (!actions || !btn || !iconbar) return;

    const mq = window.matchMedia ? window.matchMedia("(max-width: 860px)") : null;

    function isMobile() {
      return mq ? mq.matches : window.innerWidth <= 520;
    }

    function open() {
      if (!isMobile()) return;
      actions.setAttribute("data-social-open", "1");
      btn.setAttribute("aria-expanded", "true");
    }

    function close() {
      actions.removeAttribute("data-social-open");
      btn.setAttribute("aria-expanded", "false");
    }

    function toggle() {
      if (actions.getAttribute("data-social-open") === "1") close();
      else open();
    }

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      toggle();
    });

    // Close when clicking any social link
    iconbar.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (a) close();
    });

    // Close on outside click / tap
    document.addEventListener("pointerdown", (e) => {
      if (!isMobile()) { close(); return; }
      if (actions.getAttribute("data-social-open") !== "1") return;
      if (e.target.closest(".header__actions")) return;
      close();
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    // Close when leaving mobile breakpoint
    if (mq && mq.addEventListener) {
      mq.addEventListener("change", () => { if (!isMobile()) close(); });
    } else {
      window.addEventListener("resize", () => { if (!isMobile()) close(); });
    }
  }

  initSocialToggle();

const sections = document.querySelectorAll('.section');

sections.forEach((section, idx) => {
  section.classList.add(idx % 2 === 0 ? 'reveal-left' : 'reveal-right', 'reveal');
});

const observer = new IntersectionObserver(
  (entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        obs.unobserve(entry.target); // animate only once
      }
    });
  },
  { threshold: 0.15 } // trigger when ~15% of section is visible
);

sections.forEach(section => observer.observe(section));

// Testimonials carousel — one at a time (robust + works from local file://)
  function initTestimonialsCarousel() {
    const carousels = document.querySelectorAll("[data-carousel]");
    if (!carousels.length) return;

    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    carousels.forEach((rootEl) => {
      const viewport = rootEl.querySelector("[data-carousel-viewport]");
      const track = rootEl.querySelector("[data-carousel-track]");
      const btnPrev = rootEl.querySelector("[data-carousel-prev]");
      const btnNext = rootEl.querySelector("[data-carousel-next]");
      const dotsWrap = rootEl.querySelector("[data-carousel-dots]");
      const perViewLabel = rootEl.querySelector("[data-carousel-perview]");
      if (!viewport || !track) return;

      const slides = Array.from(track.children).filter((n) => n && n.nodeType === 1);
      const total = slides.length;
      if (!total) return;

      // Always 1 at a time
      rootEl.style.setProperty("--perView", "1");
      if (perViewLabel) perViewLabel.textContent = "1";

      let index = 0;
      let timer = null;
      let isPaused = false;

      function setDots() {
        if (!dotsWrap) return;
        dotsWrap.innerHTML = "";
        if (total <= 1) return;

        for (let i = 0; i < total; i++) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "tcarousel__dot";
          b.setAttribute("aria-label", `Go to testimonial ${i + 1} of ${total}`);
          b.dataset.index = String(i);
          b.addEventListener("click", () => goTo(i, true));
          dotsWrap.appendChild(b);
        }
      }

      function updateDots() {
        if (!dotsWrap) return;
        const dots = dotsWrap.querySelectorAll(".tcarousel__dot");
        dots.forEach((d, i) => {
          const active = i === index;
          d.toggleAttribute("data-active", active);
          if (active) d.setAttribute("aria-current", "true");
          else d.removeAttribute("aria-current");
        });
      }

      function updateButtons() {
        if (!btnPrev || !btnNext) return;
        const disabled = total <= 1;
        btnPrev.disabled = disabled;
        btnNext.disabled = disabled;
      }

      function translateToCurrent() {
        const slide = slides[index];
        if (!slide) return;

        // Use offsetLeft for robustness (gap/padding/responsive widths)
        const x = slide.offsetLeft;

        if (prefersReduced) {
          track.style.transitionDuration = "0ms";
        } else {
          track.style.transitionDuration = "";
        }
        track.style.transform = `translate3d(${-x}px, 0, 0)`;
      }

      function goTo(newIndex, userAction = false) {
        if (total <= 1) {
          track.style.transform = "translate3d(0,0,0)";
          updateDots();
          updateButtons();
          return;
        }
        if (newIndex < 0) newIndex = total - 1;
        if (newIndex >= total) newIndex = 0;
        index = newIndex;
        translateToCurrent();
        updateDots();
        updateButtons();
        if (userAction) restartAuto();
      }

      function next(userAction = false) { goTo(index + 1, userAction); }
      function prev(userAction = false) { goTo(index - 1, userAction); }

      function stopAuto() {
        if (timer) window.clearInterval(timer);
        timer = null;
      }

      function startAuto() {
        if (prefersReduced) return;
        stopAuto();
        if (total <= 1) return;
        timer = window.setInterval(() => {
          if (isPaused) return;
          next(false);
        }, 6500);
      }

      function restartAuto() {
        stopAuto();
        startAuto();
      }

      function onResize() {
        translateToCurrent();
      }

      // Controls / interactions
      btnPrev?.addEventListener("click", () => prev(true));
      btnNext?.addEventListener("click", () => next(true));

      // Pause on hover/focus
      rootEl.addEventListener("mouseenter", () => { isPaused = true; });
      rootEl.addEventListener("mouseleave", () => { isPaused = false; });
      rootEl.addEventListener("focusin", () => { isPaused = true; });
      rootEl.addEventListener("focusout", () => { isPaused = false; });

      // Keyboard support
      rootEl.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") prev(true);
        if (e.key === "ArrowRight") next(true);
      });

      // Init
      setDots();
      updateDots();
      updateButtons();

      // First paint after layout
      window.requestAnimationFrame(() => goTo(0, false));

      window.addEventListener("resize", () => {
        window.requestAnimationFrame(onResize);
      });

      startAuto();
    });
  }

  // Init UI components
  initTestimonialsCarousel();

  // Set year
  const y = document.querySelector("[data-year]");
  if (y) y.textContent = String(new Date().getFullYear());
})();
