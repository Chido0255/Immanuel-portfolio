// Progressive enhancements for the existing single-page portfolio.
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const root = document.documentElement;
  const modal = $('#videoModal');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = $('.motion-switch');
  const change = new EventTarget();
  const themeButton = $('.theme-switch');
  const themeMeta = $('meta[name="theme-color"]');
  let lightTheme;
  function applyTheme(light) {
    lightTheme = light;
    root.dataset.theme = light ? 'light' : 'dark';
    themeButton.setAttribute('aria-checked', String(light));
    themeButton.title = light ? 'Switch to dark mode' : 'Switch to light mode';
    themeMeta.content = getComputedStyle(root).getPropertyValue('--bg').trim();
    change.dispatchEvent(new Event('update')); // Repaint even motion-paused canvases.
  }
  applyTheme(root.dataset.theme === 'light');
  themeButton.hidden = false;
  themeButton.addEventListener('click', () => {
    applyTheme(!lightTheme);
    try { localStorage.setItem('immanuel:theme', root.dataset.theme); } catch { /* Use this tab's choice. */ }
  });
  window.addEventListener('storage', e => {
    if (e.key === 'immanuel:theme' || e.key === null) applyTheme(e.newValue === 'light');
  });

  let choice;
  try { choice = sessionStorage.getItem('portfolio-motion'); } catch { /* Storage can be disabled in a preview frame. */ }
  const motionOn = () => choice ? choice === 'on' : !preference.matches;
  function syncMotion() {
    root.dataset.motion = motionOn() ? 'on' : 'off';
    motionButton.setAttribute('aria-pressed', String(motionOn()));
    $('.motion-state', motionButton).textContent = `Motion ${root.dataset.motion}`;
    change.dispatchEvent(new Event('update'));
  }
  root.classList.add('enhanced');
  syncMotion();
  motionButton.hidden = false;
  motionButton.addEventListener('click', () => {
    choice = motionOn() ? 'off' : 'on';
    try { sessionStorage.setItem('portfolio-motion', choice); } catch { /* Keep the in-memory choice. */ }
    syncMotion();
  });
  preference.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', () => change.dispatchEvent(new Event('update')));

  // Keep the hire beacon visible without sitting on cards or form controls.
  // It floats only when the gutter is actually wide enough to contain it.
  const beacon = $('.hire-beacon'), wideGutter = matchMedia('(min-width:1640px)');
  const placeBeacon = () => (wideGutter.matches ? $('.footer') : $('.hire-slot')).append(beacon);
  placeBeacon(); wideGutter.addEventListener('change', placeBeacon);

  // The compact mobile menu is a disclosure, not a modal; it never traps page scrolling.
  const menuButton = $('.hamburger');
  const menu = $('#primary-navigation');
  function setMenu(open) {
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
  }
  menuButton.hidden = false;
  menuButton.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuButton.focus(); }
  });
  for (const name of ['pointerdown', 'focusin']) document.addEventListener(name, e => {
    if (!menu.hidden && !menu.contains(e.target) && !menuButton.contains(e.target)) setMenu(false);
  });
  matchMedia('(min-width:768px)').addEventListener('change', () => setMenu(false));

  // Preserve all four particle fields. Only visible canvases share the frame loop;
  // cap the backing pixels on very tall work grids and high-DPI phones.
  function initFields() {
    const specs = [
      ['hero-canvas', 42, 0, ['#9af77d','#e5ee96','#eaf4dd']],
      ['topo-canvas', 37, 120, ['#89e66c','#d6ec81','#d9ecd2']],
      ['particles', 46, 0, ['#a8e46e','#eadf75','#d8e5cf']],
      ['network-bg', 25, 140, ['#bde7bd','#d3e2bc']]
    ];
    const daylightDots = ['#4b7745','#858135','#6d8164'];
    const fields = new Map();
    let frame = 0, last = 0;
    function fit(f) {
      const w = f.canvas.clientWidth, h = f.canvas.clientHeight;
      const scale = Math.min(devicePixelRatio || 1, 1.6, 4096 / Math.max(w,h,1), Math.sqrt(1_250_000 / Math.max(w*h,1)));
      f.w = w; f.h = h;
      f.canvas.width = Math.max(1,Math.round(w*scale)); f.canvas.height = Math.max(1,Math.round(h*scale));
      f.ctx.setTransform(f.canvas.width / (w||1),0,0,f.canvas.height / (h||1),0,0);
      f.count = Math.min(f.points.length, Math.max(12,Math.round(w*h/11500)));
      f.dirty = false;
    }
    function paint(f, dt) {
      if (f.dirty) fit(f);
      const {w,h,ctx,points,count,reach} = f;
      const palette = lightTheme ? daylightDots : f.colors;
      if (!w || !h) return;
      ctx.clearRect(0,0,w,h);
      for (let i=0; i<count; i++) {
        const p = points[i];
        p.x = (p.x + dt*p.vx/w + 1) % 1; p.y = (p.y + dt*p.vy/h + 1) % 1;
        p.px = p.x*w; p.py = p.y*h;
        if (f.pointer) {
          const dx = p.px-f.pointer.x, dy = p.py-f.pointer.y;
          const push = Math.max(0,1-Math.hypot(dx,dy)/90)*.13;
          p.px += dx*push; p.py += dy*push;
        }
        ctx.fillStyle = palette[p.tone]; ctx.globalAlpha = p.alpha;
        ctx.beginPath(); ctx.arc(p.px,p.py,p.r,0,Math.PI*2); ctx.fill();
      }
      if (reach) {
        ctx.strokeStyle = lightTheme ? '#68815c' : '#a7cd8a'; ctx.lineWidth = .7;
        for (let i=0; i<count; i++) for (let j=i+1; j<count; j++) {
          const a = points[i], b = points[j], d = Math.hypot(a.px-b.px,a.py-b.py);
          if (d >= reach) continue;
          ctx.globalAlpha = (1-d/reach)*.22;
          ctx.beginPath(); ctx.moveTo(a.px,a.py); ctx.lineTo(b.px,b.py); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
    function tick(time) {
      frame = 0;
      if (document.hidden || modal.open || !motionOn()) return;
      if (!last || time-last >= 33) {
        for (const f of fields.values()) if (f.visible) paint(f,Math.min((time-(last||time))/1000,.09));
        last = time;
      }
      frame = requestAnimationFrame(tick);
    }
    function schedule() {
      cancelAnimationFrame(frame); frame = 0; last = 0;
      if (document.hidden || modal.open) return;
      const visible = [...fields.values()].filter(f => f.visible);
      for (const f of visible) if (f.dirty || !motionOn()) paint(f,0);
      if (visible.length && motionOn()) frame = requestAnimationFrame(tick);
    }
    const resize = new ResizeObserver(entries => {
      for (const {target} of entries) fields.get(target).dirty = true;
      schedule();
    });
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) fields.get(entry.target).visible = entry.isIntersecting;
      schedule();
    });
    for (const [id,count,reach,colors] of specs) {
      const canvas = document.getElementById(id), ctx = canvas.getContext('2d');
      if (!ctx) continue;
      const points = Array.from({length:count}, () => ({
        x:Math.random(), y:Math.random(), vx:(Math.random()-.5)*9, vy:(Math.random()-.5)*9,
        r:.65+Math.random()*.9, alpha:.22+Math.random()*.42, tone:Math.floor(Math.random()*colors.length)
      }));
      const f = {canvas,ctx,points,reach,colors,dirty:true,visible:false,pointer:null};
      fields.set(canvas,f); resize.observe(canvas); observer.observe(canvas);
      if (id === 'particles') {
        canvas.parentElement.addEventListener('pointermove', e => {
          if (e.pointerType !== 'mouse' || !motionOn() || !f.visible) return;
          const rect = canvas.getBoundingClientRect(); f.pointer = {x:e.clientX-rect.left,y:e.clientY-rect.top};
        }, {passive:true});
        canvas.parentElement.addEventListener('pointerleave', () => { f.pointer = null; });
      }
    }
    change.addEventListener('update', schedule);
  }
  if ('IntersectionObserver' in window && 'ResizeObserver' in window) initFields();

  // Animate the existing rings once, keeping their final values in the HTML.
  function onceVisible(elements, callback, threshold = .1) {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { io.unobserve(entry.target); callback(entry.target); }
    }, {threshold});
    elements.forEach(el => io.observe(el));
  }
  onceVisible([$('.skills-grid')], grid => {
    if (!motionOn()) return;
    const skills = $$('.skill',grid).map(el => ({
      ring:$('.ring-fg',el), value:$('.number',el), target:Number($('.skill-percent',el).dataset.target)
    }));
    const start = performance.now(), circumference = 251.2;
    function step(time) {
      const t = !motionOn() || document.hidden || modal.open ? 1 : Math.min(1,(time-start)/670);
      const progress = 1-Math.pow(1-t,3);
      for (const skill of skills) {
        const n = String(Math.round(skill.target*progress));
        if (skill.value.textContent !== n) skill.value.textContent = n;
        skill.ring.style.strokeDashoffset = String(circumference*(1-progress*skill.target/100));
      }
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
  const strip = $('.logo-strip');
  const group = $('.logo-group',strip).cloneNode(true);
  group.setAttribute('aria-hidden','true'); $$('img',group).forEach(img => { img.alt = ''; });
  strip.append(group); strip.classList.add('is-looping');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) entry.target.classList.toggle('is-away',!entry.isIntersecting);
    });
    ['.logo-section','.toolkit-area'].forEach(selector => observer.observe($(selector)));
  }

  // Filtering must not override the cards' flex layout when showing them again.
  const cards = $$('.project-card'), filters = $$('.filter-btn');
  $('.filters').hidden = false;
  for (const button of filters) button.addEventListener('click', () => {
    for (const other of filters) {
      other.classList.toggle('active',other === button);
      other.setAttribute('aria-pressed',String(other === button));
    }
    let shown = 0;
    for (const card of cards) {
      card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter;
      if (!card.hidden) shown++;
    }
    $('#project-count').textContent = `${shown} project${shown === 1 ? '' : 's'} shown`;
  });
  onceVisible(cards, el => { if (motionOn()) el.classList.add('fade-in-up'); });

  // Audio, film and stills share a single viewer. Never request absent MP4s.
  // A restored original film can use data-media="video" with its existing data-video URL.
  const video = $('#projectVideo'), audio = $('#projectAudio'), image = $('#projectImage');
  const note = $('#media-note'), originalLink = $('#original-link');
  let opener;
  function release(player) {
    player.hidden = true;
    if (!player.hasAttribute('src')) return;
    player.pause(); player.removeAttribute('src'); player.preload = 'none'; player.load();
  }
  function showArtwork(link, thumb) {
    image.alt = thumb.alt;
    image.width = Number(thumb.getAttribute('width')); image.height = Number(thumb.getAttribute('height'));
    image.sizes = '(min-width: 940px) 850px, 94vw';
    const original = new URL(link.dataset.original,document.baseURI).href;
    image.srcset = thumb.srcset + (Number(link.dataset.originalWidth) > 1000 ? `, ${original} ${link.dataset.originalWidth}w` : '');
    image.src = thumb.src;
    image.hidden = false;
    originalLink.href = link.dataset.original;
  }
  function loadPlayer(player, src) {
    player.preload = 'metadata'; player.src = src; player.hidden = false;
  }
  $('.projects-grid').addEventListener('click', e => {
    const link = e.target.closest('.view-btn');
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !modal.showModal) return;
    e.preventDefault(); opener = link;
    const card = link.closest('.project-card'), thumb = $('.thumb img',card), media = card.dataset.media;
    $('#preview-kicker').textContent = `${$('.tag',card).textContent} / ${$('.title',card).textContent}`;
    $('#preview-title').textContent = card.dataset.name;
    $('#preview-desc').textContent = $('.desc',card).textContent;
    showArtwork(link,thumb);
    if (media === 'video' && link.dataset.video) {
      image.hidden = true; video.poster = thumb.currentSrc || thumb.src; loadPlayer(video,link.dataset.video);
      note.textContent = 'Original film';
    } else if (media === 'audio' && link.dataset.audio) {
      loadPlayer(audio,link.dataset.audio); note.textContent = 'Original soundtrack · MP3';
    } else {
      note.textContent = media === 'still' ? 'Film still · Full video unavailable.' : 'Project artwork';
    }
    modal.showModal(); root.classList.add('has-preview'); change.dispatchEvent(new Event('update'));
  });
  for (const player of [audio,video]) player.addEventListener('error', () => {
    if (!modal.open || player.hidden || !opener) return;
    image.hidden = false; release(player);
    if (player === video && opener.dataset.audio) { loadPlayer(audio,opener.dataset.audio); note.textContent = 'Original soundtrack · MP3'; }
    else note.textContent = 'Playback is unavailable. The original artwork is shown instead.';
  });
  $('#closeModal').addEventListener('click', () => modal.close());
  modal.addEventListener('click', e => {
    if (e.target !== modal) return;
    const r = modal.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) modal.close();
  });
  modal.addEventListener('close', () => {
    release(video); release(audio); video.removeAttribute('poster');
    image.hidden = true; image.removeAttribute('srcset'); image.removeAttribute('src');
    root.classList.remove('has-preview'); change.dispatchEvent(new Event('update'));
    opener?.focus({preventScroll:true}); opener = null;
  });

  // Keep the site's own Formspree endpoint and native validation. Never report
  // delivery without a successful response, or discard a message on failure.
  const form = $('#contact-form'), submit = $('.submit-btn',form), status = $('#form-status');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (submit.disabled) return;
    submit.disabled = true; $('span',submit).textContent = 'Sending…'; status.textContent = '';
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(),20000);
    try {
      const res = await fetch(form.action,{method:'POST',body:new FormData(form),headers:{Accept:'application/json'},signal:controller.signal});
      if (!res.ok) throw new Error('Message not accepted');
      form.reset(); status.textContent = 'Thank you. Your message has been sent.';
    } catch {
      status.textContent = 'Delivery couldn’t be confirmed. Your message is still here. Please retry or use the email link.';
    } finally {
      clearTimeout(timer); submit.disabled = false; $('span',submit).textContent = 'Send Message';
    }
  });
})();
