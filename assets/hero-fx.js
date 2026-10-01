/* WinsVue Agro · camada de movimento do topo (hero).
   Desenha num <canvas id="wvfx"> atrás do título e do celular.
   Cada quadro é função pura do tempo, então o site e a captura do vídeo
   (?capture=1, com relógio virtual) mostram exatamente a mesma coisa.

   Roteiro (u = segundos dentro do ciclo de 12 s, depois de 1,9 s de montagem):
   captura (talhões e documentos viram pacotes) → organiza → confere
   (varredura do campo, nota x áudio x Pix) → calcula → monitora →
   entrega (anéis travam e o briefing chega no celular). */
(() => {
  'use strict';

  const CAPTURE = /[?&]capture=1\b/.test(location.search);
  const INTRO = 1.9;
  const CYCLE = 12;
  const DELIVER = 10.4;
  const SLOT = 0.05;
  const MAXLIFE = 2.6;

  const BLUE = [86, 142, 255];
  const BLUE2 = [160, 194, 255];
  const PINK = [255, 26, 108];
  const WHITE = [255, 255, 255];
  const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a <= 0 ? 0 : a >= 1 ? 1 : a.toFixed(3)) + ')';
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, k) => a + (b - a) * k;
  const sstep = k => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
  const eOut = k => (k <= 0 ? 0 : k >= 1 ? 1 : 1 - Math.pow(1 - k, 3));
  const eInOut = k => (k <= 0 ? 0 : k >= 1 ? 1 : k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const eBack = k => {
    if (k <= 0) return 0;
    if (k >= 1) return 1;
    const c = 1.7;
    return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
  };
  function hash(n) {
    n |= 0;
    n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
    n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
    n ^= n >>> 16;
    return (n >>> 0) / 4294967296;
  }
  const hash2 = (a, b) => hash((Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + 1013904223) | 0);

  // Documentos que chegam pelo WhatsApp (dados do próprio demo do site).
  const CHIPS = [
    { k: 'Áudio · Zé Carlos', v: '420 L · trator 7230', icon: 'wave', lane: 'R', f: 0.06 },
    { k: 'NF-e 18.233', v: 'R$ 19.520,00', icon: 'doc', lane: 'R', f: 0.4 },
    { k: 'Pix · Sicredi', v: '−R$ 12.480,00', icon: 'pix', lane: 'R', f: 0.74 },
    { k: 'Contrato 0447/26', v: '8.000 sc · R$ 126', icon: 'contract', lane: 'L', f: 0.2 },
    { k: 'Mercado · soja', v: 'R$ 131/sc', icon: 'chart', lane: 'L', f: 0.6 }
  ];
  const CH_WIN = [[0.3, 2.6], [1.2, 3.6], [2.2, 4.6], [3.0, 5.4], [3.8, 6.2]];
  const STAGES = [['CAPTURA', 0], ['ORGANIZA', 3.4], ['CONFERE', 5.0], ['CALCULA', 7.6], ['MONITORA', 8.8], ['EXPLICA', 9.8], ['ALERTA', 10.6]];
  const RING_WORDS = ['CAPTURA', 'ORGANIZA', 'CONFERE', 'CALCULA', 'MONITORA', 'EXPLICA', 'ALERTA'];
  const VERIFY = [
    { a: 0, b: 1, txt: ['≠ 260 L sem destino', '≠ 260 L'], pink: true, at: 5.6 },
    { a: 1, b: 2, txt: ['✓ conferido', '✓ ok'], pink: false, at: 6.3 },
    { a: 3, b: 4, txt: ['✓ 22% com preço', '✓ 22%'], pink: false, at: 7.0 }
  ];
  const VERIFY_END = 8.9;

  let canvas = null, ctx = null, hero = null, phoneEl = null, textEl = null;
  let L = null, W = 0, H = 0, dpr = 1, t0 = 0, raf = 0, visible = true;
  let mx = 0, my = 0, tmx = 0, tmy = 0, frameN = 0, slowRun = 0;
  let sprite = null, spriteP = null, ringText = null;
  const stats = (window.__wvfxStats = { avgMs: 0, dpr: 1, frames: 0 });
  const hasLS = typeof CanvasRenderingContext2D !== 'undefined' && 'letterSpacing' in CanvasRenderingContext2D.prototype;
  const spacing = v => { if (hasLS) ctx.letterSpacing = v; };

  function makeSprite(c1, c2) {
    const s = document.createElement('canvas');
    s.width = s.height = 64;
    const g = s.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.16, c1);
    gr.addColorStop(0.45, c2);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return s;
  }
  function glowAt(x, y, r, a, pink) {
    if (a <= 0.004 || r <= 0.5) return;
    ctx.globalAlpha = a > 1 ? 1 : a;
    ctx.drawImage(pink ? spriteP : sprite, x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }
  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ───────────────────────── layout ─────────────────────────
  function layout() {
    const hr = hero.getBoundingClientRect();
    const nw = hr.width, nh = hr.height;
    if (nw < 2 || nh < 2) return false;
    const pr = phoneEl.getBoundingClientRect(), tr = textEl.getBoundingClientRect();
    const P = { x: pr.left - hr.left, y: pr.top - hr.top, w: pr.width, h: pr.height };
    const T = { x: tr.left - hr.left, y: tr.top - hr.top, r: tr.right - hr.left, b: tr.bottom - hr.top };
    const two = P.x > T.r - 2;
    const cx = P.x + P.w / 2, cy = P.y + P.h / 2;
    const lay = { P, T, two, cx, cy, chips: [] };
    lay.hy = two ? nh * 0.5 : P.y + P.h * 0.28;
    lay.K = nh + 60 - lay.hy;
    lay.S = Math.max(nw, 900) * 0.9;
    if (two) {
      const laneL = P.x - T.r, laneR = nw - (P.x + P.w);
      CHIPS.forEach((c, i) => {
        const lane = c.lane === 'L' ? laneL : laneR;
        const w = Math.min(176, lane - 28);
        if (w < 128) return;
        let x;
        if (c.lane === 'L') x = P.x - clamp((laneL - w) / 2, 14, 120) - w;
        else x = P.x + P.w + clamp((laneR - w - 12) / 2, 12, 140);
        lay.chips[i] = { i, x, y: P.y + c.f * P.h, w, h: 54, side: c.lane, yy: 0 };
      });
      lay.ringA = clamp(cx - T.r - 26, P.w * 0.62, P.w * 1.05);
      lay.Rt = Math.min(P.h / 2 + 34, cx - T.r - 6);
      if (lay.Rt < P.h / 2 + 10) lay.Rt = 0;
    } else {
      lay.ringA = P.w * 0.5 + 24;
      lay.Rt = 0;
    }
    const cw = Math.min(nw, 1440), pad = clamp(window.innerWidth * 0.055, 20, 80);
    lay.hudR = (nw - cw) / 2 + cw - pad;
    lay.hud = two && nw >= 1100;
    L = lay;
    if (nw !== W || nh !== H) {
      W = nw; H = nh;
      sizeCanvas();
    }
    ringText = null;
    return true;
  }
  function sizeCanvas() {
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }

  // ───────────────────────── tempo do roteiro ─────────────────────────
  const cycU = t => (t < INTRO ? -1 : (t - INTRO) % CYCLE);
  function stageAt(t) {
    const u = cycU(t);
    if (u < 0) return 'CONECTANDO';
    let s = STAGES[0][0];
    for (const [name, at] of STAGES) if (u >= at) s = name;
    return s;
  }
  function lastDelivery(t) {
    if (t < INTRO - 0.05) return -1;
    const k = Math.floor((t - INTRO - DELIVER) / CYCLE);
    return k >= 0 ? INTRO + k * CYCLE + DELIVER : INTRO - 0.05;
  }
  function lockAt(u) {
    if (u < 0) return 0;
    return sstep((u - (DELIVER - 0.6)) / 0.5) * sstep((DELIVER + 0.75 - u) / 0.6);
  }
  function countAt(t) {
    if (t < INTRO) return 23;
    const k = Math.floor((t - INTRO) / CYCLE), u = cycU(t);
    let c = 23 + k * 9;
    for (const w of CH_WIN) if (u >= w[1]) c++;
    if (u >= DELIVER) c += 4;
    return c;
  }

  // ───────────────────────── fundo e campo ─────────────────────────
  function drawBackGlow(t) {
    const g = ctx.createRadialGradient(L.cx, L.hy, 0, L.cx, L.hy, Math.max(W, H) * 0.62);
    g.addColorStop(0, 'rgba(86,142,255,0.20)');
    g.addColorStop(0.35, 'rgba(86,142,255,0.07)');
    g.addColorStop(1, 'rgba(86,142,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const b = 0.5 + 0.5 * Math.sin(t * 0.8);
    const g2 = ctx.createRadialGradient(L.cx, L.cy, 0, L.cx, L.cy, L.P.h * 0.75);
    g2.addColorStop(0, 'rgba(86,142,255,' + (0.1 + b * 0.04).toFixed(3) + ')');
    g2.addColorStop(1, 'rgba(86,142,255,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);
  }

  function scanS(t) {
    const u = cycU(t);
    if (t < INTRO + 5) return (t - 0.15) * 1.125;
    return (u - 5.0 + CYCLE) % CYCLE;
  }

  function drawGround(t) {
    const hy = L.hy + my * 6, vx = L.cx + mx * 18, K = L.K, S = L.S;
    const Zn = 1, Zf = 18, span = Zf - Zn, dz = 0.6, cell = 0.16;
    const intro = eOut((t - 0.05) / 1.25);
    if (intro <= 0) return;
    const bottom = H + 60;
    const reveal = hy + (bottom - hy) * intro;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, hy - 1, W, reveal - hy + 1);
    ctx.clip();

    const v = 0.32, off = t * v, frac = off % dz, gbase = Math.floor(off / dz);
    const zs = [];
    for (let m = 1; m < 80; m++) {
      const Z = Zn + m * dz - frac;
      if (Z > Zf) break;
      zs.push({ Z, g: m + gbase });
    }
    const sy = Z => hy + K / Z;
    const sx = (X, Z) => vx + (X * S) / Z;

    // talhões acesos (varredura + parcelas monitoradas)
    const s = scanS(t);
    for (let r = 0; r + 1 < zs.length; r++) {
      const za = zs[r].Z, zb = zs[r + 1].Z, g = zs[r].g;
      const zc = (za + zb) / 2;
      const near = clamp(((Zf - zc) / span) * 1.35, 0, 1) * sstep((zc - 1.9) / 1.1);
      if (near <= 0.02) continue;
      const uc = (1.8 * (Zf - zc)) / span;
      const scanG = s >= uc ? Math.exp(-(s - uc) / 0.85) : 0;
      const i0 = Math.floor(((-60 - vx) * za) / (S * cell)) - 1, i1 = Math.ceil(((W + 60 - vx) * za) / (S * cell)) + 1;
      for (let i = i0; i <= i1; i++) {
        const h = hash2(i, g);
        if (h > 0.32) continue;
        const base = h < 0.1 ? 0.03 + 0.05 * hash2(i + 7, g) : 0;
        const a = (base + scanG * (h < 0.1 ? 0.26 : 0.14)) * near;
        if (a < 0.006) continue;
        const X0 = (i + 0.07) * cell, X1 = (i + 0.93) * cell, Za = za + dz * 0.07, Zb = zb - dz * 0.07;
        ctx.fillStyle = rgba(BLUE, a);
        ctx.beginPath();
        ctx.moveTo(sx(X0, Za), sy(Za));
        ctx.lineTo(sx(X1, Za), sy(Za));
        ctx.lineTo(sx(X1, Zb), sy(Zb));
        ctx.lineTo(sx(X0, Zb), sy(Zb));
        ctx.closePath();
        ctx.fill();
        if (h < 0.018 && zc < 8) {
          const fs = clamp(26 / zc, 7.5, 11);
          ctx.font = '600 ' + fs.toFixed(1) + 'px Kanit, sans-serif';
          ctx.fillStyle = rgba(BLUE2, (0.3 + scanG * 0.5) * near);
          ctx.textAlign = 'center';
          ctx.fillText('T-' + (1 + Math.floor(hash2(i + 3, g + 5) * 48)), sx((i + 0.5) * cell, zc), sy(zc) + fs * 0.35);
          ctx.textAlign = 'left';
        }
      }
    }

    // linhas do campo
    const grad = (mul) => {
      const gr = ctx.createLinearGradient(0, hy, 0, bottom);
      gr.addColorStop(0, rgba(BLUE, 0));
      gr.addColorStop(0.05, rgba(BLUE, 0.04 * mul));
      gr.addColorStop(0.45, rgba(BLUE, 0.13 * mul));
      gr.addColorStop(1, rgba(BLUE, 0.22 * mul));
      return gr;
    };
    const Xmax = Math.ceil(((Math.max(vx, W - vx) + 40) * Zf) / S / cell);
    ctx.lineWidth = 1;
    for (const bright of [false, true]) {
      ctx.beginPath();
      for (let i = -Xmax; i <= Xmax; i++) {
        if ((i % 4 === 0) !== bright) continue;
        const X = i * cell;
        ctx.moveTo(sx(X, Zf), sy(Zf));
        ctx.lineTo(sx(X, Zn), sy(Zn));
      }
      for (const z of zs) {
        if ((z.g % 4 === 0) !== bright) continue;
        const y = sy(z.Z);
        ctx.moveTo(-10, y);
        ctx.lineTo(W + 10, y);
      }
      ctx.strokeStyle = grad(bright ? 1.9 : 1);
      ctx.stroke();
    }

    // feixe de varredura
    if (s >= 0 && s <= 1.8) {
      const Zs = Zf - (span * s) / 1.8, y = sy(Zs);
      const a = sstep(s / 0.25) * sstep((1.8 - s) / 0.3);
      const band = ctx.createLinearGradient(0, y - 26, 0, y + 6);
      band.addColorStop(0, rgba(BLUE, 0));
      band.addColorStop(0.8, rgba(BLUE, 0.16 * a));
      band.addColorStop(1, rgba(BLUE, 0));
      ctx.fillStyle = band;
      ctx.fillRect(0, y - 26, W, 32);
      const line = ctx.createLinearGradient(0, 0, W, 0);
      line.addColorStop(0, rgba(BLUE2, 0));
      line.addColorStop(clamp(vx / W, 0.05, 0.95), rgba(BLUE2, 0.85 * a));
      line.addColorStop(1, rgba(BLUE2, 0));
      ctx.strokeStyle = line;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // horizonte
    const hz = ctx.createLinearGradient(0, 0, W, 0);
    hz.addColorStop(0, rgba(BLUE, 0));
    hz.addColorStop(clamp(vx / W, 0.05, 0.95), rgba(BLUE2, 0.42 * intro));
    hz.addColorStop(1, rgba(BLUE, 0));
    ctx.strokeStyle = hz;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, hy + 0.5);
    ctx.lineTo(W, hy + 0.5);
    ctx.stroke();
    ctx.restore();
  }

  function drawDust(t) {
    const n = W < 700 ? 46 : 96;
    const din = eOut((t - 0.2) / 1.2);
    for (let i = 0; i < n; i++) {
      const hx = hash(i * 3 + 11), hy0 = hash(i * 3 + 12), hs = hash(i * 3 + 13);
      const sp = 5 + hs * 14;
      let y = (hy0 * (H + 40) - t * sp) % (H + 40);
      if (y < 0) y += H + 40;
      y -= 20;
      const x = hx * W + Math.sin(t * 0.35 + i) * 10 + mx * (4 + hs * 12);
      const a = (0.06 + 0.26 * hs) * (0.6 + 0.4 * Math.sin(t * 1.6 + i * 2.1)) * din;
      const sz = 0.8 + hs * 1.3;
      ctx.fillStyle = rgba(BLUE2, a);
      ctx.fillRect(x, y, sz, sz);
    }
  }

  // ───────────────────────── anéis em volta do celular ─────────────────────────
  function insidePhone(x, y, pad) {
    const P = L.P;
    return x > P.x - pad && x < P.x + P.w + pad && y > P.y - pad && y < P.y + P.h + pad;
  }

  function drawRings(t, u) {
    const ringIn = eOut((t - 0.3) / 1.1);
    if (ringIn <= 0) return;
    const lock = lockAt(u);
    const cx = L.cx + mx * 8, cy = L.cy + my * 5;
    const A0 = L.ringA * lerp(0.84, 1, ringIn);
    const defs = [
      { b: -0.42, amp: 0.15, w: 0.23, ph: 0.0, e: 0.3, k: 1.0, sp: 0.55 },
      { b: 0.0, amp: 0.11, w: 0.17, ph: 2.1, e: 0.22, k: 1.1, sp: -0.42 },
      { b: 0.42, amp: 0.15, w: 0.29, ph: 4.0, e: 0.34, k: 0.9, sp: 0.66 }
    ];
    ctx.lineCap = 'round';
    const SEG = 150;
    defs.forEach((d, ri) => {
      const th = lerp(d.b + d.amp * Math.sin(t * d.w + d.ph), 0, lock);
      const A = A0 * lerp(d.k, 1, lock), B = A * lerp(d.e, 0.27, lock);
      const c = Math.cos(th), s = Math.sin(th);
      const el = [];
      for (let j = 0; j < 2; j++) el.push(d.ph + t * d.sp + j * Math.PI);
      let px = 0, py = 0;
      for (let k = 0; k <= SEG; k++) {
        const a = (k / SEG) * Math.PI * 2;
        const ex = A * Math.cos(a), ey = B * Math.sin(a);
        const x = cx + ex * c - ey * s, y = cy + ex * s + ey * c;
        if (k > 0 && !(insidePhone(x, y, -2) && insidePhone(px, py, -2))) {
          let tail = 0;
          for (const e of el) {
            let dl = (e - a) * Math.sign(d.sp);
            dl = ((dl % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            tail += Math.exp(-dl / 0.42);
          }
          const front = Math.sin(a) > 0 ? 0.06 : 0;
          const alpha = (0.13 + front + tail * 0.6 + lock * 0.38) * ringIn;
          ctx.strokeStyle = rgba(ri === 1 ? BLUE2 : BLUE, alpha);
          ctx.lineWidth = 1 + tail * 0.8 + lock * 0.6;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
        px = x;
        py = y;
      }
      ctx.globalCompositeOperation = 'lighter';
      for (const e of el) {
        const ex = A * Math.cos(e), ey = B * Math.sin(e);
        const x = cx + ex * c - ey * s, y = cy + ex * s + ey * c;
        if (insidePhone(x, y, 2)) continue;
        glowAt(x, y, 12, 0.85 * ringIn);
        ctx.fillStyle = rgba(WHITE, 0.95 * ringIn);
        ctx.beginPath();
        ctx.arc(x, y, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    });

    // anel de texto com as etapas
    if (L.Rt > 0) {
      const R = L.Rt * lerp(0.9, 1, ringIn);
      const tin = eOut((t - 0.4) / 1.0);
      if (!ringText) buildRingText();
      const stage = stageAt(t);
      const rot = t * 0.035 - Math.PI / 2;
      ctx.font = '600 10.5px Kanit, sans-serif';
      spacing('0px');
      ctx.textAlign = 'center';
      const scale = (Math.PI * 2) / ringText.total;
      for (const ch of ringText.chars) {
        const ang = rot + ch.mid * scale;
        const x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R;
        if (insidePhone(x, y, 6)) continue;
        const active = ch.word === stage;
        const a = (active ? 0.95 : 0.24 + lock * 0.3) * tin;
        if (a < 0.01) continue;
        ctx.fillStyle = active ? rgba(BLUE2, a) : rgba(WHITE, a);
        const ca = Math.cos(ang + Math.PI / 2), sa = Math.sin(ang + Math.PI / 2);
        ctx.setTransform(dpr * ca, dpr * sa, -dpr * sa, dpr * ca, dpr * x, dpr * y);
        ctx.fillText(ch.c, 0, 3.5);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.textAlign = 'left';

      // marcações internas
      const Ri = R - 15, rot2 = -t * 0.06;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k < 120; k++) {
        const ang = rot2 + (k / 120) * Math.PI * 2;
        const len = k % 5 === 0 ? 6 : 2.5;
        const x1 = cx + Math.cos(ang) * Ri, y1 = cy + Math.sin(ang) * Ri;
        if (insidePhone(x1, y1, 4)) continue;
        const x2 = cx + Math.cos(ang) * (Ri - len), y2 = cy + Math.sin(ang) * (Ri - len);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.strokeStyle = rgba(BLUE, (0.3 + lock * 0.4) * tin);
      ctx.stroke();
    }
  }

  function buildRingText() {
    ctx.font = '600 10.5px Kanit, sans-serif';
    spacing('0px');
    const sep = '  ·  ';
    const unit = [];
    RING_WORDS.forEach(w => {
      for (const c of w) unit.push({ c, word: w });
      for (const c of sep) unit.push({ c, word: '' });
    });
    const track = 2.6;
    let unitW = 0;
    for (const u of unit) unitW += ctx.measureText(u.c).width + track;
    const circ = Math.PI * 2 * L.Rt;
    const reps = Math.max(1, Math.round(circ / unitW));
    const chars = [];
    let acc = 0;
    for (let r = 0; r < reps; r++) {
      for (const u of unit) {
        const w = ctx.measureText(u.c).width + track;
        if (u.c !== ' ') chars.push({ c: u.c, word: u.word, mid: acc + w / 2 });
        acc += w;
      }
    }
    ringText = { chars, total: acc };
  }

  // ───────────────────────── pacotes de dados ─────────────────────────
  function eventInfo(n) {
    const ts = n * SLOT;
    if (ts < 0.35) return null;
    const h = i => hash(n * 13 + i);
    const u = ts < INTRO ? -1 : (ts - INTRO) % CYCLE;
    const chips = L.chips;
    if (u >= DELIVER - 0.62 && u < DELIVER - 0.08 && h(1) < 0.9) {
      const c = Math.floor(h(2) * CHIPS.length);
      if (chips[c]) return { n, ts, type: 'C', chip: c, h };
    }
    if (u >= 0) {
      const act = [];
      for (let i = 0; i < CHIPS.length; i++) if (u >= CH_WIN[i][0] && u < CH_WIN[i][1] && chips[i]) act.push(i);
      if (act.length && h(3) < 0.5) return { n, ts, type: 'B', chip: act[Math.floor(h(4) * act.length)], h };
    }
    let p = ts < INTRO ? 0.14 : 0.27;
    if (u >= DELIVER - 0.9 && u < DELIVER - 0.1) p = 0.55;
    if (h(5) < p) return { n, ts, type: 'A', h };
    return null;
  }

  function phoneTarget(px, py, r) {
    const P = L.P;
    if (px >= P.x + P.w) return { x: P.x + P.w - 2, y: clamp(py, P.y + 70, P.y + P.h - 70) + (r - 0.5) * 60, nx: 1, ny: 0 };
    if (px <= P.x) return { x: P.x + 2, y: clamp(py, P.y + 70, P.y + P.h - 70) + (r - 0.5) * 60, nx: -1, ny: 0 };
    if (py >= P.y + P.h) return { x: clamp(px, P.x + 50, P.x + P.w - 50), y: P.y + P.h - 2, nx: 0, ny: 1 };
    return { x: clamp(px, P.x + 50, P.x + P.w - 50), y: P.y + 2, nx: 0, ny: -1 };
  }

  function bez(p, s) {
    const m = 1 - s, A = m * m * m, B = 3 * m * m * s, C = 3 * m * s * s, D = s * s * s;
    return [A * p[0][0] + B * p[1][0] + C * p[2][0] + D * p[3][0], A * p[0][1] + B * p[1][1] + C * p[2][1] + D * p[3][1]];
  }
  function trail(p, s, len, col, a, w) {
    const n = 12;
    let prev = null;
    for (let k = 0; k <= n; k++) {
      const sk = s - (k / n) * len;
      if (sk < 0) break;
      const pt = bez(p, sk);
      if (prev) {
        const f = 1 - k / n;
        ctx.strokeStyle = rgba(col, a * f * f);
        ctx.lineWidth = w * f + 0.3;
        ctx.beginPath();
        ctx.moveTo(prev[0], prev[1]);
        ctx.lineTo(pt[0], pt[1]);
        ctx.stroke();
      }
      prev = pt;
    }
    return bez(p, s);
  }
  function head(pt, a, pink) {
    glowAt(pt[0], pt[1], 10, 0.9 * a, pink);
    ctx.fillStyle = rgba(WHITE, a);
    ctx.beginPath();
    ctx.arc(pt[0], pt[1], 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  function spark(x, y, a, pink) {
    if (a < 0 || a > 0.45) return;
    const k = a / 0.45;
    glowAt(x, y, 6 + k * 26, (1 - k) * 0.9, pink);
  }

  function drawEvents(t, flashes) {
    const nEnd = Math.floor(t / SLOT), nStart = Math.max(0, Math.floor((t - MAXLIFE) / SLOT));
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let n = nStart; n <= nEnd; n++) {
      const e = eventInfo(n);
      if (e) drawEvent(e, t, flashes);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawEvent(e, t, flashes) {
    const h = e.h, age = t - e.ts;
    if (age < 0) return;
    if (e.type === 'C') {
      const c = L.chips[e.chip];
      if (!c) return;
      const sx = c.side === 'L' ? c.x + c.w : c.x, sy = c.yy + c.h / 2 + (h(12) - 0.5) * 22;
      const tg = phoneTarget(sx, sy, h(13));
      const dir = c.side === 'L' ? 1 : -1;
      const p = [[sx, sy], [sx + dir * 34, sy], [tg.x + tg.nx * 34, tg.y + tg.ny * 34], [tg.x, tg.y]];
      const dur = 0.34 + h(14) * 0.2;
      if (age < dur) head(trail(p, eInOut(age / dur), 0.5, BLUE2, 0.95, 2.2), 1);
      else spark(tg.x, tg.y, age - dur);
      flashes[e.chip] = Math.max(flashes[e.chip], 0.55 * (1 - age / 0.55));
      return;
    }
    const P = L.P;
    const xa = L.two ? Math.max(0, L.T.r - 160) : 0;
    let gx = lerp(xa, W, h(6));
    const Z = lerp(1.7, 8.5, h(7) * h(7));
    const gy = L.hy + L.K / Z + my * 6;
    if (gx > P.x - 6 && gx < P.x + P.w + 6 && gy < P.y + P.h + 6) gx = gx < L.cx ? P.x - 10 - h(15) * 50 : P.x + P.w + 10 + h(15) * 50;
    const rise = 26 + h(8) * 54, tr = 0.26;
    const top = [gx, gy - rise];
    const ra = eOut(age / tr);
    const lifeA = sstep((MAXLIFE - age) / 0.3);
    // pino no talhão
    const pin = age < 1.2 ? (1 - age / 1.2) : 0;
    if (pin > 0) {
      glowAt(gx, gy, 7, 0.6 * pin);
      const g = ctx.createLinearGradient(gx, gy, gx, gy - rise * ra);
      g.addColorStop(0, rgba(BLUE, 0.05 * pin));
      g.addColorStop(1, rgba(BLUE2, 0.75 * pin));
      ctx.strokeStyle = g;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx, gy - rise * ra);
      ctx.stroke();
    }
    if (age < tr) {
      head([gx, gy - rise * ra], 0.8);
      return;
    }
    const travel = 0.85 + h(11) * 0.55;
    if (e.type === 'A') {
      const tg = phoneTarget(top[0], top[1], h(13));
      const p = [top, [top[0], top[1] - (60 + h(9) * 120)], [tg.x + tg.nx * (50 + h(10) * 90), tg.y + tg.ny * (50 + h(10) * 90)], [tg.x, tg.y]];
      const a = age - tr;
      if (a < travel) head(trail(p, eInOut(a / travel), 0.3, BLUE, 0.75 * lifeA, 1.6), 0.85 * lifeA);
      else spark(tg.x, tg.y, a - travel);
      return;
    }
    // B: talhão → documento → celular
    const c = L.chips[e.chip];
    if (!c) return;
    const an = [c.x + c.w / 2 + (h(16) - 0.5) * c.w * 0.5, c.yy + c.h];
    const p1 = [top, [top[0], top[1] - (40 + h(9) * 90)], [an[0], an[1] + 60 + h(10) * 90], an];
    const a = age - tr;
    if (a < travel) {
      head(trail(p1, eInOut(a / travel), 0.32, BLUE2, 0.9, 1.8), 1);
      return;
    }
    const ac = a - travel;
    flashes[e.chip] = Math.max(flashes[e.chip], ac < 0.7 ? 1 - ac / 0.7 : 0);
    const hop = 0.34, delay = 0.06;
    if (ac < delay) return;
    const sx = c.side === 'L' ? c.x + c.w : c.x, sy = c.yy + c.h / 2;
    const tg = phoneTarget(sx, sy, h(13));
    const dir = c.side === 'L' ? 1 : -1;
    const p2 = [[sx, sy], [sx + dir * 30, sy], [tg.x + tg.nx * 30, tg.y + tg.ny * 30], [tg.x, tg.y]];
    const ah = ac - delay;
    if (ah < hop) head(trail(p2, eInOut(ah / hop), 0.55, WHITE, 0.9, 2), 1);
    else spark(tg.x, tg.y, ah - hop);
  }

  // ───────────────────────── máscara de leitura ─────────────────────────
  function drawMask() {
    const T = L.T;
    if (L.two) {
      const end = Math.min(T.r + 60, L.P.x - 10);
      const g = ctx.createLinearGradient(0, 0, end, 0);
      g.addColorStop(0, 'rgba(15,27,53,0.74)');
      g.addColorStop(clamp(T.r / end, 0.01, 0.99), 'rgba(15,27,53,0.42)');
      g.addColorStop(1, 'rgba(15,27,53,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, end, H);
    } else {
      const end = Math.min(T.b + 30, L.P.y);
      const g = ctx.createLinearGradient(0, 0, 0, end);
      g.addColorStop(0, 'rgba(15,27,53,0.72)');
      g.addColorStop(0.85, 'rgba(15,27,53,0.45)');
      g.addColorStop(1, 'rgba(15,27,53,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, end);
    }
  }

  // ───────────────────────── celular: contorno e entrega ─────────────────────────
  function drawPhoneGlow(t, u, pinkPulse) {
    const P = L.P, R = 44;
    const td = lastDelivery(t);
    const a = td >= 0 ? t - td : -1;
    const pulse = a >= 0 ? Math.exp(-a / 0.55) * sstep(a / 0.08) : 0;
    const appear = eOut((t - 0.6) / 1.0);
    const breath = 0.16 + 0.06 * Math.sin(t * 1.4);
    ctx.globalCompositeOperation = 'lighter';
    const col = pinkPulse > pulse ? PINK : BLUE;
    const k = Math.max(pulse, pinkPulse * 0.8);
    rr(P.x - 3, P.y - 3, P.w + 6, P.h + 6, R + 3);
    ctx.strokeStyle = rgba(col, (0.05 + k * 0.22) * appear);
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.strokeStyle = rgba(col === PINK ? PINK : BLUE2, (breath + k * 0.7) * appear);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // ondas de entrega
    if (a >= 0 && a < 1.6) {
      for (let j = 0; j < 2; j++) {
        const b = a - j * 0.16;
        if (b < 0) continue;
        const p = eOut(b / 1.35);
        const d = 6 + p * Math.max(W, H) * 0.32;
        rr(P.x - d, P.y - d, P.w + 2 * d, P.h + 2 * d, R + d);
        ctx.strokeStyle = rgba(BLUE2, (1 - p) * (j ? 0.35 : 0.6));
        ctx.lineWidth = 2 * (1 - p) + 0.6;
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ───────────────────────── conferência entre documentos ─────────────────────────
  function verifyState(u) {
    const out = [];
    if (u < 0 || !L.two) return out;
    for (const v of VERIFY) {
      const a = L.chips[v.a], b = L.chips[v.b];
      if (!a || !b) continue;
      const loc = u - v.at;
      if (loc < 0 || u > VERIFY_END + 0.45) continue;
      out.push({ v, a, b, loc, fade: sstep((VERIFY_END + 0.45 - u) / 0.45) });
    }
    return out;
  }

  function drawVerify(t, list) {
    const pinkSet = new Set();
    for (const it of list) {
      const { v, a, b, loc, fade } = it;
      const col = v.pink ? PINK : BLUE;
      const x = a.x + a.w / 2, y1 = a.yy + a.h + 4, y2 = b.yy - 4;
      const pr = eOut(loc / 0.45);
      ctx.strokeStyle = rgba(col, 0.6 * fade);
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 4]);
      ctx.lineDashOffset = -t * 18;
      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x, lerp(y1, y2, pr));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalCompositeOperation = 'lighter';
      const gl = ((loc * 1.1) % 1);
      glowAt(x, lerp(y1, y2, gl * pr), 8, 0.8 * fade, v.pink);
      ctx.globalCompositeOperation = 'source-over';
      if (v.pink && loc > 0.35) {
        pinkSet.add(v.a);
        pinkSet.add(v.b);
      }
      if (loc > 0.35) {
        const sc = eBack(clamp((loc - 0.35) / 0.32, 0, 1));
        ctx.font = '600 10px Kanit, sans-serif';
        spacing('1.2px');
        let txt = v.txt[0].toUpperCase(), tw = ctx.measureText(txt).width;
        if (tw + 22 > a.w) {
          txt = v.txt[1].toUpperCase();
          tw = ctx.measureText(txt).width;
        }
        const pw = tw + 22, ph = 22, cy = (y1 + y2) / 2;
        ctx.save();
        ctx.translate(x, cy);
        ctx.scale(sc, sc);
        rr(-pw / 2, -ph / 2, pw, ph, 11);
        const pulse = v.pink ? 0.5 + 0.5 * Math.sin(t * 7) : 0;
        ctx.fillStyle = v.pink ? rgba(PINK, (0.18 + 0.12 * pulse) * fade) : 'rgba(0,9,22,' + (0.9 * fade).toFixed(3) + ')';
        ctx.fill();
        ctx.strokeStyle = rgba(col, 0.9 * fade);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = v.pink ? rgba(WHITE, fade) : rgba(BLUE2, fade);
        ctx.textAlign = 'center';
        ctx.fillText(txt, 0, 3.6);
        ctx.textAlign = 'left';
        ctx.restore();
        spacing('0px');
        it.pill = { x, y: cy, w: pw };
      }
    }
    return pinkSet;
  }

  function drawAlert(t, list) {
    let pinkPulse = 0;
    for (const it of list) {
      if (!it.v.pink || !it.pill) continue;
      const a = it.loc - 0.9;
      if (a < 0) continue;
      const tg = phoneTarget(it.pill.x, it.pill.y, 0.5);
      const sx = it.pill.x + (it.a.side === 'L' ? it.pill.w / 2 : -it.pill.w / 2), sy = it.pill.y;
      const p = [[sx, sy], [sx + tg.nx * 20, sy - 30], [tg.x + tg.nx * 40, tg.y - 10], [tg.x, tg.y]];
      ctx.globalCompositeOperation = 'lighter';
      const dur = 0.6;
      if (a < dur) head(trail(p, eInOut(a / dur), 0.5, PINK, 1, 2.4), 1, true);
      else spark(tg.x, tg.y, a - dur, true);
      ctx.globalCompositeOperation = 'source-over';
      if (a >= dur) pinkPulse = Math.exp(-(a - dur) / 0.5) * it.fade;
    }
    return pinkPulse;
  }

  // ───────────────────────── documentos (chips) ─────────────────────────
  function drawIcon(kind, x, y, k, pink) {
    const col = pink ? PINK : BLUE2;
    ctx.strokeStyle = rgba(col, 0.95);
    ctx.fillStyle = rgba(col, 0.95);
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (kind === 'wave') {
      const hs = [5, 10, 15, 9, 12, 6];
      hs.forEach((hh, i) => {
        const v = hh * (0.75 + 0.25 * Math.sin(k * 9 + i * 1.7));
        ctx.beginPath();
        ctx.moveTo(x - 7.5 + i * 3, y - v / 2);
        ctx.lineTo(x - 7.5 + i * 3, y + v / 2);
        ctx.stroke();
      });
    } else if (kind === 'doc' || kind === 'contract') {
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 7.5);
      ctx.lineTo(x + 2.5, y - 7.5);
      ctx.lineTo(x + 5.5, y - 4.5);
      ctx.lineTo(x + 5.5, y + 7.5);
      ctx.lineTo(x - 5, y + 7.5);
      ctx.closePath();
      ctx.stroke();
      if (kind === 'doc') {
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(x - 2.5, y - 2.5 + i * 3.4);
          ctx.lineTo(x + 3, y - 2.5 + i * 3.4);
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(x - 2.8, y + 1.2);
        ctx.quadraticCurveTo(x - 1, y - 2.4, x, y + 1.6);
        ctx.quadraticCurveTo(x + 1.2, y + 4.6, x + 3.2, y + 0.6);
        ctx.stroke();
      }
    } else if (kind === 'pix') {
      ctx.beginPath();
      ctx.moveTo(x, y - 7);
      ctx.lineTo(x + 7, y);
      ctx.lineTo(x, y + 7);
      ctx.lineTo(x - 7, y);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y - 2.6);
      ctx.lineTo(x + 2.6, y);
      ctx.lineTo(x, y + 2.6);
      ctx.lineTo(x - 2.6, y);
      ctx.closePath();
      ctx.fill();
    } else if (kind === 'chart') {
      ctx.beginPath();
      ctx.moveTo(x - 7, y + 6);
      ctx.lineTo(x + 7, y + 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 6, y + 2);
      ctx.lineTo(x - 2, y - 1.5);
      ctx.lineTo(x + 1.5, y + 1);
      ctx.lineTo(x + 6.5, y - 5.5);
      ctx.stroke();
    }
  }

  function drawChips(t, flashes, pinkSet) {
    for (const c of L.chips) {
      if (!c) continue;
      const d = CHIPS[c.i];
      const ap = eOut((t - (0.55 + c.i * 0.12)) / 0.5);
      if (ap <= 0) continue;
      const fl = flashes[c.i] || 0;
      const pink = pinkSet.has(c.i);
      const x = c.x, y = c.yy + (1 - ap) * 10;
      ctx.globalAlpha = ap;
      if (fl > 0.02) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = ap * fl * 0.5;
        ctx.drawImage(pink ? spriteP : sprite, x - 24, y - 22, c.w + 48, c.h + 44);
        ctx.globalAlpha = ap;
        ctx.globalCompositeOperation = 'source-over';
      }
      rr(x, y, c.w, c.h, 9);
      ctx.fillStyle = 'rgba(0,9,22,0.86)';
      ctx.fill();
      ctx.strokeStyle = rgba(pink ? PINK : BLUE, 0.28 + fl * 0.62 + (pink ? 0.4 : 0));
      ctx.lineWidth = 1;
      ctx.stroke();
      rr(x + 10, y + 12, 30, 30, 7);
      ctx.fillStyle = rgba(pink ? PINK : BLUE, 0.13 + fl * 0.25);
      ctx.fill();
      drawIcon(d.icon, x + 25, y + 27, t, pink);
      const tx = x + 50, avail = c.w - 60;
      ctx.font = '600 9.5px Kanit, sans-serif';
      spacing('1.1px');
      let kk = d.k.toUpperCase();
      if (ctx.measureText(kk).width > avail) spacing('0.3px');
      ctx.fillStyle = rgba(pink ? PINK : BLUE2, 0.9);
      ctx.fillText(kk, tx, y + 23);
      spacing('0px');
      ctx.font = '500 13px Kanit, sans-serif';
      if (ctx.measureText(d.v).width > avail) ctx.font = '500 11.5px Kanit, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.93)';
      ctx.fillText(d.v, tx, y + 41);
      ctx.fillStyle = rgba(pink ? PINK : BLUE, 0.45 + 0.55 * Math.max(fl, 0.5 + 0.5 * Math.sin(t * 3 + c.i)));
      ctx.beginPath();
      ctx.arc(x + c.w - 11, y + 11, 2.2, 0, Math.PI * 2);
      ctx.fill();
      if (fl > 0.02) {
        ctx.fillStyle = rgba(BLUE2, fl * 0.9);
        ctx.fillRect(x + 10, y + c.h - 4, (c.w - 20) * eOut(1 - fl), 1.5);
      }
      ctx.globalAlpha = 1;
    }
  }

  // ───────────────────────── painel de status ─────────────────────────
  function drawHUD(t) {
    if (!L.hud) return;
    const ap = eOut((t - 1.0) / 0.6);
    if (ap <= 0) return;
    const y = 34;
    ctx.globalAlpha = ap;
    ctx.font = '600 10.5px Kanit, sans-serif';
    spacing('1.6px');
    const stage = stageAt(t), count = String(countAt(t));
    const parts = [
      { l: 'GRACE', v: 'ONLINE', dot: true },
      { l: 'ETAPA', v: stage },
      { l: 'LANÇAMENTOS HOJE', v: count }
    ];
    const gap = 26;
    const widths = parts.map(p => ctx.measureText(p.l + ' ').width + ctx.measureText(p.v).width + (p.dot ? 14 : 0));
    let x = L.hudR - widths.reduce((a, b) => a + b, 0) - gap * (parts.length - 1);
    parts.forEach((p, i) => {
      if (p.dot) {
        const pl = 0.5 + 0.5 * Math.sin(t * 3.2);
        ctx.globalCompositeOperation = 'lighter';
        glowAt(x + 4, y - 4, 7, 0.5 * pl * ap);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = rgba(BLUE2, 0.95);
        ctx.beginPath();
        ctx.arc(x + 4, y - 4, 2.6, 0, Math.PI * 2);
        ctx.fill();
        x += 14;
      }
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText(p.l + ' ', x, y);
      x += ctx.measureText(p.l + ' ').width;
      ctx.fillStyle = i === 1 ? rgba(BLUE2, 1) : 'rgba(255,255,255,0.92)';
      ctx.fillText(p.v, x, y);
      x += ctx.measureText(p.v).width;
      if (i < parts.length - 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.fillRect(x + gap / 2, y - 10, 1, 12);
        x += gap;
      }
    });
    spacing('0px');
    ctx.globalAlpha = 1;
  }

  // ───────────────────────── quadro ─────────────────────────
  function draw(t) {
    const w0 = performance.now();
    if (frameN++ % 20 === 0 || !L) { if (!layout()) return; }
    mx += (tmx - mx) * 0.05;
    my += (tmy - my) * 0.05;
    const u = cycU(t);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0F1B35';
    ctx.fillRect(0, 0, W, H);
    drawBackGlow(t);
    drawGround(t);
    drawDust(t);
    drawRings(t, u);
    for (const c of L.chips) if (c) c.yy = c.y + Math.sin(t * 0.7 + c.i * 1.3) * 3;
    const flashes = [0, 0, 0, 0, 0];
    drawEvents(t, flashes);
    drawMask();
    const vlist = verifyState(u);
    // o pulso rosa do alerta precisa ser conhecido antes do contorno do celular
    let pinkPulse = 0;
    for (const it of vlist) if (it.v.pink && it.loc > 1.5) pinkPulse = Math.max(pinkPulse, Math.exp(-(it.loc - 1.5) / 0.5) * it.fade);
    drawPhoneGlow(t, u, pinkPulse);
    const pinkSet = drawVerify(t, vlist);
    drawChips(t, flashes, pinkSet);
    drawAlert(t, vlist);
    drawHUD(t);
    if (!CAPTURE) adapt(performance.now() - w0);
  }

  function adapt(ms) {
    stats.frames++;
    stats.avgMs = stats.avgMs * 0.95 + ms * 0.05;
    stats.dpr = dpr;
    if (stats.frames > 90 && stats.avgMs > 12 && dpr > 1) {
      if (++slowRun > 60) {
        dpr = Math.max(1, dpr - 0.25);
        slowRun = 0;
        sizeCanvas();
      }
    } else slowRun = 0;
  }

  function frame(now) {
    raf = 0;
    if (!canvas || !canvas.isConnected) { boot(); return; }
    draw((now - t0) / 1000);
    if (visible || CAPTURE) raf = requestAnimationFrame(frame);
  }

  function start(cv) {
    canvas = cv;
    ctx = canvas.getContext('2d');
    hero = canvas.closest('section');
    phoneEl = hero && hero.querySelector('[data-fx="phone"]');
    textEl = hero && hero.querySelector('[data-fx="text"]');
    if (!hero || !phoneEl || !textEl) return false;
    if (!sprite) {
      sprite = makeSprite('rgba(196,216,255,0.85)', 'rgba(86,142,255,0.32)');
      spriteP = makeSprite('rgba(255,170,200,0.85)', 'rgba(255,26,108,0.34)');
    }
    dpr = CAPTURE ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    t0 = performance.now();
    window.__wvfxT0 = t0;
    layout();
    if (document.fonts && document.fonts.load) {
      Promise.all([document.fonts.load('600 11px Kanit'), document.fonts.load('500 13px Kanit')]).then(() => { ringText = null; }).catch(() => {});
    }
    if (window.ResizeObserver) new ResizeObserver(() => { L && layout(); }).observe(hero);
    if (!CAPTURE && window.IntersectionObserver) {
      new IntersectionObserver(es => {
        visible = es[0].isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(frame);
      }).observe(hero);
    }
    if (!CAPTURE) {
      window.addEventListener('pointermove', e => {
        tmx = (e.clientX / window.innerWidth - 0.5) * 2;
        tmy = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
    } else {
      captureSetup();
    }
    raf = requestAnimationFrame(frame);
    return true;
  }

  // Só no vídeo: o topo ocupa a tela toda e o "Quero" é tocado para a Grace explicar o item 2
  // no mesmo instante da entrega do ciclo.
  function captureSetup() {
    const header = document.querySelector('header');
    const fit = () => {
      const hh = header ? header.getBoundingClientRect().height : 0;
      hero.style.minHeight = Math.max(0, window.innerHeight - hh) + 'px';
      hero.style.display = 'flex';
      hero.style.flexDirection = 'column';
      hero.style.justifyContent = 'center';
    };
    fit();
    setTimeout(fit, 50);
    setTimeout(() => {
      const b = [...hero.querySelectorAll('button')].find(x => x.textContent.trim() === 'Quero');
      if (b) b.click();
    }, (INTRO + DELIVER - 1.4) * 1000);
  }

  let booted = false;
  function boot() {
    const cv = document.getElementById('wvfx');
    if (cv && cv !== canvas && start(cv)) { booted = true; return; }
    if (!booted || !canvas || !canvas.isConnected) {
      const mo = new MutationObserver(() => {
        const c = document.getElementById('wvfx');
        if (c && c !== canvas && c.closest('section') && c.closest('section').querySelector('[data-fx="phone"]')) {
          mo.disconnect();
          if (start(c)) booted = true;
        }
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    }
  }
  boot();
})();
