import {
  Defense, LEVELS, TYPES, ENEMIES, W, H, stats, wavePlan, onPath,
  SAVE_KEY, SOUND_KEY, DEMO, META_UPGRADES, META_COST,
  loadSave, persistSave, modsFromSave, buyMeta, applyRunPayout,
  demoRankLocked, demoCta,
} from './engine.mjs';

const $ = id => document.getElementById(id);
const canvas = $('board');
const ctx = canvas.getContext('2d');
const typeKeys = Object.keys(TYPES);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const qa = new URLSearchParams(location.search).has('qa');
const storage = window.localStorage;

const memoryStore = () => {
  const map = new Map();
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
  };
};

let save;
try { save = loadSave(storage); persistSave(storage, save); }
catch {
  save = loadSave(memoryStore());
}

let game = new Defense(0, { ...modsFromSave(save), qa });
let screen = 'hq';
let mapIndex = 0;
let selected = -1;
let blueprint = null;
let paused = false;
let speed = 1;
let clock = 0;
let last = 0;
let uiClock = 0;
let noticeTime = 0;
let effects = [];
let hover = -1;
let mapScale = 1;
let mapX = 0;
let mapY = 0;
let viewW = 960;
let viewH = 600;
let sound = false;
let audio = null;
try { sound = storage.getItem(SOUND_KEY) === 'true'; } catch {}

const fmt = n => Math.round(n).toLocaleString('en-US');

function tone(freq = 440, duration = .1, volume = .025, type = 'sine', end) {
  if (!sound || !audio) return;
  try {
    const t = audio.currentTime;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (end) o.frequency.exponentialRampToValueAtTime(end, t + duration);
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(.001, t + duration);
    o.connect(g);
    g.connect(audio.destination);
    o.start(t);
    o.stop(t + duration);
    o.onended = () => { o.disconnect(); g.disconnect(); };
  } catch {}
}

function readyAudio() {
  if (!sound) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume().catch(() => {});
  } catch {}
}

function persist() {
  try { persistSave(storage, save); } catch {}
}

function syncSound() {
  $('sound').setAttribute('aria-pressed', String(sound));
  $('sound').setAttribute('aria-label', sound ? 'Sound off' : 'Sound on');
  $('sound').textContent = sound ? '♫' : '♪';
}

$('sound').onclick = () => {
  sound = !sound;
  readyAudio();
  syncSound();
  try { storage.setItem(SOUND_KEY, String(sound)); } catch {}
  if (sound) tone(500, .14);
};
syncSound();

function circle(c, x, y, r, fill, stroke, width = 1) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}

function turret(c, x, y, type, angle = -Math.PI / 2, level = 1, scale = 1) {
  const color = TYPES[type].color;
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  circle(c, 0, 0, 18, '#0b2a32', color, 2);
  if (type === 'beacon') {
    c.beginPath();
    c.moveTo(0, -16);
    c.lineTo(12, 0);
    c.lineTo(0, 16);
    c.lineTo(-12, 0);
    c.closePath();
    c.fillStyle = color;
    c.fill();
    circle(c, 0, 0, 4, '#0b2a32');
  } else {
    c.save();
    c.rotate(angle);
    if (type === 'cannon') {
      c.fillStyle = color;
      c.fillRect(4, -4, 26, 8);
      circle(c, 0, 0, 6, color);
    }
    if (type === 'mortar') {
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(-8, 8);
      c.lineTo(22, 2);
      c.lineTo(22, -2);
      c.lineTo(-8, -8);
      c.closePath();
      c.fill();
      circle(c, 8, 0, 7, '#0b2a32', color, 2);
    }
    if (type === 'frost') {
      c.strokeStyle = color;
      c.lineWidth = 2.4;
      for (let i = 0; i < 6; i++) {
        c.rotate(Math.PI / 3);
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(16, 0);
        c.stroke();
      }
      circle(c, 0, 0, 4, color);
    }
    c.restore();
  }
  for (let i = 0; i < level; i++) circle(c, (i - (level - 1) / 2) * 7, 24, 2.2, color);
  c.restore();
}

function iconSvg(kind) {
  if (kind === 'chest') {
    return `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="18" width="32" height="20" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 26h32" stroke="currentColor" stroke-width="2"/><rect x="21" y="24" width="6" height="8" fill="currentColor"/></svg>`;
  }
  if (kind === 'lights') {
    return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 8l8 12v20H16V20z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 20h16" stroke="currentColor" stroke-width="2"/><path d="M24 8V4" stroke="currentColor" stroke-width="2"/></svg>`;
  }
  return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 34l20-20" stroke="currentColor" stroke-width="2"/><path d="M30 10l8 8-6 2-4-4z" fill="currentColor"/><path d="M12 32l4 4 8-4" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
}

function hideScreens() {
  $('hq').classList.add('hidden');
  $('battle').classList.add('hidden');
  $('result').classList.add('hidden');
}

function drawHq() {
  $('hq-remnants').textContent = fmt(save.remnants);
  $('demo-cta').classList.toggle('hidden', !demoCta(save.runs));
  if (save.last) {
    $('last-run').classList.remove('hidden');
    $('last-run').textContent = `${save.last.won ? 'Held' : 'Broken'} · +${save.last.gain} remnants`;
  } else $('last-run').classList.add('hidden');

  $('upgrades').innerHTML = META_UPGRADES.map(u => {
    const rank = save.upgrades[u.id];
    const maxed = rank >= u.max;
    const locked = !maxed && demoRankLocked(rank);
    const cost = META_COST[rank];
    const can = !maxed && !locked && save.remnants >= cost;
    const label = maxed ? 'Max' : locked ? 'Full game coming' : `Buy · ${cost}`;
    return `<article class="upgrade-card ${locked ? 'locked' : ''}">
      <div class="upgrade-icon">${iconSvg(u.icon)}</div>
      <span class="rank">${rank} / ${u.max}</span>
      <h3>${u.name}</h3>
      <p>${u.desc}</p>
      <b>${u.label(rank)}</b>
      <button class="primary" data-upgrade="${u.id}" ${can ? '' : 'disabled'}>${label}</button>
    </article>`;
  }).join('');
  document.querySelectorAll('[data-upgrade]').forEach(b => {
    b.onclick = () => {
      if (!buyMeta(save, b.dataset.upgrade)) return;
      persist();
      drawHq();
      tone(520, .12, .035);
    };
  });

  $('maps').innerHTML = LEVELS.map((level, i) => `
    <button class="map-pick ${i === mapIndex ? 'selected' : ''}" data-map="${i}">
      <span class="eyebrow">${level.area}</span>
      <strong>${level.name}</strong>
      <small>${qa ? 2 : level.waves} waves</small>
    </button>`).join('');
  document.querySelectorAll('[data-map]').forEach(b => {
    b.onclick = () => { mapIndex = Number(b.dataset.map); drawHq(); };
  });
}

function showHq() {
  closeModal();
  screen = 'hq';
  paused = false;
  hideScreens();
  $('hq').classList.remove('hidden');
  drawHq();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function startRun(index = mapIndex) {
  closeModal();
  mapIndex = index;
  game = new Defense(index, { ...modsFromSave(save), qa });
  screen = 'battle';
  selected = -1;
  blueprint = null;
  paused = false;
  speed = 1;
  effects = [];
  hover = -1;
  readyAudio();
  hideScreens();
  $('battle').classList.remove('hidden');
  $('sector-label').textContent = game.level.area;
  $('mission-name').textContent = game.level.name;
  $('speed').textContent = '1×';
  notice('Build. Then send the first wave.', 3.4);
  resize();
  syncUI();
  canvas.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function showResult(won, gain) {
  screen = 'result';
  paused = false;
  hideScreens();
  $('result').classList.remove('hidden');
  $('result-kicker').textContent = won ? 'HELD' : 'BROKEN';
  $('result-title').textContent = won ? 'The lantern held.' : 'The lantern went dark.';
  $('result-remnants').textContent = `+${gain}`;
  $('result-kills').textContent = fmt(game.kills);
  $('result-wave').textContent = `${game.wave} / ${game.level.waves}`;
  $('result-lives').textContent = `${game.lives} / ${game.maxLives}`;
  $('result-note').classList.toggle('hidden', !demoCta(save.runs));
}

function notice(text, seconds = 2.4, danger = false) {
  $('notice').textContent = text;
  $('notice').className = 'notice show' + (danger ? ' danger' : '');
  noticeTime = seconds;
}

function closeModal() {
  if ($('modal').open) $('modal').close();
}

function modal(kicker, title, copy, buttons) {
  $('modal-kicker').textContent = kicker;
  $('modal-title').textContent = title;
  $('modal-copy').innerHTML = copy;
  $('modal-actions').replaceChildren();
  for (const [text, action, secondary] of buttons) {
    const b = document.createElement('button');
    b.textContent = text;
    b.className = secondary ? 'text-btn' : 'primary';
    b.onclick = action;
    $('modal-actions').append(b);
  }
  if (!$('modal').open) $('modal').showModal();
}

function resume() {
  paused = false;
  closeModal();
  readyAudio();
  canvas.focus({ preventScroll: true });
  syncUI();
}

function pause() {
  if (screen !== 'battle' || ['won', 'lost'].includes(game.state)) return;
  paused = true;
  modal('PAUSE', 'Hold.', `<p>Towers keep the line.</p>`, [
    ['Resume →', resume],
    ['Redeploy', () => startRun(game.index), true],
    ['Headquarters', showHq, true],
  ]);
  syncUI();
}

$('pause').onclick = pause;
$('home').onclick = () => {
  if (screen === 'battle' && !['won', 'lost'].includes(game.state)) pause();
  else showHq();
};
$('start-run').onclick = () => startRun(mapIndex);
$('to-hq').onclick = showHq;

$('help').onclick = () => {
  const wasPaused = paused;
  if (screen === 'battle') paused = true;
  modal('FIELD NOTES', 'Hold the harbor.', `<ol class="help-list">
    <li><b>Build on pads.</b> Four roles: Cannon, Mortar, Cryo, Beacon.</li>
    <li><b>Gold</b> buys towers this run. <b>Remnants</b> stay at Headquarters.</li>
    <li><b>Die or hold.</b> Spend remnants, deploy again.</li>
    <li>1–4 tower · arrows pad · Enter build · U upgrade · space wave · P pause</li>
  </ol>`, [['Got it →', () => {
    closeModal();
    if (wasPaused) pause();
    else {
      paused = false;
      if (screen === 'battle') canvas.focus({ preventScroll: true });
    }
    syncUI();
  }]]);
};

$('modal').addEventListener('cancel', e => {
  e.preventDefault();
  if (screen === 'battle' && !['won', 'lost'].includes(game.state)) resume();
  else closeModal();
});

function endRun(won) {
  const gain = applyRunPayout(save, {
    won,
    wave: game.wave,
    kills: game.kills,
    lives: game.lives,
  });
  persist();
  if (won) [440, 554, 660, 880].forEach((f, i) => setTimeout(() => tone(f, .4, .06), i * 110));
  else tone(180, .5, .05, 'triangle', 55);
  showResult(won, gain);
}

function makeTowerCards() {
  $('tower-options').innerHTML = Object.entries(TYPES).map(([type, t], i) => `
    <button class="tower-card" data-tower="${type}" style="--accent:${t.color}" aria-label="${t.name}, ${t.role}">
      <canvas width="100" height="90" aria-hidden="true"></canvas>
      <span class="tower-cost"></span>
      <strong>${t.name}</strong>
      <small>${t.role}</small>
      <span class="tower-key">${i + 1}</span>
    </button>`).join('');
  document.querySelectorAll('[data-tower]').forEach(b => {
    turret(b.querySelector('canvas').getContext('2d'), 46, 41, b.dataset.tower, -.55, 1, 1.2);
    b.onclick = () => chooseType(b.dataset.tower);
  });
}

function chooseType(type) {
  if (paused || !['build', 'wave'].includes(game.state)) return;
  readyAudio();
  if (selected >= 0 && !game.towerAt(selected)) {
    if (game.build(selected, type)) {
      blueprint = null;
      events();
      syncUI();
      canvas.focus({ preventScroll: true });
      return;
    }
    notice('Need more gold.', 2, true);
  }
  blueprint = type;
  selected = -1;
  syncUI();
  canvas.focus({ preventScroll: true });
}

function selectPad(i) {
  if (paused || !['build', 'wave'].includes(game.state)) return;
  readyAudio();
  if (blueprint && !game.towerAt(i)) {
    if (game.build(i, blueprint)) {
      selected = i;
      blueprint = null;
      events();
    } else {
      selected = i;
      notice('Need more gold.', 2, true);
    }
  } else {
    selected = i;
    blueprint = null;
  }
  syncUI();
}

function clearSelection() {
  selected = -1;
  blueprint = null;
  syncUI();
}

$('cancel-selection').onclick = clearSelection;
$('upgrade').onclick = () => {
  if (paused) return;
  if (game.upgrade(selected)) { tone(660, .17, .045); events(); syncUI(); }
  else notice('Need more gold.', 2, true);
};
$('sell').onclick = () => {
  if (paused) return;
  if (game.sell(selected)) { tone(290, .12); clearSelection(); }
};
$('send-wave').onclick = () => {
  if (paused) return;
  readyAudio();
  if (!game.towers.length) { notice('Build at least one tower.', 2.2, true); return; }
  if (game.startWave()) { events(); syncUI(); canvas.focus({ preventScroll: true }); }
};
$('speed').onclick = () => {
  speed = speed === 1 ? 2 : 1;
  $('speed').textContent = speed + '×';
};

function waveText(plan) {
  const counts = {};
  for (const t of plan) counts[t] = (counts[t] || 0) + 1;
  return Object.entries(counts).map(([t, n]) => `${n}× ${ENEMIES[t].name}`).join(' · ');
}

function syncUI() {
  if (screen !== 'battle') return;
  $('money').textContent = fmt(game.money);
  $('lives').innerHTML = `${game.lives} <small>/ ${game.maxLives}</small>`;
  $('lives').classList.toggle('low-health', game.lives < Math.ceil(game.maxLives * .4));
  $('wave').innerHTML = `${game.wave} <small>/ ${game.level.waves}</small>`;
  $('board-state').textContent = paused ? 'PAUSE' : game.state === 'wave' ? 'INBOUND' : game.state === 'build' ? 'BUILD' : game.state === 'won' ? 'HELD' : 'BROKEN';
  $('send-wave').disabled = game.state !== 'build' || paused;
  $('send-wave').innerHTML = game.state === 'wave' ? 'Wave live' : game.state === 'won' ? 'Held' : 'Send wave <span>→</span>';
  $('next-label').textContent = game.state === 'wave' ? 'STILL AFLOAT' : 'NEXT WAVE';
  if (game.state === 'wave') $('next-enemies').textContent = `${game.enemies.length + game.queue.length} hulls`;
  else if (game.state === 'build') $('next-enemies').textContent = waveText(wavePlan(game.index, game.wave + 1, qa));
  else $('next-enemies').textContent = '—';

  document.querySelectorAll('[data-tower]').forEach(b => {
    const cost = game.towerCost(b.dataset.tower);
    b.querySelector('.tower-cost').textContent = cost;
    b.classList.toggle('selected', blueprint === b.dataset.tower);
    b.classList.toggle('unaffordable', game.money < cost);
    b.setAttribute('aria-pressed', String(blueprint === b.dataset.tower));
  });

  const t = game.towerAt(selected);
  const type = t?.type || blueprint;
  const s = type ? stats(t || { type, level: 1 }, game.towers) : null;
  $('cancel-selection').classList.toggle('hidden', selected < 0 && !blueprint);
  $('tower-stats').classList.toggle('hidden', !s);
  $('upgrade-actions').classList.toggle('hidden', !t);
  if (s) {
    $('selection-label').textContent = t ? `TOWER / ${t.level} OF 3` : 'READY';
    $('selection-name').textContent = `${s.name} · ${s.role}`;
    $('selection-desc').textContent = s.desc;
    const mid = type === 'beacon'
      ? `<div><b>${Math.round(s.range)}</b><span>AURA</span></div>`
      : `<div><b>${Math.round(s.damage)}</b><span>DMG</span></div>`;
    $('tower-stats').innerHTML = `${mid}<div><b>${s.range} m</b><span>RANGE</span></div><div><b>${s.rate.toFixed(1)} s</b><span>RATE</span></div>`;
  } else {
    $('selection-label').textContent = selected >= 0 ? 'PAD' : 'TIP';
    $('selection-name').textContent = selected >= 0 ? `Pad ${selected + 1}` : 'Corners.';
    $('selection-desc').textContent = selected >= 0 ? 'Pick a tower.' : game.level.tip;
  }
  if (t) {
    $('upgrade').textContent = t.level >= 3 ? 'Maxed' : `Upgrade · ${game.upgradePrice(t)}`;
    $('upgrade').disabled = t.level >= 3 || game.money < game.upgradePrice(t) || paused;
    $('sell').textContent = `Sell · ${Math.floor(t.invested * .7)} gold`;
    $('sell').disabled = paused;
  }
  $('build-hint').textContent = blueprint ? `${TYPES[blueprint].name}: click a pad.` : 'Pick a tower, then a pad.';
}

function events() {
  for (const e of game.events) {
    if (e.type === 'build') { effects.push({ ...e, age: 0, life: .55 }); tone(430, .1, .035); }
    if (e.type === 'kill') { effects.push({ ...e, age: 0, life: .55 }); if (game.kills % 3 === 0) tone(75, .12, .025, 'triangle', 35); }
    if (e.type === 'blast') { effects.push({ ...e, age: 0, life: .4 }); tone(58, .18, .04, 'triangle', 30); }
    if (e.type === 'beam' || e.type === 'aura') effects.push({ ...e, age: 0, life: e.frost ? .2 : .18 });
    if (e.type === 'leak') { effects.push({ ...e, age: 0, life: .65 }); notice(`Leak −${e.harm}`, 1.5, true); tone(140, .3, .05, 'sawtooth', 75); }
    if (e.type === 'wave') { notice(`Wave ${e.wave} / ${game.level.waves}`, 2); tone(330, .2, .04); }
    if (e.type === 'clear') { notice(`Clear. +${e.bonus} gold.`, 2.4); tone(660, .25, .04); }
    if (e.type === 'end') endRun(e.won);
  }
  game.events.length = 0;
}

function resize() {
  if (screen !== 'battle') return;
  const r = canvas.getBoundingClientRect();
  if (!r.width || !r.height) return;
  viewW = r.width;
  viewH = r.height;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(viewW * dpr);
  canvas.height = Math.round(viewH * dpr);
  mapScale = Math.min(viewW / W, viewH / H);
  mapX = (viewW - W * mapScale) / 2;
  mapY = (viewH - H * mapScale) / 2;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
new ResizeObserver(resize).observe(canvas);

function point(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left - mapX) / mapScale, y: (e.clientY - r.top - mapY) / mapScale };
}

function nearest(p, threshold = 43) {
  let best = -1;
  let d = Infinity;
  game.level.pads.forEach(([x, y], i) => {
    const n = Math.hypot(x - p.x, y - p.y);
    if (n < d && n < threshold) { d = n; best = i; }
  });
  return best;
}

canvas.addEventListener('pointermove', e => { hover = nearest(point(e)); });
canvas.addEventListener('pointerleave', () => { hover = -1; });
canvas.addEventListener('pointerup', e => {
  if (screen !== 'battle' || paused) return;
  const i = nearest(point(e), e.pointerType === 'touch' ? Math.max(43, 22 / mapScale) : 43);
  if (i >= 0) selectPad(i);
  else clearSelection();
  canvas.focus({ preventScroll: true });
});

window.addEventListener('keydown', e => {
  if (screen !== 'battle' || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
  const key = e.key || e.code;
  if ($('modal').open) {
    if ((key === 'p' || key === 'P') && !e.repeat && paused) { e.preventDefault(); resume(); }
    return;
  }
  if (e.target.closest?.('input,textarea,select')) return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
    e.preventDefault();
    const [dx, dy] = key === 'ArrowLeft' ? [-1, 0] : key === 'ArrowRight' ? [1, 0] : key === 'ArrowUp' ? [0, -1] : [0, 1];
    if (selected < 0) selected = 0;
    else {
      const [x, y] = game.level.pads[selected];
      const choices = game.level.pads.map(([xx, yy], i) => ({
        i,
        forward: (xx - x) * dx + (yy - y) * dy,
        side: Math.abs((xx - x) * dy - (yy - y) * dx),
        d: Math.hypot(xx - x, yy - y),
      })).filter(v => v.forward > 5).sort((a, b) => (a.d + a.side * 1.5) - (b.d + b.side * 1.5));
      if (choices.length) selected = choices[0].i;
    }
    canvas.focus({ preventScroll: true });
    syncUI();
    return;
  }
  if (e.repeat) return;
  if (['1', '2', '3', '4'].includes(key)) { e.preventDefault(); chooseType(typeKeys[Number(key) - 1]); }
  else if (key === 'Enter' && e.target === canvas && selected >= 0) { e.preventDefault(); selectPad(selected); }
  else if ((key === ' ' || key === 'Space') && e.target === canvas) { e.preventDefault(); $('send-wave').click(); }
  else if (key.toLowerCase() === 'u' && selected >= 0) { e.preventDefault(); $('upgrade').click(); }
  else if (key.toLowerCase() === 'p') { e.preventDefault(); pause(); }
  else if (key === 'Escape') {
    e.preventDefault();
    if (blueprint || selected >= 0) clearSelection();
    else pause();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'battle' && !paused) pause();
});
window.addEventListener('blur', () => {
  if (screen === 'battle' && game.state === 'wave' && !paused) pause();
});

function drawShip(e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  ctx.beginPath();
  if (e.type === 'tank') {
    ctx.moveTo(e.size * 1.3, 0);
    ctx.lineTo(e.size * .4, -e.size);
    ctx.lineTo(-e.size, -e.size * .7);
    ctx.lineTo(-e.size, e.size * .7);
    ctx.lineTo(e.size * .4, e.size);
  } else if (e.type === 'fast') {
    ctx.moveTo(e.size * 1.8, 0);
    ctx.lineTo(-e.size, -e.size * .55);
    ctx.lineTo(-e.size * .6, 0);
    ctx.lineTo(-e.size, e.size * .55);
  } else {
    ctx.moveTo(e.size * 1.4, 0);
    ctx.lineTo(-e.size, -e.size * .7);
    ctx.lineTo(-e.size * .7, 0);
    ctx.lineTo(-e.size, e.size * .7);
  }
  ctx.closePath();
  ctx.fillStyle = e.flash > 0 ? '#fff0df' : e.color;
  ctx.fill();
  ctx.strokeStyle = e.armor ? '#ffd6e5' : '#ffffff40';
  ctx.lineWidth = e.armor ? 2 : 1;
  ctx.stroke();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, viewW, viewH);
  ctx.save();
  ctx.translate(mapX, mapY);
  ctx.scale(mapScale, mapScale);

  for (const points of game.level.paths) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#05171d';
    ctx.lineWidth = 36;
    ctx.stroke();
    ctx.strokeStyle = '#ffd19255';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 10]);
    ctx.lineDashOffset = reduced ? 0 : -clock * 8;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const active = selected >= 0 ? selected : hover;
  const t = game.towerAt(active);
  const type = t?.type || blueprint;
  if (active >= 0 && type) {
    const [x, y] = game.level.pads[active];
    const s = stats(t || { type, level: 1, x, y }, game.towers);
    circle(ctx, x, y, s.range, s.color + '10', s.color + '55', 1);
  }

  game.level.pads.forEach(([x, y], i) => {
    const tower = game.towerAt(i);
    const isSelected = i === selected || i === hover;
    circle(ctx, x, y, 24, '#071e27', isSelected ? '#b8ffd9' : tower ? '#7eab9266' : '#a2d2b570', isSelected ? 2 : 1);
    if (!tower) {
      ctx.strokeStyle = isSelected ? '#b8ffd9' : '#99ccb966';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 6, y);
      ctx.lineTo(x + 6, y);
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x, y + 6);
      ctx.stroke();
    }
  });

  const baseX = 931;
  const baseY = 300;
  circle(ctx, baseX, baseY, 28, '#0b2a32', '#ffd192', 2);
  ctx.beginPath();
  ctx.arc(baseX, baseY, 34, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * game.lives / game.maxLives);
  ctx.strokeStyle = game.lives < Math.ceil(game.maxLives * .4) ? '#ff8094' : '#ffd192';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#ffd192';
  ctx.font = '22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Ⅱ', baseX, baseY);

  for (const tw of game.towers) {
    turret(ctx, tw.x, tw.y, tw.type, tw.angle, tw.level);
    if (tw.type !== 'beacon' && tw.cool > stats(tw, game.towers).rate - .07) {
      circle(ctx, tw.x + Math.cos(tw.angle) * 26, tw.y + Math.sin(tw.angle) * 26, 5, TYPES[tw.type].color);
    }
  }

  for (const e of game.enemies) {
    drawShip(e);
    if (e.slow > 0) circle(ctx, e.x, e.y, e.size + 7, null, '#e2eee888', 2);
    if (e.hp < e.maxHp || e.type === 'tank') {
      const w = e.type === 'tank' ? 36 : 26;
      ctx.fillStyle = '#071e27';
      ctx.fillRect(e.x - w / 2, e.y - e.size - 12, w, 3);
      ctx.fillStyle = e.slow > 0 ? '#e2eee8' : e.type === 'tank' ? '#ff8094' : '#ffd192';
      ctx.fillRect(e.x - w / 2, e.y - e.size - 12, w * Math.max(0, e.hp / e.maxHp), 3);
    }
  }

  for (const p of game.projectiles) {
    const q = Math.min(1, p.age / p.duration);
    const x = p.ox + (p.tx - p.ox) * q;
    const y = p.oy + (p.ty - p.oy) * q - (p.type === 'mortar' ? Math.sin(q * Math.PI) * 60 : 0);
    ctx.beginPath();
    ctx.moveTo(x - (p.tx - p.ox) * .03, y - (p.ty - p.oy) * .03);
    ctx.lineTo(x, y);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.type === 'mortar' ? 4 : 2;
    ctx.stroke();
    circle(ctx, x, y, p.type === 'mortar' ? 4 : 2.4, '#fff0d2');
  }

  for (const e of effects) {
    const q = e.age / e.life;
    ctx.globalAlpha = 1 - q;
    if (e.type === 'beam') {
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.tx, e.ty);
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (e.type === 'aura') {
      circle(ctx, e.x, e.y, e.range * (0.2 + q * 0.15), null, e.color, 1.5);
    } else if (e.type === 'blast') {
      circle(ctx, e.x, e.y, 65 * q, null, e.color, 2);
    } else if (e.type === 'build') {
      circle(ctx, e.x, e.y, 22 + q * 22, null, e.color, 2);
    } else if (e.type === 'leak') {
      circle(ctx, e.x, e.y, 14 + q * 50, null, '#ff8094', 3);
    } else if (e.type === 'kill') {
      ctx.fillStyle = '#ffd192';
      ctx.font = 'bold 12px "DM Sans",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('+' + e.bounty, e.x, e.y - 12 - q * 20);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function frame(ms) {
  const dt = Math.min((ms - last) / 1000 || 0, .05);
  last = ms;
  clock += dt;
  if (screen === 'battle') {
    if (!paused) {
      for (let i = 0; i < speed; i++) {
        game.step(dt);
        events();
        if (['won', 'lost'].includes(game.state)) break;
      }
      for (const e of effects) e.age += dt;
      effects = effects.filter(e => e.age < e.life).slice(-180);
      noticeTime -= dt;
      if (noticeTime <= 0) $('notice').classList.remove('show');
    }
    uiClock += dt;
    if (uiClock > .15) { syncUI(); uiClock = 0; }
    draw();
  }
  requestAnimationFrame(frame);
}

makeTowerCards();
drawHq();
requestAnimationFrame(frame);

window.__pristavQa = qa ? {
  save,
  key: SAVE_KEY,
  finish(won = true) {
    if (screen !== 'battle') startRun(mapIndex);
    game.finish(won);
    events();
  },
} : undefined;
