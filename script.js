/* ==========================================================================
   SISTEMA NIKI — interacciones
   ========================================================================== */

(() => {
  'use strict';

  /* -------------------- NAV -------------------- */
  const nav = document.querySelector('.nav');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  const onScroll = () => {
    if (window.scrollY > 30) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => navLinks.classList.remove('open'));
  });

  /* -------------------- YEAR -------------------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* -------------------- REVEAL ON SCROLL -------------------- */
  const revealTargets = document.querySelectorAll(
    '.section-title, .section-lead, .glass-card, .seminar-photo, .hero-meta, .chip-list'
  );
  revealTargets.forEach(el => el.classList.add('reveal'));

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  revealTargets.forEach(el => io.observe(el));

  /* -------------------- SEMINAR CAROUSEL (auto-scroll infinite) -------------------- */
  document.querySelectorAll('.carousel-track').forEach(track => {
    Array.from(track.children).forEach(slide => {
      const clone = slide.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
  });

  /* -------------------- LOOM PLACEHOLDER BUTTONS -------------------- */
  document.querySelectorAll('[data-loom]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-loom');
      // PLACEHOLDER: cuando tengas el ID real, este botón debería abrir el video.
      // Reemplazar por: window.open(`https://www.loom.com/share/${id}`, '_blank');
      alert(
        `Video demo pendiente de subir.\n\n` +
        `ID placeholder: ${id}\n` +
        `Cuando lo subas a Loom, reemplazá el placeholder en index.html por el iframe real.`
      );
    });
  });

  /* -------------------- CONTACT FORM -------------------- */
  const form = document.getElementById('contactForm');
  const note = document.getElementById('formNote');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const nombre  = encodeURIComponent(data.get('nombre')  || '');
      const email   = encodeURIComponent(data.get('email')   || '');
      const tipo    = encodeURIComponent(data.get('tipo')    || '');
      const mensaje = encodeURIComponent(data.get('mensaje') || '');

      const wa = `https://wa.me/5493875551234?text=` +
        `Hola%20Axel%2C%20soy%20${nombre}%20(${email}).%20` +
        `Tipo%3A%20${tipo}.%20Mensaje%3A%20${mensaje}`;

      note.textContent = 'Abriendo WhatsApp para enviar tu mensaje...';
      window.open(wa, '_blank');
      form.reset();
      setTimeout(() => { note.textContent = ''; }, 5000);
    });
  }

  /* -------------------- PARTICLES (canvas) -------------------- */
  const canvas = document.getElementById('particles-canvas');
  if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  let W, H, particles;

  const resize = () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    const count = Math.min(70, Math.floor((W * H) / 22000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.6 + 0.4,
      a: Math.random() * 0.6 + 0.2
    }));
  };
  resize();
  window.addEventListener('resize', resize);

  const tick = () => {
    ctx.clearRect(0, 0, W, H);

    // particles
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 60, 60, ${p.a})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(255, 30, 30, 0.8)';
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // connecting lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 130) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(255, 40, 40, ${0.18 * (1 - dist / 130)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(tick);
  };
  tick();
})();
