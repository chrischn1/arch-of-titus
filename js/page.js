// Interactive sections below the model: inscription, city plan, route of the
// spoils, timeline and the closing choice.
(function () {
  const AT = window.AT;
  const $ = (id) => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  // Scroll to the model, then run an action once it is in view.
  function toModel(fn) {
    const stage = $('model');
    const top = stage.getBoundingClientRect().top;
    if (Math.abs(top) < 4) return fn();
    window.scrollTo({ top: window.scrollY + top, behavior: reduce ? 'auto' : 'smooth' });
    let tries = 0;
    const wait = () => {
      if (Math.abs(stage.getBoundingClientRect().top) < 4 || tries++ > 90) fn();
      else requestAnimationFrame(wait);
    };
    requestAnimationFrame(wait);
  }

  // ---------- inscription ----------
  (function inscription() {
    const stone = $('stone');
    let sel = null;
    AT.INSCRIPTION.forEach((line) => {
      const row = document.createElement('div');
      row.className = 'stone-line';
      line.forEach((w, i) => {
        if (i) {
          const d = document.createElement('span');
          d.className = 'dot';
          d.textContent = '·';
          d.setAttribute('aria-hidden', 'true');
          row.appendChild(d);
        }
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'word';
        b.textContent = w.w;
        b.addEventListener('click', () => {
          if (sel) sel.classList.remove('sel');
          sel = b;
          b.classList.add('sel');
          $('wcLatin').textContent = w.w;
          $('wcTrans').textContent = w.t;
          $('wcNote').textContent = w.n;
        });
        row.appendChild(b);
      });
      stone.appendChild(row);
    });
    const btn = $('compareBtn'), txt = $('compareText');
    btn.addEventListener('click', () => {
      const open = txt.hidden;
      txt.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      btn.classList.toggle('on', open);
    });
  })();

  // ---------- city plan ----------
  (function city() {
    const svg = $('citySvg');
    const defs = el('defs', {}, svg);
    const pat = el('pattern', { id: 'hatch', width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(35)' }, defs);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 8, stroke: 'rgba(255,255,255,0.05)', 'stroke-width': 3 }, pat);
    el('rect', { x: 0, y: 0, width: 1000, height: 640, fill: 'url(#hatch)' }, svg);
    // the Tiber
    el('path', { d: 'M70 0 C 20 120, 110 230, 50 340 S 20 520, 90 640', fill: 'none', stroke: '#2c4a63', 'stroke-width': 26, 'stroke-linecap': 'round', opacity: 0.8 }, svg);
    el('text', { x: 92, y: 420, fill: '#5d7f9b', 'font-size': 15, 'font-family': 'system-ui', transform: 'rotate(-78 92 420)' }, svg).textContent = 'Tiber';
    // hills
    const hill = (cx, cy, rx, ry, label, lx, ly) => {
      el('ellipse', { cx, cy, rx, ry, fill: 'rgba(160,140,110,0.1)', stroke: 'rgba(160,140,110,0.22)' }, svg);
      if (label) el('text', { x: lx, y: ly, fill: 'rgba(200,185,160,0.5)', 'font-size': 17, 'font-family': 'system-ui', 'text-anchor': 'middle' }, svg).textContent = label;
    };
    hill(150, 250, 70, 52, 'Capitoline hill', 150, 192);
    hill(470, 470, 120, 78, '', 0, 0);
    hill(200, 590, 90, 50, 'Aventine hill', 200, 615);
    hill(860, 160, 120, 70, 'Oppian hill', 860, 110);
    // the circus
    el('rect', { x: 210, y: 535, width: 250, height: 52, rx: 26, fill: 'rgba(255,255,255,0.04)', stroke: 'rgba(255,255,255,0.18)' }, svg);
    // the colosseum
    el('ellipse', { cx: 800, cy: 330, rx: 52, ry: 42, fill: 'rgba(255,255,255,0.05)', stroke: 'rgba(255,255,255,0.25)', 'stroke-width': 2 }, svg);
    el('ellipse', { cx: 800, cy: 330, rx: 30, ry: 20, fill: 'none', stroke: 'rgba(255,255,255,0.15)' }, svg);
    // the temple of peace
    el('rect', { x: 385, y: 130, width: 72, height: 80, fill: 'rgba(255,255,255,0.04)', stroke: 'rgba(255,255,255,0.2)' }, svg);
    // the triumphal route
    const route = el('path', { d: 'M800 330 L 560 330 C 470 330, 400 300, 330 300 S 210 270, 150 250', fill: 'none', stroke: '#dcae45', 'stroke-width': 3, 'stroke-dasharray': '2 9', 'stroke-linecap': 'round', opacity: 0.85 }, svg);
    el('text', { x: 450, y: 352, fill: 'rgba(220,174,69,0.75)', 'font-size': 13, 'font-family': 'system-ui', 'text-anchor': 'middle' }, svg).textContent = 'Via Sacra';
    if (!reduce) {
      const a = el('animate', { attributeName: 'stroke-dashoffset', from: 0, to: -110, dur: '4s', repeatCount: 'indefinite' }, route);
      void a;
    }
    let sel = null;
    const pick = (p, g) => {
      if (sel) sel.classList.remove('sel');
      sel = g;
      g.classList.add('sel');
      $('ccName').textContent = p.name;
      $('ccText').textContent = p.text;
    };
    AT.CITY.forEach((p) => {
      const g = el('g', { class: 'place', tabindex: 0, role: 'button', 'aria-label': p.name }, svg);
      el('circle', { class: 'ring', cx: p.x, cy: p.y, r: p.r, fill: p.here ? 'rgba(220,174,69,0.18)' : 'rgba(255,255,255,0.06)', stroke: '#dcae45', 'stroke-opacity': p.here ? 0.9 : 0.45, 'stroke-width': 2 }, g);
      el('circle', { cx: p.x, cy: p.y, r: 5, fill: '#dcae45' }, g);
      const t = el('text', { x: p.x, y: p.y - p.r - 10, 'text-anchor': 'middle' }, g);
      t.textContent = p.name;
      g.addEventListener('click', () => pick(p, g));
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(p, g); } });
      if (p.here) pick(p, g);
    });
  })();

  // ---------- route of the spoils ----------
  (function routeChart() {
    const svg = $('routeSvg');
    const X = (lon) => ((lon - 4) / 36) * 1000, Y = (lat) => ((46 - lat) / 17) * 520;
    for (let lon = 5; lon <= 40; lon += 5) {
      el('line', { x1: X(lon), y1: 0, x2: X(lon), y2: 520, stroke: 'rgba(255,255,255,0.05)' }, svg);
      el('text', { x: X(lon) + 4, y: 512, fill: 'rgba(255,255,255,0.22)', 'font-size': 11, 'font-family': 'system-ui' }, svg).textContent = `${lon}°E`;
    }
    for (let lat = 30; lat <= 45; lat += 5) {
      el('line', { x1: 0, y1: Y(lat), x2: 1000, y2: Y(lat), stroke: 'rgba(255,255,255,0.05)' }, svg);
      el('text', { x: 6, y: Y(lat) - 4, fill: 'rgba(255,255,255,0.22)', 'font-size': 11, 'font-family': 'system-ui' }, svg).textContent = `${lat}°N`;
    }
    el('text', { x: X(19), y: Y(35.6), fill: 'rgba(120,160,200,0.35)', 'font-size': 18, 'font-family': 'system-ui', 'text-anchor': 'middle', 'letter-spacing': '0.2em' }, svg).textContent = 'MEDITERRANEAN SEA';
    const S = AT.ROUTE;
    const segs = [];
    for (let i = 0; i < S.length - 1; i++) {
      const a = S[i], b = S[i + 1];
      const ax = X(a.lon), ay = Y(a.lat), bx = X(b.lon), by = Y(b.lat);
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
      const bend = i === 3 ? -0.22 : 0.18;
      const cx = mx - (dy / L) * L * bend, cy = my + (dx / L) * L * bend;
      segs.push(el('path', { d: `M${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`, fill: 'none', stroke: '#dcae45', 'stroke-width': 2.5, 'stroke-linecap': 'round' }, svg));
    }
    const nodes = {};
    S.forEach((s, i) => {
      const key = s.name;
      if (nodes[key]) { nodes[key].idx.push(i); return; }
      const g = el('g', { class: 'place', tabindex: 0, role: 'button', 'aria-label': s.name }, svg);
      el('circle', { class: 'ring', cx: X(s.lon), cy: Y(s.lat), r: 16, fill: 'rgba(255,255,255,0.05)', stroke: '#dcae45', 'stroke-opacity': 0.45, 'stroke-width': 2 }, g);
      el('circle', { cx: X(s.lon), cy: Y(s.lat), r: 5, fill: '#dcae45' }, g);
      const t = el('text', { x: X(s.lon), y: Y(s.lat) - 26, 'text-anchor': 'middle' }, g);
      t.textContent = s.name;
      nodes[key] = { g, idx: [i] };
      const go = () => {
        const list = nodes[key].idx;
        const next = list.find((k) => k > cur);
        show(next != null ? next : list[0]);
      };
      g.addEventListener('click', go);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    const mover = el('circle', { r: 8, fill: '#fff', stroke: '#dcae45', 'stroke-width': 3 }, svg);
    let cur = 0, animId = 0;
    function show(i) {
      const prev = cur;
      cur = i;
      const s = S[i];
      $('rcYear').textContent = s.year;
      $('rcName').textContent = s.name;
      $('rcText').textContent = s.text;
      $('rcCount').textContent = `${i + 1} of ${S.length}`;
      segs.forEach((p, k) => {
        p.setAttribute('stroke-opacity', k < i ? 0.95 : 0.18);
        p.setAttribute('stroke-dasharray', k < i ? 'none' : '4 8');
      });
      Object.values(nodes).forEach((n) => n.g.classList.toggle('sel', n.idx.includes(i)));
      const end = { x: X(s.lon), y: Y(s.lat) };
      cancelAnimationFrame(animId);
      if (reduce || i !== prev + 1) { mover.setAttribute('cx', end.x); mover.setAttribute('cy', end.y); return; }
      const path = segs[prev], L = path.getTotalLength(), t0 = performance.now(), dur = 1100;
      const stepA = (t) => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        const p = path.getPointAtLength(L * e);
        mover.setAttribute('cx', p.x);
        mover.setAttribute('cy', p.y);
        if (k < 1) animId = requestAnimationFrame(stepA);
      };
      animId = requestAnimationFrame(stepA);
    }
    $('rcPrev').addEventListener('click', () => show((cur - 1 + S.length) % S.length));
    $('rcNext').addEventListener('click', () => show((cur + 1) % S.length));
    show(0);
  })();

  // ---------- timeline ----------
  (function timeline() {
    const colors = { war: '#c9cdd3', rome: '#d0714f', spoils: '#b99ad8', memory: '#dcae45', keep: '#7fb0c9' };
    const links = {
      'IVDAEA CAPTA coins': 'victories', 'The triumph': 'spoils', 'Titus dies, the arch rises': 'inscription',
      'The rabbis remember Titus': 'inscription', 'A fortress': 'restoration', 'Not under the arch': 'apotheosis',
      'Valadier’s restoration': 'restoration', 'The walk back': 'west', 'An emblem': 'spoils', 'The gold returns': 'spoils',
    };
    const box = $('timeline'), filters = $('filters');
    const cards = AT.TIMELINE.map((ev) => {
      const c = document.createElement('article');
      c.className = 'event';
      c.style.setProperty('--tagc', colors[ev.tag]);
      c.dataset.tag = ev.tag;
      c.innerHTML = `<p class="ey">${ev.y}</p><h3>${ev.t}</h3><p>${ev.d}</p><p class="tag">${AT.TAGS[ev.tag]}</p>`;
      const id = links[ev.t];
      if (id) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn small';
        b.textContent = 'Show on the model';
        b.addEventListener('click', () => toModel(() => {
          if (ev.t === 'Valadier’s restoration' || ev.t === 'A fortress') {
            $('tRestore').checked = true;
            AT.viewer.setRestore(true);
          }
          if (ev.t === 'The gold returns') {
            $('tPaint').checked = true;
            AT.viewer.setPaint(true);
          }
          AT.viewer.select(id);
        }));
        c.appendChild(b);
      }
      box.appendChild(c);
      return c;
    });
    const tags = ['all', ...Object.keys(AT.TAGS)];
    tags.forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn small';
      b.textContent = t === 'all' ? 'All events' : AT.TAGS[t];
      b.setAttribute('aria-pressed', String(t === 'all'));
      b.addEventListener('click', () => {
        filters.querySelectorAll('.btn').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        cards.forEach((c) => { c.hidden = !(t === 'all' || c.dataset.tag === t); });
        box.scrollTo({ left: 0, behavior: reduce ? 'auto' : 'smooth' });
      });
      filters.appendChild(b);
    });
    // vertical wheel scrolls the strip sideways while the pointer is over it
    box.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = box.scrollWidth - box.clientWidth;
      if ((e.deltaY > 0 && box.scrollLeft >= max - 1) || (e.deltaY < 0 && box.scrollLeft <= 0)) return;
      e.preventDefault();
      box.scrollLeft += e.deltaY;
    }, { passive: false });
  })();

  // ---------- under or around ----------
  (function choice() {
    const out = $('choiceOut');
    document.querySelectorAll('.choice-btn').forEach((b) => b.addEventListener('click', () => {
      document.querySelectorAll('.choice-btn').forEach((x) => x.classList.toggle('sel', x === b));
      out.hidden = false;
      out.dataset.sel = b.dataset.choice;
    }));
    $('choiceWalk').addEventListener('click', () => toModel(() => AT.viewer.walk('exodus')));
  })();
})();
