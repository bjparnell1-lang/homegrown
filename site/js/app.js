/* Streetwear storefront — motion + interaction engine.
   No dependencies. One rAF loop drives every scroll-linked effect; scroll position is
   eased (not hijacked) so native scrolling, sticky pinning and anchors keep working. */
(() => {
  'use strict';

  /* ───────── helpers ───────── */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const root = document.documentElement;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (RM) root.classList.add('rm');
  if (FINE && !RM) root.classList.add('has-cursor');

  const WDTH_MIN = 62, WDTH_MAX = 125;
  const TONES = ['#1c1c19', '#33381f', '#5a2a18', '#26333f', '#3a2f22', '#222'];

  /* ───────── garment silhouettes (placeholders until photos exist) ───────── */
  const FIG = {
    sweat: '<path d="M62 30 90 22Q100 36 110 22L138 30 184 84 160 102 146 82V176H54V82L40 102 16 84Z"/><path class="d" d="M90 22Q100 36 110 22M54 164H146"/>',
    hood: '<path d="M70 38Q64 2 100 2T130 38Q100 66 70 38Z"/><path d="M62 34 88 28Q100 44 112 28L138 34 184 88 160 106 146 86V178H54V86L40 106 16 88Z"/><path class="d" d="M88 28Q100 44 112 28M72 124H128L134 154H66ZM96 44v22M104 44v22"/>',
    jeans: '<path d="M56 14H144L153 54 148 190H108L100 78 92 190H52L47 54Z"/><path class="d" d="M56 30H144M100 30V78M62 40q8 10 0 22"/>',
    sneaker: '<path d="M8 126 10 152Q100 172 192 152V134Q168 130 150 118L124 92Q104 102 88 86L74 66Q46 60 40 92Q36 120 8 126Z"/><path class="d" d="M10 148Q100 168 192 148M88 86 98 76M100 92 110 82M112 98 122 88"/>'
  };
  const figKey = c => { c = (c || '').toLowerCase(); return /hood/.test(c) ? 'hood' : /jean|pant|denim/.test(c) ? 'jeans' : /sneak|shoe|boot/.test(c) ? 'sneaker' : 'sweat'; };
  const fig = c => `<svg class="fig" viewBox="0 0 200 200" fill="currentColor" aria-hidden="true">${FIG[figKey(c)]}</svg>`;

  /* ───────── data ───────── */
  const getJSON = u => fetch(u).then(r => { if (!r.ok) throw 0; return r.json(); }).catch(() => null);
  let brand = {}, products = [], activeCat = 'All';

  function applyBrand() {
    const name = brand.name || 'Your Label', slogan = brand.slogan || '';
    document.title = slogan ? `${name} — ${slogan}` : name;
    $$('[data-brand]').forEach(el => {
      const k = el.dataset.brand; if (k === 'story' || brand[k] == null) return;
      el.textContent = brand[k];
    });
    $$('[data-brand-href]').forEach(a => {
      const k = a.dataset.brandHref; if (!brand[k]) return;
      a.href = k === 'email' ? 'mailto:' + brand[k] : brand[k];
    });
    $('[data-year]').textContent = new Date().getFullYear();
    buildHero(name); buildStory(brand.story); buildFootWord(name);
  }

  /* ───────── hero word ───────── */
  const heroWord = $('[data-hero-word]');
  function buildHero(name) {
    const parts = String(name).trim().toUpperCase().split(/\s+/);
    const lines = parts.length > 1 ? [parts[0], parts.slice(1).join(' ')] : [parts[0]];
    heroWord.setAttribute('aria-label', name);
    let i = 0;
    heroWord.innerHTML = lines.map(l =>
      `<span class="hero__line" data-hero-line><span class="hero__chars" aria-hidden="true">${
        [...l].map(ch => `<span class="char" style="--i:${i++}">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('')}</span></span>`).join('');
    fitHero();
  }
  function fitHero() {
    const chars = $$('.hero__chars', heroWord); if (!chars.length) return;
    heroWord.style.fontVariationSettings = `"wdth" ${WDTH_MAX}`; heroWord.style.fontSize = '100px';
    const widest = Math.max(...chars.map(c => c.getBoundingClientRect().width));
    const byW = (innerWidth * .9) / widest * 100;
    const byH = (innerHeight * .62) / (chars.length * .8);
    heroWord.style.fontSize = Math.min(byW, byH) + 'px';
    heroWord.style.fontVariationSettings = `"wdth" ${RM ? 100 : WDTH_MIN}`;
  }

  /* ───────── story (word scrub) ───────── */
  let words = [];
  function buildStory(text) {
    const el = $('[data-story]'); if (!text) return;
    words = []; el.textContent = '';
    text.split(/\s+/).forEach(raw => {
      const hl = /^\*.*\*[.,!?—]*$/.test(raw);
      const s = document.createElement('span');
      s.className = 'w' + (hl ? ' hl' : ''); s.textContent = raw.replace(/\*/g, '');
      el.append(s, document.createTextNode(' ')); words.push({ el: s, v: -1 });
    });
  }

  /* ───────── footer word ───────── */
  const footWord = $('[data-foot-word]'); let footLetters = [];
  function buildFootWord(name) {
    const t = String(name).toUpperCase();
    footWord.innerHTML = [...t].map((ch, i) => `<span class="fc" style="--i:${i}">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');
    footLetters = $$('.fc', footWord).map(el => ({ el, cur: 100, tgt: 100 }));
    fitFoot();
  }
  function fitFoot() {
    if (!footLetters.length) return;
    footLetters.forEach(l => l.el.style.setProperty('--fw', 100));
    footWord.style.fontSize = '100px';
    const w = footLetters.reduce((a, l) => a + l.el.getBoundingClientRect().width, 0);
    footWord.style.fontSize = Math.min(innerWidth * .94 / w * 100, 600) + 'px';
    footLetters.forEach(l => l.el.style.setProperty('--fw', l.cur));
  }

  /* ───────── categories (horizontal) ───────── */
  const catsTrack = $('[data-cats-track]');
  function buildCats() {
    const cats = [...new Set(products.map(p => p.category))];
    cats.forEach((c, i) => {
      const n = products.filter(p => p.category === c).length;
      const a = document.createElement('a');
      a.className = 'cat'; a.href = '#products'; a.dataset.cat = c; a.dataset.cursor = 'Shop';
      a.style.setProperty('--tone', TONES[i % TONES.length]);
      a.setAttribute('aria-label', `${c}, ${n} pieces`);
      a.innerHTML = `<div class="cat__media">
        <span class="cat__num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
        <div class="cat__fig">${fig(c)}</div>
        <span class="cat__tag mono">photo · category-${esc(c.toLowerCase())}.webp · 1600×2000</span>
      </div>
      <div class="cat__name"><h3>${esc(c)}</h3><span class="cat__count mono">${n} pcs</span></div>`;
      catsTrack.append(a);
    });
  }

  /* ───────── products ───────── */
  const grid = $('[data-grid]'), chipsEl = $('[data-chips]');
  function buildChips() {
    const cats = ['All', ...new Set(products.map(p => p.category))];
    chipsEl.innerHTML = cats.map(c => `<button type="button" class="chip" data-chip="${esc(c)}" aria-pressed="${c === activeCat}">${esc(c)}</button>`).join('');
  }
  function renderGrid() {
    const list = products.filter(p => activeCat === 'All' || p.category === activeCat);
    grid.innerHTML = '';
    list.forEach((p, n) => {
      const idx = products.indexOf(p) + 1, ph = p.photos && p.photos.front || {};
      const el = document.createElement('article');
      el.className = 'card'; el.dataset.id = p.id; el.dataset.color = 0; el.style.setProperty('--n', n % 8);
      el.innerHTML = `
        <div class="card__tile" data-cursor="Pick size">
          <span class="card__idx">${String(idx).padStart(2, '0')}</span>
          <div class="card__fig" style="--c:${esc(p.colors[0].hex)}">${fig(p.category)}</div>
          <div class="card__slot"><b data-slot>FRONT</b> · ${esc(ph.file || 'images/' + p.id + '-front.webp')} · ${ph.width || 1200}×${ph.height || 1500}</div>
          <div class="card__sizes" role="group" aria-label="Quick add ${esc(p.name)}"><span>Quick add — pick a size</span>
            ${p.sizes.map(s => `<button type="button" class="size" data-size="${esc(s)}" aria-label="Add ${esc(p.name)} size ${esc(s)} to bag">${esc(s)}</button>`).join('')}
          </div>
        </div>
        <div class="card__info">
          <div><h3 class="card__name">${esc(p.name)}</h3><p class="card__meta mono">${esc(p.category)} · ${p.price == null ? 'Price on request' : esc(p.price)}</p></div>
          <div class="card__sw" role="group" aria-label="Color">
            ${p.colors.map((c, i) => `<button type="button" class="sw" data-sw="${i}" style="--sw:${esc(c.hex)}" aria-pressed="${i === 0}" aria-label="${esc(c.name)}"></button>`).join('')}
          </div>
        </div>`;
      grid.append(el);
    });
    observeCards(); measure();
  }
  let cardIO;
  function observeCards() {
    if (cardIO) cardIO.disconnect();
    cardIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); cardIO.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('.card', grid).forEach(c => { if (RM) c.classList.add('in'); else cardIO.observe(c); });
    if (!RM) $$('.card', grid).forEach(c => { c.style.opacity = 0; c.addEventListener('animationstart', () => c.style.opacity = '', { once: true }); });
  }
  grid.addEventListener('click', e => {
    const card = e.target.closest('.card'); if (!card) return;
    const p = products.find(x => x.id === card.dataset.id);
    const sw = e.target.closest('[data-sw]');
    if (sw) {
      const i = +sw.dataset.sw; card.dataset.color = i;
      $$('.sw', card).forEach(b => b.setAttribute('aria-pressed', b === sw));
      $('.card__fig', card).style.setProperty('--c', p.colors[i].hex); return;
    }
    const sz = e.target.closest('[data-size]');
    if (sz) addToCart(p, +card.dataset.color, sz.dataset.size);
  });
  grid.addEventListener('pointerover', e => { const t = e.target.closest('.card__tile'); if (t && !t._on) { t._on = 1; $('[data-slot]', t).textContent = 'BACK'; } });
  grid.addEventListener('pointerout', e => { const t = e.target.closest('.card__tile'); if (t && !t.contains(e.relatedTarget)) { t._on = 0; $('[data-slot]', t).textContent = 'FRONT'; } });
  chipsEl.addEventListener('click', e => { const b = e.target.closest('[data-chip]'); if (b) setCat(b.dataset.chip); });
  function setCat(c) {
    activeCat = c;
    $$('.chip', chipsEl).forEach(b => b.setAttribute('aria-pressed', b.dataset.chip === c));
    renderGrid();
  }
  catsTrack.addEventListener('click', e => { const a = e.target.closest('.cat'); if (a) setCat(a.dataset.cat); });

  /* ───────── bag ───────── */
  const KEY = 'yl-bag-v1';
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(KEY)) || []; } catch (_) { cart = []; }
  const bag = $('[data-bag]'), scrim = $('[data-scrim]'), list = $('[data-bag-list]'), toastEl = $('[data-toast]');
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (_) {} };
  function addToCart(p, ci, size) {
    const c = p.colors[ci], key = [p.id, c.name, size].join('|');
    const ex = cart.find(l => l.key === key);
    if (ex) ex.qty++; else cart.push({ key, id: p.id, color: c.name, hex: c.hex, size, qty: 1 });
    save(); renderBag(true); toast(`Added — ${p.name} / ${c.name} / ${size}`);
  }
  function renderBag(bump) {
    const count = cart.reduce((a, l) => a + l.qty, 0);
    $$('[data-bag-count]').forEach(e => e.textContent = count);
    if (bump) { const b = $('.nav__bag'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
    list.innerHTML = cart.map(l => {
      const p = products.find(x => x.id === l.id); if (!p) return '';
      return `<li class="line" data-key="${esc(l.key)}">
        <div class="line__img" style="--c:${esc(l.hex)}">${fig(p.category)}</div>
        <div><h3>${esc(p.name)}</h3><p class="mono">${esc(l.color)} · Size ${esc(l.size)}</p>
          <div class="qty"><button type="button" data-dec aria-label="Decrease quantity">−</button><span aria-live="polite">${l.qty}</span><button type="button" data-inc aria-label="Increase quantity">+</button></div></div>
        <button type="button" class="line__rm" data-rm aria-label="Remove ${esc(p.name)}">Remove</button></li>`;
    }).join('');
  }
  list.addEventListener('click', e => {
    const li = e.target.closest('.line'); if (!li) return;
    const l = cart.find(x => x.key === li.dataset.key); if (!l) return;
    if (e.target.closest('[data-inc]')) l.qty++;
    else if (e.target.closest('[data-dec]')) l.qty = Math.max(1, l.qty - 1);
    else if (e.target.closest('[data-rm]')) cart = cart.filter(x => x !== l);
    save(); renderBag();
  });
  let lastFocus = null, toastT;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2400); }
  function openBag() {
    lastFocus = document.activeElement; bag.hidden = scrim.hidden = false; void bag.offsetWidth;
    bag.classList.add('is-open'); scrim.classList.add('is-open'); root.style.overflow = 'hidden'; $('[data-close-bag]').focus();
  }
  function closeBag() {
    bag.classList.remove('is-open'); scrim.classList.remove('is-open'); root.style.overflow = '';
    setTimeout(() => { if (!bag.classList.contains('is-open')) bag.hidden = scrim.hidden = true; }, RM ? 0 : 560);
    if (lastFocus) lastFocus.focus();
  }
  $('[data-open-bag]').addEventListener('click', openBag);
  $('[data-close-bag]').addEventListener('click', closeBag);
  scrim.addEventListener('click', closeBag);
  document.addEventListener('keydown', e => {
    if (bag.hidden) return;
    if (e.key === 'Escape') return closeBag();
    if (e.key !== 'Tab') return;
    const f = $$('button:not([disabled]),a[href]', bag); if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  $('[data-top]').addEventListener('click', () => scrollTo({ top: 0 }));

  /* ───────── pointer: cursor, magnets, parallax ───────── */
  const cursorEl = $('[data-cursor-el]'), cursorLabel = $('span', cursorEl);
  const ptr = { x: innerWidth / 2, y: innerHeight / 2, cx: innerWidth / 2, cy: innerHeight / 2, mx: 0, my: 0, sx: 0, sy: 0 };
  let magnetDirty = false;
  addEventListener('pointermove', e => {
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.mx = e.clientX / innerWidth - .5; ptr.my = e.clientY / innerHeight - .5;
    magnetDirty = true; footDirty = true;
  }, { passive: true });
  document.addEventListener('pointerover', e => {
    if (!FINE) return;
    const t = e.target.closest && e.target.closest('[data-cursor]');
    if (t) { cursorLabel.textContent = t.dataset.cursor; cursorEl.classList.add('has-label'); } else cursorEl.classList.remove('has-label');
  });
  function magnets() {
    magnetDirty = false;
    $$('[data-magnet]').forEach(el => {
      const r = el.getBoundingClientRect(); // rect includes current offset, so measure against the un-offset centre
      const cx = r.left + r.width / 2 - (el._mx || 0), cy = r.top + r.height / 2 - (el._my || 0);
      const dx = ptr.x - cx, dy = ptr.y - cy, d = Math.hypot(dx, dy), R = 90;
      const tx = d < R ? dx * .3 : 0, ty = d < R ? dy * .4 : 0;
      el._mx = tx; el._my = ty; el.style.transform = tx || ty ? `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px)` : '';
    });
  }
  let footDirty = false;
  footWord.addEventListener('pointerleave', () => footLetters.forEach(l => l.tgt = 100));
  function footProximity() {
    footDirty = false;
    const r = footWord.getBoundingClientRect();
    if (ptr.y < r.top - 80 || ptr.y > r.bottom + 80) { footLetters.forEach(l => l.tgt = 100); return; }
    footLetters.forEach(l => {
      const b = l.el.getBoundingClientRect(), d = Math.abs(ptr.x - (b.left + b.width / 2));
      l.tgt = lerp(WDTH_MAX, WDTH_MIN, clamp(d / (innerWidth * .22)));
    });
  }

  /* ───────── scroll engine ───────── */
  const hero = $('#hero'), story = $('#story'), cats = $('[data-cats]'), look = $('[data-look]'), prods = $('#products'), foot = $('#contact');
  const storyBg = $('[data-story-bg]'), storyInner = $('.story__inner'), star = $('[data-star]'), badge = $('[data-badge]'), heroGrid = $('.hero__grid');
  const progress = $('[data-progress]'), catsBar = $('[data-cats-bar]');
  const marquees = $$('[data-marquee]').map(el => ({ el, track: $('.marquee__track', el), dir: +el.dataset.dir, x: 0, w: 1 }));
  const whereI = $('[data-where-i]'), whereName = $('[data-where-name]');
  const secs = [hero, story, cats, look.parentElement, prods, foot];
  const themeEls = [hero, story, $('[data-marquee-sec]'), cats, look.parentElement, prods, foot];
  const themeAt = y => { let t = 'light'; themeEls.forEach((el, i) => { if (y >= M.themeTops[i]) t = el.dataset.theme || 'light'; }); return t; };
  let navTheme = '', whereTheme = '';
  let VH = innerHeight, VW = innerWidth, M = {}, catsDist = 0, docH = 1, sy = scrollY, vel = 0, lastY = scrollY, whereIdx = -1, badgeAngle = 0, cols = [];

  function measure() {
    VH = innerHeight; VW = innerWidth; root.style.setProperty('--vh', VH + 'px');
    if (!RM) {
      const last = catsTrack.lastElementChild;
      const total = last ? last.offsetLeft + last.offsetWidth + VW * .08 : VW;
      catsDist = Math.max(0, total - VW);
      cats.style.height = (VH + catsDist) + 'px';
    }
    const top = el => el.getBoundingClientRect().top + scrollY;
    M = { hero: top(hero), story: top(story), storyH: story.offsetHeight, cats: top(cats), prods: top(prods), foot: top(foot) };
    M.secTops = secs.map(top); M.themeTops = themeEls.map(top);
    docH = document.documentElement.scrollHeight;
    const g = grid.getBoundingClientRect(); M.gridMid = g.top + scrollY + g.height / 2;
    const n = VW > 1000 ? 4 : VW > 760 ? 3 : 2, sp = VW > 760 ? [-.05, .07, -.02, .09] : [0, 0, 0, 0];
    cols = $$('.card', grid).map((c, i) => ({ c, s: sp[(i % n) % 4] }));
    marquees.forEach(m => m.w = m.track.firstElementChild.getBoundingClientRect().width || 1);
    footLetters.length && fitFoot(); fitHero();
  }

  let lastT = performance.now();
  function tick(t) {
    const dt = Math.min(.05, (t - lastT) / 1000); lastT = t;
    const nat = scrollY;
    vel = lerp(vel, nat - lastY, .18); lastY = nat;

    /* cursor (always) */
    if (FINE && !RM) {
      ptr.cx = lerp(ptr.cx, ptr.x, .22); ptr.cy = lerp(ptr.cy, ptr.y, .22);
      cursorEl.style.transform = `translate(${ptr.cx}px,${ptr.cy}px)`;
    }
    if (magnetDirty && FINE && !RM) magnets();
    if (footDirty && FINE && !RM) footProximity();
    if (!RM) footLetters.forEach(l => { if (Math.abs(l.cur - l.tgt) > .1) { l.cur = lerp(l.cur, l.tgt, .14); l.el.style.setProperty('--fw', l.cur.toFixed(1)); } });

    if (!RM) {
      sy = Math.abs(nat - sy) < .05 ? nat : lerp(sy, nat, .14);
      ptr.sx = lerp(ptr.sx, ptr.mx, .06); ptr.sy = lerp(ptr.sy, ptr.my, .06);

      /* progress + section counter */
      progress.style.transform = `scaleX(${clamp(nat / Math.max(1, docH - VH))})`;
      const probe = nat + VH * .5; let idx = 0;
      M.secTops.forEach((tp, i) => { if (probe >= tp) idx = i; });
      if (idx !== whereIdx) {
        whereIdx = idx; whereI.textContent = String(idx + 1).padStart(2, '0');
        whereName.textContent = secs[idx].dataset.name || ''; whereName.classList.remove('swap'); void whereName.offsetWidth; whereName.classList.add('swap');
      }

      const nt = themeAt(nat + 30), wt = themeAt(nat + VH - 24);
      if (nt !== navTheme) { navTheme = nt; root.style.setProperty('--nav', nt === 'dark' ? '#0a0a09' : '#ece9df'); }
      if (wt !== whereTheme) { whereTheme = wt; root.style.setProperty('--where', wt === 'dark' ? '#0a0a09' : '#ece9df'); }

      /* 1 · HERO — wordmark stretches, lines slide apart, shapes drift */
      if (sy < VH * 2.2) {
        const p = clamp(sy / VH), e = ease(p);
        heroWord.style.fontVariationSettings = `"wdth" ${lerp(WDTH_MIN, WDTH_MAX, e).toFixed(1)}`;
        $$('.hero__chars', heroWord).forEach((c, i) => c.style.transform = `translateX(${((i % 2 ? 1 : -1) * e * VW * .025).toFixed(1)}px)`);
        star.style.transform = `translate(${ptr.sx * -40}px,${-sy * .22 + ptr.sy * -30}px) rotate(${sy * .14}deg) scale(${1 + p * .7})`;
        badgeAngle += dt * 14 + vel * .35;
        badge.style.transform = `translate(${ptr.sx * 30}px,${-sy * .12 + ptr.sy * 24}px) rotate(${badgeAngle}deg)`;
        heroGrid.style.transform = `translate(${ptr.sx * -18}px,${sy * .12}px)`;
      }

      /* 2 · STORY — circle wipe, then words light up */
      const p1 = clamp((sy + VH - M.story) / VH);
      if (p1 > 0 && sy < M.story + M.storyH) {
        const R = Math.hypot(VW, VH) / 2 * 1.04;
        storyBg.style.setProperty('--r', (ease(p1) * R).toFixed(1) + 'px');
        storyInner.style.setProperty('--o', clamp((p1 - .6) / .3).toFixed(2));
        const q = clamp((sy - M.story) / (M.storyH - VH)), qq = clamp((q - .05) / .8), n = words.length;
        words.forEach((w, i) => { const v = Math.round(clamp(qq * n - i + .5) * 100) / 100; if (v !== w.v) { w.v = v; w.el.style.opacity = (.14 + .86 * v).toFixed(2); } });
      } else if (p1 <= 0) storyBg.style.setProperty('--r', '0px');

      /* 3 · MARQUEE — speed + direction follow scroll */
      const skew = clamp(vel * -.35, -9, 9);
      marquees.forEach(m => {
        const dir = vel < -.5 ? -1 : 1;
        m.x -= m.dir * dir * (60 + Math.abs(vel) * 9) * dt * (vel < -.5 ? 1 : 1);
        if (m.x <= -m.w) m.x += m.w; if (m.x > 0) m.x -= m.w;
        m.track.style.transform = `translate3d(${m.x.toFixed(1)}px,0,0) skewX(${skew.toFixed(2)}deg)`;
      });

      /* 4 · CATEGORIES — vertical scroll drives the horizontal track */
      if (sy > M.cats - VH && sy < M.cats + VH + catsDist) {
        const p = clamp((sy - M.cats) / Math.max(1, catsDist)), x = -p * catsDist;
        catsTrack.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`; catsBar.style.transform = `scaleX(${p.toFixed(4)})`;
        $$('.cat', catsTrack).forEach(c => {
          const mid = c.offsetLeft + c.offsetWidth / 2 + x, rel = (mid - VW / 2) / VW;
          $('.cat__media', c).style.transform = `translate3d(${(-rel * c.offsetWidth * .14).toFixed(1)}px,0,0)`;
        });
      }

      /* 5 · LOOKBOOK — cards stack, earlier ones recede */
      const lc = $$('[data-look-card]', look);
      const reads = lc.map(c => c.getBoundingClientRect().top);
      lc.forEach((c, i) => {
        if (i === lc.length - 1) return;
        const h = c.offsetHeight, stick = VH * .1 + i * 16, nextStick = VH * .1 + (i + 1) * 16;
        const p = clamp((stick + h - reads[i + 1]) / (stick + h - nextStick));
        c.style.transform = `scale(${(1 - p * .07).toFixed(4)})`; c.style.filter = `brightness(${(1 - p * .55).toFixed(3)})`;
      });

      /* 6 · PRODUCTS — columns drift at different speeds */
      if (sy > M.prods - VH && sy < M.foot) {
        const off = M.gridMid - sy - VH / 2;
        cols.forEach(o => { o.c.style.translate = o.s ? `0 ${(-off * o.s).toFixed(1)}px` : ''; });
      }
    }
    requestAnimationFrame(tick);
  }

  /* ───────── footer letters reveal ───────── */
  new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('in', e.isIntersecting)), { threshold: .25 }).observe(footWord);

  /* ───────── boot ───────── */
  let rT; addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(measure, 120); });
  history.scrollRestoration = 'manual'; scrollTo(0, 0);

  function runIntro() {
    const out = () => root.classList.remove('is-loading');
    if (RM) return out();
    const num = $('[data-intro-count]'), t0 = performance.now(), D = 1100;
    (function step(now) {
      const p = clamp((now - t0) / D); num.textContent = String(Math.round(ease(p) * 100)).padStart(3, '0');
      if (p < 1) requestAnimationFrame(step); else setTimeout(out, 150);
    })(t0);
  }

  Promise.all([getJSON('data/brand.json'), getJSON('data/products.json')]).then(([b, p]) => {
    brand = b || {}; products = (p && p.products) || [];
    applyBrand(); buildCats(); buildChips(); renderBag();
    products.length ? renderGrid() : (grid.innerHTML = '<p class="mono">Add products in site/data/products.json</p>');
    const ready = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
    ready.then(() => { measure(); runIntro(); requestAnimationFrame(tick); });
  });
})();
