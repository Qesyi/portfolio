// Terminal boot intro. Click/keypress skips it; respects prefers-reduced-motion.
(() => {
  const bootLoader = document.getElementById('bootLoader');
  const bootLines = document.getElementById('bootLines');
  if (!bootLoader || !bootLines) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const revealSite = () => {
    document.documentElement.classList.remove('boot-lock');
    bootLoader.remove();
  };

  // Hard safety net: whatever happens, never let the loader outlive this.
  const safetyTimer = setTimeout(revealSite, 9000);

  if (prefersReducedMotion) {
    clearTimeout(safetyTimer);
    revealSite();
    return;
  }

  try {
    document.documentElement.classList.add('boot-lock');

    const lines = [
      '$ initializing portfolio...',
      '$ loading skills... done',
      '$ compiling experience... done',
      '$ ameer@portfolio ready',
    ];

    let skipRequested = false;
    const requestSkip = () => { skipRequested = true; };
    bootLoader.addEventListener('click', requestSkip);
    window.addEventListener('keydown', requestSkip, { once: true });

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const typeLine = async (text) => {
      const lineEl = document.createElement('div');
      lineEl.className = 'boot-line';
      bootLines.appendChild(lineEl);

      if (skipRequested) {
        lineEl.textContent = text;
        return lineEl;
      }

      for (let i = 0; i < text.length; i++) {
        lineEl.textContent += text[i];
        if (!skipRequested) {
          await delay(22 + Math.random() * 26);
        } else {
          lineEl.textContent = text;
          break;
        }
      }
      return lineEl;
    };

    const finishBoot = () => {
      clearTimeout(safetyTimer);
      // Force reflow so the transition reliably plays.
      void bootLoader.offsetHeight;
      bootLoader.classList.add('is-hidden');
      document.documentElement.classList.remove('boot-lock');
      setTimeout(() => bootLoader.remove(), 800);
    };

    const runBoot = async () => {
      for (const line of lines) {
        await typeLine(line);
        await delay(skipRequested ? 60 : 420);
      }

      const lastLine = bootLines.lastElementChild;
      if (lastLine) {
        const cursorSpan = document.createElement('span');
        cursorSpan.className = 'cursor';
        cursorSpan.textContent = '_';
        lastLine.appendChild(cursorSpan);
      }

      await delay(skipRequested ? 200 : 950);
      finishBoot();
    };

    runBoot();
  } catch (err) {
    clearTimeout(safetyTimer);
    revealSite();
  }
})();

// Pause the skills marquee on hover so tags can be read.
const marquee = document.querySelector('.hero-marquee');
const track = document.querySelector('.marquee-track');

if (marquee && track) {
  marquee.addEventListener('mouseenter', () => {
    track.style.animationPlayState = 'paused';
  });

  marquee.addEventListener('mouseleave', () => {
    track.style.animationPlayState = 'running';
  });

  marquee.addEventListener('touchstart', () => {
    track.style.animationPlayState = 'paused';
  }, { passive: true });

  marquee.addEventListener('touchend', () => {
    track.style.animationPlayState = 'running';
  });
}

// Projects scroll-pin reveal (desktop only). Sticky section + scroll
// progress reveals cards left/bottom/right in sequence; reverses on scroll up.
(() => {
  const desktopQuery = window.matchMedia('(min-width: 921px)');
  const section = document.querySelector('.projects-scroll');
  const cards = section ? Array.from(section.querySelectorAll('.project-card[data-dir]')) : [];

  if (!section || cards.length === 0) return;

  // Each card animates over its own [start, end] slice of scroll progress.
  const REVEAL_WINDOWS = {
    left:   { start: 0.05, end: 0.32 },
    bottom: { start: 0.38, end: 0.65 },
    right:  { start: 0.71, end: 0.98 },
  };

  const OFFSET_PX = 80;

  let ticking = false;
  let active = false;

  const clamp01 = (n) => Math.min(1, Math.max(0, n));

  const applyCardStyle = (card, progress) => {
    const dir = card.dataset.dir;
    const win = REVEAL_WINDOWS[dir];
    if (!win) return;

    const span = win.end - win.start;
    const t = clamp01((progress - win.start) / span);

    const eased = t * t * (3 - 2 * t); // smoothstep, gentle ease in/out

    let transform = '';
    if (dir === 'left') {
      transform = `translateX(${(1 - eased) * -OFFSET_PX}px)`;
    } else if (dir === 'right') {
      transform = `translateX(${(1 - eased) * OFFSET_PX}px)`;
    } else {
      transform = `translateY(${(1 - eased) * OFFSET_PX}px)`;
    }

    card.style.opacity = String(eased);
    card.style.transform = transform;
  };

  const updateProgress = () => {
    ticking = false;

    const rect = section.getBoundingClientRect();
    const scrollableDistance = section.offsetHeight - window.innerHeight;

    if (scrollableDistance <= 0) {
      cards.forEach((card) => applyCardStyle(card, 1));
      return;
    }

    const progress = clamp01(-rect.top / scrollableDistance);
    cards.forEach((card) => applyCardStyle(card, progress));
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateProgress);
    }
  };

  const resetCards = () => {
    cards.forEach((card) => {
      card.style.opacity = '';
      card.style.transform = '';
    });
  };

  const enable = () => {
    if (active) return;
    active = true;
    window.addEventListener('scroll', onScroll, { passive: true });
    updateProgress();
  };

  const disable = () => {
    if (!active) return;
    active = false;
    window.removeEventListener('scroll', onScroll);
    resetCards();
  };

  const syncToViewport = () => {
    if (desktopQuery.matches) {
      enable();
    } else {
      disable();
    }
  };

  syncToViewport();

  if (desktopQuery.addEventListener) {
    desktopQuery.addEventListener('change', syncToViewport);
  } else {
    // Safari < 14 fallback
    desktopQuery.addListener(syncToViewport);
  }

  window.addEventListener('resize', () => {
    if (active) updateProgress();
  });
})();
