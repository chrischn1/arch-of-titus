// Relief engine. A relief is a height field in centimeters, built from depth planes.
// Each plane draws its figures as canvas silhouettes; the engine blurs them into
// rounded forms, adds volume, cuts drapery folds, then stacks planes front over back.
(function () {
  const AT = (window.AT = window.AT || {});
  const { blur, clamp, smooth } = AT;

  class Relief {
    constructor(wcm, hcm, pxPerCm, seed) {
      this.wcm = wcm;
      this.hcm = hcm;
      this.s = pxPerCm;
      this.w = Math.round(wcm * pxPerCm);
      this.h = Math.round(hcm * pxPerCm);
      this.H = new Float32Array(this.w * this.h);
      this.P = null; // paint mask
      this.cv = document.createElement('canvas');
      this.cv.width = this.w;
      this.cv.height = this.h;
      this.ctx = this.cv.getContext('2d', { willReadFrequently: true });
      this.noise = AT.makeNoise(seed || 7);
      this.rng = AT.rng(seed || 7);
    }

    // Draw with cm coordinates and return the alpha channel as a mask.
    mask(draw) {
      const c = this.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, this.w, this.h);
      c.setTransform(this.s, 0, 0, this.s, 0, 0);
      c.fillStyle = '#fff';
      c.strokeStyle = '#fff';
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.globalAlpha = 1;
      draw(c);
      const d = c.getImageData(0, 0, this.w, this.h).data;
      const m = new Float32Array(this.w * this.h);
      for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] / 255;
      return m;
    }

    // One depth plane. draw(c, pass) is called for passes body, dome, fold, hi.
    plane(o, draw) {
      const n = this.w * this.h, s = this.s;
      const body = this.mask((c) => draw(c, 'body'));
      // A small blur gives a steep, undercut edge. A wide blur of the same mask
      // swells the large masses (torsos, horses) more than thin limbs.
      const b = blur(body, this.w, this.h, (o.blur || 0.9) * s, 3);
      const rb = o.round ? blur(body, this.w, this.h, (o.roundBlur || 5) * s, 3) : null;
      const P = new Float32Array(n);
      const IN = new Uint8Array(n);
      const H = this.H;
      const base = o.base || 0, amp = o.amp == null ? 3 : o.amp;
      for (let i = 0; i < n; i++) {
        const v = b[i];
        if (v > 0.03) {
          IN[i] = 1;
          const t = smooth(0.03, 0.4, v);
          P[i] = H[i] * (1 - t) + base * t + amp * Math.pow(v, 0.45);
          if (rb) P[i] += o.round * rb[i] * rb[i] * t;
        }
      }
      if (o.dome) {
        const dm = blur(this.mask((c) => draw(c, 'dome')), this.w, this.h, (o.domeBlur || 3) * s, 2);
        for (let i = 0; i < n; i++) if (IN[i]) P[i] += o.dome * dm[i];
      }
      const f = o.fold == null ? 1.1 : o.fold;
      if (f) {
        const fm = blur(this.mask((c) => draw(c, 'fold')), this.w, this.h, (o.foldBlur || 0.7) * s, 2);
        for (let i = 0; i < n; i++) if (IN[i]) P[i] = Math.max(base * 0.6 + H[i] * 0.4, P[i] - f * fm[i]);
      }
      const hi = o.hi == null ? 1.0 : o.hi;
      if (hi) {
        const hm = blur(this.mask((c) => draw(c, 'hi')), this.w, this.h, (o.hiBlur || 0.6) * s, 2);
        for (let i = 0; i < n; i++) if (IN[i] && hm[i] > 0.02) P[i] += hi * hm[i];
      }
      for (let i = 0; i < n; i++) if (IN[i] && P[i] > H[i]) H[i] = P[i];
      return this;
    }

    // Generic layer with an explicit mode.
    layer(draw, o) {
      const n = this.w * this.h;
      const m = blur(this.mask(draw), this.w, this.h, (o.blur || 1) * this.s, o.passes || 2);
      const H = this.H, a = o.amp;
      for (let i = 0; i < n; i++) {
        const v = o.pow ? Math.pow(m[i], o.pow) : m[i];
        if (o.mode === 'add') H[i] += a * v;
        else if (o.mode === 'sub') H[i] -= a * v;
        else if (o.mode === 'set') { if (m[i] > 0.001) H[i] = H[i] * (1 - m[i]) + a * m[i]; }
        else H[i] = Math.max(H[i], a * v);
      }
      return this;
    }

    paintMask(draw, blurCm) {
      const m = this.mask(draw);
      this.P = blur(m, this.w, this.h, (blurCm || 0.8) * this.s, 2);
      return this;
    }

    // Weathering: surface grain, pits and broken edges.
    weather(o) {
      o = o || {};
      const n = this.w * this.h, nz = this.noise, H = this.H;
      const grain = o.grain == null ? 0.35 : o.grain;
      const pits = (o.pits == null ? 1.6 : o.pits) * 0.6;
      for (let i = 0; i < n; i++) {
        const x = (i % this.w) / this.s, y = Math.floor(i / this.w) / this.s;
        const g = nz.fbm(x * 0.35, y * 0.35, 3) - 0.5;
        // broad wear on the high points, not holes
        const p = smooth(0.6, 0.85, nz.fbm(x * 0.05 + 9, y * 0.05, 4));
        const top = smooth(4, 14, H[i]);
        H[i] = Math.max(o.floor || 0, H[i] + g * grain - p * pits * top);
      }
      return this;
    }

    // Albedo with cavity darkening, plus normal map from the fine detail only.
    build(o) {
      o = o || {};
      const w = this.w, h = this.h, n = w * h, H = this.H, s = this.s, nz = this.noise;
      const low = blur(H, w, h, 3 * s, 3);
      const vlow = blur(H, w, h, 10 * s, 2);
      const fineLow = blur(H, w, h, 1.2 * s, 2);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const x = c.getContext('2d');
      const im = x.createImageData(w, h);
      const tint = o.tint || [0.8, 0.77, 0.71];
      for (let i = 0; i < n; i++) {
        const px = (i % w) / s, py = Math.floor(i / w) / s;
        // dirt gathers in hollows; raised surfaces stay lighter
        const cav = clamp((low[i] - H[i]) * 0.13 + (vlow[i] - H[i]) * 0.035, 0, 0.6);
        const exp = clamp((H[i] - vlow[i]) * 0.025, 0, 0.14);
        const m = nz.fbm(px * 0.03, py * 0.03, 4);
        const f = nz.fbm(px * 0.5, py * 0.5, 2);
        const spot = smooth(0.7, 0.85, nz.fbm(px * 0.08 + 4, py * 0.08, 4)) * 0.08;
        let k = (1 - cav) * (0.93 + (m - 0.5) * 0.18 + (f - 0.5) * 0.06 + exp);
        k *= 1 - spot;
        const pat = smooth(0.4, 0.8, m) * 0.12;
        const j = i * 4;
        im.data[j] = clamp(tint[0] * k * (1 - pat * 0.2) + pat * 0.1, 0, 1) * 255;
        im.data[j + 1] = clamp(tint[1] * k * (1 - pat * 0.3) + pat * 0.07, 0, 1) * 255;
        im.data[j + 2] = clamp(tint[2] * k * (1 - pat * 0.5), 0, 1) * 255;
        im.data[j + 3] = 255;
      }
      x.putImageData(im, 0, 0);
      const hp = new Float32Array(n);
      for (let i = 0; i < n; i++) hp[i] = H[i] - fineLow[i];
      const nm = AT.textures.heightToNormal(hp, w, h, s * 0.5, false);
      const out = {
        map: AT.textures.toTex(c, { srgb: true, clamp: true }),
        normalMap: AT.textures.toTex(nm, { clamp: true }),
      };
      if (this.P) {
        const pc = document.createElement('canvas');
        pc.width = w;
        pc.height = h;
        const px = pc.getContext('2d');
        const pi = px.createImageData(w, h);
        for (let i = 0; i < n; i++) {
          const v = clamp(this.P[i], 0, 1) * 255;
          pi.data[i * 4] = v; pi.data[i * 4 + 1] = v; pi.data[i * 4 + 2] = v; pi.data[i * 4 + 3] = 255;
        }
        px.putImageData(pi, 0, 0);
        out.paintMap = AT.textures.toTex(pc, { clamp: true });
      }
      return out;
    }

    sample(u, v) {
      // u right, v up, both 0..1
      const fx = u * (this.w - 1), fy = (1 - v) * (this.h - 1);
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const x1 = Math.min(this.w - 1, x0 + 1), y1 = Math.min(this.h - 1, y0 + 1);
      const tx = fx - x0, ty = fy - y0, H = this.H, w = this.w;
      const a = H[y0 * w + x0], b = H[y0 * w + x1], c = H[y1 * w + x0], d = H[y1 * w + x1];
      return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
    }

    // Flat panel geometry, displaced along +z. Size in meters.
    geometry(segPerCm) {
      const k = segPerCm || 1;
      const g = new THREE.PlaneGeometry(this.wcm / 100, this.hcm / 100, Math.round(this.wcm * k), Math.round(this.hcm * k));
      const p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) p.setZ(i, this.sample(uv.getX(i), uv.getY(i)) / 100);
      g.computeVertexNormals();
      return g;
    }
  }

  // Keep only triangles whose centroid passes the test (x, y in geometry units).
  function filterTris(g, keep) {
    const p = g.attributes.position, idx = g.index.array, out = [];
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i], b = idx[i + 1], c = idx[i + 2];
      const cx = (p.getX(a) + p.getX(b) + p.getX(c)) / 3;
      const cy = (p.getY(a) + p.getY(b) + p.getY(c)) / 3;
      if (keep(cx, cy)) out.push(a, b, c);
    }
    g.setIndex(out);
    return g;
  }

  // Mirror a geometry across x = 0 and keep faces pointing the same way.
  function mirrorX(g) {
    const m = g.clone();
    const p = m.attributes.position;
    for (let i = 0; i < p.count; i++) p.setX(i, -p.getX(i));
    const uv = m.attributes.uv;
    if (uv) for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
    const idx = m.index.array.slice();
    for (let i = 0; i < idx.length; i += 3) {
      const t = idx[i + 1];
      idx[i + 1] = idx[i + 2];
      idx[i + 2] = t;
    }
    m.setIndex(Array.from(idx));
    m.computeVertexNormals();
    return m;
  }

  // ---------- Drawing primitives, in cm, canvas y down ----------

  function limb(c, pts, w0, w1) {
    // A tapered limb through a list of points.
    const n = pts.length;
    for (let i = 0; i < n - 1; i++) {
      const t0 = i / (n - 1), t1 = (i + 1) / (n - 1);
      c.lineWidth = w0 + (w1 - w0) * ((t0 + t1) / 2);
      c.beginPath();
      c.moveTo(pts[i][0], pts[i][1]);
      c.lineTo(pts[i + 1][0], pts[i + 1][1]);
      c.stroke();
    }
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      c.beginPath();
      c.arc(pts[i][0], pts[i][1], (w0 + (w1 - w0) * t) / 2, 0, Math.PI * 2);
      c.fill();
    }
  }

  function poly(c, pts, fill) {
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath();
    if (fill !== false) c.fill();
  }

  function smoothPoly(c, pts) {
    // Closed curve through midpoints, for soft outlines.
    const n = pts.length;
    c.beginPath();
    const m0 = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2];
    c.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    c.closePath();
    c.fill();
  }

  function ell(c, x, y, rx, ry, rot) {
    c.beginPath();
    c.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
    c.fill();
  }

  function curve(c, pts, w) {
    c.lineWidth = w;
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 3) c.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
    else if (pts.length === 4) c.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]);
    else for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.stroke();
  }

  function dome(c, x, y, r, a) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a == null ? 1 : a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#fff';
  }

  // A human figure. Local units: 170 tall, feet at 0, facing +x.
  // o: { dir, h, pose, dress: 'tunic'|'toga'|'long'|'bare', wreath, helmet, beard, cloak, step }
  function figure(c, pass, x, foot, o) {
    const dir = o.dir || 1, s = (o.h || 160) / 170;
    c.save();
    c.translate(x, foot);
    c.scale(dir * s, s);
    if (o.lean) c.rotate(o.lean);
    const dress = o.dress || 'tunic';
    const step = o.step == null ? 1 : o.step;
    const hemY = dress === 'long' || dress === 'toga' ? -8 : -62;
    const headX = o.lookBack ? -1 : 3;
    if (pass === 'body') {
      // legs
      if (dress !== 'long' && dress !== 'toga') {
        limb(c, [[5, -72], [6 + 7 * step, -38], [9 + 10 * step, -5]], 13, 7.5);
        limb(c, [[-5, -72], [-5 - 6 * step, -38], [-9 - 10 * step, -5]], 13, 7.5);
        ell(c, 14 + 10 * step, -3, 9, 3.5);
        ell(c, -4 - 10 * step, -3, 9, 3.5);
      } else {
        ell(c, 12, -3, 9, 3.5);
        ell(c, -6, -3, 8, 3.5);
      }
      // torso and skirt
      const hemF = dress === 'long' || dress === 'toga' ? 20 : 24;
      smoothPoly(c, [
        [-14, -141], [13, -142], [18, -124], [15, -104], [hemF, hemY + 4], [hemF - 2, hemY],
        [-hemF, hemY + 2], [-hemF - 1, hemY + 6], [-19, -102], [-17, -126],
      ]);
      // neck and head
      poly(c, [[-4, -150], [7, -150], [8, -138], [-5, -138]]);
      ell(c, headX, -157, 10, 12.5);
      ell(c, headX + dir * 0 + 9.5, -156, 3, 4); // nose and face front
      if (o.helmet) {
        ell(c, headX - 1, -164, 12, 9);
        limb(c, [[headX - 6, -172], [headX + 2, -180], [headX + 10, -176]], 5, 3);
      }
      if (o.cloak) {
        smoothPoly(c, [[-15, -144], [-6, -146], [-12, -118], [-22, -84], [-34, -70], [-30, -96], [-22, -126]]);
      }
      if (dress === 'toga') {
        smoothPoly(c, [[8, -140], [18, -132], [20, -100], [10, -86], [-20, -70], [-24, -90], [-10, -118]]);
      }
      // arms
      const pose = o.pose || 'down';
      const A = arms(pose, o);
      for (const a of A) limb(c, a, 9, 6.5);
      if (o.hold) holdItem(c, o.hold, A);
    } else if (pass === 'dome') {
      dome(c, 0, -112, 34, 1);
      dome(c, headX, -157, 11, 0.8);
      if (dress === 'bare') dome(c, 6, -125, 14, 0.6);
    } else if (pass === 'fold') {
      // drapery folds
      const lines = dress === 'tunic' || dress === 'bare'
        ? [[[-12, -98], [-4, -84], [-14, -64]], [[0, -98], [6, -82], [4, -64]], [[10, -100], [18, -84], [18, -66]], [[-10, -136], [2, -120], [12, -104]], [[-14, -124], [-6, -112], [4, -100]]]
        : [[[-12, -98], [-8, -60], [-14, -12]], [[0, -100], [4, -60], [2, -10]], [[12, -100], [16, -60], [14, -12]], [[-10, -136], [4, -118], [14, -98]], [[-16, -110], [0, -96], [16, -84]], [[-18, -86], [-4, -72], [18, -66]]];
      for (const l of lines) curve(c, l, 1.6);
      curve(c, [[-17, -102], [0, -100], [16, -103]], 2); // belt
      // eye socket and mouth
      c.beginPath(); c.arc(headX + 6, -160, 1.6, 0, Math.PI * 2); c.fill();
      if (o.cloak) {
        curve(c, [[-14, -138], [-20, -110], [-28, -80]], 1.6);
        curve(c, [[-10, -136], [-15, -108], [-22, -86]], 1.4);
      }
    } else if (pass === 'hi') {
      if (o.wreath) for (let a = 200; a <= 345; a += 18) {
        const r = (a * Math.PI) / 180;
        ell(c, headX + Math.cos(r) * 10.5, -158 + Math.sin(r) * 12.5, 3.2, 1.6, r + 0.7);
      }
      // hair
      for (let a = 190; a <= 350; a += 30) {
        const r = (a * Math.PI) / 180;
        ell(c, headX - 1 + Math.cos(r) * 8.5, -159 + Math.sin(r) * 10.5, 2.2, 2.2);
      }
      if (o.beard) ell(c, headX + 5, -147, 6, 5);
    }
    c.restore();
  }

  function arms(pose, o) {
    const sh = [11, -136], shB = [-11, -136];
    switch (pose) {
      case 'carry': // hand up at the pole on the shoulder
        return [[sh, [19, -120], [15, -146]], [shB, [-14, -112], [-6, -98]]];
      case 'carry2':
        return [[sh, [20, -122], [16, -147]], [shB, [-4, -124], [8, -146]]];
      case 'raise':
        return [[sh, [22, -150], [26, -170]], [shB, [-14, -112], [-6, -98]]];
      case 'raiseBoth':
        return [[sh, [18, -156], [14, -178]], [shB, [-6, -156], [2, -178]]];
      case 'bridle':
        return [[sh, [26, -128], [42, -126]], [shB, [-14, -112], [-6, -98]]];
      case 'crown':
        return [[sh, [24, -152], [42, -164]], [shB, [-14, -112], [-6, -98]]];
      case 'scepter':
        return [[sh, [22, -122], [30, -132]], [shB, [-4, -112], [14, -104]]];
      default:
        return [[sh, [16, -110], [22, -96]], [shB, [-14, -112], [-8, -96]]];
    }
  }

  function holdItem(c, item, A) {
    const hand = A[0][2];
    if (item === 'scepter') limb(c, [[hand[0] - 6, hand[1] + 60], [hand[0] + 6, hand[1] - 50]], 3.5, 3);
    if (item === 'wreath') {
      c.lineWidth = 3.5;
      c.beginPath();
      c.ellipse(hand[0] + 4, hand[1] - 4, 9, 6, 0, 0, Math.PI * 2);
      c.stroke();
    }
    if (item === 'spear') limb(c, [[hand[0] - 4, hand[1] + 120], [hand[0] + 4, hand[1] - 40]], 3.5, 3);
    if (item === 'branch') {
      limb(c, [[hand[0], hand[1]], [hand[0] + 8, hand[1] - 30]], 2.5, 1.5);
      for (let k = 0; k < 5; k++) ell(c, hand[0] + 2 + k * 1.6, hand[1] - 8 - k * 5, 4, 1.6, -0.6 + (k % 2) * 1.2);
    }
  }

  // Horse, local units: about 150 high at the withers, facing +x.
  function horse(c, pass, x, foot, o) {
    const dir = o.dir || 1, s = o.s || 1;
    const rear = o.rear || 0; // 0 walk, 1 prancing
    c.save();
    c.translate(x, foot);
    c.scale(dir * s, s);
    if (pass === 'body') {
      ell(c, 0, -104, 54, 27, -0.06);
      ell(c, 38, -112, 26, 31, -0.2);
      ell(c, -38, -108, 28, 30, 0.1);
      poly(c, [[30, -128], [52, -102], [72, -150], [70, -178], [54, -186], [40, -158]]);
      poly(c, [[56, -188], [66, -194], [96, -156], [92, -146], [80, -144], [64, -160]]);
      ell(c, 88, -150, 8, 7);
      poly(c, [[57, -190], [60, -204], [64, -191]]);
      // legs
      if (rear) {
        limb(c, [[44, -92], [64, -76], [58, -54]], 12, 7);
        limb(c, [[32, -92], [40, -66], [52, -46]], 12, 7);
      } else {
        limb(c, [[44, -92], [48, -50], [50, -6]], 12, 7);
        limb(c, [[32, -92], [28, -50], [24, -6]], 12, 7);
      }
      limb(c, [[-38, -92], [-50, -56], [-44, -6]], 14, 7);
      limb(c, [[-26, -94], [-26, -54], [-20, -6]], 13, 7);
      limb(c, [[-62, -118], [-72, -96], [-76, -64]], 9, 5);
    } else if (pass === 'dome') {
      dome(c, 0, -104, 50, 0.9);
      dome(c, 40, -114, 28, 0.8);
      dome(c, -38, -108, 28, 0.8);
      dome(c, 70, -168, 16, 0.6);
    } else if (pass === 'fold') {
      curve(c, [[52, -172], [70, -164], [86, -152]], 1.5); // bridle strap
      curve(c, [[60, -186], [62, -170], [66, -160]], 1.5);
      curve(c, [[10, -128], [0, -110], [-6, -84]], 1.4);
      curve(c, [[36, -136], [40, -110], [40, -90]], 1.4);
      curve(c, [[-40, -130], [-30, -112], [-30, -88]], 1.3);
      c.beginPath(); c.arc(74, -170, 1.6, 0, Math.PI * 2); c.fill(); // eye
    } else if (pass === 'hi') {
      for (let k = 0; k < 7; k++) ell(c, 50 + k * 3, -182 + k * 7, 4.5, 2.4, 0.9);
      ell(c, 60, -192, 3, 4);
      if (o.plume) limb(c, [[60, -194], [58, -206], [62, -212]], 4, 2);
    }
    c.restore();
  }

  AT.Relief = Relief;
  AT.relief = { filterTris, mirrorX, limb, poly, smoothPoly, ell, curve, dome, figure, horse };
})();
