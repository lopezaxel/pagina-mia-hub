/* ==========================================================================
   NIKI SOFTWARE — interacciones
   ========================================================================== */

(() => {
  'use strict';

  // Le avisa al CSS que este script corrió: sin esto, la red de seguridad de [data-reveal] muestra todo a los 3 s.
  document.documentElement.classList.add('js-ready');

  // Cada función corre aislada: si una falla, el resto de la página sigue funcionando.
  const safe = (name, fn) => {
    try { fn(); } catch (err) { console.error(`[niki] ${name}:`, err); }
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* -------------------- REVEAL AL SCROLLEAR -------------------- */
  // Va primero: es lo que vuelve visible el contenido.
  safe('reveal', () => {
    const revealEls = $$('[data-reveal]');
    // Escalonado: los hermanos dentro de una misma grilla entran de a uno.
    $$('.projects, .pay, .contact-cards, .stats').forEach(group => {
      $$('[data-reveal], li', group).forEach((el, i) => el.style.setProperty('--d', `${i * 0.09}s`));
    });
    // Terminada la entrada se quita el retardo escalonado, para que hover, imán y tilt respondan al instante.
    const settle = el => setTimeout(() => el.classList.add('revealed'), 1700);
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealEls.forEach(el => el.classList.add('in', 'revealed'));
    } else {
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          e.target.classList.add('in');
          settle(e.target);
          io.unobserve(e.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      revealEls.forEach(el => io.observe(el));
    }

    /* Escenas con secuencia propia (sin data-reveal: un transform en el contenedor rompe el mix-blend). */
    const playEls = $$('[data-play]');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      playEls.forEach(el => el.classList.add('in'));
    } else {
      const po = new IntersectionObserver(entries => {
        entries.forEach(e => {
          // Entra (>= 25 % visible): arranca la secuencia. Sale por completo: se rearma para la próxima vez.
          if (e.intersectionRatio >= 0.25) e.target.classList.add('in');
          else if (!e.isIntersecting) e.target.classList.remove('in');
        });
      }, { threshold: [0, 0.25] });
      playEls.forEach(el => po.observe(el));
    }
  });

  /* -------------------- NAV + PROGRESO -------------------- */
  safe('nav', () => {
    const nav = $('#nav');
    const navToggle = $('#navToggle');
    const navLinks = $('#navLinks');
    const progress = $('.progress');

    const setMenu = open => {
      navLinks.classList.toggle('open', open);
      nav.classList.toggle('menu-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    };
    navToggle.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
    $$('a', navLinks).forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        nav.classList.toggle('scrolled', y > 30);
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();

    /* Link activo */
    const sections = $$('main section[id]').filter(s => $(`a[href="#${s.id}"]`, navLinks));
    if (sections.length && 'IntersectionObserver' in window) {
      const spy = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          $$('a', navLinks).forEach(a => a.removeAttribute('aria-current'));
          const link = $(`a[href="#${e.target.id}"]`, navLinks);
          if (link) link.setAttribute('aria-current', 'true');
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach(s => spy.observe(s));
    }
  });

  /* -------------------- AÑO -------------------- */
  safe('año', () => {
    const yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  });

  /* -------------------- CONTADORES -------------------- */
  safe('contadores', () => {
    const counters = $$('[data-count]');
    const runCounter = el => {
      const end = Number(el.dataset.count);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      if (reduceMotion) { el.textContent = `${prefix}${end}${suffix}`; return; }
      const t0 = performance.now();
      const dur = 1400;
      const step = now => {
        const k = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - k, 4);
        el.textContent = `${prefix}${Math.round(end * eased)}${suffix}`;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window) {
      const co = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          runCounter(e.target);
          co.unobserve(e.target);
        });
      }, { threshold: 0.6 });
      counters.forEach(el => co.observe(el));
    }
  });

  /* -------------------- CARRUSELES INFINITOS -------------------- */
  // La animación corre de 0 a -50 %, así que la pista es: [juegos] + [los mismos juegos clonados].
  // Se repite el juego tantas veces como haga falta para que cada mitad cubra la pantalla; si no, en monitores
  // anchos (2560 px o más) queda un hueco vacío a la derecha. La duración se escala para mantener la velocidad.
  safe('carruseles', () => {
    const tracks = $$('.reel-track, .band-track');
    const base = new Map(tracks.map(t => [t, {
      nodes: Array.from(t.children),
      dur: parseFloat(getComputedStyle(t).animationDuration) || 60
    }]));
    const asClone = node => {
      const clone = node.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      $$('img', clone).forEach(img => { img.alt = ''; });
      return clone;
    };
    let builtFor = 0;
    const build = () => {
      builtFor = window.innerWidth;
      tracks.forEach(track => {
        const { nodes, dur } = base.get(track);
        track.replaceChildren(...nodes);
        const pitch = track.scrollWidth; // un juego, con el hueco final incluido (ver padding-right en el CSS)
        const copies = reduceMotion || !pitch ? 1 : Math.max(1, Math.ceil(window.innerWidth / pitch));
        const half = [...nodes];
        for (let c = 1; c < copies; c++) nodes.forEach(n => half.push(asClone(n)));
        track.replaceChildren(...half, ...half.map(asClone));
        track.style.animationDuration = `${(dur * copies).toFixed(1)}s`;
      });
    };
    build();
    // Las medidas de la banda dependen de la tipografía: se recalcula cuando termina de cargar.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
    let timer;
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { if (window.innerWidth > builtFor) build(); }, 200);
    });
  });

  /* -------------------- TILT + LUZ QUE SIGUE AL PUNTERO -------------------- */
  safe('tilt', () => {
    if (!finePointer || reduceMotion) return;
    $$('.tilt').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.classList.add('is-tilting');
        card.style.setProperty('--ry', `${((px - 0.5) * 6).toFixed(2)}deg`);
        card.style.setProperty('--rx', `${((0.5 - py) * 6).toFixed(2)}deg`);
        card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });

    /* Botones magnéticos */
    $$('.magnet').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.transform = `translate(${(dx * 10).toFixed(1)}px, ${(dy * 8).toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  });

  /* -------------------- MODAL DE VIDEO (Loom) -------------------- */
  safe('modal', () => {
    const modal = $('#videoModal');
    const frame = $('#vmFrame');
    const title = $('#vmTitle');
    const LOOM_ID = /^[a-f0-9]{32}$/;
    let lastTrigger = null;

    const closeModal = () => { if (modal.open) modal.close(); };
    $$('[data-loom]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.loom;
        if (!LOOM_ID.test(id)) return;
        lastTrigger = btn;
        title.textContent = btn.dataset.title || 'Demo';
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.loom.com/embed/${id}?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true&autoplay=1`;
        iframe.title = `Demo: ${btn.dataset.title || 'proyecto'}`;
        iframe.allow = 'autoplay; fullscreen; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        frame.replaceChildren(iframe);
        modal.showModal();
      });
    });
    $('#vmClose').addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    modal.addEventListener('close', () => {
      frame.replaceChildren(); // corta el video al cerrar
      if (lastTrigger) lastTrigger.focus();
    });
  });

  /* -------------------- RETRATO DEL HERO: profundidad con el mouse + chispas -------------------- */
  safe('hero', () => {
    const art = $('#heroArt');
    const sparks = $('#artSparks');
    if (!art || reduceMotion) {
      if (sparks) sparks.remove(); // movimiento reducido: solo la imagen quieta
      return;
    }
    const hero = $('#hero');
    const state = { x: 0, y: 0, tx: 0, ty: 0, visible: true };

    // El puntero mueve las capas (--px / --py las leen en CSS, cada una con su amplitud).
    if (finePointer) {
      window.addEventListener('pointermove', e => {
        state.tx = (e.clientX / window.innerWidth - 0.5) * 2;
        state.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
    }

    // Chispas que salen del anillo central (coordenadas relativas al retrato).
    const ctx = sparks ? sparks.getContext('2d') : null;
    const CORE = { x: 0.492, y: 0.52 };
    const MAX = window.innerWidth < 860 ? 34 : 70;
    let size = 0;
    let dots = [];
    const resize = () => {
      if (!sparks) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = art.clientWidth;
      sparks.width = sparks.height = Math.round(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const spawn = () => {
      const a = Math.random() * Math.PI * 2;
      const r = size * (0.05 + Math.random() * 0.05);
      return {
        x: size * CORE.x + Math.cos(a) * r, y: size * CORE.y + Math.sin(a) * r,
        vx: Math.cos(a) * (0.25 + Math.random() * 0.7), vy: Math.sin(a) * (0.25 + Math.random() * 0.7) - 0.12,
        life: 0, ttl: 90 + Math.random() * 120, r: 0.6 + Math.random() * 1.8
      };
    };

    // "running" evita que se acumulen loops: con la pestaña oculta el rAF pendiente sigue vivo,
    // y arrancar otro al volver duplicaba el ciclo.
    let running = false;
    let last = 0;
    const tick = now => {
      if (!state.visible) { running = false; return; }
      requestAnimationFrame(tick);
      if (now - last < 16) return; // tope ~60 fps en pantallas de alta frecuencia
      last = now;

      state.x += (state.tx - state.x) * 0.06;
      state.y += (state.ty - state.y) * 0.06;
      art.style.setProperty('--px', state.x.toFixed(4));
      art.style.setProperty('--py', state.y.toFixed(4));

      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);
      ctx.globalCompositeOperation = 'lighter';
      while (dots.length < MAX) dots.push(Object.assign(spawn(), { life: Math.random() * 60 }));
      dots = dots.filter(d => d.life < d.ttl);
      for (const d of dots) {
        d.life++; d.x += d.vx; d.y += d.vy;
        const k = 1 - d.life / d.ttl;
        ctx.fillStyle = `rgba(255, ${Math.round(70 + 90 * k)}, ${Math.round(40 + 40 * k)}, ${(k * 0.9).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * (0.5 + k), 0, Math.PI * 2);
        ctx.fill();
      }
    };
    const start = () => {
      if (running || !state.visible) return;
      running = true;
      requestAnimationFrame(tick);
    };

    resize();
    new ResizeObserver(resize).observe(art);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        state.visible = e.isIntersecting && !document.hidden;
        start();
      }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener('visibilitychange', () => {
      state.visible = !document.hidden;
      start();
    });
    start();
  });
})();
