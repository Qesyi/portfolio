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

// Tilt the project, timeline and contact cards toward the cursor on hover,
// and (regardless of tilt/hover support) drive the --mx/--my custom
// properties their ::before specular-highlight gradient reads in style.css
// — this is the "glass catching light" effect from the reference liquid-
// glass design. The highlight follows the pointer even where tilt itself
// is skipped (coarse pointers, reduced motion), since it's a much subtler
// effect that doesn't have the same motion-sickness/precision concerns.
(() => {
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Cards that physically tilt toward the cursor.
  const cards = document.querySelectorAll('.project-card, .timeline-card');
  // The contact panel gets the same specular highlight but no tilt — it's
  // a glass panel full of text and buttons, not a card. (The bizcard has
  // its own bespoke tilt+flip logic further down, independent of this.)
  const specularOnly = document.querySelectorAll('.contact-panel');

  const trackSpecular = (el) => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 100;
      const my = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty('--mx', `${mx.toFixed(1)}%`);
      el.style.setProperty('--my', `${my.toFixed(1)}%`);
    });
  };

  cards.forEach(trackSpecular);
  specularOnly.forEach(trackSpecular);

  if (!canHover || reduceMotion) return;

  const MAX_TILT = 7; // degrees, kept subtle on purpose

  cards.forEach((card) => {
    let tilting = false;

    card.addEventListener('mouseenter', () => {
      if (card.classList.contains('project-card')) {
        const opacity = card.style.opacity;
        if (opacity !== '' && Number(opacity) < 0.98) return;
      }
      tilting = true;
      card.style.transition = 'none';
    });

    card.addEventListener('mousemove', (e) => {
      if (!tilting) return;
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      const rotateY = px * MAX_TILT * 2;
      const rotateX = -py * MAX_TILT * 2;
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
      if (!tilting) return;
      tilting = false;
      card.style.transition = 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)';
      card.style.transform = '';
    });
  });
})();

// Theme toggle: manual light/dark override via data-theme on <html>,
// persisted in localStorage so it survives a reload. Falls back to the
// OS preference (style.css's prefers-color-scheme block) whenever no
// override has been chosen yet.
(() => {
  const root = document.documentElement;
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  let stored = null;
  try { stored = localStorage.getItem('theme'); } catch (e) { /* storage blocked */ }
  if (stored === 'dark' || stored === 'light') {
    root.setAttribute('data-theme', stored);
  }

  const isDark = () => {
    const t = root.getAttribute('data-theme');
    return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const sync = () => {
    const dark = isDark();
    btn.textContent = dark ? 'Light' : 'Dark';
    btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  };

  btn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) { /* storage blocked */ }
    sync();
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!root.getAttribute('data-theme')) sync();
  });

  sync();
})();

// Hide the floating nav for the Projects section only — visible for Hero
// and Journey, hidden once Projects starts, back again at Contact.
(() => {
  const header = document.querySelector('.site-header');
  const projects = document.querySelector('#projects');
  const contact = document.querySelector('#contact');
  if (!header || !projects || !contact) return;

  let ticking = false;

  const update = () => {
    ticking = false;
    const hideFrom = projects.getBoundingClientRect().top + window.scrollY - 1;
    // Contact's natural offset can sit past the page's actual max scroll
    // position when it's the last section and shorter than one viewport
    // (true on mobile, where Projects isn't scroll-jacked and the whole
    // page is much shorter) — scrollY could then never reach it, leaving
    // the nav hidden forever. Clamp to the real max scroll so "show again
    // at Contact" always has a reachable threshold.
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const showFrom = Math.min(contact.getBoundingClientRect().top + window.scrollY - 1, maxScroll);
    const y = window.scrollY;
    header.classList.toggle('nav-hidden', y >= hideFrom && y < showFrom);
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });

  window.addEventListener('resize', update);
  update();
})();

// Flipping business card: click toggles a permanent flip, pointer movement
// layers a subtle tilt on top of whichever face is showing. Ported from
// the reference's liquid-glass bizcard, adapted to this site's element ids.
// The card is a div (role="button"), not a real <button>, because its back
// face holds real GitHub/LinkedIn/Instagram links now — a <button> can't
// contain interactive content. That means the flip's click/keyboard
// handling has to be done by hand here, and clicks on an actual link
// inside the card must open it instead of flipping the card.
(() => {
  const stage = document.getElementById('card-stage');
  const card = document.getElementById('bizcard');
  if (!stage || !card) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  let flipped = false;
  let rx = 0;
  let ry = 0;

  const paint = () => {
    card.style.transform = `rotateX(${rx.toFixed(1)}deg) rotateY(${(ry + (flipped ? 180 : 0)).toFixed(1)}deg)`;
  };

  const toggleFlip = () => {
    flipped = !flipped;
    paint();
  };

  card.addEventListener('click', (e) => {
    if (e.target.closest('a')) return; // let the link navigate, don't also flip
    toggleFlip();
  });

  card.addEventListener('keydown', (e) => {
    if (e.target !== card) return; // a focused link handles its own Enter
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      toggleFlip();
    }
  });

  if (!reduceMotion && canHover) {
    stage.addEventListener('mousemove', (e) => {
      const rect = stage.getBoundingClientRect();
      ry = ((e.clientX - rect.left) / rect.width - 0.5) * 18 * (flipped ? -1 : 1);
      rx = -((e.clientY - rect.top) / rect.height - 0.5) * 14;
      paint();
    });

    stage.addEventListener('mouseleave', () => {
      rx = 0;
      ry = 0;
      paint();
    });
  }
})();
