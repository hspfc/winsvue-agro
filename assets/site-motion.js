/* WinsVue Agro · movimento do site (o topo tem a camada em canvas à parte, hero-fx.js).
   Age só dentro de #dc-root, depois que o runtime do Claude Design renderiza o React.
   Regras para conviver com o React:
   - estado escondido e animação vêm de classes (o React não mexe em className aqui);
   - animação por @keyframes com fill "backwards", então nada fica preso depois;
   - texto só é reescrito em nó de texto único e sempre volta ao valor original;
   - se o React trocar o texto no meio (conteúdo dinâmico), a animação para. */
(() => {
  'use strict';
  if (/[?&](capture|nomotion)=1\b/.test(location.search)) return; // vídeo do topo e teste de comparação

  const EASE = 'cubic-bezier(.2,.7,.2,1)';
  const CSS = `
html{scroll-behavior:smooth}
.m-up:not(.m-in),.m-fade:not(.m-in),.m-rise:not(.m-in),.m-left:not(.m-in),.m-pop:not(.m-in){opacity:0}
.m-grow-y{transform-origin:50% 100%}.m-grow-y:not(.m-in){transform:scaleY(0)}
.m-grow-x{transform-origin:0 50%}.m-grow-x:not(.m-in){transform:scaleX(0)}
.m-wipe:not(.m-in){clip-path:inset(0 100% 0 0)}
.m-in.m-up{animation:m-up var(--m-dur,.6s) ${EASE} var(--m-d,0ms) backwards}
.m-in.m-fade{animation:m-fade var(--m-dur,.6s) ease-out var(--m-d,0ms) backwards}
.m-in.m-rise{animation:m-rise var(--m-dur,.8s) ${EASE} var(--m-d,0ms) backwards}
.m-in.m-left{animation:m-left var(--m-dur,.55s) ${EASE} var(--m-d,0ms) backwards}
.m-in.m-pop{animation:m-pop var(--m-dur,.5s) ${EASE} var(--m-d,0ms) backwards}
.m-in.m-grow-y{animation:m-gy var(--m-dur,.7s) ${EASE} var(--m-d,0ms) backwards}
.m-in.m-grow-x{animation:m-gx var(--m-dur,.6s) ${EASE} var(--m-d,0ms) backwards}
.m-in.m-wipe{animation:m-wipe var(--m-dur,.7s) cubic-bezier(.6,0,.2,1) var(--m-d,0ms) backwards}
.m-in.m-skip,.m-words.m-skip .m-wi{animation:none!important}
@keyframes m-up{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
@keyframes m-fade{from{opacity:0}to{opacity:1}}
@keyframes m-rise{from{opacity:0;transform:translateY(40px) scale(.975)}to{opacity:1;transform:none}}
@keyframes m-left{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:none}}
@keyframes m-pop{0%{opacity:0;transform:scale(.55)}65%{opacity:1;transform:scale(1.08)}100%{opacity:1;transform:none}}
@keyframes m-gy{from{transform:scaleY(0)}to{transform:none}}
@keyframes m-gx{from{transform:scaleX(0)}to{transform:none}}
@keyframes m-wipe{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}

.m-wm{display:inline-block;overflow:hidden;vertical-align:top;padding:.2em .05em .1em;margin:-.2em -.05em -.1em}
.m-wi{display:inline-block}
.m-words:not(.m-in) .m-wi{transform:translateY(118%)}
.m-words.m-in .m-wi{animation:m-word .7s ${EASE} var(--m-d,0ms) backwards}
@keyframes m-word{from{transform:translateY(118%)}to{transform:none}}

.m-card{transition:transform .3s ${EASE},box-shadow .3s ${EASE}}
.m-card:hover{transform:translateY(-4px);box-shadow:0 22px 44px -26px rgba(0,9,22,.5)}

.m-bubble{animation:m-bub .42s ${EASE} backwards}
.m-bubble.m-me{transform-origin:100% 100%}
.m-bubble:not(.m-me){transform-origin:0 100%}
@keyframes m-bub{from{opacity:0;transform:translateY(10px) scale(.9)}to{opacity:1;transform:none}}
.m-swap{animation:m-swap .45s ${EASE} backwards}
@keyframes m-swap{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}

.m-loop{animation-play-state:paused!important}
.m-live .m-loop,.m-loop.m-always{animation-play-state:running!important}

.m-shine{position:relative;overflow:hidden;isolation:isolate}
.m-shine::after{content:"";position:absolute;top:-20%;bottom:-20%;left:0;width:38%;pointer-events:none;
  background:linear-gradient(100deg,transparent 0%,rgba(255,255,255,.42) 50%,transparent 100%);
  transform:translateX(-160%) skewX(-18deg);animation:m-shine 5.2s ease-in-out var(--m-sd,1.2s) infinite;animation-play-state:inherit}
@keyframes m-shine{0%,62%{transform:translateX(-160%) skewX(-18deg)}88%,100%{transform:translateX(330%) skewX(-18deg)}}

.m-chip{position:relative;overflow:hidden}
.m-chip::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(100deg,transparent 20%,rgba(255,255,255,.5) 50%,transparent 80%);
  transform:translateX(-120%);animation:m-chipglow 3.6s ease-in-out calc(var(--i,0) * .16s) infinite;animation-play-state:inherit}
@keyframes m-chipglow{0%,8%{transform:translateX(-120%)}24%,100%{transform:translateX(120%)}}

.m-journey{position:relative}
.m-journey::before{content:"";position:absolute;left:-1px;right:-1px;top:-1px;height:4px;background:#568EFF;
  transform:scaleX(0);transform-origin:0 50%}
.m-in-path .m-journey::before{animation:m-gx .55s cubic-bezier(.6,0,.2,1) calc(var(--i,0) * .16s) forwards}

.m-dot{position:relative}
.m-dot::after{content:"";position:absolute;top:18px;right:18px;width:8px;height:8px;border-radius:50%;background:#568EFF;
  box-shadow:0 0 0 0 rgba(86,142,255,.55);animation:m-dot 2.4s ease-out calc(var(--i,0) * .3s) infinite;animation-play-state:inherit}
@keyframes m-dot{0%{box-shadow:0 0 0 0 rgba(86,142,255,.55)}70%,100%{box-shadow:0 0 0 12px rgba(86,142,255,0)}}

.m-spot{position:relative;isolation:isolate;overflow:hidden}
.m-spot-l{position:absolute;left:0;top:0;width:760px;height:760px;margin:-380px 0 0 -380px;z-index:-1;pointer-events:none;
  transition:transform .9s cubic-bezier(.2,.7,.2,1);will-change:transform}
.m-spot-l>i{position:absolute;inset:0;border-radius:50%;
  background:radial-gradient(circle,rgba(86,142,255,.22) 0%,rgba(86,142,255,.08) 38%,rgba(86,142,255,0) 68%);
  animation:m-drift 9s ease-in-out infinite alternate;animation-play-state:inherit}
@keyframes m-drift{from{transform:translate(-40px,-20px) scale(.95)}to{transform:translate(40px,30px) scale(1.05)}}

.m-prog{position:absolute;left:0;right:0;bottom:-2px;height:2px;background:#FF1A6C;transform:scaleX(0);transform-origin:0 50%;pointer-events:none}
.m-nav{position:relative}
.m-nav::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:#FF1A6C;transform:scaleX(0);transform-origin:0 50%;transition:transform .35s ${EASE}}
.m-nav.m-nav-on{color:#FFFFFF!important}
.m-nav.m-nav-on::after{transform:scaleX(1)}
`;

  // ───────────── utilidades ─────────────
  const $$ = (root, sel) => Array.from(root.querySelectorAll(sel));
  const docOrder = (a, b) => (a === b ? 0 : a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
  const raf = window.requestAnimationFrame.bind(window);

  function tag(el, kind, delay, dur) {
    el.classList.add('m-' + kind);
    if (delay) el.style.setProperty('--m-d', Math.round(delay) + 'ms');
    if (dur) el.style.setProperty('--m-dur', dur + 's');
  }
  // o React grava estilo pelo CSSOM ("border: 1px solid rgba(...)", cores em rgb()),
  // então a seleção olha as propriedades, nunca o texto do atributo
  const BLUE = 'rgb(86, 142, 255)', PINK = 'rgb(255, 26, 108)';
  const pick = (root, sel, pred) => $$(root, sel).filter(el => pred(el.style, el));
  const isPhoneEl = el => el.style.borderTopLeftRadius === '44px';
  const isCardEl = el => el.tagName === 'ARTICLE' || (el.tagName === 'DIV' && ((el.style.borderLeftWidth === '1px' && el.style.borderLeftStyle === 'solid') || isPhoneEl(el)));
  const bubbleKind = el => {
    const a = el.style.borderTopLeftRadius, b = el.style.borderTopRightRadius;
    return a === '4px' && b === '14px' ? 'in' : a === '14px' && b === '4px' ? 'me' : null;
  };
  const isTwoCol = st => /^minmax\(0(px)?, ?1fr\) auto/.test(st.gridTemplateColumns || '');
  const soleText = el => (el && el.childNodes.length === 1 && el.firstChild.nodeType === 3 ? el.firstChild : null);

  // palavra a palavra: só em título de texto fixo
  function splitWords(el) {
    const words = [];
    const walk = node => {
      for (const ch of Array.from(node.childNodes)) {
        if (ch.nodeType === 3) {
          const parts = ch.nodeValue.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          for (const p of parts) {
            if (!p) continue;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); continue; }
            const m = document.createElement('span');
            m.className = 'm-wm';
            const i = document.createElement('span');
            i.className = 'm-wi';
            i.textContent = p;
            m.appendChild(i);
            frag.appendChild(m);
            words.push(i);
          }
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1 && !ch.classList.contains('m-wm')) walk(ch);
      }
    };
    walk(el);
    words.forEach((w, k) => w.style.setProperty('--m-d', Math.min(k * 45, 700) + 'ms'));
    el.classList.add('m-words');
    return words;
  }

  // etiqueta que se decodifica
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  function scramble(el, dur = 650) {
    const node = soleText(el);
    if (!node) return;
    const orig = node.nodeValue;
    let last = orig;
    const t0 = performance.now();
    const step = now => {
      if (node.nodeValue !== last) return; // o React trocou o texto
      const p = Math.min(1, (now - t0) / dur);
      const shown = Math.floor(p * orig.length * 1.15);
      let out = '';
      for (let i = 0; i < orig.length; i++) {
        const c = orig[i];
        out += i < shown || /[\s·.,\d/-]/.test(c) ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      if (p >= 1) out = orig;
      node.nodeValue = last = out;
      if (p < 1) raf(step);
    };
    raf(step);
  }

  // números que contam até o valor do layout
  function numberInfo(text) {
    const nums = text.match(/\d[\d.]*(?:,\d+)?/g);
    if (!nums || nums.length !== 1) return null;
    const raw = nums[0];
    if (/^0\d/.test(raw)) return null;
    if (/^(19|20)\d\d$/.test(raw)) return null;
    const at = text.indexOf(raw);
    if (text[at + raw.length] === '/' && /\d/.test(text[at + raw.length + 1] || '')) return null;
    const grouped = raw.includes('.');
    const dec = raw.includes(',') ? raw.split(',')[1].length : 0;
    const val = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
    if (!(val >= 10 || dec > 0)) return null;
    return { pre: text.slice(0, at), post: text.slice(at + raw.length), val, dec, grouped };
  }
  function fmt(v, dec, grouped) {
    let s = v.toFixed(dec);
    let [i, d] = s.split('.');
    if (grouped) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return d ? i + ',' + d : i;
  }
  function countUp(el, dur = 1100) {
    const node = soleText(el);
    if (!node) return;
    const orig = node.nodeValue;
    const info = numberInfo(orig);
    if (!info) return;
    let last = info.pre + fmt(0, info.dec, info.grouped) + info.post;
    node.nodeValue = last;
    const t0 = performance.now();
    const step = now => {
      if (node.nodeValue !== last) return;
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      node.nodeValue = last = p >= 1 ? orig : info.pre + fmt(info.val * e, info.dec, info.grouped) + info.post;
      if (p < 1) raf(step);
    };
    raf(step);
  }

  // ───────────── gatilhos por rolagem ─────────────
  const groups = new Map(); // gatilho -> [{el, delay, run}]
  function add(trigger, el, kind, delay = 0, dur) {
    if (!trigger || !el) return;
    if (kind) tag(el, kind, delay, dur);
    if (!groups.has(trigger)) groups.set(trigger, []);
    groups.get(trigger).push({ el, kind, delay });
  }
  function addRun(trigger, fn, delay = 0) {
    if (!groups.has(trigger)) groups.set(trigger, []);
    groups.get(trigger).push({ run: fn, delay });
  }
  function fire(trigger, base, instant) {
    const items = groups.get(trigger);
    if (!items) return;
    groups.delete(trigger);
    io.unobserve(trigger);
    for (const it of items) {
      if (it.el) {
        if (instant) it.el.classList.add('m-skip');
        if (base && !instant) {
          const own = it.delay || 0;
          it.el.style.setProperty('--m-d', Math.round(own + base) + 'ms');
          if (it.el.classList.contains('m-words')) for (const w of it.el.querySelectorAll('.m-wi')) w.style.setProperty('--m-d', (parseFloat(w.style.getPropertyValue('--m-d')) || 0) + base + 'ms');
        }
        it.el.classList.add('m-in');
      }
      if (it.run && !instant) setTimeout(it.run, (it.delay || 0) + (base || 0));
    }
    if (trigger.classList) trigger.classList.add('m-in-path');
  }
  const io = new IntersectionObserver(entries => {
    const hits = entries.filter(e => e.isIntersecting || e.boundingClientRect.bottom < 0).map(e => ({ t: e.target, above: !e.isIntersecting }));
    hits.sort((a, b) => docOrder(a.t, b.t));
    let k = 0;
    for (const h of hits) {
      if (h.above) fire(h.t, 0, true);
      else fire(h.t, Math.min(k++ * 70, 350), false);
    }
  }, { rootMargin: '0px 0px -7% 0px', threshold: 0 });

  // no fim da página, revela o que sobrou (o rodapé nunca cruza a margem de baixo)
  window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      let k = 0;
      for (const t of Array.from(groups.keys()).sort(docOrder)) fire(t, Math.min(k++ * 70, 350), false);
    }
  }, { passive: true });

  // laços (brilho, pontos, luz) só rodam com a seção na tela
  const live = new IntersectionObserver(es => { for (const e of es) e.target.classList.toggle('m-live', e.isIntersecting); });

  // ───────────── montagem ─────────────
  function headerGroup(sec, h2) {
    const hg = h2.parentElement;
    const trig = hg.parentElement && hg.parentElement !== sec ? hg.parentElement : hg;
    const kicker = hg.querySelector('p');
    if (kicker && kicker !== h2) {
      add(trig, kicker, 'up', 0, 0.5);
    }
    splitWords(h2);
    add(trig, h2, null, 60);
    const line = hg.querySelector('img[src$="c8922da4.svg"]');
    if (line) add(trig, line, 'wipe', 260);
    for (const p of trig.children) if (p.tagName === 'P' && !hg.contains(p)) add(trig, p, 'up', 220);
    for (const p of hg.parentElement.children) if (p !== hg && p.tagName === 'P' && trig === hg) add(trig, p, 'up', 220);
    return hg;
  }

  function cards(sec, skip) {
    const all = $$(sec, 'article, div').filter(isCardEl);
    const set = new Set(all);
    const out = [];
    for (const el of all) {
      if (skip && skip.some(s => s.contains(el))) continue;
      let p = el.parentElement, inner = false;
      while (p && p !== sec) { if (set.has(p)) { inner = true; break; } p = p.parentElement; }
      if (!inner) out.push(el);
    }
    return out;
  }

  function stagger(trigger, els, kind, step = 70, base = 0, dur) {
    els.forEach((el, i) => add(trigger, el, kind, base + Math.min(i * step, 600), dur));
  }

  function setupSection(sec) {
    const label = sec.getAttribute('data-screen-label') || '';
    const heads = [];
    for (const h2 of $$(sec, 'h2')) heads.push(headerGroup(sec, h2));

    // cards e painéis
    for (const c of cards(sec, heads)) {
      const isPhone = isPhoneEl(c);
      add(c, c, isPhone ? 'rise' : 'up', 0, isPhone ? 0.85 : 0.6);
      if (c.tagName === 'ARTICLE' || /Integrações|Para quem|Jornada|Inteligência|Confiança/.test(label) && c.offsetHeight < 420) c.classList.add('m-card');
    }

    if (label === 'Tese') {
      pick(sec, 'div', st => st.flexWrap === 'wrap' && st.alignItems === 'center' && st.gap === '8px').forEach((chain, ci) => {
        stagger(chain, Array.from(chain.children), 'pop', 55, 150, 0.45);
        if (ci === 1) {
          pick(chain, 'span', st => st.backgroundColor === BLUE).forEach((s, i) => {
            s.classList.add('m-chip', 'm-loop');
            s.style.setProperty('--i', i);
          });
        }
      });
      live.observe(sec);
    }

    if (label === '01 Captura') {
      const tabs = pick(sec, 'div', (st, el) => st.flexWrap === 'wrap' && st.gap === '8px' && el.querySelector(':scope > button'))[0];
      if (tabs) stagger(tabs, Array.from(tabs.querySelectorAll('button')), 'up', 50, 0, 0.45);
    }

    if (label === '04 Inteligência') {
      const chart = pick(sec, 'div', st => (st.gridTemplateColumns || '').startsWith('repeat(5'))[0];
      if (chart) {
        Array.from(chart.children).forEach((col, ci) => {
          pick(col, 'div', st => st.height === '170px').forEach(box => Array.from(box.children).forEach((bar, bi) => add(chart, bar, 'grow-y', 120 + ci * 90 + bi * 60, 0.75)));
          pick(col, 'span', st => st.fontWeight === '600').forEach(v => addRun(chart, () => countUp(v, 900), 200 + ci * 90));
        });
      }
      pick(sec, 'span', st => st.fontSize === '22px' && st.fontWeight === '700').forEach((v, i) => addRun(v.parentElement, () => countUp(v), 100 + i * 120));
      const saldo = $$(sec, 'span').find(s => /^Saldo hoje/.test(s.textContent));
      if (saldo) addRun(saldo, () => countUp(saldo, 900), 100);
      $$(sec, 'article').forEach(a => { a.classList.remove('m-up'); a.classList.add('m-left'); });
    }

    if (label === 'Confiança') {
      const panel = pick(sec, 'div', st => st.borderTopWidth === '4px' && st.borderTopColor === BLUE)[0];
      if (panel) {
        const big = $$(panel, 'span').find(s => /^Faltam R\$/.test(s.textContent));
        if (big) addRun(panel, () => countUp(big, 1000), 200);
        const rows = pick(panel, 'div', isTwoCol);
        const list = rows[0] && rows[0].parentElement;
        if (list) {
          rows.forEach((r, i) => {
            add(list, r, 'left', 120 + i * 110, 0.5);
            const spans = r.querySelectorAll('span');
            if (spans[1]) addRun(list, () => countUp(spans[1], 800), 160 + i * 110);
            const badge = Array.from(spans).find(s => /^(conferido|\d+ pendentes?)$/i.test(s.textContent.trim()));
            if (badge) add(list, badge, 'pop', 420 + i * 110, 0.45);
          });
        }
      }
    }

    if (label === 'Jornada da compra') {
      const arts = $$(sec, 'article');
      const grid = arts[0] && arts[0].parentElement;
      arts.forEach((a, i) => {
        a.classList.add('m-journey');
        a.style.setProperty('--i', i);
        stagger(a, $$(a, 'div > span'), 'up', 45, 160, 0.4);
      });
      if (grid) addRun(grid, () => grid.classList.add('m-in-path'), 0);
    }

    if (label === 'Integrações') {
      $$(sec, 'article').forEach((a, i) => { a.classList.add('m-dot', 'm-loop'); a.style.setProperty('--i', i); });
      live.observe(sec);
    }

    if (label === 'Para quem') {
      pick(sec, 'span', st => st.width === '40px' && st.height === '3px').forEach(b => add(b.parentElement, b, 'grow-x', 150, 0.6));
      pick(sec, 'p', st => (st.fontSize || '').includes('clamp(36px')).forEach(p => addRun(p.parentElement, () => countUp(p), 120));
    }

    if (label === '05 Decisão') {
      const rows = pick(sec, 'div', isTwoCol);
      const list = rows[0] && rows[0].parentElement;
      if (list) rows.forEach((r, i) => {
        add(list, r, 'left', 120 + i * 100, 0.5);
        const v = r.querySelectorAll('span')[1];
        if (v) addRun(list, () => countUp(v, 800), 160 + i * 100);
      });
    }

    if (label === 'Piloto') {
      $$(sec, 'span').filter(s => /^0[1-3]$/.test(s.textContent.trim())).forEach((n, i) => add(sec.querySelector('h2').parentElement.parentElement, n.parentElement, 'left', 300 + i * 110, 0.5));
      const send = pick(sec, 'button', st => st.backgroundColor === BLUE)[0];
      if (send) { send.classList.add('m-shine', 'm-loop'); send.style.setProperty('--m-sd', '2s'); }
      live.observe(sec);
    }

    if (label === '03 Controle' || label === '05 Decisão') {
      spotlight(sec);
      const chips = pick(sec, 'div', (st, el) => st.flexWrap === 'wrap' && el.querySelector('button'))[0];
      if (chips && label === '03 Controle') stagger(chips, Array.from(chips.querySelectorAll('button')), 'up', 45, 120, 0.45);
    }

    for (const t of groups.keys()) if (sec.contains(t)) io.observe(t);
  }

  function spotlight(sec) {
    sec.classList.add('m-spot');
    const l = document.createElement('div');
    l.className = 'm-spot-l';
    l.setAttribute('aria-hidden', 'true');
    const i = document.createElement('i');
    i.className = 'm-loop';
    l.appendChild(i);
    sec.insertBefore(l, sec.firstChild);
    const zoom = () => (sec.getBoundingClientRect().width / (sec.offsetWidth || 1)) || 1;
    const place = (x, y) => { const z = zoom(); l.style.transform = 'translate(' + (x / z) + 'px,' + (y / z) + 'px)'; };
    const r0 = sec.getBoundingClientRect();
    place(r0.width * 0.72, r0.height * 0.35);
    sec.addEventListener('pointermove', e => {
      const r = sec.getBoundingClientRect();
      place(e.clientX - r.left, e.clientY - r.top);
    }, { passive: true });
    live.observe(sec);
  }

  function setupHero(sec) {
    const kicker = pick(sec, 'p', st => st.color === PINK)[0];
    const h1 = sec.querySelector('h1');
    const text = sec.querySelector('[data-fx="text"]');
    const phone = sec.querySelector('[data-fx="phone"]');
    if (kicker) { tag(kicker, 'up', 0, 0.5); kicker.classList.add('m-in'); }
    if (h1) {
      const w = splitWords(h1);
      w.forEach((x, k) => x.style.setProperty('--m-d', 120 + k * 55 + 'ms'));
      h1.classList.add('m-in');
    }
    if (text) {
      const rest = Array.from(text.children).filter(c => c !== kicker && c !== h1);
      rest.forEach((c, i) => { tag(c, 'up', 520 + i * 110, 0.6); c.classList.add('m-in'); });
      const cta = text.querySelector('a[href="#piloto"]');
      if (cta) { cta.classList.add('m-shine', 'm-loop'); cta.style.setProperty('--m-sd', '2.6s'); }
    }
    // celular: só opacidade, a camada em canvas mede a posição dele
    if (phone) { tag(phone, 'fade', 250, 0.9); phone.classList.add('m-in'); }
    live.observe(sec);
  }

  function setupHeader(hd) {
    const bar = document.createElement('div');
    bar.className = 'm-prog';
    bar.setAttribute('aria-hidden', 'true');
    hd.appendChild(bar);
    let pend = false;
    const upd = () => {
      pend = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0).toFixed(4) + ')';
    };
    window.addEventListener('scroll', () => { if (!pend) { pend = true; raf(upd); } }, { passive: true });
    window.addEventListener('resize', upd, { passive: true });
    upd();
    const cta = hd.querySelector('a[href="#piloto"]');
    if (cta) { cta.classList.add('m-shine', 'm-loop', 'm-always'); cta.style.setProperty('--m-sd', '4s'); }
    // link da seção atual aceso
    const links = $$(hd, 'nav a[href^="#"]').filter(a => a.getAttribute('href').length > 1 && a.getAttribute('href') !== '#piloto');
    const map = new Map();
    for (const a of links) {
      const s = document.getElementById(a.getAttribute('href').slice(1));
      if (s) { a.classList.add('m-nav'); map.set(s, a); }
    }
    const nio = new IntersectionObserver(es => {
      for (const e of es) map.get(e.target).classList.toggle('m-nav-on', e.isIntersecting);
    }, { rootMargin: '-45% 0px -50% 0px' });
    for (const s of map.keys()) nio.observe(s);
  }

  function setupFooter(ft) {
    const inner = ft.firstElementChild;
    if (!inner) return;
    stagger(inner, Array.from(inner.children), 'up', 90, 0, 0.55);
    io.observe(inner);
  }

  // balões de conversa e painéis que entram depois (abas, respostas)
  function animateAdded(node) {
    if (node.nodeType !== 1) return;
    const list = [node, ...node.querySelectorAll('div,article')];
    let swapped = false;
    for (const el of list) {
      const bk = bubbleKind(el);
      if (bk) {
        el.classList.add('m-bubble');
        if (bk === 'me') el.classList.add('m-me');
      } else if (!swapped && el === node && isCardEl(el)) {
        el.classList.add('m-swap');
        swapped = true;
      }
    }
  }

  function boot(root) {
    const style = document.createElement('style');
    style.id = 'wv-motion';
    style.textContent = CSS;
    document.head.appendChild(style);
    const hd = root.querySelector('header');
    if (hd) setupHeader(hd);
    for (const sec of $$(root, 'section')) {
      if (sec.getAttribute('data-screen-label') === 'Hero') setupHero(sec);
      else setupSection(sec);
    }
    const ft = root.querySelector('footer');
    if (ft) setupFooter(ft);
    new MutationObserver(ms => {
      for (const m of ms) for (const n of m.addedNodes) animateAdded(n);
    }).observe(root, { childList: true, subtree: true });
    window.__wvMotion = { groups: () => groups.size };
  }

  function wait() {
    const ok = () => {
      const r = document.getElementById('dc-root');
      return r && r.querySelector('section[data-screen-label="Tese"] h2') ? r : null;
    };
    const r = ok();
    if (r) return boot(r);
    const mo = new MutationObserver(() => {
      const x = ok();
      if (x) { mo.disconnect(); boot(x); }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
  wait();
})();
