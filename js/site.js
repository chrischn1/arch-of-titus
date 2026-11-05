// The setting: sky, terrain, the Via Sacra, stone pines, and simple masses for the
// Colosseum, the bell tower of Santa Francesca Romana and the Basilica of Maxentius.
// These are context shapes at reduced detail, placed by approximate direction.
(function () {
  const AT = (window.AT = window.AT || {});
  const { smooth } = AT;
  const nz = AT.makeNoise(97);

  // Terrain height. The arch stands on the Velia; the ground falls to the Forum
  // in the west and to the Colosseum valley in the east, with the Palatine to the
  // south west.
  function hgt(x, z) {
    const d = Math.hypot(x, z);
    const flat = smooth(28, 60, d);
    let h = 0;
    h -= 4.5 * smooth(-40, -150, z) * flat;
    h -= 6 * smooth(40, 170, z) * flat;
    const dp = Math.hypot(x + 120, z + 70);
    h += 19 * smooth(150, 45, dp);
    h += (nz.fbm(x * 0.012, z * 0.012, 4) - 0.5) * 5 * flat;
    return h;
  }
  AT.hgt = hgt;

  function skyMaterial() {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        sunDir: { value: new THREE.Vector3(0, 1, 0) },
        zen: { value: new THREE.Color(0.18, 0.36, 0.68) },
        hor: { value: new THREE.Color(0.72, 0.78, 0.84) },
        sunCol: { value: new THREE.Color(1, 0.9, 0.75) },
      },
      vertexShader: `varying vec3 vDir;
        void main(){ vDir = normalize((modelMatrix * vec4(position,1.0)).xyz - cameraPosition);
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 sunDir, zen, hor, sunCol; varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir);
          float h = clamp(d.y, 0.0, 1.0);
          vec3 col = mix(hor, zen, pow(h, 0.5));
          float s = max(dot(d, normalize(sunDir)), 0.0);
          col += sunCol * (pow(s, 6.0) * 0.22 + pow(s, 64.0) * 0.5 + smoothstep(0.9993, 0.9997, s) * 8.0);
          col = mix(col, hor * 0.85, smoothstep(0.0, -0.12, d.y));
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
  }

  function terrain(tex) {
    const S = 1400, seg = 280;
    const g = new THREE.PlaneGeometry(S, S, seg, seg);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    const col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      p.setY(i, hgt(x, z) - 0.02);
      const m = nz.fbm(x * 0.02 + 5, z * 0.02, 4);
      const dry = smooth(0.45, 0.65, m);
      const k = 0.85 + (nz.fbm(x * 0.08, z * 0.08, 3) - 0.5) * 0.3;
      col[i * 3] = k * (0.9 + dry * 0.25);
      col[i * 3 + 1] = k * (1.0 - dry * 0.05);
      col[i * 3 + 2] = k * (0.85 + dry * 0.1);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (S / 12), uv.getY(i) * (S / 12));
    const m = new THREE.MeshStandardMaterial({ map: tex.map, normalMap: tex.normalMap, vertexColors: true, roughness: 0.95 });
    const mesh = new THREE.Mesh(g, m);
    mesh.receiveShadow = true;
    return mesh;
  }

  // A strip that follows the terrain along z, for the road.
  function road(tex, x0, x1, z0, z1, tile, lift) {
    const sx = 8, sz = Math.round((z1 - z0) / 1.5);
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, sx, sz);
    g.rotateX(-Math.PI / 2);
    g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      p.setY(i, hgt(p.getX(i), p.getZ(i)) + lift);
      uv.setXY(i, p.getX(i) / tile, p.getZ(i) / tile);
    }
    g.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({ map: tex.map, normalMap: tex.normalMap, roughnessMap: tex.roughnessMap, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const mesh = new THREE.Mesh(g, m);
    mesh.receiveShadow = true;
    return mesh;
  }

  function apron(tex) {
    const g = new THREE.CircleGeometry(1, 96);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const a = Math.atan2(z, x);
      const rr = 26 + (nz.fbm(Math.cos(a) * 2 + 3, Math.sin(a) * 2, 3) - 0.5) * 10;
      p.setXYZ(i, x * rr * 0.8, 0.008, z * rr * 1.25);
      uv.setXY(i, (x * rr * 0.8) / 4, (z * rr * 1.25) / 4);
    }
    g.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({ map: tex.map, normalMap: tex.normalMap, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const mesh = new THREE.Mesh(g, m);
    mesh.receiveShadow = true;
    return mesh;
  }

  // Stone pine: a leaning trunk and a flat umbrella crown made of clumps.
  function pine(seed, scale) {
    const r = AT.rng(seed);
    const grp = new THREE.Group();
    const H = (11 + r() * 6) * (scale || 1);
    const lean = new THREE.Vector3((r() - 0.5) * 3, 0, (r() - 0.5) * 3);
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      pts.push(new THREE.Vector3(lean.x * t * t, H * t, lean.z * t * t));
    }
    const trunk = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.32 * (scale || 1), 8, false);
    const tp = trunk.attributes.position;
    for (let i = 0; i < tp.count; i++) {
      const y = tp.getY(i) / H;
      const k = 1 - y * 0.45;
      const cx = lean.x * y * y, cz = lean.z * y * y;
      tp.setX(i, cx + (tp.getX(i) - cx) * k);
      tp.setZ(i, cz + (tp.getZ(i) - cz) * k);
    }
    trunk.computeVertexNormals();
    const tm = new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 0.95 });
    const tmesh = new THREE.Mesh(trunk, tm);
    tmesh.castShadow = true;
    grp.add(tmesh);
    const cm = AT._pineMat || (AT._pineMat = new THREE.MeshStandardMaterial({ color: 0x33472b, roughness: 0.92, vertexColors: true }));
    const crowns = [];
    const branches = [];
    const top = pts[6];
    const n = 7 + Math.floor(r() * 5);
    const W = (5 + r() * 3) * (scale || 1);
    for (let k = 0; k < n; k++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * W;
      const g = new THREE.IcosahedronGeometry(1, 2);
      const p = g.attributes.position;
      const col = new Float32Array(p.count * 3);
      const sc = 2.2 + r() * 2.2;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const f = 1 + (nz.fbm(x * 2 + k, y * 2 + seed, 3) - 0.5) * 0.7;
        p.setXYZ(i, x * f * sc, y * f * sc * 0.42, z * f * sc);
        const sh = 0.75 + Math.max(0, y) * 0.35;
        col[i * 3] = sh; col[i * 3 + 1] = sh; col[i * 3 + 2] = sh * 0.95;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.translate(top.x + Math.cos(a) * d, top.y + (r() - 0.3) * 1.4 - (d / W) * 1.2, top.z + Math.sin(a) * d);
      g.computeVertexNormals();
      crowns.push(g);
      // branches out to the clump
      const br = new THREE.CylinderGeometry(0.08, 0.14, d + 0.5, 5);
      br.translate(0, (d + 0.5) / 2, 0);
      br.rotateZ(-Math.PI / 2 + 0.25);
      br.rotateY(-a);
      br.translate(top.x, top.y - 1.2, top.z);
      branches.push(br);
    }
    const cg = AT.archUtil.merge(crowns.map((g) => { g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; }));
    // merge drops colors, so rebuild them on the merged mesh
    const cc = new Float32Array(cg.attributes.position.count * 3);
    let o = 0;
    for (const g of crowns) { const src = (g.index ? g.toNonIndexed() : g).attributes.color.array; cc.set(src, o); o += src.length; }
    cg.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    if (branches.length) {
      const bg = AT.archUtil.merge(branches.map((b) => { b.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(b.attributes.position.count * 2), 2)); return b; }));
      const bmesh = new THREE.Mesh(bg, tm);
      bmesh.castShadow = true;
      grp.add(bmesh);
    }
    const crown = new THREE.Mesh(cg, cm);
    crown.castShadow = true;
    crown.receiveShadow = true;
    grp.add(crown);
    return grp;
  }

  // Facade texture for one Colosseum bay: three arcades and the attic.
  function colosseumTex() {
    const c = AT.textures.canvas(256, 512), x = c.getContext('2d');
    const tr = '#c9b89a';
    x.fillStyle = tr;
    x.fillRect(0, 0, 256, 512);
    const stories = [[512, 400], [400, 290], [290, 180]];
    for (const [b, t] of stories) {
      x.fillStyle = '#b5a384';
      x.fillRect(0, t, 256, 14);
      x.fillStyle = '#1c1a18';
      x.beginPath();
      x.moveTo(52, b - 6); x.lineTo(52, t + 50); x.arc(128, t + 50, 76, Math.PI, 0); x.lineTo(204, b - 6); x.closePath();
      x.fill();
      const g = x.createLinearGradient(52, 0, 204, 0);
      g.addColorStop(0, 'rgba(255,240,210,0.1)');
      g.addColorStop(1, 'rgba(0,0,0,0.25)');
      x.fillStyle = g;
      x.fill();
      x.fillStyle = '#d6c6a8';
      x.fillRect(0, t + 14, 26, b - t - 14);
      x.fillRect(230, t + 14, 26, b - t - 14);
      x.fillStyle = 'rgba(0,0,0,0.18)';
      x.fillRect(22, t + 14, 4, b - t - 14);
    }
    x.fillStyle = '#c2b090';
    x.fillRect(0, 0, 256, 180);
    x.fillStyle = '#d6c6a8';
    x.fillRect(0, 0, 22, 180);
    x.fillRect(234, 0, 22, 180);
    x.fillStyle = '#2a2622';
    x.fillRect(110, 70, 36, 50);
    const im = x.getImageData(0, 0, 256, 512);
    for (let i = 0; i < im.data.length; i += 4) {
      const p = (i / 4) | 0, px = p % 256, py = (p / 256) | 0;
      const k = 0.85 + nz.fbm(px * 0.05, py * 0.05, 3) * 0.3;
      im.data[i] *= k; im.data[i + 1] *= k; im.data[i + 2] *= k;
    }
    x.putImageData(im, 0, 0);
    return AT.textures.toTex(c, { srgb: true });
  }

  function ellipseWall(ra, rb, h, a0, a1, segs, bays, tex, y0) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= segs; i++) {
      const a = a0 + ((a1 - a0) * i) / segs;
      const x = Math.cos(a) * rb, z = Math.sin(a) * ra;
      pos.push(x, y0, z, x, y0 + h, z);
      const u = ((a - a0) / (Math.PI * 2)) * bays;
      uv.push(u, 0, u, h / 48.5);
    }
    for (let i = 0; i < segs; i++) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    tex.wrapS = THREE.RepeatWrapping;
    return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.DoubleSide }));
  }

  function colosseum() {
    const grp = new THREE.Group();
    const tex = colosseumTex();
    const by = hgt(-40, 250) - 1;
    // outer ring survives on the north side only
    grp.add(ellipseWall(94, 78, 48.5, -Math.PI * 0.62, Math.PI * 0.62, 120, 80 * 0.62, tex.clone(), by));
    const t2 = tex.clone();
    t2.repeat.set(1, 0.7);
    t2.offset.set(0, 0.3);
    grp.add(ellipseWall(86, 70, 34, 0, Math.PI * 2, 160, 76, t2, by));
    const inner = ellipseWall(64, 48, 26, 0, Math.PI * 2, 120, 60, t2.clone(), by);
    grp.add(inner);
    grp.position.set(-40, 0, 250);
    grp.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
    return grp;
  }

  // The Romanesque bell tower beside the arch, in brick with arcaded stories.
  function campanile(brickTex) {
    const grp = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ map: brickTex.map, normalMap: brickTex.normalMap, roughness: 0.92 });
    const white = new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.85 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: 1 });
    const w = 4.6;
    let y = 0;
    const stories = [9, 4.2, 4.2, 4.2, 4.2, 4.2];
    stories.forEach((hh, i) => {
      const g = new THREE.BoxGeometry(w, hh, w);
      AT.archUtil.boxUV(g, 2);
      const b = new THREE.Mesh(g, m);
      b.position.y = y + hh / 2;
      grp.add(b);
      if (i > 0) {
        for (let side = 0; side < 4; side++) {
          for (let k = 0; k < 3; k++) {
            const ow = 0.8, oh = 1.9;
            const og = new THREE.BoxGeometry(ow, oh, 0.05);
            const o = new THREE.Mesh(og, dark);
            const off = (k - 1) * 1.25;
            const ang = (side * Math.PI) / 2;
            o.position.set(Math.sin(ang) * (w / 2 + 0.01) + Math.cos(ang) * off, y + hh / 2 - 0.2, Math.cos(ang) * (w / 2 + 0.01) - Math.sin(ang) * off);
            o.rotation.y = ang;
            grp.add(o);
          }
        }
      }
      const cg = new THREE.BoxGeometry(w + 0.25, 0.18, w + 0.25);
      const c = new THREE.Mesh(cg, white);
      c.position.y = y + hh;
      grp.add(c);
      y += hh;
    });
    const roof = new THREE.ConeGeometry(w * 0.72, 3, 4);
    roof.rotateY(Math.PI / 4);
    const rf = new THREE.Mesh(roof, new THREE.MeshStandardMaterial({ color: 0x8a5a3c, roughness: 0.9 }));
    rf.position.y = y + 1.5;
    grp.add(rf);
    grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return grp;
  }

  // Three great brick vaults opening to the Via Sacra.
  function basilica(brickTex) {
    const shp = new THREE.Shape();
    const L = 66, H = 28;
    shp.moveTo(-L / 2, 0);
    shp.lineTo(L / 2, 0);
    shp.lineTo(L / 2, H);
    shp.lineTo(-L / 2, H);
    shp.closePath();
    for (let k = -1; k <= 1; k++) {
      const hole = new THREE.Path();
      const cx = k * 21, hw = 8.5, sp = 12;
      hole.moveTo(cx - hw, 0.01);
      hole.lineTo(cx - hw, sp);
      hole.absarc(cx, sp, hw, Math.PI, 0, true);
      hole.lineTo(cx + hw, 0.01);
      hole.closePath();
      shp.holes.push(hole);
    }
    const g = new THREE.ExtrudeGeometry(shp, { depth: 4, bevelEnabled: false, curveSegments: 24 });
    g.deleteAttribute('uv');
    g.computeVertexNormals();
    AT.archUtil.boxUV(g, 2);
    const m = new THREE.MeshStandardMaterial({ map: brickTex.map, normalMap: brickTex.normalMap, roughness: 0.92 });
    const grp = new THREE.Group();
    const front = new THREE.Mesh(g, m);
    grp.add(front);
    // back wall and side walls
    const back = new THREE.BoxGeometry(L, H, 2);
    AT.archUtil.boxUV(back, 2);
    const bm = new THREE.Mesh(back, m);
    bm.position.set(0, H / 2, 22);
    grp.add(bm);
    for (const k of [-1.5, -0.5, 0.5, 1.5]) {
      const s = new THREE.BoxGeometry(4, H, 20);
      AT.archUtil.boxUV(s, 2);
      const sm = new THREE.Mesh(s, m);
      sm.position.set(k * 21, H / 2, 12);
      grp.add(sm);
    }
    grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return grp;
  }

  // Fallen and standing fragments: a few column drums and wall stubs.
  function ruins(brickTex, stoneMat) {
    const grp = new THREE.Group();
    const r = AT.rng(808);
    const bm = new THREE.MeshStandardMaterial({ map: brickTex.map, normalMap: brickTex.normalMap, roughness: 0.92 });
    for (let k = 0; k < 18; k++) {
      const x = -30 - r() * 70, z = -40 - r() * 70;
      const w = 3 + r() * 9, hh = 1 + r() * 5, d = 1 + r() * 1.5;
      const g = new THREE.BoxGeometry(w, hh, d);
      AT.archUtil.boxUV(g, 2);
      const m = new THREE.Mesh(g, bm);
      m.position.set(x, hgt(x, z) + hh / 2 - 0.3, z);
      m.rotation.y = r() * Math.PI;
      m.castShadow = m.receiveShadow = true;
      grp.add(m);
    }
    for (let k = 0; k < 10; k++) {
      const x = (r() - 0.5) * 40, z = -30 - r() * 30;
      if (Math.abs(x) < 6) continue;
      const g = new THREE.CylinderGeometry(0.45, 0.45, 0.9 + r() * 0.5, 24);
      const m = new THREE.Mesh(g, stoneMat);
      const lying = r() > 0.4;
      if (lying) m.rotation.z = Math.PI / 2;
      m.rotation.y = r() * Math.PI;
      m.position.set(x, hgt(x, z) + (lying ? 0.45 : 0.45), z);
      m.castShadow = m.receiveShadow = true;
      grp.add(m);
    }
    return grp;
  }

  // Low blocks of the modern city, far out in the haze, so the horizon is not empty.
  function skyline() {
    const r = AT.rng(4242);
    const geos = [];
    const palette = [[0.78, 0.6, 0.42], [0.82, 0.7, 0.52], [0.7, 0.5, 0.36], [0.86, 0.78, 0.64], [0.74, 0.56, 0.44]];
    for (let k = 0; k < 520; k++) {
      const a = r() * Math.PI * 2, d = 330 + r() * 520;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      const w = 14 + r() * 30, h = 10 + r() * 22, dd = 12 + r() * 26;
      const g = new THREE.BoxGeometry(w, h, dd);
      g.rotateY(r() * Math.PI);
      g.translate(x, hgt(x, z) + h / 2 - 1, z);
      const col = palette[Math.floor(r() * palette.length)];
      const c = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < c.length; i += 3) { c[i] = col[0]; c[i + 1] = col[1]; c[i + 2] = col[2]; }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      geos.push(g);
      // a few domes and towers
      if (r() < 0.025) {
        const dm = new THREE.SphereGeometry(10 + r() * 8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        dm.translate(x, hgt(x, z) + h - 1, z);
        const c2 = new Float32Array(dm.attributes.position.count * 3).fill(0.62);
        dm.setAttribute('color', new THREE.BufferAttribute(c2, 3));
        geos.push(dm);
      }
    }
    const merged = AT.archUtil.merge(geos.map((g) => { g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; }));
    const cc = new Float32Array(merged.attributes.position.count * 3);
    let o = 0;
    for (const g of geos) { const src = (g.index ? g.toNonIndexed() : g).attributes.color.array; cc.set(src, o); o += src.length; }
    merged.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    return new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  }

  AT.buildSite = function (scene, stoneMat) {
    const T = AT.textures;
    const ground = T.ground(), basalt = T.basalt(), grav = T.gravel(), brick = T.brick();
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), skyMaterial());
    sky.renderOrder = -1;
    scene.add(sky);
    scene.add(terrain(ground));
    scene.add(apron(grav));
    scene.add(road(basalt, -3.6, 3.6, -200, 230, 6, 0.03));
    const trees = [
      [20, -24, 1.0], [-27, -15, 0.9], [31, 10, 1.1], [-36, 28, 1.0], [26, 46, 0.95], [-22, -50, 1.05],
      [52, -34, 1.1], [-66, -44, 1.2], [-92, -70, 1.15], [-120, -24, 1.2], [-78, -104, 1.1], [-140, -90, 1.25],
      [44, 70, 1.0], [60, 18, 1.15], [-48, 80, 1.0],
    ];
    const rr = AT.rng(9001);
    for (let k = 0; k < 46; k++) {
      const a = rr() * Math.PI * 2, d = 70 + rr() * 230;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.abs(x) < 8 || Math.hypot(x + 40, z - 250) < 120) continue;
      trees.push([x, z, 0.9 + rr() * 0.45]);
    }
    scene.add(skyline());
    trees.forEach(([x, z, s], i) => {
      const t = pine(300 + i, s);
      t.position.set(x, hgt(x, z) - 0.3, z);
      scene.add(t);
    });
    scene.add(colosseum());
    const camp = campanile(brick);
    camp.position.set(36, hgt(36, -34), -34);
    scene.add(camp);
    const bas = basilica(brick);
    bas.position.set(62, hgt(62, -128) - 1, -128);
    bas.rotation.y = Math.PI / 2; // the open vaults face south, toward the road
    scene.add(bas);
    scene.add(ruins(brick, stoneMat));
    return { sky };
  };
})();
