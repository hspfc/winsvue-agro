/* WinsVue Agro · camada de movimento do topo (hero).
   Desenha num <canvas id="wvfx"> atrás do título e do celular.
   Cada quadro é função pura do tempo, então o site e a captura do vídeo
   (?capture=1, com relógio virtual) mostram exatamente a mesma coisa.

   A história é a mesma da seção "A ideia", lida da esquerda para a direita:
   o que chega no WhatsApp (card de contorno) entra no celular da Grace
   e sai do outro lado como lançamento (card azul; rosa quando ela acha erro).
   Quatro linhas, uma por vez; no fim do ciclo o briefing chega no celular. */
(() => {
  'use strict';

  const CAPTURE = /[?&]capture=1\b/.test(location.search);
  const INTRO = 1.9;      // montagem; o briefing do celular aparece em 1,9 s
  const CYCLE = 12;
  const DELIVER = 10.4;   // onda de entrega do briefing (u)
  const BEATS = [0.5, 2.8, 5.1, 7.4];
  const RESET = 11.15;    // os lançamentos voltam para o celular e o ciclo recomeça

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
    const c = 1.5;
    return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
  };

  const ROWS = [
    { k: 'Áudio · Zé Carlos', v: '420 L de diesel', icon: 'wave', out: ['✓ Diesel lançado', 'trator 7230 · talhão 12'] },
    { k: 'Nota fiscal · posto', v: 'R$ 19.520,00', icon: 'doc', out: ['≠ 260 L sem destino', 'Grace perguntou ao Zé'], pink: true },
    { k: 'Pix · Sicredi', v: '−R$ 12.480,00', icon: 'pix', out: ['✓ Pix conciliado', 'nota de agosto baixada'] },
    { k: 'Contrato · Planalto', v: '8.000 sc a R$ 126', icon: 'contract', out: ['✓ Recebível criado', 'R$ 1,008 mi em abril'] }
  ];
  const ROW_F = [0.2, 0.39, 0.58, 0.77];

  let canvas = null, ctx = null, hero = null, phoneEl = null, textEl = null;
  let L = null, W = 0, H = 0, dpr = 1, t0 = 0, raf = 0, visible = true;
  let mx = 0, my = 0, tmx = 0, tmy = 0, frameN = 0, slowRun = 0;
  let sprite = null, spriteP = null;
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
    const lay = { P, T, two, cx: P.x + P.w / 2, cy: P.y + P.h / 2 };
    lay.hy = two ? P.y + P.h * 0.56 : P.y + P.h * 0.3;
    lay.K = nh + 40 - lay.hy;
    lay.S = Math.max(nw, 900) * 0.9;
    // faixas visíveis ao lado do celular: entrada à esquerda, lançamento à direita
    lay.visL = two ? Math.min(230, P.x - T.r - 18) : 0;
    lay.visR = two ? Math.min(230, nw - (P.x + P.w) - 16) : 0;
    lay.rows = two && lay.visL >= 120 && lay.visR >= 120;
    lay.cardH = clamp(P.h * 0.092, 52, 64);
    L = lay;
    if (nw !== W || nh !== H) {
      W = nw;
      H = nh;
      sizeCanvas();
    }
    return true;
  }
  function sizeCanvas() {
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }

  const cycU = t => (t < INTRO ? -1 : (t - INTRO) % CYCLE);
  function lastDelivery(t) {
    if (t < INTRO - 0.05) return -1;
    const k = Math.floor((t - INTRO - DELIVER) / CYCLE);
    return k >= 0 ? INTRO + k * CYCLE + DELIVER : INTRO - 0.05;
  }

  // ───────────────────────── fundo: campo de pontos ─────────────────────────
  function drawBack(t) {
    const g = ctx.createRadialGradient(L.cx, L.cy, 0, L.cx, L.cy, Math.max(W, H) * 0.6);
    const b = 0.5 + 0.5 * Math.sin(t * 0.7);
    g.addColorStop(0, 'rgba(86,142,255,' + (0.17 + b * 0.04).toFixed(3) + ')');
    g.addColorStop(0.4, 'rgba(86,142,255,0.06)');
    g.addColorStop(1, 'rgba(86,142,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  const DOT_LEVELS = 10;
  function drawField(t) {
    const intro = eOut((t - 0.05) / 1.5);
    if (intro <= 0) return;
    const hy = L.hy + my * 5, vx = L.cx + mx * 14, K = L.K, S = L.S;
    const Zn = 1.25, Zf = 15, dz = 0.42, cell = 0.21, v = 0.16;
    const frac = (t * v) % dz;
    const buckets = [];
    for (let i = 0; i < DOT_LEVELS; i++) buckets.push([]);
    for (let m = 1; m < 60; m++) {
      const Z = Zn + m * dz - frac;
      if (Z > Zf) break;
      const near = Math.pow(clamp((Zf - Z) / (Zf - Zn), 0, 1), 1.25);
      const fadeHz = sstep((Z - Zn) / 0.6);
      const i0 = Math.floor(((-20 - vx) * Z) / (S * cell)), i1 = Math.ceil(((W + 20 - vx) * Z) / (S * cell));
      for (let i = i0; i <= i1; i++) {
        const X = i * cell;
        const wave = 0.09 * Math.sin(X * 1.6 + t * 0.8) + 0.07 * Math.sin(Z * 0.85 - t * 0.6 + X * 0.35);
        const y = hy + (K * (1 - wave)) / Z;
        if (y > H + 4 || y < hy - 4) continue;
        const x = vx + (X * S) / Z;
        const crest = clamp((wave + 0.16) / 0.32, 0, 1);
        const a = Math.min(1, near * 1.25) * fadeHz * (0.35 + 0.65 * crest);
        const lvl = Math.min(DOT_LEVELS - 1, Math.floor(a * DOT_LEVELS));
        if (lvl <= 0) continue;
        const r = clamp((3.4 / Z) * 1.5, 1, 2.8);
        buckets[lvl].push(x - r / 2, y - r / 2, r);
      }
    }
    for (let l = 1; l < DOT_LEVELS; l++) {
      const arr = buckets[l];
      if (!arr.length) continue;
      ctx.fillStyle = rgba(BLUE2, (l / DOT_LEVELS) * 0.95 * intro);
      ctx.beginPath();
      for (let j = 0; j < arr.length; j += 3) ctx.rect(arr[j], arr[j + 1], arr[j + 2], arr[j + 2]);
      ctx.fill();
    }
    // horizonte suave
    const hz = ctx.createLinearGradient(0, 0, W, 0);
    hz.addColorStop(0, rgba(BLUE, 0));
    hz.addColorStop(clamp(vx / W, 0.05, 0.95), rgba(BLUE2, 0.32 * intro));
    hz.addColorStop(1, rgba(BLUE, 0));
    ctx.strokeStyle = hz;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, hy + 0.5);
    ctx.lineTo(W, hy + 0.5);
    ctx.stroke();
  }

  function drawMask() {
    const T = L.T;
    if (L.two) {
      const end = Math.min(T.r + 40, L.P.x - 10);
      const g = ctx.createLinearGradient(0, 0, end, 0);
      g.addColorStop(0, 'rgba(15,27,53,0.78)');
      g.addColorStop(clamp(T.r / end, 0.01, 0.99), 'rgba(15,27,53,0.5)');
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

  // ───────────────────────── celular: contorno, entrada e entrega ─────────────────────────
  function drawPhoneGlow(t, pinkPulse, edgeL, edgeR) {
    const P = L.P, R = 44;
    const td = lastDelivery(t);
    const a = td >= 0 ? t - td : -1;
    const pulse = a >= 0 ? Math.exp(-a / 0.6) * sstep(a / 0.08) : 0;
    const appear = eOut((t - 0.6) / 1.0);
    const breath = 0.15 + 0.05 * Math.sin(t * 1.3);
    const k = Math.max(pulse, pinkPulse * 0.7);
    const col = pinkPulse > pulse ? PINK : BLUE;
    ctx.globalCompositeOperation = 'lighter';
    rr(P.x - 3, P.y - 3, P.w + 6, P.h + 6, R + 3);
    ctx.strokeStyle = rgba(col, (0.05 + k * 0.2) * appear);
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.strokeStyle = rgba(col === PINK ? PINK : BLUE2, (breath + k * 0.6) * appear);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // brilho onde o documento entra e onde o lançamento sai
    for (const e of [edgeL, edgeR]) {
      if (!e || e.a <= 0) continue;
      glowAt(e.x, e.y, 10 + e.k * 34, e.a * 0.85, e.pink);
    }
    if (a >= 0 && a < 1.7) {
      for (let j = 0; j < 2; j++) {
        const b = a - j * 0.18;
        if (b < 0) continue;
        const p = eOut(b / 1.4);
        const d = 6 + p * Math.max(W, H) * 0.26;
        rr(P.x - d, P.y - d, P.w + 2 * d, P.h + 2 * d, R + d);
        ctx.strokeStyle = rgba(BLUE2, (1 - p) * (j ? 0.22 : 0.4));
        ctx.lineWidth = 1.6 * (1 - p) + 0.5;
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ───────────────────────── linhas: entrada → Grace → lançamento ─────────────────────────
  function rowState(i, t) {
    const u = cycU(t);
    const intro = eOut((t - (0.45 + i * 0.12)) / 0.6);
    if (u < 0) return { inX: 1 - intro, inA: intro, hot: 0, outX: 0, outA: 0, done: 0, local: -1 };
    const local = u - BEATS[i];
    const hot = sstep(local / 0.3) * (1 - sstep((local - 0.4) / 0.3));
    // entrada desliza para dentro do celular entre 0,35 e 0,85; volta no reset
    const into = local < 0 ? 0 : eInOut((local - 0.35) / 0.5);
    const back = eInOut((u - RESET - 0.25) / 0.55);
    const inX = u >= RESET ? 1 - back : into;
    // lançamento sai pela direita entre 1,2 e 1,7; recolhe no reset
    const out = local < 0 ? 0 : eOut((local - 1.2) / 0.5);
    const outBack = eInOut((u - RESET) / 0.45);
    const outX = u >= RESET ? out * (1 - outBack) : out;
    const done = local >= 1.2 ? 1 : 0;
    return { inX, inA: 1, hot, outX, outA: 1, done, local, u };
  }

  function drawIcon(kind, x, y, col) {
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (kind === 'wave') {
      [5, 10, 15, 9, 12, 6].forEach((hh, i) => {
        ctx.beginPath();
        ctx.moveTo(x - 7.5 + i * 3, y - hh / 2);
        ctx.lineTo(x - 7.5 + i * 3, y + hh / 2);
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
    }
  }

  // ajusta a fonte até o texto caber
  function fit(text, weight, size, maxW, ls) {
    let s = size;
    for (; s > size * 0.78; s -= 0.5) {
      ctx.font = weight + ' ' + s + 'px Kanit, sans-serif';
      spacing(ls || '0px');
      if (ctx.measureText(text).width <= maxW) break;
    }
    return s;
  }

  function drawRows(t) {
    const P = L.P, ch = L.cardH;
    let edgeL = null, edgeR = null, pinkPulse = 0;
    const capA = eOut((t - 0.9) / 0.6);
    // títulos das duas colunas
    if (capA > 0) {
      const y0 = P.y + ROW_F[0] * P.h - ch / 2 - 16;
      fit('CHEGA NO WHATSAPP', '700', 10.5, L.visL, '1.8px');
      ctx.fillStyle = 'rgba(255,255,255,' + (0.62 * capA).toFixed(3) + ')';
      ctx.textAlign = 'right';
      ctx.fillText('CHEGA NO WHATSAPP', P.x - 18, y0);
      ctx.textAlign = 'left';
      fit('A WINSVUE LANÇA', '700', 10.5, L.visR, '1.8px');
      ctx.fillStyle = rgba(BLUE2, 0.95 * capA);
      ctx.fillText('A WINSVUE LANÇA', P.x + P.w + 16, y0);
      spacing('0px');
    }
    ROWS.forEach((row, i) => {
      const st = rowState(i, t);
      const cyRow = P.y + ROW_F[i] * P.h + Math.sin(t * 0.8 + i * 1.4) * 1.5;
      const y = cyRow - ch / 2;

      // entrada: card de contorno saindo da esquerda do celular
      const wIn = L.visL + 70;
      const xRest = P.x - L.visL; // os 70 px da direita ficam atrás do celular
      const xIn = xRest + st.inX * (L.visL + 24);
      if (xIn < P.x - 4) {
        const hot = st.hot;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, y - 20, P.x + 2, ch + 40);
        ctx.clip();
        if (hot > 0.01) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = hot * 0.45;
          ctx.drawImage(sprite, xIn - 30, y - 26, wIn + 60, ch + 52);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }
        rr(xIn, y, wIn, ch, 10);
        ctx.fillStyle = 'rgba(0,9,22,0.92)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 + hot * 0.5).toFixed(3) + ')';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        const icon = L.visL >= 168;
        const tx = xIn + (icon ? 48 : 14);
        const maxW = L.visL - (icon ? 58 : 24);
        if (icon) {
          ctx.beginPath();
          ctx.arc(xIn + 26, cyRow, 14, 0, Math.PI * 2);
          ctx.fillStyle = rgba(BLUE, 0.16 + hot * 0.3);
          ctx.fill();
          drawIcon(row.icon, xIn + 26, cyRow, rgba(BLUE2, 1));
        }
        fit(row.k.toUpperCase(), '600', 9.5, maxW, '1px');
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(row.k.toUpperCase(), tx, cyRow - ch * 0.08);
        spacing('0px');
        fit(row.v, '500', 14, maxW);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(row.v, tx, cyRow + ch * 0.27);
        ctx.restore();
      }
      // brilho na borda esquerda quando o documento entra
      if (st.local >= 0.5 && st.local < 1.3) {
        const k = (st.local - 0.5) / 0.8;
        const e = { x: P.x + 2, y: cyRow, k, a: 1 - k, pink: false };
        if (!edgeL || e.a > edgeL.a) edgeL = e;
      }

      // lançamento: card azul (rosa no erro) saindo da direita do celular
      if (st.outX > 0.001) {
        const wOut = L.visR + 70;
        const xFinal = P.x + P.w - 70; // os 70 px da esquerda ficam atrás do celular
        const xHid = P.x + P.w - wOut - 4;
        const xOut = lerp(xHid, xFinal, st.outX);
        const col = row.pink ? PINK : BLUE;
        ctx.save();
        ctx.beginPath();
        ctx.rect(P.x + P.w - 2, y - 20, W, ch + 40);
        ctx.clip();
        const pop = st.local >= 1.2 && st.local < 2.2 ? Math.exp(-(st.local - 1.2) / 0.35) : 0;
        if (pop > 0.01) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = pop * 0.55;
          ctx.drawImage(row.pink ? spriteP : sprite, xOut - 30, y - 26, wOut + 60, ch + 52);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }
        rr(xOut, y, wOut, ch, 10);
        ctx.fillStyle = rgba(col, 1);
        ctx.fill();
        const left = xOut + 70 + 14;
        const maxW = L.visR - 26;
        fit(row.out[0], '600', 14, maxW);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(row.out[0], left, cyRow - ch * 0.04);
        fit(row.out[1], '400', 12, maxW);
        ctx.fillStyle = 'rgba(255,255,255,0.86)';
        ctx.fillText(row.out[1], left, cyRow + ch * 0.27);
        ctx.restore();
      }
      if (st.local >= 1.15 && st.local < 1.9) {
        const k = (st.local - 1.15) / 0.75;
        const e = { x: P.x + P.w - 2, y: cyRow, k, a: 1 - k, pink: !!row.pink };
        if (!edgeR || e.a > edgeR.a) edgeR = e;
        if (row.pink) pinkPulse = Math.max(pinkPulse, Math.exp(-(st.local - 1.15) / 0.5));
      }
    });
    return { edgeL, edgeR, pinkPulse };
  }

  // ───────────────────────── quadro ─────────────────────────
  function draw(t) {
    const w0 = performance.now();
    if (frameN++ % 20 === 0 || !L) { if (!layout()) return; }
    mx += (tmx - mx) * 0.05;
    my += (tmy - my) * 0.05;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0F1B35';
    ctx.fillRect(0, 0, W, H);
    drawBack(t);
    drawField(t);
    drawMask();
    let edges = { edgeL: null, edgeR: null, pinkPulse: 0 };
    if (L.rows) edges = drawRows(t);
    drawPhoneGlow(t, edges.pinkPulse, edges.edgeL, edges.edgeR);
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
      Promise.all([document.fonts.load('600 11px Kanit'), document.fonts.load('500 14px Kanit')]).catch(() => {});
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
    const fit2 = () => {
      const hh = header ? header.getBoundingClientRect().height : 0;
      const z = hero.getBoundingClientRect().width / (hero.offsetWidth || 1) || 1;
      hero.style.minHeight = Math.max(0, (window.innerHeight - hh) / z) + 'px';
      hero.style.display = 'flex';
      hero.style.flexDirection = 'column';
      hero.style.justifyContent = 'center';
    };
    fit2();
    setTimeout(fit2, 50);
    setTimeout(() => {
      const b = [...hero.querySelectorAll('button')].find(x => x.textContent.trim() === 'Quero');
      if (b) b.click();
    }, (INTRO + DELIVER - 1.4) * 1000);
  }

  let booted = false;
  function boot() {
    const cv = document.querySelector('#dc-root #wvfx');
    if (cv && cv !== canvas && start(cv)) { booted = true; return; }
    if (!booted || !canvas || !canvas.isConnected) {
      const mo = new MutationObserver(() => {
        const c = document.querySelector('#dc-root #wvfx');
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
