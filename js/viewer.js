// The 3D viewer: renderer, lighting, the orbit camera, hotspots and guided walks.
(function () {
  const AT = (window.AT = window.AT || {});
  const K = AT.K;
  // Yield so the loader can paint. A background tab pauses animation frames,
  // so a timer finishes the wait there instead.
  const tick = () => new Promise((r) => {
    let done = false;
    const go = () => { if (!done) { done = true; r(); } };
    requestAnimationFrame(() => setTimeout(go, 0));
    setTimeout(go, 120);
  });
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Critically damped spring. response is in seconds.
  class Spring {
    constructor(v) { this.x = v; this.v = 0; this.g = v; }
    step(dt, resp) {
      const w = (2 * Math.PI) / resp;
      const a = -w * w * (this.x - this.g) - 2 * w * this.v;
      this.v += a * dt;
      this.x += this.v * dt;
    }
    snap(v) { this.x = this.g = v; this.v = 0; }
  }

  function stoneMaterial(tex, side) {
    const m = new THREE.MeshStandardMaterial({
      map: tex.map, normalMap: tex.normalMap, roughnessMap: tex.roughnessMap,
      roughness: 1, normalScale: new THREE.Vector2(0.7, 0.7), side: side || THREE.FrontSide, envMapIntensity: 0.85,
    });
    return AT.patchStone(m, { trav: true, detailScale: 4 });
  }

  function reliefMaterial(t, scale, side) {
    const m = new THREE.MeshStandardMaterial({
      map: t.map, normalMap: t.normalMap, roughness: 0.82, normalScale: new THREE.Vector2(1, 1),
      side: side || THREE.FrontSide, envMapIntensity: 0.85,
    });
    return AT.patchStone(m, { trav: false, detailScale: scale, paintMap: t.paintMap });
  }

  class Viewer {
    constructor(el, hotLayer) {
      this.el = el;
      this.hotLayer = hotLayer;
      this.listeners = {};
      this.anim = { paint: new Spring(0), restore: new Spring(0) };
      this.walkState = null;
      this.visible = true;
    }
    on(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); }
    emit(ev, a) { (this.listeners[ev] || []).forEach((f) => f(a)); }

    async init(progress) {
      const R = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      R.outputColorSpace = THREE.SRGBColorSpace;
      R.toneMapping = THREE.ACESFilmicToneMapping;
      R.toneMappingExposure = 1.0;
      R.shadowMap.enabled = true;
      R.shadowMap.type = THREE.PCFSoftShadowMap;
      // Nothing in the scene moves, so shadow maps render only when the sun moves.
      R.shadowMap.autoUpdate = false;
      R.shadowMap.needsUpdate = true;
      this.el.appendChild(R.domElement);
      this.renderer = R;
      AT.maxAniso = Math.min(8, R.capabilities.getMaxAnisotropy());

      const scene = (this.scene = new THREE.Scene());
      scene.fog = new THREE.Fog(0xb7c2cb, 70, 820);
      this.camera = new THREE.PerspectiveCamera(40, 1, 0.08, 4000);

      progress(0.04, 'Quarrying marble');
      await tick();
      const marble = AT.textures.marble(1024);
      AT.stoneU.uDetail.value = AT.textures.detail(512);
      this.mat = { stone: stoneMaterial(marble), stoneDouble: stoneMaterial(marble, THREE.DoubleSide) };

      progress(0.16, 'Raising the piers and columns');
      await tick();
      this.arch = AT.buildArch(this.mat);
      scene.add(this.arch);

      progress(0.28, 'Carving the spoils of the Temple');
      await tick();
      await document.fonts.load('600 40px Cinzel').catch(() => {});
      const add = (geo, mat) => {
        const m = new THREE.Mesh(geo, mat);
        m.castShadow = m.receiveShadow = true;
        scene.add(m);
        return m;
      };
      const sp = AT.panels.spoils();
      const spT = sp.build();
      this.spoilsMat = reliefMaterial(spT, 3.9);
      add(sp.geometry(1).rotateY(Math.PI / 2).translate(-K.a + 0.003, 4.2, 0), this.spoilsMat);

      progress(0.42, 'Carving the triumph of Titus');
      await tick();
      const tr = AT.panels.triumph();
      add(tr.geometry(1).rotateY(-Math.PI / 2).translate(K.a - 0.003, 4.2, 0), reliefMaterial(tr.build(), 3.9));

      progress(0.54, 'Coffering the vault');
      await tick();
      const L = Math.round(Math.PI * K.r * 100), Dc = Math.round(K.D * 100);
      const va = AT.panels.vault(L, Dc);
      const P = va.panel;
      const u0 = P.u / L, u1 = (P.u + P.size) / L;
      const v0 = 1 - (P.v + P.size) / Dc, v1 = 1 - P.v / Dc;
      const vg = AT.vaultSurface(va, Math.PI, 0, -K.D / 2, K.D / 2, Math.round(L / 2), Math.round(Dc / 2),
        (u, v) => u > u0 && u < u1 && v > v0 && v < v1);
      add(vg, reliefMaterial(va.build(), 8.4, THREE.DoubleSide));
      const ap = AT.panels.apotheosis(P.size);
      const ag = AT.vaultSurface(ap, Math.PI - u0 * Math.PI, Math.PI - u1 * Math.PI,
        -K.D / 2 + v0 * K.D, -K.D / 2 + v1 * K.D, P.size * 2, P.size * 2);
      add(ag, reliefMaterial(ap.build(), 1.3, THREE.DoubleSide));

      progress(0.64, 'Carving the Victories and the frieze');
      await tick();
      const vi = AT.panels.victory(707);
      let g = vi.geometry(0.6).translate(0.2 + 1.525, 9.65 - 2.025, 0);
      AT.relief.filterTris(g, (x, y) => x > 0.33 && x < 3.13 && y < 9.63 && Math.hypot(x, y - K.I) > K.r + 0.62);
      const eR = g.translate(0, 0, K.D / 2 + 0.003);
      const eL = AT.relief.mirrorX(eR);
      const wR = eR.clone().rotateY(Math.PI), wL = eL.clone().rotateY(Math.PI);
      const vic = AT.archUtil.merge([eR, eL, wR, wL]);
      add(vic, reliefMaterial(vi.build(), 3));
      const fr = AT.panels.frieze();
      add(fr.geometry(1).translate(0, 10.55, K.D / 2 + 0.003), reliefMaterial(fr.build(), 6.2));

      progress(0.74, 'Cutting the inscription');
      await tick();
      const ins = AT.panels.inscription(true);
      const zA = K.D / 2 - 0.05;
      add(ins.geometry(1).translate(0, 13.45, zA + 0.003), reliefMaterial(ins.build(), 7.2));
      const insW = AT.panels.inscription(false);
      add(insW.geometry(0.5).rotateY(Math.PI).translate(0, 13.45, -zA - 0.003), reliefMaterial(insW.build(), 7.2));

      progress(0.84, 'Laying the Via Sacra');
      await tick();
      const site = AT.buildSite(scene, this.mat.stone);
      this.sky = site.sky;

      progress(0.93, 'Waiting for the sun');
      await tick();
      this.setupLights();
      this.setTime(0.36, true);
      this.setupControls();
      this.setupHotspots();
      new ResizeObserver(() => this.resize()).observe(this.el);
      this.resize();
      new IntersectionObserver((e) => { this.visible = e[0].isIntersecting; }, { threshold: 0.01 }).observe(this.el);
      // compile once so the first frame does not stall
      R.compile(scene, this.camera);
      progress(1, 'Ready');
      this.last = performance.now();
      const loop = (t) => {
        requestAnimationFrame(loop);
        const dt = Math.min(0.05, (t - this.last) / 1000);
        this.last = t;
        if (this.visible && !document.hidden) this.frame(dt);
      };
      requestAnimationFrame(loop);
    }

    setupLights() {
      const s = (this.sun = new THREE.DirectionalLight(0xffffff, 3));
      s.castShadow = true;
      s.shadow.mapSize.set(4096, 4096);
      const c = s.shadow.camera;
      c.left = -17; c.right = 17; c.top = 17; c.bottom = -17; c.near = 1; c.far = 160;
      s.shadow.bias = -0.00025;
      s.shadow.normalBias = 0.025;
      s.target.position.set(0, 6, 0);
      this.scene.add(s, s.target);
      this.hemi = new THREE.HemisphereLight(0xbfd4ee, 0x6b5f4f, 0.55);
      this.scene.add(this.hemi);
      // Skylight enters the passage from its two open ends and rakes along the
      // walls, which is what makes the real reliefs readable. Two soft spots
      // stand in for it, and a low warm light stands in for bounce off the road.
      this.passLights = [];
      for (const fz of [1, -1]) {
        const sp = new THREE.SpotLight(0xdfe6ef, 26, 16, 0.62, 1, 1.6);
        sp.position.set(0, 4.6, fz * 6.8);
        sp.target.position.set(0, 4.4, -fz * 2.5);
        sp.castShadow = true;
        sp.shadow.mapSize.set(1024, 1024);
        sp.shadow.bias = -0.0006;
        sp.shadow.normalBias = 0.02;
        sp.shadow.camera.near = 2;
        sp.shadow.camera.far = 16;
        this.scene.add(sp, sp.target);
        this.passLights.push(sp);
      }
      const bounce = new THREE.PointLight(0xe8d6bc, 7, 9, 1.6);
      bounce.position.set(0, 0.6, 0);
      this.scene.add(bounce);
      this.bounce = bounce;
      this.pmrem = new THREE.PMREMGenerator(this.renderer);
      this.envScene = new THREE.Scene();
      this.envSky = new THREE.Mesh(this.sky.geometry, this.sky.material);
      this.envScene.add(this.envSky);
      const gnd = new THREE.Mesh(new THREE.CircleGeometry(800, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x6a6252 }));
      gnd.position.y = -2;
      this.envScene.add(gnd);
      this.envGround = gnd;
    }

    // t from 0 (sunrise) to 1 (sunset). Azimuth from north, clockwise.
    setTime(t, now) {
      this.timeT = t;
      const A = THREE.MathUtils.degToRad(105 + 150 * t);
      const el = THREE.MathUtils.degToRad(3 + 36 * Math.sin(Math.PI * t));
      const d = new THREE.Vector3(Math.cos(A) * Math.cos(el), Math.sin(el), Math.sin(A) * Math.cos(el));
      this.sunDir = d;
      this.renderer.shadowMap.needsUpdate = true;
      this.sun.position.copy(this.sun.target.position).addScaledVector(d, 90);
      const low = 1 - AT.smooth(0.05, 0.45, el);
      this.sun.color.setRGB(1, 0.95 - low * 0.25, 0.88 - low * 0.42);
      this.sun.intensity = 0.4 + 3.1 * AT.smooth(0.0, 0.16, el);
      const day = 0.45 + 0.55 * AT.smooth(0.0, 0.4, el);
      for (const sp of this.passLights) { sp.intensity = 26 * day; sp.color.setRGB(0.88 + low * 0.12, 0.9, 0.94 - low * 0.2); }
      this.bounce.intensity = 7 * day;
      this.hemi.intensity = 0.35 + 0.35 * AT.smooth(0.0, 0.5, el);
      const u = this.sky.material.uniforms;
      u.sunDir.value.copy(d);
      u.zen.value.setRGB(0.16 + low * 0.08, 0.34 + low * 0.02, 0.66 - low * 0.12);
      u.hor.value.setRGB(0.74 + low * 0.18, 0.78 + low * 0.02, 0.84 - low * 0.16);
      u.sunCol.value.setRGB(1, 0.86 - low * 0.2, 0.7 - low * 0.35);
      this.scene.fog.color.copy(u.hor.value);
      this.envGround.material.color.setRGB(0.42 + low * 0.08, 0.39, 0.33 - low * 0.05);
      const regen = () => {
        if (this.envRT) this.envRT.dispose();
        this.envRT = this.pmrem.fromScene(this.envScene, 0, 1, 3000);
        this.scene.environment = this.envRT.texture;
      };
      clearTimeout(this.envTimer);
      if (now) regen();
      else this.envTimer = setTimeout(regen, 120);
    }

    // ---------- camera ----------
    setupControls() {
      const H = AT.HOME;
      this.c = {
        tx: new Spring(H.target[0]), ty: new Spring(H.target[1] + 4), tz: new Spring(H.target[2]),
        r: new Spring(H.r * 2.2), th: new Spring(H.th - 0.9), ph: new Spring(1.5),
      };
      this.resp = 1.6;
      this.vel = { th: 0, ph: 0 };
      this.flyTo(this.homeView());
      const el = this.renderer.domElement;
      el.style.touchAction = 'none';
      const ptrs = new Map();
      let last = null, hist = [], pinch0 = null, engaged = false;
      const stopAuto = () => {
        if (this.walkState) this.stopWalk();
        this.resp = 0.12;
        for (const k of ['tx', 'ty', 'tz', 'r', 'th', 'ph']) this.c[k].g = this.c[k].x;
      };
      el.addEventListener('pointerdown', (e) => {
        el.setPointerCapture(e.pointerId);
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        stopAuto();
        engaged = true;
        this.vel.th = this.vel.ph = 0;
        last = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey };
        hist = [];
        if (ptrs.size === 2) {
          const [a, b] = [...ptrs.values()];
          pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y), r: this.c.r.g, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
        }
        this.emit('interact');
      });
      el.addEventListener('pointermove', (e) => {
        if (!ptrs.has(e.pointerId)) return;
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (ptrs.size === 2 && pinch0) {
          const [a, b] = [...ptrs.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          this.c.r.g = THREE.MathUtils.clamp(pinch0.r * (pinch0.d / d), 1.4, 160);
          const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
          this.pan(cx - pinch0.cx, cy - pinch0.cy);
          pinch0.cx = cx; pinch0.cy = cy;
          return;
        }
        const dx = e.clientX - last.x, dy = e.clientY - last.y;
        last.x = e.clientX; last.y = e.clientY;
        if (last.pan) this.pan(dx, dy);
        else {
          this.c.th.g -= dx * 0.0055;
          this.c.ph.g = THREE.MathUtils.clamp(this.c.ph.g - dy * 0.0045, 0.06, Math.PI - 0.06);
          hist.push({ t: performance.now(), dx, dy });
          if (hist.length > 6) hist.shift();
        }
      });
      const up = (e) => {
        if (!ptrs.has(e.pointerId)) return;
        ptrs.delete(e.pointerId);
        if (ptrs.size < 2) pinch0 = null;
        if (ptrs.size === 0 && last && !last.pan && hist.length) {
          // carry the drag velocity into a short glide
          const now = performance.now();
          const recent = hist.filter((h) => now - h.t < 90);
          if (recent.length) {
            const span = Math.max(16, now - recent[0].t) / 1000;
            const sx = recent.reduce((s, h) => s + h.dx, 0), sy = recent.reduce((s, h) => s + h.dy, 0);
            this.vel.th = (-sx * 0.0055) / span;
            this.vel.ph = (-sy * 0.0045) / span;
          }
        }
      };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      el.addEventListener('pointerleave', () => { if (!ptrs.size) engaged = false; });
      el.addEventListener('wheel', (e) => {
        // Zoom only with a pinch or modifier, or after the visitor clicks into the scene,
        // so the page still scrolls past the viewer.
        if (!(e.ctrlKey || e.metaKey || engaged)) { this.emit('wheelhint'); return; }
        e.preventDefault();
        stopAuto();
        const k = e.ctrlKey ? 0.01 : 0.0012;
        this.c.r.g = THREE.MathUtils.clamp(this.c.r.g * Math.exp(e.deltaY * k), 1.4, 160);
      }, { passive: false });
    }

    pan(dx, dy) {
      const cam = this.camera;
      const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
      const upv = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
      const k = this.c.r.x * 0.0016;
      const c = this.c;
      c.tx.g += (-right.x * dx + upv.x * dy) * k;
      c.ty.g = THREE.MathUtils.clamp(c.ty.g + (-right.y * dx + upv.y * dy) * k, 0.4, 30);
      c.tz.g += (-right.z * dx + upv.z * dy) * k;
    }

    zoom(f) {
      this.resp = 0.25;
      this.c.r.g = THREE.MathUtils.clamp(this.c.r.g * f, 1.4, 160);
    }

    flyTo(v) {
      const c = this.c;
      let th = v.th;
      while (th - c.th.x > Math.PI) th -= Math.PI * 2;
      while (th - c.th.x < -Math.PI) th += Math.PI * 2;
      c.tx.g = v.target[0]; c.ty.g = v.target[1]; c.tz.g = v.target[2];
      c.r.g = v.r; c.th.g = th; c.ph.g = v.ph;
      this.vel.th = this.vel.ph = 0;
      this.resp = 1.25;
      if (reduce) for (const k of ['tx', 'ty', 'tz', 'r', 'th', 'ph']) c[k].snap(c[k].g);
    }

    // Pull back on tall, narrow screens so the whole arch fits.
    homeView() {
      const a = this.el.clientWidth / Math.max(1, this.el.clientHeight);
      const k = a < 1 ? Math.min(1.9, 1.15 / a) : 1;
      return Object.assign({}, AT.HOME, { r: AT.HOME.r * k, target: [AT.HOME.target[0], AT.HOME.target[1] + (k > 1 ? 1.5 : 0), AT.HOME.target[2]] });
    }

    home() { this.stopWalk(); this.flyTo(this.homeView()); }

    select(id) {
      const h = AT.HOTSPOTS.find((x) => x.id === id);
      if (!h) return;
      this.stopWalk();
      const a = this.el.clientWidth / Math.max(1, this.el.clientHeight);
      const k = a < 1 && !h.interior ? Math.min(1.7, 1.05 / a) : 1;
      this.flyTo(Object.assign({}, h.view, { r: h.view.r * k }));
      this.active = id;
      this.emit('select', h);
    }

    // ---------- toggles ----------
    setPaint(on) { this.anim.paint.g = on ? 1 : 0; }
    setRestore(on) { this.anim.restore.g = on ? 1 : 0; }

    // ---------- walks ----------
    walk(name) {
      const w = AT.WALKS[name];
      this.walkState = { w, t: 0, cap: -1, name };
      this.emit('walk', { name, on: true });
    }
    stopWalk() {
      if (!this.walkState) return;
      const ws = this.walkState;
      this.walkState = null;
      // hand the camera back to the orbit controls where the walk left it
      const pos = this.camera.position.clone();
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      const tgt = pos.clone().addScaledVector(dir, 6);
      const c = this.c;
      c.tx.snap(tgt.x); c.ty.snap(tgt.y); c.tz.snap(tgt.z); c.r.snap(6);
      c.th.snap(Math.atan2(-dir.x, -dir.z));
      c.ph.snap(Math.acos(THREE.MathUtils.clamp(-dir.y, -1, 1)));
      this.resp = 0.4;
      this.emit('walk', { name: ws.name, on: false });
    }

    walkFrame(dt) {
      const ws = this.walkState, w = ws.w;
      ws.t = Math.min(1, ws.t + dt / w.dur);
      const e = ws.t < 0.5 ? 2 * ws.t * ws.t : 1 - Math.pow(-2 * ws.t + 2, 2) / 2;
      const z = w.z0 + (w.z1 - w.z0) * (0.08 * e + 0.92 * ws.t);
      const s = Math.sign(w.z1 - w.z0);
      // look keys in travel order
      const keys = w.look;
      let yaw = keys[0][1], pitch = keys[0][2];
      for (let i = 0; i < keys.length - 1; i++) {
        const a = keys[i], b = keys[i + 1];
        const pa = (a[0] - w.z0) * s, pb = (b[0] - w.z0) * s, pz = (z - w.z0) * s;
        if (pz >= pa && pz <= pb) {
          const k = AT.smooth(0, 1, (pz - pa) / Math.max(1e-6, pb - pa));
          yaw = a[1] + (b[1] - a[1]) * k;
          pitch = a[2] + (b[2] - a[2]) * k;
        } else if (pz > pb) { yaw = b[1]; pitch = b[2]; }
      }
      const fwd = new THREE.Vector3(0, 0, s), left = new THREE.Vector3(s, 0, 0);
      const hz = fwd.clone().multiplyScalar(Math.cos(yaw)).addScaledVector(left, Math.sin(yaw));
      const dir = hz.multiplyScalar(Math.cos(pitch)).add(new THREE.Vector3(0, Math.sin(pitch), 0));
      const bob = Math.sin(ws.t * w.dur * 5.2) * 0.012;
      this.camera.position.set(0, 1.65 + bob, z);
      this.camera.lookAt(this.camera.position.clone().add(dir));
      let idx = -1;
      w.captions.forEach((c, i) => { if ((z - w.z0) * s >= (c[0] - w.z0) * s - 0.01) idx = i; });
      if (idx !== ws.cap) {
        ws.cap = idx;
        if (idx >= 0) this.emit('caption', w.captions[idx][1]);
      }
      if (ws.t >= 1) this.stopWalk();
    }

    // ---------- hotspots ----------
    setupHotspots() {
      this.hot = AT.HOTSPOTS.map((h) => {
        const b = document.createElement('button');
        b.className = 'hotspot';
        b.type = 'button';
        b.setAttribute('aria-label', h.title);
        b.innerHTML = `<span class="hs-dot"></span><span class="hs-label">${h.title}</span>`;
        b.addEventListener('pointerdown', (e) => e.stopPropagation());
        b.addEventListener('click', () => this.select(h.id));
        this.hotLayer.appendChild(b);
        return { h, b, p: new THREE.Vector3(...h.pos), n: new THREE.Vector3(...h.n), vis: 0 };
      });
    }

    hotVisible(o, cam) {
      const p = o.p, toCam = cam.clone().sub(p);
      if (toCam.dot(o.n) <= 0) return false;
      if (!o.h.interior) {
        // hidden while the camera stands in or under the arch
        const under = Math.abs(cam.x) < K.W / 2 && Math.abs(cam.z) < K.D / 2 + 0.9 && cam.y < K.CORN_TOP;
        return !under;
      }
      const inside = Math.abs(cam.x) < K.a && Math.abs(cam.z) < K.D / 2 && cam.y < K.I + K.r;
      if (inside) return true;
      if (Math.abs(cam.z) <= K.D / 2) return false;
      const zf = Math.sign(cam.z) * K.D / 2;
      const t = (zf - p.z) / (cam.z - p.z);
      const q = p.clone().addScaledVector(toCam, t);
      const ax = Math.abs(q.x);
      return ax < K.a - 0.05 && q.y > 0 && q.y < K.I + Math.sqrt(Math.max(0, K.r * K.r - ax * ax)) - 0.05;
    }

    updateHotspots(dt) {
      const cam = this.camera.position, w = this.el.clientWidth, h = this.el.clientHeight;
      const v = new THREE.Vector3();
      for (const o of this.hot) {
        v.copy(o.p).project(this.camera);
        const front = v.z < 1;
        const want = front && !this.walkState && this.hotVisible(o, cam) ? 1 : 0;
        o.vis += (want - o.vis) * Math.min(1, dt * 10);
        const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
        o.b.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        o.b.style.opacity = o.vis.toFixed(3);
        o.b.style.pointerEvents = o.vis > 0.5 ? 'auto' : 'none';
        o.b.classList.toggle('active', this.active === o.h.id);
      }
    }

    resize() {
      const w = this.el.clientWidth, h = this.el.clientHeight;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / Math.max(1, h);
      this.camera.fov = w < 640 ? 52 : 40;
      this.camera.updateProjectionMatrix();
    }

    frame(dt) {
      const c = this.c;
      if (this.walkState) this.walkFrame(dt);
      else {
        if (Math.abs(this.vel.th) + Math.abs(this.vel.ph) > 1e-4) {
          c.th.g += this.vel.th * dt;
          c.ph.g = THREE.MathUtils.clamp(c.ph.g + this.vel.ph * dt, 0.06, Math.PI - 0.06);
          const k = Math.exp(-dt * 4.5);
          this.vel.th *= k;
          this.vel.ph *= k;
        }
        const steps = 2;
        for (let i = 0; i < steps; i++) for (const k of ['tx', 'ty', 'tz', 'r', 'th', 'ph']) c[k].step(dt / steps, this.resp);
        const sp = Math.sin(c.ph.x);
        const pos = new THREE.Vector3(
          c.tx.x + c.r.x * sp * Math.sin(c.th.x),
          c.ty.x + c.r.x * Math.cos(c.ph.x),
          c.tz.x + c.r.x * sp * Math.cos(c.th.x)
        );
        const gy = AT.hgt(pos.x, pos.z) + 0.3;
        if (pos.y < gy) pos.y = gy;
        this.camera.position.copy(pos);
        this.camera.lookAt(c.tx.x, c.ty.x, c.tz.x);
      }
      this.anim.paint.step(dt, 0.6);
      this.anim.restore.step(dt, 0.6);
      AT.stoneU.uPaint.value = THREE.MathUtils.clamp(this.anim.paint.x, 0, 1);
      AT.stoneU.uRestore.value = THREE.MathUtils.clamp(this.anim.restore.x, 0, 1);
      // keep the subject clear of the side panel
      const w = this.el.clientWidth, h = this.el.clientHeight;
      // a side panel on wide screens, a bottom sheet on phones
      const wide = w > 760;
      const wantX = this.panelOpen && wide ? Math.min(220, w * 0.22) : 0;
      const wantY = this.panelOpen && !wide ? h * 0.27 : 0;
      const k = Math.min(1, dt * 6);
      this.shiftX = (this.shiftX || 0) + (wantX - (this.shiftX || 0)) * k;
      this.shiftY = (this.shiftY || 0) + (wantY - (this.shiftY || 0)) * k;
      if (Math.abs(this.shiftX) + Math.abs(this.shiftY) > 0.5) this.camera.setViewOffset(w, h, this.shiftX, this.shiftY, w, h);
      else if (this.camera.view && this.camera.view.enabled) this.camera.clearViewOffset();
      this.camera.updateMatrixWorld();
      this.updateHotspots(dt);
      this.renderer.render(this.scene, this.camera);
    }
  }

  AT.Viewer = Viewer;
})();
