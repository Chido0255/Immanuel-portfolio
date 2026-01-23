// script.js (updated with canvas particles)
(() => {
  const CONFIG = {
    heroSelector: '#hero-content',
    mobileNavId: 'primary-navigation',
    hamburgerSelector: '.hamburger',
    animationDelay: 80,
    particles: 40,            // number of particles
    maxSpeed: 0.25,           // drift speed
    colors: ['#39FF14','#FFFF33','#FFFFFF'], // neon palette
  };

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function doEntrance() {
    if (prefersReducedMotion) {
      document.querySelector(CONFIG.heroSelector)?.classList.add('is-visible');
      return;
    }
    window.requestAnimationFrame(() => {
      const el = document.querySelector(CONFIG.heroSelector);
      if (el) setTimeout(() => el.classList.add('is-visible'), CONFIG.animationDelay);
    });
  }

  function setupMobileMenu() {
    const btn = document.querySelector(CONFIG.hamburgerSelector);
    const nav = document.getElementById(CONFIG.mobileNavId);
    if (!btn || !nav) return;

    const setOpen = (open) => {
      btn.setAttribute('aria-expanded', String(open));
      nav.setAttribute('aria-hidden', String(!open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.style.overflow = open ? 'hidden' : '';
    };

    btn.addEventListener('click', () => setOpen(btn.getAttribute('aria-expanded') !== 'true'));
    btn.addEventListener('keydown', (e) => {
      if (['Enter',' '].includes(e.key)) { e.preventDefault(); setOpen(btn.getAttribute('aria-expanded') !== 'true'); }
      else if (e.key === 'Escape') setOpen(false);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    nav.addEventListener('click', (e) => { if (e.target.tagName.toLowerCase() === 'a') setOpen(false); });
  }

  // Canvas particle animation
  function setupParticles() {
    if (prefersReducedMotion) return;
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let w, h;
    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = document.querySelector('.site-header').offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // create particles
    const particles = Array.from({length: CONFIG.particles}, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 1 + Math.random() * 2,
      color: CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)],
      vx: (Math.random() - 0.5) * CONFIG.maxSpeed,
      vy: (Math.random() - 0.5) * CONFIG.maxSpeed
    }));

    function animate() {
      ctx.clearRect(0,0,w,h);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fill();
      });
      requestAnimationFrame(animate);
    }
    animate();
  }

  document.addEventListener('DOMContentLoaded', () => {
    doEntrance();
    setupMobileMenu();
    setupParticles();
  });
})();

// about.js
// Controls: topology canvas + ring progress animation on scroll + progressive numbers
// Lightweight and documented. Defer-load this file.

(() => {
  // --- Config ---
  const CONFIG = {
    canvasId: 'topo-canvas',
    ringSelector: '.skill .ring-fg',
    percentSelector: '.skill-percent',
    revealOffset: 0.65, // how much of skill grid is visible before animating
    particleCount: 40, // keep low for performance
    lineDistance: 120,
  };

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // -------------------------
  // Topology canvas (dots + connecting lines)
  // -------------------------
  function initTopo() {
    if (prefersReducedMotion) return;
    const canvas = document.getElementById(CONFIG.canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = canvas.clientWidth;
    let h = canvas.height = canvas.clientHeight;

    const particles = [];
    for (let i = 0; i < CONFIG.particleCount; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: 1 + Math.random() * 2,
        c: ['#39FF14','#FFFF33','#FFFFFF'][Math.floor(Math.random()*3)]
      });
    }

    function resize() {
      w = canvas.width = canvas.clientWidth;
      h = canvas.height = canvas.clientHeight;
    }
    window.addEventListener('resize', resize, { passive: true });

    function draw() {
      ctx.clearRect(0,0,w,h);
      // dots
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.fillStyle = p.c;
        ctx.globalAlpha = 0.9;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fill();
      }
      // lines between close dots
      for (let i=0;i<particles.length;i++){
        for (let j=i+1;j<particles.length;j++){
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < CONFIG.lineDistance) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(57,255,20,' + (0.12 * (1 - dist / CONFIG.lineDistance)) + ')';
            ctx.lineWidth = 0.8;
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  // -------------------------
  // Circular ring animation + numeric counter
  // -------------------------
  function animateRingsWhenVisible() {
    const rings = Array.from(document.querySelectorAll(CONFIG.ringSelector));
    const percents = Array.from(document.querySelectorAll(CONFIG.percentSelector));

    if (!rings.length) return;

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // animate all rings once when the container intersects
          startRingsAnimation();
          obs.disconnect(); // only trigger once
        }
      });
    }, { threshold: CONFIG.revealOffset });

    // observe the first skill element as a proxy for the grid
    const firstSkill = document.querySelector('.skills-grid');
    if (firstSkill) observer.observe(firstSkill);

    function startRingsAnimation() {
      // animate each ring individually
      rings.forEach((ring, idx) => {
        const parent = ring.closest('.skill');
        const percentEl = parent.querySelector('.skill-percent');
        const target = parseInt(percentEl.getAttribute('data-target') || '0', 10);
        // SVG circle length (r=40 -> circumference ~ 2πr = 251.2)
        const circumference = 2 * Math.PI * 40;
        const targetOffset = circumference * (1 - target / 100);

        // CSS transition is already set on .ring-fg; set dashoffset to animate
        requestAnimationFrame(() => {
          ring.style.strokeDashoffset = String(targetOffset);
        });

        // animate numeric counter with requestAnimationFrame
        if (!prefersReducedMotion) {
          animateNumber(percentEl, target, 1100);
        } else {
          percentEl.firstChild.nodeValue = String(target);
        }
      });
    }
  }

  function animateNumber(el, target, duration) {
    const start = performance.now();
    const initial = 0;
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const val = Math.floor(initial + (target - initial) * easeOutCubic(t));
      el.firstChild.nodeValue = String(val);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

  // -------------------------
  // Init
  // -------------------------
  document.addEventListener('DOMContentLoaded', () => {
    initTopo();
    animateRingsWhenVisible();
  });

})();

// Reveal Trusted By title on scroll
document.addEventListener("DOMContentLoaded", () => {
  const trustedTitle = document.querySelector(".logos-title");

  function handleScroll() {
    const rect = trustedTitle.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.8) {
      trustedTitle.classList.add("animate");
      window.removeEventListener("scroll", handleScroll);
    }
  }

  window.addEventListener("scroll", handleScroll);
  handleScroll(); // check on load
});
// ====================
// Infinite Logo Marquee
// ====================
document.addEventListener("DOMContentLoaded", () => {
  const strip = document.querySelector(".logo-strip");

  if (strip) {
    // Duplicate logos so animation looks seamless
    strip.innerHTML += strip.innerHTML;
  }
});
// work.js
document.addEventListener("DOMContentLoaded", () => {
  const filterBtns = document.querySelectorAll(".filter-btn");
  const cards = document.querySelectorAll(".project-card");
  const canvas = document.getElementById("particles");
  if (!canvas) return; // ✅ Prevents errors if section is missing

  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const particles = [];

  if (!prefersReduced) {
    const colors = ["#39FF14", "#FFFF33", "#FFFFFF", "#FFD700", "#CCCCCC"];
    const particleCount = 60;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3
      });
    }

    let mouse = { x: null, y: null };

    canvas.addEventListener("mousemove", e => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        if (mouse.x && mouse.y) {
          let dx = mouse.x - p.x;
          let dy = mouse.y - p.y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            p.vx -= dx / 20000;
            p.vy -= dy / 20000;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.color;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    }

    animate();
  }

  // Filtering
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.dataset.filter;

      cards.forEach(card => {
        if (filter === "all" || card.dataset.category === filter) {
          card.style.display = "block";
          card.classList.add("fade-in");
        } else {
          card.style.display = "none";
        }
      });
    });
  });

  // Reveal on scroll
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("fade-in-up");
      }
    });
  }, { threshold: 0.2 });

  cards.forEach(card => observer.observe(card));
});
// Get modal elements
const modal = document.getElementById("videoModal");
const video = document.getElementById("projectVideo");
const closeModal = document.getElementById("closeModal");

// Attach event listeners to all view buttons
document.querySelectorAll(".view-btn").forEach(button => {
  button.addEventListener("click", () => {
    const videoSrc = button.getAttribute("data-video");
    video.src = videoSrc;
    modal.style.display = "flex";
    video.play();
  });
});

// Close modal when clicking X
closeModal.addEventListener("click", () => {
  video.pause();
  video.currentTime = 0;77
});

// Optional: close when clicking outside the video
modal.addEventListener("click", e => {
  if (e.target === modal) {
    video.pause();
    video.currentTime = 0;
    modal.style.display = "none";
  }
});


// Subtle particle glow shimmer
document.addEventListener('mousemove', (e) => {
  document.body.style.backgroundPosition = `${e.clientX / 50}px ${e.clientY / 50}px`;
});

