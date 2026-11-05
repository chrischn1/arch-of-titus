// Geometry of the Arch of Titus. Units are meters; y is up, +z faces east (the
// inscription side, toward the Colosseum), +x is north. Proportions follow the
// commonly published figures: about 15.4 m high, 13.5 m wide, 4.75 m deep, with a
// passage 5.36 m wide and 8.3 m high.
(function () {
  const AT = (window.AT = window.AT || {});
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  const K = {
    W: 13.5, D: 4.75, a: 2.68, I: 5.62, r: 2.68,
    SOC: 0.45, PED_TOP: 2.9, BASE_TOP: 3.3, SHAFT_TOP: 8.75, CAP_TOP: 9.65,
    ARCH_TOP: 10.25, FRIEZE_TOP: 10.85, CORN_TOP: 11.62,
    ATTIC_DIE: 12.0, ATTIC_TOP: 14.9, TOP: 15.4,
    cols: [-6.05, -3.62, 3.62, 6.05],
    colOut: 0.12, // column axis in front of the wall face
    bump: 0.48, // entablature break over each column
    trav: 4.32, // approximate edge of Valadier's travertine
  };
  AT.K = K;

  // ---------- helpers ----------
  function boxUV(g, tile) {
    const p = g.attributes.position, n = g.attributes.normal;
    const uv = new Float32Array(p.count * 2);
    const k = 1 / (tile || 4);
    for (let i = 0; i < p.count; i++) {
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      let u, v;
      if (ax >= ay && ax >= az) { u = p.getZ(i); v = p.getY(i); }
      else if (ay >= az) { u = p.getX(i); v = p.getZ(i); }
      else { u = p.getX(i); v = p.getY(i); }
      uv[i * 2] = u * k;
      uv[i * 2 + 1] = v * k;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return g;
  }

  function merge(list) {
    let n = 0;
    const parts = list.map((g) => {
      const gg = g.index ? g.toNonIndexed() : g;
      if (!gg.attributes.normal) gg.computeVertexNormals();
      if (!gg.attributes.uv) boxUV(gg);
      n += gg.attributes.position.count;
      return gg;
    });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    for (const g of parts) {
      pos.set(g.attributes.position.array, o * 3);
      nor.set(g.attributes.normal.array, o * 3);
      uv.set(g.attributes.uv.array, o * 2);
      o += g.attributes.position.count;
    }
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    m.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    m.computeBoundingSphere();
    return m;
  }

  // Sweep a 2D profile [[o, u], ...] along a path. Points carry an outward
  // normal n; up is the second profile axis. The solid lies to the left of
  // the profile direction, so list profiles from outside bottom to top.
  function sweep(path, closed, profile, up, smoothPath) {
    const P = path.map((q) => q.p), Nn = path.map((q) => q.n);
    const N = P.length;
    const miter = [];
    for (let i = 0; i < N; i++) {
      if (smoothPath || (!closed && (i === 0 || i === N - 1))) { miter.push(Nn[i].clone()); continue; }
      // the edge normals before and after the vertex
      const nPrev = path[(i - 1 + N) % N].en, nNext = path[i].en;
      const m = nPrev.clone().add(nNext).multiplyScalar(1 / (1 + nPrev.dot(nNext)));
      miter.push(m);
    }
    const geos = [];
    const strip = (idxs) => {
      // one grid across these path indices
      const cols = idxs.length, rows = profile.length;
      const pos = new Float32Array(cols * rows * 3);
      for (let a = 0; a < cols; a++) {
        const i = idxs[a];
        for (let b = 0; b < rows; b++) {
          const [o, u] = profile[b];
          const v = P[i].clone().addScaledVector(miter[i], o).addScaledVector(up, u);
          const k = (a * rows + b) * 3;
          pos[k] = v.x; pos[k + 1] = v.y; pos[k + 2] = v.z;
        }
      }
      const t = P[idxs[1]].clone().sub(P[idxs[0]]).normalize();
      const nRef = Nn[idxs[0]];
      const flip = t.clone().cross(up).dot(nRef) < 0;
      const index = [];
      for (let a = 0; a < cols - 1; a++)
        for (let b = 0; b < rows - 1; b++) {
          const p0 = a * rows + b, p1 = (a + 1) * rows + b, p2 = (a + 1) * rows + b + 1, p3 = a * rows + b + 1;
          if (!flip) index.push(p0, p1, p2, p0, p2, p3);
          else index.push(p0, p2, p1, p0, p3, p2);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setIndex(index);
      g.computeVertexNormals();
      geos.push(g);
    };
    if (smoothPath) {
      const idx = [];
      for (let i = 0; i < N; i++) idx.push(i);
      if (closed) idx.push(0);
      strip(idx);
    } else {
      const E = closed ? N : N - 1;
      for (let i = 0; i < E; i++) strip([i, (i + 1) % N]);
    }
    if (!closed) {
      geos.push(cap(profile, P[0], miter[0], up, P[1].clone().sub(P[0]).negate()));
      geos.push(cap(profile, P[N - 1], miter[N - 1], up, P[N - 1].clone().sub(P[N - 2])));
    }
    return geos;
  }

  // Close the end of an open sweep with the profile polygon.
  function cap(profile, p, n, up, facing) {
    const shape = new THREE.Shape();
    const pts = profile.slice();
    shape.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
    shape.closePath();
    const g = new THREE.ShapeGeometry(shape);
    const a = g.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const o = a.getX(i), u = a.getY(i);
      const v = p.clone().addScaledVector(n, o).addScaledVector(up, u);
      a.setXYZ(i, v.x, v.y, v.z);
    }
    g.deleteAttribute('uv');
    g.computeVertexNormals();
    const nn = g.attributes.normal;
    if (nn.count && V3(nn.getX(0), nn.getY(0), nn.getZ(0)).dot(facing) < 0) {
      const idx = g.index.array;
      for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
      g.index.needsUpdate = true;
      g.computeVertexNormals();
    }
    return g;
  }

  // Closed polygon in the xz plane (counter or clockwise), with outward normals.
  function footprint(pts) {
    const N = pts.length;
    const inside = (x, z) => {
      let c = false;
      for (let i = 0, j = N - 1; i < N; j = i++) {
        const [xi, zi] = pts[i], [xj, zj] = pts[j];
        if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
      }
      return c;
    };
    const path = [];
    for (let i = 0; i < N; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % N];
      const t = V3(x1 - x0, 0, z1 - z0).normalize();
      let en = V3(t.z, 0, -t.x);
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      if (inside(mx + en.x * 1e-3, mz + en.z * 1e-3)) en.negate();
      path.push({ p: V3(x0, 0, z0), en, n: en });
    }
    return path;
  }

  function rect(x0, z0, x1, z1) {
    return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  }

  // Entablature footprint, with breaks out over the columns on both faces.
  function entFootprint() {
    const { W, D, cols, colOut, bump } = K;
    const hw = 0.5, zf = D / 2;
    const front = [], back = [];
    for (const x of cols) {
      front.push([x - hw, zf], [x - hw, zf + bump + colOut - 0.12], [x + hw, zf + bump + colOut - 0.12], [x + hw, zf]);
    }
    for (const x of cols.slice().reverse()) {
      back.push([x + hw, -zf], [x + hw, -zf - bump - colOut + 0.12], [x - hw, -zf - bump - colOut + 0.12], [x - hw, -zf]);
    }
    // the outer columns sit close to the corners; clamp their breaks inside the ends
    const pts = [[-W / 2, zf], ...front, [W / 2, zf], [W / 2, -zf], ...back, [-W / 2, -zf]];
    // drop duplicate points
    return pts.filter((p, i) => {
      const q = pts[(i + 1) % pts.length];
      return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-4;
    });
  }

  // Generate arc points for a profile.
  function arcPts(co, cu, r, a0, a1, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      out.push([co + Math.cos(a) * r, cu + Math.sin(a) * r]);
    }
    return out;
  }

  // ---------- profiles ----------
  function entablatureProfile() {
    const p = [];
    p.push([0, K.CAP_TOP], [0, 9.85], [0.025, 9.85], [0.025, 10.03], [0.05, 10.03], [0.05, 10.15]);
    p.push(...arcPts(0.05, 10.2, 0.05, -Math.PI / 2, 0, 4).slice(1)); // small cyma
    p.push([0.1, 10.25], [0.0, 10.26], [0, K.FRIEZE_TOP]);
    p.push(...arcPts(0, K.FRIEZE_TOP + 0.08, 0.08, -Math.PI / 2, 0, 5).slice(1)); // ovolo bed mold
    p.push([0.1, 10.95], [0.1, 11.1], [0.17, 11.11]);
    p.push(...arcPts(0.17, 11.17, 0.06, -Math.PI / 2, 0, 5).slice(1));
    p.push([0.24, 11.18], [0.7, 11.2], [0.72, 11.2], [0.72, 11.4]);
    // cyma recta at the top of the corona
    p.push(...arcPts(0.72, 11.48, 0.05, -Math.PI / 2, 0, 4).slice(1));
    p.push(...arcPts(0.82, 11.48, 0.05, Math.PI, Math.PI / 2, 4).slice(1));
    p.push([0.84, 11.53], [0.84, 11.58], [0, K.CORN_TOP]);
    return p;
  }

  function pedestalBase() {
    return [[0.14, 0], [0.14, 0.12], ...arcPts(0.1, 0.17, 0.05, -Math.PI / 2, Math.PI / 2, 6).slice(1), [0.06, 0.23], [0.04, 0.26], [0.02, 0.3], [0, 0.3]];
  }
  function pedestalCap() {
    return [[0, 0], [0.03, 0.03], [0.05, 0.08], [0.09, 0.12], [0.09, 0.22], [0.12, 0.25], [0.12, 0.3], [0, 0.3]];
  }
  function socleProfile() {
    return [[0.16, 0], [0.16, 0.3], ...arcPts(0.1, 0.36, 0.06, -Math.PI / 2, Math.PI / 2, 6).slice(1), [0.04, 0.43], [0, 0.45]];
  }
  function imposeProfile(I) {
    return [[0, I - 0.3], [0.02, I - 0.26], [0.04, I - 0.2], [0.04, I - 0.12], [0.09, I - 0.08], [0.13, I - 0.02], [0.13, I], [0, I]];
  }
  function archivoltProfile() {
    return [[0.58, 0], [0.58, 0.09], ...arcPts(0.53, 0.09, 0.05, 0, Math.PI / 2, 4).slice(1), [0.45, 0.14], [0.42, 0.12], [0.42, 0.09], [0.24, 0.09], [0.24, 0.07], [0.02, 0.07], [0, 0.04], [0, 0]];
  }
  function atticBase() {
    return [[0.16, 0], [0.16, 0.08], ...arcPts(0.12, 0.14, 0.06, -Math.PI / 2, Math.PI / 2, 6).slice(1), [0.06, 0.24], [0.03, 0.32], [0, 0.38]];
  }
  function atticCrown() {
    return [[0, 0], [0.04, 0.05], [0.06, 0.1], [0.1, 0.16], [0.18, 0.22], [0.26, 0.26], [0.26, 0.4], [0.3, 0.44], [0.3, 0.5], [0, 0.5]];
  }

  // ---------- column parts ----------
  function shaftGeo(h) {
    const flutes = 24, perFlute = 8, segA = flutes * perFlute, segY = 36;
    const pos = [], idx = [];
    for (let j = 0; j <= segY; j++) {
      const y = (j / segY) * h, t = y / h;
      const R = 0.4 - 0.055 * AT.smooth(0.3, 1, t);
      const fade = AT.smooth(0.0, 0.12, y) * AT.smooth(h, h - 0.12, y);
      for (let i = 0; i <= segA; i++) {
        const th = (i / segA) * Math.PI * 2;
        const f = ((th * flutes) / (Math.PI * 2)) % 1;
        let dpt = 0;
        if (f > 0.18) {
          const s = (f - 0.18) / 0.82;
          dpt = 0.03 * Math.sqrt(Math.max(0, 1 - (2 * s - 1) * (2 * s - 1)));
        }
        const r = R - dpt * fade;
        pos.push(Math.sin(th) * r, y, Math.cos(th) * r);
      }
    }
    const row = segA + 1;
    for (let j = 0; j < segY; j++)
      for (let i = 0; i < segA; i++) {
        const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
        idx.push(a, b, d, a, d, c);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  function lathe(points, seg) {
    return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg || 64);
  }

  function baseGeo() {
    const pts = [[0.0, 0.12], [0.48, 0.12]];
    for (const p of arcPts(0.455, 0.175, 0.055, -Math.PI / 2, Math.PI / 2, 8)) pts.push(p);
    pts.push([0.43, 0.235], [0.405, 0.25], [0.396, 0.27], [0.405, 0.29], [0.43, 0.3]);
    for (const p of arcPts(0.425, 0.335, 0.035, -Math.PI / 2, Math.PI / 2, 6)) pts.push(p);
    pts.push([0.405, 0.38], [0.4, 0.4]);
    const g = [lathe(pts, 72)];
    const plinth = new THREE.BoxGeometry(1.0, 0.12, 1.0);
    plinth.translate(0, 0.06, 0);
    g.push(plinth);
    return g;
  }

  function leafGeo(theta, R0, H, Wd, curl) {
    const su = 10, sv = 16, pos = [], idx = [];
    for (let j = 0; j <= sv; j++) {
      const v = j / sv;
      const lob = 1 + 0.16 * Math.sin(v * Math.PI * 7);
      const w = Wd * (0.5 + 0.5 * Math.sin(Math.PI * Math.min(1, v * 1.08))) * lob * (v > 0.82 ? Math.max(0.08, (1 - v) / 0.18) : 1);
      for (let i = 0; i <= su; i++) {
        const u = (i / su) * 2 - 1;
        let rad = R0 + 0.015 + v * 0.05 + 0.012 * u * u + 0.007 * Math.exp(-(u * u) / 0.02);
        let y = v * H;
        if (v > 0.6) {
          const q = (v - 0.6) / 0.4;
          rad += curl * q * q;
          y -= curl * 0.55 * q * q * q;
        }
        const th = theta + (u * w) / rad;
        pos.push(Math.sin(th) * rad, y, Math.cos(th) * rad);
      }
    }
    const row = su + 1;
    for (let j = 0; j < sv; j++)
      for (let i = 0; i < su; i++) {
        const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
        idx.push(a, b, d, a, d, c);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  // Composite capital: two rings of acanthus, egg and dart, diagonal volutes, abacus.
  function capitalGeo() {
    const solid = [], leaves = [];
    solid.push(lathe([[0.345, 0], [0.35, 0.2], [0.37, 0.48], [0.4, 0.6], [0.41, 0.66], [0.2, 0.7]], 64));
    const astr = new THREE.TorusGeometry(0.36, 0.022, 8, 64);
    astr.rotateX(Math.PI / 2);
    astr.translate(0, 0.0, 0);
    solid.push(astr);
    for (let k = 0; k < 8; k++) leaves.push(leafGeo((k / 8) * Math.PI * 2, 0.35, 0.3, 0.13, 0.07));
    for (let k = 0; k < 8; k++) leaves.push(leafGeo(((k + 0.5) / 8) * Math.PI * 2, 0.36, 0.52, 0.12, 0.09));
    // egg and dart on the echinus
    const bead = new THREE.TorusGeometry(0.41, 0.018, 8, 64);
    bead.rotateX(Math.PI / 2);
    bead.translate(0, 0.6, 0);
    solid.push(bead);
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * Math.PI * 2;
      const e = new THREE.SphereGeometry(0.04, 10, 8);
      e.scale(0.85, 1.25, 0.7);
      e.translate(Math.sin(a) * 0.42, 0.67, Math.cos(a) * 0.42);
      solid.push(e);
    }
    // volutes on the diagonals
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      const d = V3(Math.sin(a), 0, Math.cos(a));
      const t = V3(Math.cos(a), 0, -Math.sin(a));
      const C = d.clone().multiplyScalar(0.5).add(V3(0, 0.68, 0));
      const pts = [];
      for (let i = 0; i <= 60; i++) {
        const ph = (i / 60) * Math.PI * 3.2 - Math.PI / 2;
        const rr = 0.11 * Math.pow(0.6, (i / 60) * 3.2 * 1.1);
        pts.push(C.clone().addScaledVector(t, Math.cos(ph) * rr).add(V3(0, Math.sin(ph) * rr, 0)).addScaledVector(d, -0.02 * (i / 60)));
      }
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.022, 8, false);
      solid.push(tube);
      const eye = new THREE.SphereGeometry(0.03, 10, 8);
      eye.translate(C.x, C.y, C.z);
      solid.push(eye);
      // the band that joins this volute to the next one
      const a2 = a + Math.PI / 2;
      const d2 = V3(Math.sin(a2), 0, Math.cos(a2));
      const C2 = d2.clone().multiplyScalar(0.5).add(V3(0, 0.68, 0));
      const top1 = C.clone().add(V3(0, 0.11, 0)), top2 = C2.clone().add(V3(0, 0.11, 0));
      const mid = top1.clone().add(top2).multiplyScalar(0.5);
      mid.setLength(0.43);
      mid.y = 0.74;
      const band = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(top1, mid, top2), 24, 0.03, 8, false);
      solid.push(band);
    }
    // abacus with concave sides and a fleuron on each side
    const s = 0.53, cv = 0.09;
    const sh = new THREE.Shape();
    sh.moveTo(-s, -s + 0.06);
    sh.lineTo(-s + 0.06, -s);
    sh.quadraticCurveTo(0, -s + cv, s - 0.06, -s);
    sh.lineTo(s, -s + 0.06);
    sh.quadraticCurveTo(s - cv, 0, s, s - 0.06);
    sh.lineTo(s - 0.06, s);
    sh.quadraticCurveTo(0, s - cv, -s + 0.06, s);
    sh.lineTo(-s, s - 0.06);
    sh.quadraticCurveTo(-s + cv, 0, -s, -s + 0.06);
    const ab = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1, curveSegments: 12 });
    ab.rotateX(-Math.PI / 2);
    ab.translate(0, 0.79, 0);
    ab.deleteAttribute('uv');
    solid.push(ab);
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      const f = new THREE.SphereGeometry(0.05, 10, 8);
      f.scale(1, 0.9, 0.6);
      f.translate(Math.sin(a) * 0.46, 0.84, Math.cos(a) * 0.46);
      solid.push(f);
    }
    return { solid, leaves };
  }

  // ---------- build ----------
  AT.buildArch = function (mat) {
    const { W, D, a, I, r } = K;
    const group = new THREE.Group();
    const solid = [], dbl = [];
    const add = (g) => { if (Array.isArray(g)) solid.push(...g); else solid.push(g); };

    // Main mass with the passage: a U shape extruded through the depth.
    const rv = r + 0.15;
    const shp = new THREE.Shape();
    shp.moveTo(-W / 2, 0);
    shp.lineTo(-a, 0);
    shp.lineTo(-a, I);
    shp.lineTo(-rv, I);
    shp.absarc(0, I, rv, Math.PI, 0, true);
    shp.lineTo(a, I);
    shp.lineTo(a, 0);
    shp.lineTo(W / 2, 0);
    shp.lineTo(W / 2, K.CORN_TOP);
    shp.lineTo(-W / 2, K.CORN_TOP);
    shp.closePath();
    const body = new THREE.ExtrudeGeometry(shp, { depth: D, bevelEnabled: false, curveSegments: 64 });
    body.translate(0, 0, -D / 2);
    body.deleteAttribute('uv');
    body.computeVertexNormals();
    add(body);

    // Socle around each pier, stepping out under the pedestals.
    const up = V3(0, 1, 0);
    for (const sx of [-1, 1]) {
      const x0 = sx < 0 ? -W / 2 : a, x1 = sx < 0 ? -a : W / 2;
      const cs = K.cols.filter((x) => Math.sign(x) === sx).sort((p, q) => p - q);
      const zf = D / 2, dz = 0.62, hw = 0.575;
      const pts = [[x0, zf]];
      for (const x of cs) pts.push([x - hw, zf], [x - hw, zf + dz], [x + hw, zf + dz], [x + hw, zf]);
      pts.push([x1, zf], [x1, -zf]);
      for (const x of cs.slice().reverse()) pts.push([x + hw, -zf], [x + hw, -zf - dz], [x - hw, -zf - dz], [x - hw, -zf]);
      pts.push([x0, -zf]);
      add(sweep(footprint(pts), true, socleProfile(), up));
      // solid fill under the pedestals
      for (const x of cs) for (const fz of [1, -1]) {
        const g = new THREE.BoxGeometry(2 * hw, K.SOC, dz);
        g.translate(x, K.SOC / 2, fz * (zf + dz / 2));
        add(g);
      }
    }

    // Impost moldings along the passage walls.
    for (const sx of [-1, 1]) {
      const n = V3(-sx, 0, 0);
      const path = [{ p: V3(sx * a, 0, -D / 2), n }, { p: V3(sx * a, 0, D / 2), n }];
      add(sweep(path, false, imposeProfile(I), up));
    }

    // Entablature around the whole monument.
    add(sweep(footprint(entFootprint()), true, entablatureProfile(), up));

    // Dentils, modillions and eggs along the cornice.
    const fp = footprint(entFootprint());
    const place = (spacing, offset, make) => {
      for (let i = 0; i < fp.length; i++) {
        const p0 = fp[i].p, p1 = fp[(i + 1) % fp.length].p, n = fp[i].en;
        const t = p1.clone().sub(p0);
        const L = t.length();
        t.normalize();
        const cnt = Math.floor((L - 0.1) / spacing);
        if (cnt < 1) continue;
        const step = L / cnt;
        for (let k = 0; k < cnt; k++) {
          const c = p0.clone().addScaledVector(t, (k + 0.5) * step).addScaledVector(n, offset);
          const g = make();
          const m = new THREE.Matrix4().makeBasis(t, up, n).setPosition(c);
          g.applyMatrix4(m);
          add(g);
        }
      }
    };
    place(0.125, 0.135, () => { const g = new THREE.BoxGeometry(0.075, 0.15, 0.07); g.translate(0, 11.025, 0); return g; });
    place(0.15, 0.2, () => { const g = new THREE.SphereGeometry(0.045, 8, 6); g.scale(0.8, 1.1, 0.55); g.translate(0, 11.15, 0); return g; });
    place(0.6, 0.45, () => {
      const g = new THREE.BoxGeometry(0.14, 0.09, 0.4);
      g.translate(0, 11.145, 0);
      const s = new THREE.CylinderGeometry(0.05, 0.05, 0.14, 12);
      s.rotateZ(Math.PI / 2);
      s.translate(0, 11.13, 0.18);
      const m = merge([g, s]);
      return m;
    });

    // Columns on both faces with pedestals, bases, shafts and capitals.
    const cap = capitalGeo();
    const capSolid = merge(cap.solid);
    const capLeaves = merge(cap.leaves);
    const shaftH = K.SHAFT_TOP - K.BASE_TOP - 0.0;
    const shaft = shaftGeo(shaftH);
    const base = merge(baseGeo());
    for (const fz of [1, -1]) {
      const zc = fz * (D / 2 + K.colOut);
      for (const x of K.cols) {
        // pedestal die and moldings
        const zw = fz * (D / 2 - 0.1), zo = fz * (D / 2 + 0.62);
        const z0 = Math.min(zw, zo), z1 = Math.max(zw, zo);
        const die = new THREE.BoxGeometry(1.15, K.PED_TOP - 0.3 - (K.SOC + 0.3), z1 - z0);
        die.translate(x, (K.SOC + 0.3 + K.PED_TOP - 0.3) / 2, (z0 + z1) / 2);
        add(die);
        const pf = footprint(rect(x - 0.575, z0, x + 0.575, z1));
        const pb = pedestalBase().map(([o, u]) => [o, u + K.SOC]);
        add(sweep(pf, true, pb, up));
        const pc = pedestalCap().map(([o, u]) => [o, u + K.PED_TOP - 0.3]);
        add(sweep(pf, true, pc, up));
        const b = base.clone(); b.translate(x, K.PED_TOP, zc); add(b);
        const s = shaft.clone(); s.translate(x, K.BASE_TOP, zc); add(s);
        const cs = capSolid.clone(); cs.translate(x, K.SHAFT_TOP, zc); add(cs);
        const cl = capLeaves.clone(); cl.translate(x, K.SHAFT_TOP, zc); dbl.push(cl);
      }
    }

    // Archivolts on both faces.
    for (const fz of [1, -1]) {
      const path = [];
      const n = 48;
      for (let i = 0; i <= n; i++) {
        const th = Math.PI - (i / n) * Math.PI;
        path.push({ p: V3(Math.cos(th) * r, I + Math.sin(th) * r, fz * D / 2), n: V3(Math.cos(th), Math.sin(th), 0) });
      }
      add(sweep(path, false, archivoltProfile(), V3(0, 0, fz), true));
      // keystone console
      const ks = new THREE.Shape();
      ks.moveTo(-0.2, 0);
      ks.lineTo(0.2, 0);
      ks.lineTo(0.28, 0.95);
      ks.lineTo(-0.28, 0.95);
      ks.closePath();
      const kg = new THREE.ExtrudeGeometry(ks, { depth: 0.26, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
      kg.deleteAttribute('uv');
      if (fz < 0) kg.rotateY(Math.PI);
      kg.translate(0, I + r - 0.25, fz * D / 2);
      add(kg);
      const bust = new THREE.SphereGeometry(0.15, 16, 12);
      bust.scale(1, 1.25, 0.8);
      bust.translate(0, I + r + 0.32, fz * (D / 2 + 0.3));
      add(bust);
    }

    // Attic with base and crown moldings.
    const aw = W - 0.1, ad = D - 0.1;
    const attic = new THREE.BoxGeometry(aw, K.ATTIC_TOP - K.ATTIC_DIE, ad);
    attic.translate(0, (K.ATTIC_TOP + K.ATTIC_DIE) / 2, 0);
    add(attic);
    const af = footprint(rect(-aw / 2, -ad / 2, aw / 2, ad / 2));
    add(sweep(af, true, atticBase().map(([o, u]) => [o, u + K.CORN_TOP]), up));
    add(sweep(af, true, atticCrown().map(([o, u]) => [o, u + K.ATTIC_TOP]), up));
    const roof = new THREE.BoxGeometry(aw + 0.55, 0.06, ad + 0.55);
    roof.translate(0, K.TOP - 0.03, 0);
    add(roof);

    const merged = merge(solid);
    boxUV(merged);
    const mesh = new THREE.Mesh(merged, mat.stone);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = 'arch';
    group.add(mesh);
    const lm = merge([...dbl]);
    boxUV(lm);
    const leaves = new THREE.Mesh(lm, mat.stoneDouble);
    leaves.castShadow = leaves.receiveShadow = true;
    group.add(leaves);
    return group;
  };

  // A curved strip on the inside of the vault, displaced inward by a relief.
  AT.vaultSurface = function (R, th0, th1, z0, z1, segU, segV, skip) {
    const { I, r } = K;
    const pos = [], uv = [], idx = [];
    for (let j = 0; j <= segV; j++) {
      const v = j / segV;
      for (let i = 0; i <= segU; i++) {
        const u = i / segU;
        const th = th0 + (th1 - th0) * u;
        const h = R.sample(u, v) / 100;
        const rr = r - h;
        pos.push(Math.cos(th) * rr, I + Math.sin(th) * rr, z0 + (z1 - z0) * v);
        uv.push(u, v);
      }
    }
    const row = segU + 1;
    for (let j = 0; j < segV; j++)
      for (let i = 0; i < segU; i++) {
        if (skip && skip((i + 0.5) / segU, (j + 0.5) / segV)) continue;
        const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
        idx.push(a, d, b, a, c, d);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };

  AT.archUtil = { boxUV, merge, sweep, footprint, rect };
})();
