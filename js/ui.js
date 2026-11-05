// Interface around the 3D model: loader, intro card, hotspot panel, toolbar, captions.
(function () {
  const AT = (window.AT = window.AT || {});
  const $ = (id) => document.getElementById(id);

  const viewer = new AT.Viewer($('viewer'), $('hot'));
  AT.viewer = viewer;

  let lens = 'rome';
  let current = null;

  function renderReading(h, animate) {
    const box = $('pReading');
    const fill = () => {
      box.classList.toggle('memory', lens === 'memory');
      const label = lens === 'rome' ? 'How it shows the defeat' : 'How Jews answered it';
      box.innerHTML = `<p class="rlabel">${label}</p>` + h[lens].map((p) => `<p>${p}</p>`).join('');
    };
    if (!animate) return fill();
    box.classList.add('fade');
    setTimeout(() => { fill(); box.classList.remove('fade'); }, 180);
  }

  function openPanel(h) {
    current = h;
    $('caption').classList.remove('show');
    $('pPlace').textContent = h.place;
    $('pTitle').textContent = h.title;
    $('pSee').textContent = h.see;
    renderReading(h, false);
    const i = AT.HOTSPOTS.indexOf(h);
    $('pCount').textContent = `${i + 1} of ${AT.HOTSPOTS.length}`;
    $('panel').classList.add('open');
    viewer.panelOpen = true;
    $('panel').setAttribute('aria-hidden', 'false');
    $('pBody').scrollTop = 0;
    hideIntro();
  }

  function closePanel() {
    $('panel').classList.remove('open');
    viewer.panelOpen = false;
    $('panel').setAttribute('aria-hidden', 'true');
    viewer.active = null;
    current = null;
  }

  function setLens(l) {
    lens = l;
    document.querySelector('.lens').dataset.lens = l;
    document.querySelectorAll('.lens-btn').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.lens === l)));
    if (current) renderReading(current, true);
  }

  function hideIntro() { $('intro').classList.add('gone'); }

  function step(d) {
    const list = AT.HOTSPOTS;
    const i = current ? list.indexOf(current) : -1;
    const n = list[(i + d + list.length) % list.length];
    viewer.select(n.id);
  }

  // ---------- wiring ----------
  viewer.on('select', openPanel);
  viewer.on('interact', hideIntro);
  let hintTimer;
  viewer.on('wheelhint', () => {
    const h = $('hint');
    if (h.classList.contains('show')) return;
    h.classList.add('show');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => h.classList.remove('show'), 1800);
  });
  let capTimer;
  viewer.on('caption', (text) => {
    const c = $('caption');
    c.classList.remove('show');
    clearTimeout(capTimer);
    capTimer = setTimeout(() => { c.textContent = text; c.classList.add('show'); }, 220);
  });
  viewer.on('walk', ({ name, on }) => {
    $('tWalkA').classList.toggle('on', on && name === 'triumph');
    $('tWalkB').classList.toggle('on', on && name === 'exodus');
    $('tWalkA').textContent = on && name === 'triumph' ? 'Stop walking' : AT.WALKS.triumph.label;
    $('tWalkB').textContent = on && name === 'exodus' ? 'Stop walking' : AT.WALKS.exodus.label;
    if (!on) setTimeout(() => $('caption').classList.remove('show'), 2600);
    else { closePanel(); hideIntro(); }
  });

  $('pClose').addEventListener('click', closePanel);
  $('pPrev').addEventListener('click', () => step(-1));
  $('pNext').addEventListener('click', () => step(1));
  document.querySelectorAll('.lens-btn').forEach((b) => b.addEventListener('click', () => setLens(b.dataset.lens)));
  $('begin').addEventListener('click', () => viewer.select(AT.HOTSPOTS[0].id));
  $('walkIntro').addEventListener('click', () => viewer.walk('triumph'));
  $('tHome').addEventListener('click', () => { closePanel(); viewer.home(); });
  $('tIn').addEventListener('click', () => viewer.zoom(0.75));
  $('tOut').addEventListener('click', () => viewer.zoom(1.33));
  $('tPaint').addEventListener('change', (e) => {
    viewer.setPaint(e.target.checked);
    if (e.target.checked && (!current || current.id !== 'spoils')) viewer.select('spoils');
  });
  $('tRestore').addEventListener('change', (e) => {
    viewer.setRestore(e.target.checked);
    if (e.target.checked) { closePanel(); viewer.flyTo({ target: [0, 7.2, 0], r: 30, th: -0.35, ph: 1.47 }); }
  });
  const toggleWalk = (name) => (viewer.walkState && viewer.walkState.name === name ? viewer.stopWalk() : viewer.walk(name));
  $('tWalkA').addEventListener('click', () => toggleWalk('triumph'));
  $('tWalkB').addEventListener('click', () => toggleWalk('exodus'));

  const timeLabel = (t) => {
    const hrs = 7 + t * 10.5;
    const h = Math.floor(hrs), m = Math.floor((hrs - h) * 60 / 15) * 15;
    const hh = ((h + 11) % 12) + 1;
    return `${hh}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
  };
  $('tTime').addEventListener('input', (e) => {
    const t = e.target.value / 1000;
    viewer.setTime(t);
    $('tTimeLabel').textContent = timeLabel(t);
  });
  $('tTimeLabel').textContent = timeLabel(0.36);

  // guide menu
  const guide = $('guide');
  guide.innerHTML = AT.HOTSPOTS.map((h) => `<button type="button" data-id="${h.id}">${h.title}<span>${h.place}</span></button>`).join('');
  const setGuide = (open) => {
    guide.hidden = !open;
    $('tGuide').setAttribute('aria-expanded', String(open));
  };
  $('tGuide').addEventListener('click', (e) => { e.stopPropagation(); setGuide(guide.hidden); });
  guide.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    setGuide(false);
    viewer.select(b.dataset.id);
  });
  document.addEventListener('click', (e) => { if (!guide.hidden && !e.target.closest('.guide-wrap')) setGuide(false); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!guide.hidden) setGuide(false);
      else if (viewer.walkState) viewer.stopWalk();
      else closePanel();
    }
    if (current && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !/input|textarea/i.test(e.target.tagName)) step(e.key === 'ArrowRight' ? 1 : -1);
  });

  // header turns solid after the stage
  const bar = $('bar');
  const onScroll = () => bar.classList.toggle('solid', window.scrollY > window.innerHeight * 0.6);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const links = [...document.querySelectorAll('.nav a')];
  const io = new IntersectionObserver((ents) => {
    ents.forEach((en) => {
      if (en.isIntersecting) links.forEach((a) => a.classList.toggle('current', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('#model, main .section').forEach((s) => io.observe(s));

  // start
  const t0 = performance.now();
  AT.loadSteps = [];
  viewer.init((p, label) => {
    AT.loadSteps.push([label, Math.round(performance.now() - t0)]);
    $('loadBar').style.width = `${Math.round(p * 100)}%`;
    $('loadStep').textContent = label;
  }).then(() => {
    setTimeout(() => $('loader').classList.add('done'), 150);
  }).catch((err) => {
    console.error(err);
    $('loadStep').textContent = 'The model could not load in this browser. The sections below still work.';
  });

  AT.ui = { openPanel, closePanel, setLens };
})();
