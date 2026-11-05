// Procedural textures: marble masonry, stone detail, basalt paving, ground, gravel, brick.
// Every texture is drawn on a canvas at load time, so the site needs no image files.
(function () {
  const AT = (window.AT = window.AT || {});
  const { clamp, smooth } = AT;

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h || w;
    return c;
  }

  // Convert a height field to a tangent space normal map canvas.
  function heightToNormal(H, w, h, strength, wrapEdges) {
    const c = canvas(w, h);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h);
    const d = img.data;
    const at = (x, y) => {
      if (wrapEdges) {
        x = (x + w) % w;
        y = (y + h) % h;
      } else {
        x = x < 0 ? 0 : x >= w ? w - 1 : x;
        y = y < 0 ? 0 : y >= h ? h - 1 : y;
      }
      return H[y * w + x];
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
        const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
        // Canvas y runs down, texture v runs up, so flip dy.
        let nx = -dx, ny = dy, nz = 1;
        const l = Math.hypot(nx, ny, nz);
        const i = (y * w + x) * 4;
        d[i] = ((nx / l) * 0.5 + 0.5) * 255;
        d[i + 1] = ((ny / l) * 0.5 + 0.5) * 255;
        d[i + 2] = ((nz / l) * 0.5 + 0.5) * 255;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  function toTex(c, opts) {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = (opts && opts.clamp) ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    t.anisotropy = AT.maxAniso || 8;
    if (opts && opts.srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }

  // Marble ashlar: one tile covers 4 m by 4 m, four courses of 1 m.
  function marble(size) {
    const N = size || 1024;
    const nz = AT.makeNoise(11);
    const r = AT.rng(5);
    const col = new Float32Array(N * N * 3);
    const H = new Float32Array(N * N);
    const R = new Float32Array(N * N);
    const courses = 4, ch = N / courses;
    // Block joints per course, chosen so the tile wraps.
    const joints = [];
    for (let k = 0; k < courses; k++) {
      const start = Math.floor(r() * N);
      const list = [start];
      let acc = 0;
      for (;;) {
        const len = 230 + Math.floor(r() * 330);
        if (acc + len > N - 230) break; // the last block keeps at least 230 px
        acc += len;
        list.push((start + acc) % N);
      }
      const tints = list.map(() => [0.96 + r() * 0.08, 0.97 + r() * 0.06, 0.95 + r() * 0.07]);
      joints.push({ list: list.map((v) => v % N).sort((a, b) => a - b), tints });
    }
    for (let y = 0; y < N; y++) {
      const k = Math.floor(y / ch);
      const fy = y - k * ch;
      const J = joints[k];
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        // Find the joint distance and block index.
        let dmin = 1e9, bi = J.list.length - 1;
        for (let j = 0; j < J.list.length; j++) {
          let dd = Math.abs(x - J.list[j]);
          dd = Math.min(dd, N - dd);
          if (dd < dmin) dmin = dd;
          if (x >= J.list[j]) bi = j;
        }
        const dj = Math.min(dmin, fy, ch - fy);
        const u = x / N, v = y / N;
        const mott = nz.fbm(u * 6, v * 6, 5, 6);
        const vein = nz.ridge(u * 3 + mott * 1.6, v * 9 + mott * 0.8, 4, 3);
        const fine = nz.fbm(u * 64, v * 64, 3, 64);
        const spots = smooth(0.62, 0.8, nz.fbm(u * 18 + 3.1, v * 18, 4, 18));
        const tint = J.tints[bi % J.tints.length];
        let cr = 0.79, cg = 0.765, cb = 0.715;
        // golden patina
        const pat = smooth(0.35, 0.75, mott);
        cr = cr * (1 - pat * 0.12) + 0.8 * pat * 0.12;
        cg = cg * (1 - pat * 0.14) + 0.71 * pat * 0.14;
        cb = cb * (1 - pat * 0.2) + 0.56 * pat * 0.2;
        const vv = Math.pow(vein, 6) * 0.22;
        cr -= vv; cg -= vv; cb -= vv * 0.9;
        const g = (fine - 0.5) * 0.06;
        cr += g; cg += g; cb += g;
        cr *= tint[0]; cg *= tint[1]; cb *= tint[2];
        const sp = spots * 0.35;
        cr = cr * (1 - sp) + 0.46 * sp;
        cg = cg * (1 - sp) + 0.44 * sp;
        cb = cb * (1 - sp) + 0.41 * sp;
        // joint shading and edge wear
        const jw = 1 - smooth(0.4, 2.2 + fine * 2, dj);
        cr *= 1 - jw * 0.32; cg *= 1 - jw * 0.32; cb *= 1 - jw * 0.32;
        col[i * 3] = cr; col[i * 3 + 1] = cg; col[i * 3 + 2] = cb;
        H[i] = 0.5 + (fine - 0.5) * 0.25 - jw * 0.9 - spots * 0.05 - Math.pow(vein, 8) * 0.05;
        R[i] = clamp(0.62 + (fine - 0.5) * 0.25 + spots * 0.15 + jw * 0.2, 0, 1);
      }
    }
    const cA = canvas(N), xa = cA.getContext('2d'), ia = xa.createImageData(N, N);
    const cR = canvas(N), xr = cR.getContext('2d'), ir = xr.createImageData(N, N);
    for (let i = 0; i < N * N; i++) {
      ia.data[i * 4] = clamp(col[i * 3], 0, 1) * 255;
      ia.data[i * 4 + 1] = clamp(col[i * 3 + 1], 0, 1) * 255;
      ia.data[i * 4 + 2] = clamp(col[i * 3 + 2], 0, 1) * 255;
      ia.data[i * 4 + 3] = 255;
      const rv = R[i] * 255;
      ir.data[i * 4] = rv; ir.data[i * 4 + 1] = rv; ir.data[i * 4 + 2] = rv; ir.data[i * 4 + 3] = 255;
    }
    xa.putImageData(ia, 0, 0);
    xr.putImageData(ir, 0, 0);
    return {
      map: toTex(cA, { srgb: true }),
      normalMap: toTex(heightToNormal(H, N, N, 6, true)),
      roughnessMap: toTex(cR),
    };
  }

  // Detail: R fine noise, G travertine pores, B vertical rain streaks. One tile is 1 m.
  function detail(size) {
    const N = size || 512;
    const nz = AT.makeNoise(23);
    const c = canvas(N), x = c.getContext('2d'), im = x.createImageData(N, N);
    for (let py = 0; py < N; py++) {
      for (let px = 0; px < N; px++) {
        const u = px / N, v = py / N;
        const f = nz.fbm(u * 32, v * 32, 4, 32);
        const pore = smooth(0.66, 0.8, nz.fbm(u * 10, v * 40, 3, 10) * 0.6 + nz.n2(u * 64, v * 128, 64) * 0.4);
        const streak = smooth(0.45, 0.9, nz.fbm(u * 24, v * 2, 4, 24) * 0.8 + nz.n2(u * 90, v * 6, 90) * 0.2);
        const i = (py * N + px) * 4;
        im.data[i] = f * 255;
        im.data[i + 1] = pore * 255;
        im.data[i + 2] = streak * 255;
        im.data[i + 3] = 255;
      }
    }
    x.putImageData(im, 0, 0);
    return toTex(c);
  }

  // Tileable Voronoi cells for basalt paving and pebbles.
  function voronoi(N, cells, seed) {
    const r = AT.rng(seed);
    const pts = [];
    const cs = N / cells;
    for (let j = 0; j < cells; j++)
      for (let i = 0; i < cells; i++)
        pts.push([(i + 0.15 + r() * 0.7) * cs, (j + 0.15 + r() * 0.7) * cs, r()]);
    const F1 = new Float32Array(N * N), F2 = new Float32Array(N * N), ID = new Float32Array(N * N);
    for (let y = 0; y < N; y++) {
      const cj = Math.floor(y / cs);
      for (let x = 0; x < N; x++) {
        const ci = Math.floor(x / cs);
        let d1 = 1e9, d2 = 1e9, id = 0;
        for (let dj = -2; dj <= 2; dj++)
          for (let di = -2; di <= 2; di++) {
            const ii = (ci + di + cells) % cells, jj = (cj + dj + cells) % cells;
            const p = pts[jj * cells + ii];
            let px = p[0] + (ci + di - ii) * cs;
            let py = p[1] + (cj + dj - jj) * cs;
            const d = Math.hypot(x - px, y - py);
            if (d < d1) { d2 = d1; d1 = d; id = p[2]; } else if (d < d2) d2 = d;
          }
        const i = y * N + x;
        F1[i] = d1; F2[i] = d2; ID[i] = id;
      }
    }
    return { F1, F2, ID };
  }

  // Via Sacra: polygonal basalt (selce). One tile covers 6 m.
  function basalt() {
    const N = 1024;
    const nz = AT.makeNoise(31);
    const { F1, F2, ID } = voronoi(N, 8, 77);
    const H = new Float32Array(N * N);
    const c = canvas(N), x = c.getContext('2d'), im = x.createImageData(N, N);
    const cR = canvas(N), xr = cR.getContext('2d'), ir = xr.createImageData(N, N);
    for (let i = 0; i < N * N; i++) {
      const px = i % N, py = Math.floor(i / N);
      const edge = F2[i] - F1[i];
      const fine = nz.fbm(px / N * 80, py / N * 80, 3, 80);
      const mott = nz.fbm(px / N * 10, py / N * 10, 4, 10);
      const gap = 1 - smooth(1.5, 7 + fine * 4, edge);
      const dome = smooth(0, 60, edge);
      let g = 0.24 + ID[i] * 0.08 + (mott - 0.5) * 0.08 + (fine - 0.5) * 0.05;
      g += dome * 0.05; // worn, polished tops catch more light
      let cr = g * 1.04, cg = g * 1.0, cb = g * 0.95;
      cr = cr * (1 - gap) + 0.33 * gap; cg = cg * (1 - gap) + 0.28 * gap; cb = cb * (1 - gap) + 0.22 * gap;
      const k = i * 4;
      im.data[k] = clamp(cr, 0, 1) * 255; im.data[k + 1] = clamp(cg, 0, 1) * 255; im.data[k + 2] = clamp(cb, 0, 1) * 255; im.data[k + 3] = 255;
      H[i] = dome * 0.8 + (fine - 0.5) * 0.12 - gap * 0.6;
      const rv = clamp(0.5 - dome * 0.25 + gap * 0.45 + (fine - 0.5) * 0.2, 0, 1) * 255;
      ir.data[k] = rv; ir.data[k + 1] = rv; ir.data[k + 2] = rv; ir.data[k + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    xr.putImageData(ir, 0, 0);
    return { map: toTex(c, { srgb: true }), normalMap: toTex(heightToNormal(H, N, N, 4, true)), roughnessMap: toTex(cR) };
  }

  // Grass and dry earth. One tile covers 12 m.
  function ground() {
    const N = 1024;
    const nz = AT.makeNoise(41);
    const c = canvas(N), x = c.getContext('2d'), im = x.createImageData(N, N);
    const H = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) {
      const u = (i % N) / N, v = Math.floor(i / N) / N;
      const m = nz.fbm(u * 8, v * 8, 5, 8);
      const blades = nz.fbm(u * 220, v * 220, 2, 220);
      const dirt = smooth(0.42, 0.78, m) * 0.7;
      let cr = 0.27 + blades * 0.1, cg = 0.33 + blades * 0.11, cb = 0.18 + blades * 0.05;
      const dr = 0.4 + blades * 0.08, dg = 0.37 + blades * 0.07, db = 0.27 + blades * 0.05;
      cr = cr * (1 - dirt) + dr * dirt; cg = cg * (1 - dirt) + dg * dirt; cb = cb * (1 - dirt) + db * dirt;
      const k = i * 4;
      im.data[k] = cr * 255; im.data[k + 1] = cg * 255; im.data[k + 2] = cb * 255; im.data[k + 3] = 255;
      H[i] = blades * (1 - dirt) * 0.8 + m * 0.3;
    }
    x.putImageData(im, 0, 0);
    return { map: toTex(c, { srgb: true }), normalMap: toTex(heightToNormal(H, N, N, 3, true)) };
  }

  // Light gravel and packed earth around the arch. One tile covers 4 m.
  function gravel() {
    const N = 1024;
    const nz = AT.makeNoise(53);
    const { F1, F2, ID } = voronoi(N, 64, 91);
    const c = canvas(N), x = c.getContext('2d'), im = x.createImageData(N, N);
    const H = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) {
      const u = (i % N) / N, v = Math.floor(i / N) / N;
      const e = F2[i] - F1[i];
      const peb = smooth(0, 5, e) * (ID[i] > 0.25 ? 1 : 0);
      const m = nz.fbm(u * 6, v * 6, 4, 6);
      const base = 0.5 + (m - 0.5) * 0.12;
      const pv = 0.45 + ID[i] * 0.35;
      let g = base * (1 - peb) + pv * peb;
      const k = i * 4;
      im.data[k] = clamp(g * 1.04, 0, 1) * 255; im.data[k + 1] = clamp(g * 0.96, 0, 1) * 255; im.data[k + 2] = clamp(g * 0.85, 0, 1) * 255; im.data[k + 3] = 255;
      H[i] = peb * 0.8 + m * 0.2;
    }
    x.putImageData(im, 0, 0);
    return { map: toTex(c, { srgb: true }), normalMap: toTex(heightToNormal(H, N, N, 3, true)) };
  }

  // Roman brick facing. One tile covers 2 m.
  function brick() {
    const N = 512;
    const nz = AT.makeNoise(61);
    const r = AT.rng(17);
    const c = canvas(N), x = c.getContext('2d'), im = x.createImageData(N, N);
    const H = new Float32Array(N * N);
    const course = 16; // px, about 6 cm
    const tints = [];
    for (let k = 0; k < 200; k++) tints.push(0.82 + r() * 0.3);
    for (let y = 0; y < N; y++) {
      const row = Math.floor(y / course), fy = y % course;
      const off = (row % 2) * 40;
      for (let px = 0; px < N; px++) {
        const bx = (px + off) % N;
        const col = Math.floor(bx / 80), fx = bx % 80;
        const mortar = fy < 4 || fx < 3;
        const t = tints[(row * 7 + col) % 200];
        const f = nz.fbm(px / N * 40, y / N * 40, 3, 40);
        const m = nz.fbm(px / N * 5, y / N * 5, 4, 5);
        let cr, cg, cb;
        if (mortar) { cr = 0.62; cg = 0.58; cb = 0.52; }
        else { cr = 0.56 * t; cg = 0.42 * t; cb = 0.33 * t; }
        const s = 0.85 + f * 0.3 - (m > 0.6 ? 0.15 : 0);
        const i = (y * N + px) * 4;
        im.data[i] = clamp(cr * s, 0, 1) * 255; im.data[i + 1] = clamp(cg * s, 0, 1) * 255; im.data[i + 2] = clamp(cb * s, 0, 1) * 255; im.data[i + 3] = 255;
        H[y * N + px] = (mortar ? 0 : 0.8) + f * 0.2;
      }
    }
    x.putImageData(im, 0, 0);
    return { map: toTex(c, { srgb: true }), normalMap: toTex(heightToNormal(H, N, N, 2, true)) };
  }

  // Shared uniforms for the stone shader patch.
  AT.stoneU = {
    uDetail: { value: null },
    uRestore: { value: 0 },
    uTravX: { value: 4.32 },
    uPaint: { value: 0 },
  };

  // Patch a MeshStandardMaterial: travertine zone, grime, restoration tint,
  // optional ochre paint, and a cheap occlusion term for the passage.
  AT.patchStone = function (mat, o) {
    o = o || {};
    const trav = { value: o.trav ? 1 : 0 };
    const grime = { value: o.grime == null ? 1 : o.grime };
    const paintMap = o.paintMap ? { value: o.paintMap } : null;
    const key = 'stone' + (o.paintMap ? 'P' : '') + (o.detailScale || 4);
    mat.userData.trav = trav;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uDetail = AT.stoneU.uDetail;
      sh.uniforms.uRestore = AT.stoneU.uRestore;
      sh.uniforms.uTravX = AT.stoneU.uTravX;
      sh.uniforms.uTrav = trav;
      sh.uniforms.uGrime = grime;
      if (paintMap) {
        sh.uniforms.uPaintMap = paintMap;
        sh.uniforms.uPaint = AT.stoneU.uPaint;
      }
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
          vec4 wpA = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            wpA = instanceMatrix * wpA;
          #endif
          vWPos = (modelMatrix * wpA).xyz;`
        );
      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vWPos;
          uniform sampler2D uDetail;
          uniform float uRestore, uTravX, uTrav, uGrime;
          ${paintMap ? 'uniform sampler2D uPaintMap; uniform float uPaint;' : ''}`
        )
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          vec4 det = texture2D(uDetail, vMapUv * ${(o.detailScale || 4).toFixed(2)});
          float trav = uTrav * smoothstep(uTravX - 0.03, uTravX + 0.03, abs(vWPos.x));
          vec3 travCol = vec3(0.80, 0.735, 0.62) * (0.86 + 0.26 * det.r) * (0.9 + 0.12 * diffuseColor.r);
          travCol *= 1.0 - 0.55 * det.g;
          diffuseColor.rgb = mix(diffuseColor.rgb, travCol, trav);
          float hy = clamp(vWPos.y / 15.5, 0.0, 1.0);
          float grime = uGrime * ((1.0 - smoothstep(0.0, 0.25, hy)) * 0.3 + det.b * 0.24 * (0.35 + hy));
          diffuseColor.rgb *= 1.0 - grime;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.28, 0.5, 0.78), uRestore * trav * 0.62);
          ${paintMap ? `float pm = texture2D(uPaintMap, vMapUv).r;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.82, 0.6, 0.17) * (0.78 + 0.3 * det.r), pm * uPaint * 0.92);` : ''}`
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
          roughnessFactor = mix(roughnessFactor, 0.96, trav);`
        )
        .replace(
          '#include <aomap_fragment>',
          `#include <aomap_fragment>
          {
            float inPass = (1.0 - smoothstep(2.6, 2.95, abs(vWPos.x))) * (1.0 - smoothstep(2.2, 2.6, abs(vWPos.z))) * (1.0 - smoothstep(8.0, 8.6, vWPos.y));
            float depthIn = 1.0 - smoothstep(0.0, 2.4, abs(vWPos.z));
            float occ = 1.0 - inPass * (0.35 + 0.35 * depthIn);
            occ *= 0.72 + 0.28 * smoothstep(0.0, 0.7, vWPos.y);
            reflectedLight.indirectDiffuse *= occ;
            reflectedLight.indirectSpecular *= occ;
          }`
        );
    };
    mat.customProgramCacheKey = () => key;
    return mat;
  };

  AT.textures = { canvas, heightToNormal, toTex, marble, detail, basalt, ground, gravel, brick, voronoi };
})();
