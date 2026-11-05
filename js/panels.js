// Relief compositions. All drawing is in centimeters on the panel, y runs down.
// The figures are a simplified carving, not a copy of the ancient relief.
(function () {
  const AT = (window.AT = window.AT || {});
  const { figure, horse, limb, poly, smoothPoly, ell, curve, dome } = AT.relief;

  function clipField(c, x0, y0, x1, y1) {
    c.beginPath();
    c.rect(x0, y0, x1 - x0, y1 - y0);
    c.clip();
  }

  // Frame of a passage panel: a flat band with a small inner step.
  function frame(R, band, hgt) {
    const W = R.wcm, Hh = R.hcm;
    R.layer((c) => {
      c.beginPath();
      c.rect(0, 0, W, Hh);
      c.rect(band, band, W - 2 * band, Hh - 2 * band);
      c.fill('evenodd');
    }, { amp: hgt, blur: 0.6, mode: 'max' });
    R.layer((c) => {
      c.lineWidth = 1.4;
      c.strokeRect(band * 0.45, band * 0.45, W - band * 0.9, Hh - band * 0.9);
    }, { amp: 1.2, blur: 0.4, mode: 'sub' });
  }

  // ---------- The menorah ----------
  function menorah(c, pass, cx, baseY, topY) {
    const radii = [14, 27, 40];
    if (pass === 'body') {
      // two tier base on the platform
      poly(c, [[cx - 30, baseY], [cx + 30, baseY], [cx + 27, baseY - 11], [cx - 27, baseY - 11]]);
      poly(c, [[cx - 22, baseY - 11], [cx + 22, baseY - 11], [cx + 19, baseY - 20], [cx - 19, baseY - 20]]);
      c.fillRect(cx - 3.5, topY, 7, baseY - 20 - topY);
      c.lineWidth = 5;
      for (const r of radii) {
        c.beginPath();
        c.arc(cx, topY, r, 0, Math.PI);
        c.stroke();
      }
      for (const dx of [-40, -27, -14, 0, 14, 27, 40]) {
        poly(c, [[cx + dx - 5, topY - 5], [cx + dx + 5, topY - 5], [cx + dx + 3, topY + 1], [cx + dx - 3, topY + 1]]);
      }
    } else if (pass === 'dome') {
      dome(c, cx, baseY - 10, 24, 0.7);
    } else if (pass === 'fold') {
      // panels on the base, with sea creatures
      c.lineWidth = 1.2;
      for (let k = -2; k <= 1; k++) c.strokeRect(cx + k * 13 + 1.5, baseY - 9, 10, 7);
      for (let k = -1; k <= 0; k++) c.strokeRect(cx + k * 19 + 2, baseY - 18.5, 15, 6);
      for (let k = -2; k <= 1; k++) curve(c, [[cx + k * 13 + 3, baseY - 3.5], [cx + k * 13 + 6.5, baseY - 8], [cx + k * 13 + 10, baseY - 3.5]], 1);
    } else if (pass === 'hi') {
      // knobs and flowers along the branches
      for (const r of radii) {
        for (const a of [0.35, 0.7, 1.15, 1.6, 1.99, 2.44, 2.79]) {
          ell(c, cx + Math.cos(a) * r, topY + Math.sin(a) * r, 3.1, 2.4, a);
        }
      }
      for (let y = topY + 6; y < baseY - 22; y += 7) ell(c, cx, y, 4, 2.6);
    }
  }

  function menorahPaint(c, cx, baseY, topY) {
    menorah(c, 'body', cx, baseY, topY);
    c.save();
    c.globalAlpha = 1;
    menorah(c, 'hi', cx, baseY, topY);
    c.restore();
  }

  // ---------- Spoils panel (south wall) ----------
  // Proportions follow the original: bearers fill the lower 60 percent, and the
  // menorah, the table and the placards rise above their heads.
  function spoils() {
    const R = new AT.Relief(390, 204, 2, 101);
    const F = 194;
    const field = (c) => clipField(c, 6, 6, 384, 198);
    const mcx = 212, mBase = 72, mTop = 12;

    // background crowd: heads between the ranks
    R.plane({ base: 2, amp: 2, blur: 0.8, round: 1.2, roundBlur: 4, fold: 0.6, hi: 0.5 }, (c, p) => {
      field(c);
      for (const [x, h] of [[8, 128], [78, 126], [150, 127], [270, 128], [338, 125]]) figure(c, p, x, F - 8, { h, wreath: true, pose: 'down', step: 0.5 });
    });
    // second rank, the table and its platform, placards, and the gate
    R.plane({ base: 5, amp: 3, blur: 0.9, round: 2, roundBlur: 5, fold: 1, hi: 0.8 }, (c, p) => {
      field(c);
      const rank = [[44, 'down', 124, 0.03], [116, 'carry', 123, 0], [178, 'carry', 125, -0.02], [244, 'carry', 124, 0.02], [302, 'down', 123, 0.04]];
      for (const [x, pose, h, lean] of rank) figure(c, p, x, F - 4, { h, wreath: true, pose, step: 0.7, lean });
      if (p === 'body') {
        // placards on poles
        poly(c, [[10, 14], [54, 12], [55, 40], [11, 42]]);
        poly(c, [[312, 18], [352, 16], [352, 42], [313, 44]]);
        limb(c, [[33, 41], [34, 72]], 2.6, 2.6);
        limb(c, [[334, 43], [335, 78]], 2.6, 2.6);
        // the table of the showbread on its platform
        c.fillRect(74, 66, 84, 5);
        limb(c, [[66, 92], [166, 92]], 3.2, 3.2);
        for (const lx of [82, 96, 136, 150]) limb(c, [[lx, 44], [lx + 1, 66]], 3.6, 2.8);
        // the two silver trumpets leaning on the table
        limb(c, [[84, 70], [126, 12]], 2.4, 3.6);
        limb(c, [[150, 70], [110, 14]], 2.4, 3.6);
        ell(c, 127, 10, 5.5, 2.8, -0.95);
        ell(c, 109, 12, 5.5, 2.8, 0.9);
        // platform and poles of the menorah
        c.fillRect(mcx - 40, mBase, 80, 5);
        limb(c, [[mcx - 56, 94], [mcx + 56, 94]], 3.2, 3.2);
        // the triumphal gate, seen at an angle, with a quadriga on top
        c.fillRect(356, 46, 14, 152);
        c.fillRect(352, 30, 32, 18);
        c.beginPath();
        c.moveTo(370, 198); c.lineTo(370, 104); c.quadraticCurveTo(378, 80, 384, 86); c.lineTo(384, 46); c.lineTo(370, 46);
        c.closePath(); c.fill();
        horse(c, p, 356, 30, { dir: 1, s: 0.1 });
        horse(c, p, 366, 30, { dir: 1, s: 0.1 });
      } else if (p === 'fold') {
        c.lineWidth = 1.2;
        c.strokeRect(14, 17, 37, 21);
        c.strokeRect(316, 21, 32, 18);
        for (let y = 60; y < 196; y += 20) curve(c, [[357, y], [369, y - 1.5]], 1);
        curve(c, [[352, 48], [384, 48]], 1.4);
        for (let x = 355; x < 384; x += 6) curve(c, [[x, 32], [x, 46]], 0.8);
      }
    });
    // the table top, a little forward of its legs
    R.plane({ base: 8, amp: 2.5, blur: 0.7, round: 1.2, roundBlur: 3, fold: 0.8, hi: 0.8 }, (c, p) => {
      field(c);
      if (p === 'body') poly(c, [[74, 38], [160, 34], [160, 42], [74, 46]]);
      else if (p === 'fold') { curve(c, [[78, 41], [156, 37.5]], 0.8); }
      else if (p === 'hi') for (let x = 80; x < 156; x += 9) ell(c, x, 41.5 - (x - 74) * 0.045, 2.2, 1.6);
    });
    // front rank: bearers and walkers, all moving right, toward the gate
    R.plane({ base: 9, amp: 4.5, blur: 0.9, round: 3, roundBlur: 6, fold: 1.3, hi: 1 }, (c, p) => {
      field(c);
      const front = [
        [24, 'raiseBoth', 122, 0.9, 0], [62, 'carry', 118, 1, 0.03], [98, 'carry', 121, 1.1, 0], [136, 'down', 117, 0.8, 0.04],
        [172, 'carry', 122, 1, 0.02], [210, 'carry2', 119, 1.1, 0], [248, 'carry', 121, 1, 0.03],
        [284, 'down', 118, 1.2, 0.05], [326, 'raise', 120, 0.9, 0.02], [358, 'down', 116, 1, 0.06],
      ];
      for (const [x, pose, h, step, lean] of front) figure(c, p, x, F, { h, wreath: true, pose, step, lean, cloak: x === 136 || x === 284 });
      if (p === 'body') c.fillRect(6, 194, 378, 4);
    });
    // the menorah, in the highest relief
    R.plane({ base: 13, amp: 5, blur: 0.6, round: 2, roundBlur: 3, fold: 1, hi: 1.6, hiBlur: 0.5 }, (c, p) => {
      field(c);
      menorah(c, p, mcx, mBase, mTop);
    });
    R.paintMask((c) => menorahPaint(c, mcx, mBase, mTop), 0.6);
    frame(R, 6, 10);
    R.weather({ grain: 0.3, pits: 1.2 });
    return R;
  }

  // ---------- Triumph panel (north wall) ----------
  function triumph() {
    const R = new AT.Relief(390, 204, 2, 202);
    const field = (c) => clipField(c, 6, 6, 384, 198);
    const fasces = (c, x, top) => {
      poly(c, [[x - 3, top + 66], [x + 3, top + 66], [x + 9, top], [x + 3, top]]);
      poly(c, [[x + 6, top + 4], [x + 15, top - 2], [x + 16, top + 8], [x + 8, top + 10]]);
    };
    // lictors with fasces in the back
    R.plane({ base: 2, amp: 2, blur: 0.8, round: 1.2, roundBlur: 4, fold: 0.7, hi: 0.6 }, (c, p) => {
      field(c);
      for (const x of [26, 92, 140, 200, 236, 346]) {
        figure(c, p, x, 190, { h: 128, dir: -1, wreath: true, pose: 'carry', cloak: true });
        if (p === 'body') fasces(c, x - 12, 30);
        if (p === 'fold') { c.lineWidth = 0.7; for (let k = -1; k <= 1; k++) curve(c, [[x - 12 + k * 1.6, 94], [x - 6 + k * 1.6, 32]], 0.7); }
      }
    });
    // back horses, Victory, the Genius of the Senate
    R.plane({ base: 5, amp: 3, blur: 0.9, round: 2.4, roundBlur: 6, fold: 1, hi: 0.8 }, (c, p) => {
      field(c);
      horse(c, p, 204, 186, { dir: -1, s: 0.82 });
      horse(c, p, 192, 189, { dir: -1, s: 0.85, rear: 1 });
      figure(c, p, 360, 194, { h: 124, dir: -1, dress: 'toga', beard: true, pose: 'down' });
      figure(c, p, 306, 172, { h: 136, dir: -1, dress: 'long', pose: 'crown', hold: 'wreath' });
      if (p === 'body') {
        poly(c, [[306, 80], [318, 36], [340, 18], [368, 22], [352, 40], [338, 64], [320, 92]]);
        poly(c, [[300, 82], [294, 46], [302, 26], [314, 36], [312, 64]]);
      } else if (p === 'fold') {
        for (let k = 0; k < 6; k++) curve(c, [[312 + k * 4, 84 - k * 6], [330 + k * 5, 44 - k * 2]], 1);
      }
    });
    // front horses, Roma, Titus in the chariot, the Genius of the Roman People
    R.plane({ base: 9, amp: 4, blur: 0.9, round: 3, roundBlur: 6, fold: 1.3, hi: 0.9 }, (c, p) => {
      field(c);
      horse(c, p, 180, 192, { dir: -1, s: 0.88 });
      figure(c, p, 50, 194, { h: 124, dir: 1, helmet: true, pose: 'bridle', step: 0.8 });
      figure(c, p, 270, 150, { h: 104, dir: -1, dress: 'toga', wreath: true, pose: 'scepter', hold: 'scepter' });
      figure(c, p, 332, 194, { h: 120, dir: -1, dress: 'bare', pose: 'down', cloak: true });
      if (p === 'body') {
        smoothPoly(c, [[236, 118], [262, 112], [300, 116], [302, 168], [244, 170], [232, 142]]);
        c.fillRect(6, 194, 378, 4);
      } else if (p === 'fold') {
        c.lineWidth = 1.2;
        curve(c, [[240, 126], [270, 120], [298, 124]], 1.4);
        curve(c, [[238, 152], [270, 148], [300, 152]], 1.4);
        for (let x = 246; x < 298; x += 12) curve(c, [[x, 130], [x + 5, 140], [x, 148]], 1);
      }
    });
    // the leading horse and the chariot wheel, highest
    R.plane({ base: 13, amp: 4.5, blur: 0.8, round: 3, roundBlur: 6, fold: 1.2, hi: 1 }, (c, p) => {
      field(c);
      horse(c, p, 168, 194, { dir: -1, s: 0.9, rear: 1, plume: true });
      if (p === 'body') {
        c.lineWidth = 5;
        c.beginPath(); c.arc(262, 170, 24, 0, Math.PI * 2); c.stroke();
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4;
          limb(c, [[262, 170], [262 + Math.cos(a) * 23, 170 + Math.sin(a) * 23]], 2.6, 2);
        }
        ell(c, 262, 170, 5.5, 5.5);
      }
    });
    frame(R, 6, 10);
    R.weather({ grain: 0.3, pits: 1.2 });
    return R;
  }

  // ---------- Vault coffers ----------
  // u runs along the arc (842 cm), v along the passage (475 cm).
  function vault(L, D) {
    const R = new AT.Relief(L, D, 1, 303);
    const cell = 60, nu = 13, nv = 7;
    const u0 = (L - nu * cell) / 2, v0 = (D - nv * cell) / 2;
    const cu = Math.floor(nu / 2), cv = Math.floor(nv / 2);
    const skip = (i, j) => Math.abs(i - cu) <= 1 && Math.abs(j - cv) <= 1;
    const each = (fn) => {
      for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) if (!skip(i, j)) fn(u0 + i * cell, v0 + j * cell);
    };
    R.layer((c) => each((x, y) => c.fillRect(x + 7, y + 7, cell - 14, cell - 14)), { amp: 5, blur: 0.8, mode: 'sub' });
    R.layer((c) => each((x, y) => c.fillRect(x + 13, y + 13, cell - 26, cell - 26)), { amp: 6, blur: 0.8, mode: 'sub' });
    R.layer((c) => each((x, y) => {
      const cx = x + cell / 2, cy = y + cell / 2;
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        ell(c, cx + Math.cos(a) * 6.5, cy + Math.sin(a) * 6.5, 6, 3, a);
      }
    }), { amp: 7, blur: 0.8, mode: 'add' });
    R.layer((c) => each((x, y) => ell(c, x + cell / 2, y + cell / 2, 3.5, 3.5)), { amp: 4, blur: 0.6, mode: 'add' });
    // the panel recess around the apotheosis
    const pu = u0 + (cu - 1) * cell, pv = v0 + (cv - 1) * cell;
    R.layer((c) => c.fillRect(pu + 6, pv + 6, cell * 3 - 12, cell * 3 - 12), { amp: 3, blur: 0.6, mode: 'sub' });
    R.weather({ grain: 0.25, pits: 0.8, floor: -40 });
    R.panel = { u: pu + 6, v: pv + 6, size: cell * 3 - 12 };
    return R;
  }

  // ---------- Apotheosis: an eagle carries Titus up ----------
  function apotheosis(size) {
    const S = size;
    const R = new AT.Relief(S, S, 3, 404);
    const k = S / 130;
    R.layer((c) => c.fillRect(0, 0, S, S), { amp: -10, blur: 0.1, mode: 'set' });
    R.layer((c) => {
      c.beginPath(); c.rect(0, 0, S, S); c.rect(8 * k, 8 * k, S - 16 * k, S - 16 * k); c.fill('evenodd');
    }, { amp: 7, blur: 1.2, mode: 'add' });
    const field = (c) => { c.scale(k, k); clipField(c, 8, 8, 122, 122); };
    R.plane({ base: -7, amp: 3, blur: 1.4, dome: 1.2, fold: 1, hi: 0.6 }, (c, p) => {
      field(c);
      if (p === 'body') {
        for (const sx of [-1, 1]) {
          c.save(); c.translate(65, 0); c.scale(sx, 1); c.translate(-65, 0);
          poly(c, [[60, 64], [40, 46], [14, 22], [12, 36], [16, 52], [22, 64], [30, 76], [46, 84], [58, 82]]);
          c.restore();
        }
        poly(c, [[56, 98], [74, 98], [82, 118], [48, 118]]);
      } else if (p === 'fold') {
        for (const sx of [-1, 1]) {
          c.save(); c.translate(65, 0); c.scale(sx, 1); c.translate(-65, 0);
          for (let i = 0; i < 7; i++) curve(c, [[54 - i * 5, 70 - i * 3], [30 - i * 3, 52 - i * 5]], 1);
          c.restore();
        }
        for (let x = 52; x < 80; x += 5) curve(c, [[x + 2, 100], [x, 116]], 0.9);
      }
    });
    R.plane({ base: -4, amp: 3.5, blur: 1.4, dome: 2, fold: 0.8, hi: 0.8 }, (c, p) => {
      field(c);
      if (p === 'body') {
        ell(c, 65, 80, 13, 21);
        ell(c, 79, 58, 6, 5);
        poly(c, [[83, 57], [90, 60], [84, 62]]);
      } else if (p === 'dome') dome(c, 65, 80, 14, 1);
      else if (p === 'fold') for (let y = 66; y < 98; y += 5) curve(c, [[56, y], [65, y + 3], [74, y]], 0.9);
    });
    R.plane({ base: -1, amp: 3.5, blur: 1.2, dome: 1.6, fold: 0.9, hi: 0.8 }, (c, p) => {
      field(c);
      figure(c, p, 65, 74, { h: 58, dir: 1, dress: 'toga', wreath: true, pose: 'scepter', hold: 'scepter', step: 0 });
    });
    R.weather({ grain: 0.2, pits: 0.6, floor: -14 });
    return R;
  }

  // ---------- Spandrel Victory, right side of a face ----------
  // Panel covers x from 0.2 to 3.25 m and y from 5.6 to 9.65 m on the face.
  // The figure flies down along the curve of the arch, head toward the keystone.
  function victory(seed) {
    const W = 305, Hh = 405;
    const R = new AT.Relief(W, Hh, 1.5, seed);
    // the far wing, in lower relief
    R.plane({ base: 3, amp: 2.5, blur: 0.9, round: 1.5, roundBlur: 5, fold: 1, hi: 0.5 }, (c, p) => {
      if (p === 'body') smoothPoly(c, [[112, 62], [118, 30], [140, 12], [168, 8], [156, 28], [140, 50]]);
      else if (p === 'fold') for (let i = 0; i < 5; i++) curve(c, [[120 + i * 6, 58 - i * 6], [140 + i * 6, 22 - i * 2]], 1);
    });
    R.plane({ base: 5, amp: 4.5, blur: 1, round: 3.5, roundBlur: 7, fold: 1.4, hi: 1 }, (c, p) => {
      if (p === 'body') {
        // near wing
        smoothPoly(c, [[124, 70], [146, 30], [190, 10], [250, 8], [292, 20], [262, 30], [276, 38], [236, 44], [250, 54], [204, 58], [170, 78]]);
        // head with gathered hair
        ell(c, 70, 44, 13, 15, -0.5);
        ell(c, 60, 36, 9, 8, -0.5);
        limb(c, [[80, 54], [90, 58]], 10, 10);
        // torso, leaning into the flight
        smoothPoly(c, [[84, 50], [112, 48], [150, 66], [170, 84], [162, 104], [124, 96], [92, 74]]);
        // billowing skirt that splits into two legs
        smoothPoly(c, [[150, 74], [192, 88], [232, 112], [262, 140], [270, 158], [240, 154], [200, 134], [160, 108]]);
        limb(c, [[226, 124], [254, 146], [286, 160]], 12, 7.5);
        limb(c, [[214, 132], [244, 156], [276, 176]], 11, 7);
        ell(c, 290, 161, 7, 3.2, 0.4);
        ell(c, 280, 178, 7, 3.2, 0.6);
        // arm reaching toward the keystone, with a palm branch
        limb(c, [[90, 60], [62, 66], [34, 60]], 9, 6.5);
        limb(c, [[34, 60], [14, 28]], 3, 2);
        for (let i = 0; i < 7; i++) ell(c, 30 - i * 2.8, 52 - i * 4.4, 7, 2.4, -0.9 + (i % 2) * 1.6);
        // other arm holds a wreath
        limb(c, [[110, 60], [126, 46], [140, 46]], 9, 6.5);
        c.lineWidth = 4;
        c.beginPath(); c.ellipse(150, 44, 10, 7, 0.2, 0, Math.PI * 2); c.stroke();
      } else if (p === 'fold') {
        for (let i = 0; i < 10; i++) curve(c, [[150 + i * 10, 66 - i * 4.5], [186 + i * 10.5, 26 - i * 1.5]], 1.3);
        for (let i = 0; i < 8; i++) curve(c, [[152 + i * 12, 82 + i * 7], [184 + i * 12, 92 + i * 9], [196 + i * 11, 120 + i * 6]], 1.3);
        curve(c, [[100, 56], [118, 70], [138, 92]], 1.2);
        curve(c, [[112, 54], [134, 70], [152, 90]], 1.2);
        c.beginPath(); c.arc(78, 42, 1.8, 0, Math.PI * 2); c.fill();
      } else if (p === 'hi') {
        for (let a = 3.2; a <= 5.9; a += 0.32) ell(c, 66 + Math.cos(a) * 12, 40 + Math.sin(a) * 13, 2.6, 2.6);
        for (let k = 0; k < 10; k++) ell(c, 150 + Math.cos(k * 0.63) * 10, 44 + Math.sin(k * 0.63) * 7, 2.6, 1.6, k * 0.63);
      }
    });
    R.weather({ grain: 0.3, pits: 1.2 });
    return R;
  }

  // ---------- Small frieze: the sacrificial procession with the river Jordan ----------
  function frieze() {
    const W = 620, Hh = 60;
    const R = new AT.Relief(W, Hh, 2, 505);
    const F = 56;
    R.plane({ base: 1.2, amp: 1.5, blur: 1, dome: 0.6, fold: 0.5, hi: 0.4 }, (c, p) => {
      for (let x = 20; x < W - 10; x += 26) figure(c, p, x, F - 2, { h: 44, dir: -1, pose: 'down', wreath: true });
    });
    R.plane({ base: 3, amp: 2.2, blur: 1, dome: 0.8, fold: 0.6, hi: 0.5 }, (c, p) => {
      for (const x of [34, 70, 104, 236, 270, 310, 470, 506, 540, 590]) figure(c, p, x, F, { h: 46, dir: -1, pose: x % 4 ? 'down' : 'raise', wreath: true });
      // sacrificial bull
      if (p === 'body') {
        ell(c, 170, 34, 26, 12);
        ell(c, 148, 30, 8, 9);
        ell(c, 140, 28, 5, 5);
        limb(c, [[140, 22], [134, 16]], 2, 1.4);
        limb(c, [[146, 21], [150, 15]], 2, 1.4);
        for (const lx of [154, 162, 182, 190]) limb(c, [[lx, 40], [lx - 1, 55]], 4, 3);
        limb(c, [[195, 30], [200, 44]], 2, 1.5);
        // the litter with the reclining river god
        c.fillRect(370, 25, 80, 3);
        limb(c, [[360, 31], [460, 31]], 2, 2);
        smoothPoly(c, [[380, 24], [384, 14], [400, 12], [440, 18], [446, 24]]);
        ell(c, 386, 10, 4.5, 5);
        limb(c, [[400, 14], [394, 4], [404, 0]], 2.5, 2);
      }
      for (const x of [380, 404, 428, 452]) figure(c, p, x, F, { h: 26, dir: -1, pose: 'carry', step: 0.5 });
    });
    R.weather({ grain: 0.2, pits: 1 });
    return R;
  }

  // ---------- The dedication on the east attic ----------
  function inscription(withText) {
    const W = 720, Hh = 250;
    const R = new AT.Relief(W, Hh, 2, 606);
    R.layer((c) => c.fillRect(14, 14, W - 28, Hh - 28), { amp: 5, blur: 0.5, mode: 'max' });
    R.layer((c) => {
      c.beginPath(); c.rect(0, 0, W, Hh); c.rect(14, 14, W - 28, Hh - 28); c.fill('evenodd');
    }, { amp: 8, blur: 2.4, mode: 'max', pow: 0.7 });
    R.layer((c) => { c.lineWidth = 1.5; c.strokeRect(7, 7, W - 14, Hh - 14); }, { amp: 1.6, blur: 0.5, mode: 'sub' });
    const lines = withText === false ? [] : ['SENATVS', 'POPVLVSQVE·ROMANVS', 'DIVO·TITO·DIVI·VESPASIANI·F', 'VESPASIANO·AVGVSTO'];
    if (lines.length) R.layer((c) => {
      c.textAlign = 'center';
      c.textBaseline = 'alphabetic';
      let size = 40;
      c.font = `600 ${size}px Cinzel, "Times New Roman", serif`;
      const longest = Math.max(...lines.map((l) => c.measureText(l).width));
      size = Math.min(40, (40 * 650) / longest);
      c.font = `600 ${size}px Cinzel, "Times New Roman", serif`;
      const gap = (Hh - 40 - lines.length * size) / (lines.length + 1);
      lines.forEach((l, i) => c.fillText(l, W / 2, 20 + gap * (i + 1) + size * (i + 0.86)));
    }, { amp: 2.8, blur: 0.45, mode: 'sub' });
    R.weather({ grain: 0.25, pits: 0.9 });
    return R;
  }

  AT.panels = { spoils, triumph, vault, apotheosis, victory, frieze, inscription };
})();
