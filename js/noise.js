// Seeded random numbers and tileable value noise for procedural stone.
(function () {
  const AT = (window.AT = window.AT || {});

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeNoise(seed) {
    const r = mulberry32(seed);
    const perm = new Uint8Array(512);
    const p = [];
    for (let i = 0; i < 256; i++) p.push(i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = p[i];
      p[i] = p[j];
      p[j] = t;
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const val = new Float32Array(256);
    for (let i = 0; i < 256; i++) val[i] = r();
    const hash = (x, y) => val[perm[(perm[x & 255] + (y & 255)) & 511]];
    const wrap = (v, per) => (per ? ((v % per) + per) % per : v);

    // Value noise in [0,1]. per (integer) makes it tile with that period.
    function n2(x, y, per) {
      const ix = Math.floor(x), iy = Math.floor(y);
      const fx = x - ix, fy = y - iy;
      const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
      const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
      const x0 = wrap(ix, per), x1 = wrap(ix + 1, per);
      const y0 = wrap(iy, per), y1 = wrap(iy + 1, per);
      const a = hash(x0, y0), b = hash(x1, y0), c = hash(x0, y1), d = hash(x1, y1);
      return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
    }
    function fbm(x, y, oct, per) {
      let s = 0, amp = 0.5, f = 1, n = 0;
      for (let i = 0; i < oct; i++) {
        s += amp * n2(x * f, y * f, per ? per * f : 0);
        n += amp;
        amp *= 0.5;
        f *= 2;
      }
      return s / n;
    }
    // Ridged noise for veins and cracks.
    function ridge(x, y, oct, per) {
      let s = 0, amp = 0.5, f = 1, n = 0;
      for (let i = 0; i < oct; i++) {
        const v = 1 - Math.abs(n2(x * f, y * f, per ? per * f : 0) * 2 - 1);
        s += amp * v * v;
        n += amp;
        amp *= 0.5;
        f *= 2;
      }
      return s / n;
    }
    return { n2, fbm, ridge };
  }

  // Separable box blur, run several passes to approach a Gaussian.
  function blur(src, w, h, radius, passes) {
    if (radius < 1) return src.slice();
    const r = Math.max(1, Math.round(radius));
    let a = src.slice();
    let b = new Float32Array(w * h);
    const inv = 1 / (2 * r + 1);
    for (let p = 0; p < (passes || 3); p++) {
      for (let y = 0; y < h; y++) {
        const row = y * w;
        let acc = 0;
        for (let k = -r; k <= r; k++) acc += a[row + Math.min(w - 1, Math.max(0, k))];
        for (let x = 0; x < w; x++) {
          b[row + x] = acc * inv;
          const add = Math.min(w - 1, x + r + 1);
          const sub = Math.max(0, x - r);
          acc += a[row + add] - a[row + sub];
        }
      }
      for (let x = 0; x < w; x++) {
        let acc = 0;
        for (let k = -r; k <= r; k++) acc += b[Math.min(h - 1, Math.max(0, k)) * w + x];
        for (let y = 0; y < h; y++) {
          a[y * w + x] = acc * inv;
          const add = Math.min(h - 1, y + r + 1);
          const sub = Math.max(0, y - r);
          acc += b[add * w + x] - b[sub * w + x];
        }
      }
    }
    return a;
  }

  AT.rng = mulberry32;
  AT.makeNoise = makeNoise;
  AT.blur = blur;
  AT.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  AT.smooth = (a, b, v) => {
    const t = AT.clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
})();
