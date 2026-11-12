/* Boutique storefront. No dependencies.
   - Silk: a WebGL fabric shader that loops seamlessly (time travels a circle in noise space).
   - Motion: IntersectionObserver reveals, a light scroll handler, pointer-led parallax. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const root = document.documentElement;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ───────── Silk shader ───────── */
  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FRAG = `precision highp float;
uniform vec2 uRes;uniform float uPh;uniform vec2 uM;uniform vec3 uLo,uMid,uHi;uniform float uVig,uGrain;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<3;i++){s+=a*noise(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return s;}
float height(vec2 p,vec2 l){
  vec2 w=vec2(fbm(p*.8+l*.5),fbm(p*.8+vec2(5.2,1.3)-l.yx*.5));
  vec2 q=p+(w-.5)*1.25;
  float f=sin(q.x*2.3+q.y*1.7+l.x*.7);
  f+=.5*sin(q.x*4.3-q.y*2.2+4.*w.y+l.y*.9);
  f+=.22*sin(q.y*6.8+q.x*1.2+5.*w.x-l.x*.6);
  return f;}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/min(uRes.x,uRes.y);
  vec2 p=uv*1.25+vec2(.3,-.12);
  vec2 l=vec2(cos(uPh),sin(uPh));
  float e=.014;
  float h0=height(p,l),hx=height(p+vec2(e,0.),l),hy=height(p+vec2(0.,e),l);
  vec3 n=normalize(vec3(-(hx-h0)/e*.2,-(hy-h0)/e*.2,1.));
  vec3 L=normalize(vec3(-.45+uM.x*.7,.5+uM.y*.7,.78));
  float d=clamp(dot(n,L),0.,1.);
  vec3 H=normalize(L+vec3(0.,0.,1.));
  float s=pow(clamp(dot(n,H),0.,1.),46.);
  float sheen=pow(1.-n.z,1.6);
  vec3 c=mix(uLo,uMid,smoothstep(.2,.98,d));
  c+=uHi*(s*.85+sheen*.1);
  c*=mix(1.-uVig,1.,smoothstep(1.3,.2,length(uv)));
  c+=(hash(gl_FragCoord.xy+uPh*10.)-.5)*uGrain;
  gl_FragColor=vec4(c,1.);}`;
  const PAL = {
    dark:  { lo: [.022, .022, .024], mid: [.19, .185, .18], hi: [.86, .78, .64], vig: .45, grain: .035 },
    light: { lo: [.80, .77, .71],    mid: [.955, .94, .91], hi: [.10, .10, .09], vig: 0,   grain: .02 }
  };
  const PERIOD = 26; // seconds per seamless loop
  const ptr = { x: 0, y: 0 };
  addEventListener('pointermove', e => { ptr.x = e.clientX / innerWidth - .5; ptr.y = .5 - e.clientY / innerHeight; }, { passive: true });

  function initSilk(canvas) {
    const pal = PAL[canvas.dataset.silk] || PAL.dark;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return;
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = n => gl.getUniformLocation(pr, n);
    gl.uniform3fv(U('uLo'), pal.lo); gl.uniform3fv(U('uMid'), pal.mid); gl.uniform3fv(U('uHi'), pal.hi);
    gl.uniform1f(U('uVig'), pal.vig); gl.uniform1f(U('uGrain'), pal.grain);
    const uRes = U('uRes'), uPh = U('uPh'), uM = U('uM');
    let visible = false, raf = 0, mx = 0, my = 0;
    const size = () => {
      const k = Math.min(devicePixelRatio || 1, 1.5) * .6; // cloth is soft: render below native res
      const w = Math.max(2, Math.round(canvas.clientWidth * k)), h = Math.max(2, Math.round(canvas.clientHeight * k));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
      gl.uniform2f(uRes, w, h);
    };
    const draw = t => {
      mx += (ptr.x - mx) * .04; my += (ptr.y - my) * .04; // light follows the cursor, slowly
      gl.uniform1f(uPh, ((t / 1000) % PERIOD) / PERIOD * Math.PI * 2); gl.uniform2f(uM, mx, my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = t => { draw(t); raf = visible && !document.hidden && !RM ? requestAnimationFrame(loop) : 0; };
    const kick = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop); };
    new ResizeObserver(() => { size(); if (RM || !raf) draw(RM ? 4000 : performance.now()); }).observe(canvas);
    new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); }).observe(canvas);
    document.addEventListener('visibilitychange', kick);
    size(); draw(RM ? 4000 : performance.now()); canvas.classList.add('is-on');
  }
  $$('[data-silk]').forEach(initSilk);

  /* ───────── Garment placeholders ───────── */
  const FIG = {
    sweat: '<path d="M62 30 90 22Q100 36 110 22L138 30 184 84 160 102 146 82V176H54V82L40 102 16 84Z"/><path class="d" d="M90 22Q100 36 110 22M54 164H146"/>',
    hood: '<path d="M70 38Q64 2 100 2T130 38Q100 66 70 38Z"/><path d="M62 34 88 28Q100 44 112 28L138 34 184 88 160 106 146 86V178H54V86L40 106 16 88Z"/><path class="d" d="M88 28Q100 44 112 28M72 124H128L134 154H66ZM96 44v22M104 44v22"/>',
    jeans: '<path d="M56 14H144L153 54 148 190H108L100 78 92 190H52L47 54Z"/><path class="d" d="M56 30H144M100 30V78M62 40q8 10 0 22"/>',
    sneaker: '<path d="M8 126 10 152Q100 172 192 152V134Q168 130 150 118L124 92Q104 102 88 86L74 66Q46 60 40 92Q36 120 8 126Z"/><path class="d" d="M10 148Q100 168 192 148M88 86 98 76M100 92 110 82M112 98 122 88"/>'
  };
  const figKey = c => { c = (c || '').toLowerCase(); return /hood/.test(c) ? 'hood' : /jean|pant|denim|trouser/.test(c) ? 'jeans' : /sneak|shoe|boot/.test(c) ? 'sneaker' : 'sweat'; };
  const fig = c => `<svg viewBox="0 0 200 200" fill="currentColor" aria-hidden="true">${FIG[figKey(c)]}</svg>`;

  /* ───────── Data ───────── */
  const getJSON = u => fetch(u).then(r => { if (!r.ok) throw 0; return r.json(); }).catch(() => null);
  let brand = {}, products = [], active = 'All';

  function applyBrand() {
    const name = brand.name || 'Your Label';
    document.title = brand.slogan ? `${name} — ${brand.slogan}` : name;
    $$('[data-brand]').forEach(el => { const v = brand[el.dataset.brand]; if (v != null) el.textContent = v; });
    $$('[data-brand-href]').forEach(a => { const k = a.dataset.brandHref; if (brand[k]) a.href = k === 'email' ? 'mailto:' + brand[k] : brand[k]; });
    $('[data-year]').textContent = new Date().getFullYear();
    const st = $('[data-story]');
    if (brand.story) {
      st.textContent = '';
      brand.story.split(/\s+/).forEach((raw, i) => {
        const em = /^\*.*\*[.,!?;:]*$/.test(raw);
        const s = document.createElement(em ? 'em' : 'span');
        s.className = 'w'; s.style.setProperty('--i', i); s.textContent = raw.replace(/\*/g, '');
        st.append(s, ' ');
      });
    }
  }

  /* ───────── Reveal ───────── */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px', threshold: .05 });
  const watch = els => els.forEach(el => RM ? el.classList.add('in') : io.observe(el));

  /* ───────── Categories ───────── */
  const TONES = [['#1a1917', '#f4f1ea'], ['#cfc7b8', '#121211'], ['#b8ab95', '#121211'], ['#23262a', '#f4f1ea']];
  const catsEl = $('[data-cats]');
  function buildCats() {
    const cats = [...new Set(products.map(p => p.category))];
    catsEl.innerHTML = cats.map((c, i) => {
      const n = products.filter(p => p.category === c).length, t = TONES[i % TONES.length];
      return `<a class="cat" href="#collection" data-cat="${esc(c)}" style="--tone:${t[0]};--fg:${t[1]};--d:${(i % 2) * .12}s" aria-label="${esc(c)}, ${n} pieces"><div class="cat__in">
        <div class="cat__art">${fig(c)}</div>
        <div class="cat__top"><span class="label">${String(i + 1).padStart(2, '0')}</span><span class="cat__slot">Image slot · category-${esc(c.toLowerCase())}.webp · 1600×2000</span></div>
        <div class="cat__bot"><span class="cat__name">${esc(c)}</span><span class="cat__go label">${n} pieces <span aria-hidden="true">→</span></span></div></div></a>`;
    }).join('');
    watch($$('.cat', catsEl));
    if (FINE && !RM) $$('.cat', catsEl).forEach(el => {
      el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); el.style.setProperty('--px', ((e.clientX - r.left) / r.width - .5).toFixed(3)); el.style.setProperty('--py', ((e.clientY - r.top) / r.height - .5).toFixed(3)); });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--px', 0); el.style.setProperty('--py', 0); });
    });
  }
  catsEl.addEventListener('click', e => { const a = e.target.closest('.cat'); if (a) setFilter(a.dataset.cat); });

  /* ───────── Collection ───────── */
  const grid = $('[data-grid]'), filters = $('[data-filters]');
  function buildFilters() {
    filters.innerHTML = ['All', ...new Set(products.map(p => p.category))].map(c => `<button type="button" class="ul" data-f="${esc(c)}" aria-pressed="${c === active}">${esc(c)}</button>`).join('');
  }
  filters.addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) setFilter(b.dataset.f); });
  function setFilter(c) { active = c; $$('button', filters).forEach(b => b.setAttribute('aria-pressed', b.dataset.f === c)); renderGrid(); }
  function renderGrid() {
    const list = products.filter(p => active === 'All' || p.category === active);
    grid.innerHTML = list.map((p, n) => {
      const ph = (p.photos && p.photos.front) || {}, c0 = p.colors[0];
      return `<article class="p" data-id="${esc(p.id)}" data-color="0" style="--d:${(n % 4) * .09}s">
        <div class="p__media">
          <span class="p__n">${String(products.indexOf(p) + 1).padStart(2, '0')}</span>
          <span class="p__slot">Front · ${esc(ph.file || '')} · ${ph.width || 1200}×${ph.height || 1500}</span>
          <div class="p__fig" style="--c:${esc(c0.hex)}">${fig(p.category)}</div>
          <div class="p__sizes" role="group" aria-label="Add ${esc(p.name)} to bag"><span>Add to bag — select size</span><div>
            ${p.sizes.map(s => `<button type="button" class="size" data-size="${esc(s)}" aria-label="Add ${esc(p.name)}, size ${esc(s)}, to bag">${esc(s)}</button>`).join('')}</div></div>
        </div>
        <div class="p__info"><h3>${esc(p.name)}</h3><span class="p__price">${p.price == null ? 'Price on request' : esc(p.price)}</span></div>
        <div class="p__meta"><div class="p__sw" role="group" aria-label="Colour">
          ${p.colors.map((c, i) => `<button type="button" class="sw" data-sw="${i}" style="--sw:${esc(c.hex)}" aria-pressed="${i === 0}" aria-label="${esc(c.name)}"></button>`).join('')}</div>
          <span class="p__color" data-color-name>${esc(c0.name)}</span></div>
      </article>`;
    }).join('');
    watch($$('.p', grid));
  }
  grid.addEventListener('click', e => {
    const card = e.target.closest('.p'); if (!card) return;
    const p = products.find(x => x.id === card.dataset.id);
    const sw = e.target.closest('[data-sw]');
    if (sw) {
      const i = +sw.dataset.sw; card.dataset.color = i;
      $$('.sw', card).forEach(b => b.setAttribute('aria-pressed', b === sw));
      $('.p__fig', card).style.setProperty('--c', p.colors[i].hex); $('[data-color-name]', card).textContent = p.colors[i].name; return;
    }
    const sz = e.target.closest('[data-size]'); if (sz) addToBag(p, +card.dataset.color, sz.dataset.size);
  });

  /* ───────── Bag ───────── */
  const KEY = 'yl-bag-v2';
  let cart = []; try { cart = JSON.parse(localStorage.getItem(KEY)) || []; } catch (_) {}
  const bag = $('[data-bag]'), scrim = $('[data-scrim]'), listEl = $('[data-bag-list]'), toastEl = $('[data-toast]');
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (_) {} };
  function addToBag(p, ci, size) {
    const c = p.colors[ci], key = [p.id, c.name, size].join('|'), ex = cart.find(l => l.key === key);
    if (ex) ex.qty++; else cart.push({ key, id: p.id, color: c.name, hex: c.hex, size, qty: 1 });
    save(); renderBag(true); toast(`Added to bag — ${p.name}, ${c.name}, ${size}`);
  }
  function renderBag(bump) {
    const n = cart.reduce((a, l) => a + l.qty, 0);
    $$('[data-bag-count]').forEach(e => e.textContent = n);
    if (bump) { const b = $('.nav__bag'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
    listEl.innerHTML = cart.map(l => {
      const p = products.find(x => x.id === l.id); if (!p) return '';
      return `<li class="line" data-key="${esc(l.key)}"><div class="line__img" style="--c:${esc(l.hex)}">${fig(p.category)}</div>
        <div><h3>${esc(p.name)}</h3><p>${esc(l.color)} · Size ${esc(l.size)}</p>
        <div class="qty"><button type="button" data-dec aria-label="Decrease quantity">−</button><span>${l.qty}</span><button type="button" data-inc aria-label="Increase quantity">+</button></div></div>
        <button type="button" class="line__rm ul" data-rm aria-label="Remove ${esc(p.name)}">Remove</button></li>`;
    }).join('');
  }
  listEl.addEventListener('click', e => {
    const li = e.target.closest('.line'); if (!li) return;
    const l = cart.find(x => x.key === li.dataset.key); if (!l) return;
    if (e.target.closest('[data-inc]')) l.qty++; else if (e.target.closest('[data-dec]')) l.qty = Math.max(1, l.qty - 1); else if (e.target.closest('[data-rm]')) cart = cart.filter(x => x !== l); else return;
    save(); renderBag();
  });
  let tT; function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(tT); tT = setTimeout(() => toastEl.classList.remove('show'), 2600); }
  let lastFocus;
  function openBag() { lastFocus = document.activeElement; bag.hidden = scrim.hidden = false; void bag.offsetWidth; bag.classList.add('is-open'); scrim.classList.add('is-open'); root.style.overflow = 'hidden'; $('[data-close-bag]').focus(); }
  function closeBag() { bag.classList.remove('is-open'); scrim.classList.remove('is-open'); root.style.overflow = ''; setTimeout(() => { if (!bag.classList.contains('is-open')) bag.hidden = scrim.hidden = true; }, RM ? 0 : 800); lastFocus && lastFocus.focus(); }
  $('[data-open-bag]').addEventListener('click', openBag); $('[data-close-bag]').addEventListener('click', closeBag); scrim.addEventListener('click', closeBag);

  /* ───────── Mobile menu ───────── */
  const menu = $('[data-menu]'), menuBtn = $('[data-open-menu]');
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', open); menuBtn.textContent = open ? 'Close' : 'Menu'; root.classList.toggle('menu-open', open); root.style.overflow = open ? 'hidden' : '';
    if (open) { menu.hidden = false; void menu.offsetWidth; menu.classList.add('is-open'); } else { menu.classList.remove('is-open'); setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, RM ? 0 : 500); }
  }
  menuBtn.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!bag.hidden) closeBag(); else if (!menu.hidden) setMenu(false); return; }
    if (e.key !== 'Tab' || bag.hidden) return;
    const f = $$('button:not([disabled]),a[href]', bag), a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  });
  $('[data-top]').addEventListener('click', () => scrollTo({ top: 0 }));

  /* ───────── Scroll: nav state + hero drift ───────── */
  const nav = $('[data-nav]'), hero = $('[data-hero]'), heroInner = $('[data-hero-inner]');
  let lastY = 0, ticking = false;
  function onScroll() {
    ticking = false;
    const y = scrollY, h = hero.offsetHeight;
    nav.classList.toggle('is-solid', y > h - 90);
    nav.classList.toggle('is-hidden', y > h && y > lastY + 2);
    if (y < lastY - 2) nav.classList.remove('is-hidden');
    if (!RM && y < h) { heroInner.style.transform = `translate3d(0,${(y * .22).toFixed(1)}px,0)`; heroInner.style.opacity = clamp(1 - y / (h * .7)).toFixed(3); }
    lastY = y;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* ───────── Boot ───────── */
  Promise.all([getJSON('data/brand.json'), getJSON('data/products.json')]).then(([b, p]) => {
    brand = b || {}; products = (p && p.products) || [];
    applyBrand(); buildCats(); buildFilters(); renderBag();
    if (products.length) renderGrid(); else grid.innerHTML = '<p>Add products in site/data/products.json</p>';
    const ready = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1200))]) : Promise.resolve();
    ready.then(() => { $$('.rv', hero).forEach(el => el.classList.add('in')); watch($$('.rv').filter(el => !hero.contains(el))); onScroll(); });
  });
})();
