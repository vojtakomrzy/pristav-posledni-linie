import {
  Defense, LEVELS, TYPES, ENEMIES, W, H, wavePlan,
  SAVE_KEY, SOUND_KEY, META_UPGRADES, MAP_UNLOCK_COST,
  loadSave, persistSave, modsFromSave, buyMeta, buyMap, applyRunPayout,
  demoRankLocked, demoCta, mapUnlocked, metaCost,
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
let dockMode = 'build';
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
  const grow = 1 + (level - 1) * 0.16;
  c.save();
  c.translate(x, y);
  c.scale(scale * grow, scale * grow);
  circle(c, 0, 0, 15, '#071e27', '#b8ffd9', 1.4);
  c.strokeStyle = '#e2eee822';
  c.lineWidth = 1;
  c.beginPath();
  c.arc(0, 0, 15, -1.1, 0.4);
  c.stroke();
  if (type === 'cannon') {
    c.fillStyle = '#1c2c30';
    c.fillRect(-7, -12 - (level > 1 ? 4 : 0), 14, 24 + (level > 1 ? 4 : 0));
    c.save();
    c.rotate(angle);
    c.fillStyle = color;
    c.fillRect(4, -3.5, 16 + (level > 2 ? 4 : 0), 7);
    c.restore();
    if (level >= 2) {
      c.fillStyle = color;
      c.fillRect(-10, -3, 5, 6);
    }
    if (level >= 3) circle(c, 0, -16, 3.2, color);
  } else if (type === 'tesla') {
    c.strokeStyle = color;
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0, 7);
    c.lineTo(0, -13);
    c.stroke();
    c.beginPath();
    c.arc(0, -13, 8, Math.PI * 0.18, Math.PI * 0.82);
    c.stroke();
    if (level >= 2) {
      c.beginPath();
      c.moveTo(-6, 4);
      c.lineTo(-6, -8);
      c.moveTo(6, 4);
      c.lineTo(6, -8);
      c.stroke();
    }
    if (level >= 3) circle(c, 0, -13, 4, null, color, 1.5);
  } else if (type === 'frost') {
    c.beginPath();
    c.moveTo(0, -14);
    c.lineTo(10, 0);
    c.lineTo(0, 14);
    c.lineTo(-10, 0);
    c.closePath();
    c.fillStyle = color;
    c.fill();
    if (level >= 2) {
      c.beginPath();
      c.moveTo(0, -7);
      c.lineTo(5, 0);
      c.lineTo(0, 7);
      c.lineTo(-5, 0);
      c.closePath();
      c.fillStyle = '#071e27';
      c.fill();
    }
    if (level >= 3) {
      c.strokeStyle = color;
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(-12, -8);
      c.lineTo(-16, -14);
      c.moveTo(12, -8);
      c.lineTo(16, -14);
      c.stroke();
    }
  } else if (type === 'mortar') {
    c.fillStyle = '#1c2c30';
    c.fillRect(-9, -8, 18, 18);
    c.save();
    c.rotate(angle - 0.5);
    c.fillStyle = color;
    c.fillRect(2, -4.5, 14, 9);
    c.restore();
    if (level >= 2) {
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-11, 10);
      c.lineTo(-16, 16);
      c.moveTo(11, 10);
      c.lineTo(16, 16);
      c.stroke();
    }
    if (level >= 3) circle(c, 0, -12, 5, null, color, 2);
  }
  c.restore();
}

function hideScreens() {
  $('hq').classList.add('hidden');
  $('battle').classList.add('hidden');
  $('result').classList.add('hidden');
}

function drawHq() {
  $('hq-anchors').textContent = fmt(save.anchors);
  $('demo-cta').classList.toggle('hidden', !demoCta(save.runs));
  if (save.last) {
    $('last-run').classList.remove('hidden');
    $('last-run').textContent = `${save.last.won ? 'Held' : 'Broken'} · +${save.last.gain} anchors`;
  } else $('last-run').classList.add('hidden');

  $('upgrades').innerHTML = META_UPGRADES.map(u => {
    const rank = save.upgrades[u.id];
    const maxed = rank >= u.max;
    const locked = !maxed && demoRankLocked(rank);
    const cost = metaCost(u.id, rank);
    const can = !maxed && !locked && save.anchors >= cost;
    const label = maxed ? 'Max' : locked ? 'Full game coming' : `Buy · ${cost}`;
    return `<article class="upgrade-card ${locked ? 'locked' : ''}">
      <div class="upgrade-icon"><img src="./assets/meta/${u.icon}.svg" width="24" height="24" alt=""></div>
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

  $('maps').innerHTML = LEVELS.map((level, i) => {
    const open = mapUnlocked(save, level.id);
    const selectedMap = i === mapIndex && open;
    const waves = qa ? 2 : level.waves;
    const lockNote = open
      ? `${waves} waves`
      : `Locked · ${MAP_UNLOCK_COST} anchors or clear`;
    return `<button class="map-pick ${selectedMap ? 'selected' : ''} ${open ? '' : 'locked'}" data-map="${i}">
      <span class="eyebrow">${level.area}</span>
      <strong>${level.name}</strong>
      <small>${lockNote}</small>
      ${open ? '' : `<span class="primary unlock" data-unlock="${level.id}">Unlock · ${MAP_UNLOCK_COST}</span>`}
    </button>`;
  }).join('');
  document.querySelectorAll('[data-map]').forEach(b => {
    b.onclick = e => {
      if (e.target.closest('[data-unlock]')) return;
      const i = Number(b.dataset.map);
      if (!mapUnlocked(save, LEVELS[i].id)) return;
      mapIndex = i;
      drawHq();
    };
  });
  document.querySelectorAll('[data-unlock]').forEach(b => {
    b.onclick = e => {
      e.stopPropagation();
      if (!buyMap(save, b.dataset.unlock)) {
        noticeHq();
        return;
      }
      persist();
      mapIndex = LEVELS.findIndex(l => l.id === b.dataset.unlock);
      drawHq();
      tone(520, .12, .035);
    };
  });
  const currentOpen = mapUnlocked(save, LEVELS[mapIndex]?.id);
  if (!currentOpen) mapIndex = 0;
  $('start-run').disabled = !mapUnlocked(save, LEVELS[mapIndex].id);
}

function noticeHq() {
  $('last-run').classList.remove('hidden');
  $('last-run').textContent = `Need ${MAP_UNLOCK_COST} anchors, or clear the previous map.`;
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
  if (!mapUnlocked(save, LEVELS[index]?.id)) index = 0;
  mapIndex = index;
  game = new Defense(index, { ...modsFromSave(save), qa });
  screen = 'battle';
  selected = -1;
  blueprint = null;
  dockMode = 'build';
  paused = false;
  speed = 1;
  effects = [];
  hover = -1;
  readyAudio();
  hideScreens();
  $('battle').classList.remove('hidden');
  $('speed').textContent = '1×';
  notice('Build. Then start the first wave.', 3.4);
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
  $('result-anchors').textContent = `+${gain}`;
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
    <li><b>Build on pads.</b> Four roles: Cannon, Tesla, Cryo, Mortar.</li>
    <li><b>Credits</b> buy towers this run. <b>Anchors</b> stay at Headquarters.</li>
    <li><b>Die or hold.</b> Spend anchors, deploy again.</li>
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
    boss: game.bossDown,
    mapId: game.level.id,
  });
  persist();
  if (won) [440, 554, 660, 880].forEach((f, i) => setTimeout(() => tone(f, .4, .06), i * 110));
  else tone(180, .5, .05, 'triangle', 55);
  showResult(won, gain);
}

function makeTowerCards() {
  $('tower-options').innerHTML = Object.entries(TYPES).map(([type, t], i) => `
    <button class="tower-card" data-tower="${type}" style="--accent:${t.color}" aria-label="${t.name}, ${t.role}">
      <canvas width="96" height="96" aria-hidden="true"></canvas>
      <strong>${t.name}</strong>
      <span class="tower-cost"></span>
      <span class="tower-key">${i + 1}</span>
    </button>`).join('');
  document.querySelectorAll('[data-tower]').forEach(b => {
    turret(b.querySelector('canvas').getContext('2d'), 48, 48, b.dataset.tower, -.55, 1, 1.35);
    b.onclick = () => chooseType(b.dataset.tower);
  });
}

function setDockMode(mode) {
  dockMode = mode;
  if (mode !== 'build') blueprint = null;
  $('mode-build').classList.toggle('selected', mode === 'build');
  $('mode-upgrade').classList.toggle('selected', mode === 'upgrade');
  $('mode-sell').classList.toggle('selected', mode === 'sell');
  $('mode-build').setAttribute('aria-pressed', String(mode === 'build'));
  $('mode-upgrade').setAttribute('aria-pressed', String(mode === 'upgrade'));
  $('mode-sell').setAttribute('aria-pressed', String(mode === 'sell'));
  syncUI();
}

$('mode-build').onclick = () => { if (!paused) setDockMode('build'); };
$('mode-upgrade').onclick = () => { if (!paused) setDockMode('upgrade'); };
$('mode-sell').onclick = () => { if (!paused) setDockMode('sell'); };

function chooseType(type) {
  if (paused || !['build', 'wave'].includes(game.state)) return;
  readyAudio();
  if (!game.allowed(type)) { notice('Unlock Mortar at Headquarters.', 2.2, true); return; }
  setDockMode('build');
  if (selected >= 0 && !game.towerAt(selected)) {
    if (game.build(selected, type)) {
      blueprint = null;
      events();
      syncUI();
      canvas.focus({ preventScroll: true });
      return;
    }
    notice('Need more credits.', 2, true);
  }
  blueprint = type;
  selected = -1;
  syncUI();
  canvas.focus({ preventScroll: true });
}

function selectPad(i) {
  if (paused || !['build', 'wave'].includes(game.state)) return;
  readyAudio();
  const tower = game.towerAt(i);
  if (dockMode === 'upgrade') {
    selected = i;
    blueprint = null;
    if (tower) {
      if (game.upgrade(i)) { tone(660, .17, .045); events(); }
      else if (tower.level >= 3) notice('Maxed.', 1.6);
      else notice('Need more credits.', 2, true);
    }
    syncUI();
    return;
  }
  if (dockMode === 'sell') {
    if (tower && game.sell(i)) { tone(290, .12); selected = -1; }
    else selected = i;
    blueprint = null;
    syncUI();
    return;
  }
  if (blueprint && !tower) {
    if (game.build(i, blueprint)) {
      selected = i;
      blueprint = null;
      events();
    } else {
      selected = i;
      notice('Need more credits.', 2, true);
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
  return Object.entries(counts).map(([t, n]) => `${n}× ${ENEMIES[t]?.name || t}`).join(' · ');
}

function syncUI() {
  if (screen !== 'battle') return;
  $('money').textContent = fmt(game.money);
  $('lives').textContent = game.lives;
  $('lives-wrap').classList.toggle('low-health', game.lives < Math.ceil(game.maxLives * .4));
  $('wave').textContent = `${game.wave}/${game.level.waves}`;
  $('wave-fill').style.width = `${Math.min(1, game.wave / game.level.waves) * 100}%`;
  const chip = paused ? 'PAUSE' : dockMode === 'upgrade' ? 'UPGRADING' : dockMode === 'sell' ? 'SELLING' : 'BUILDING';
  $('mode-chip').textContent = chip;
  $('send-wave').disabled = game.state !== 'build' || paused;
  $('send-wave').textContent = game.state === 'wave' ? 'WAVE LIVE' : game.state === 'won' ? 'HELD' : 'START WAVE';
  if (game.state === 'wave') $('next-enemies').textContent = `${game.enemies.length + game.queue.length} hulls`;
  else if (game.state === 'build') $('next-enemies').textContent = waveText(wavePlan(game.index, game.wave + 1, qa));
  else $('next-enemies').textContent = '—';

  document.querySelectorAll('[data-tower]').forEach(b => {
    const type = b.dataset.tower;
    const open = game.allowed(type);
    const cost = game.towerCost(type);
    b.querySelector('.tower-cost').textContent = open ? cost : '—';
    b.classList.toggle('selected', blueprint === type);
    b.classList.toggle('unaffordable', open && game.money < cost);
    b.classList.toggle('locked', !open);
    b.disabled = !open || dockMode !== 'build' || paused;
    b.setAttribute('aria-pressed', String(blueprint === type));
  });
}

function events() {
  for (const e of game.events) {
    if (e.type === 'build') { effects.push({ ...e, age: 0, life: .55 }); tone(430, .1, .035); }
    if (e.type === 'kill') { effects.push({ ...e, age: 0, life: .55 }); if (game.kills % 3 === 0) tone(75, .12, .025, 'triangle', 35); }
    if (e.type === 'blast') { effects.push({ ...e, age: 0, life: .4 }); tone(58, .18, .04, 'triangle', 30); }
    if (e.type === 'beam' || e.type === 'aura') effects.push({ ...e, age: 0, life: e.frost ? .2 : .18 });
    if (e.type === 'leak') { effects.push({ ...e, age: 0, life: .65 }); notice(`Leak −${e.harm}`, 1.5, true); tone(140, .3, .05, 'sawtooth', 75); }
    if (e.type === 'wave') { notice(`Wave ${e.wave} / ${game.level.waves}`, 2); tone(330, .2, .04); }
    if (e.type === 'clear') {
      const extra = e.interest ? ` +${e.interest} interest.` : '';
      notice(`Clear. +${e.bonus} credits.${extra}`, 2.4);
      tone(660, .25, .04);
    }
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
  else if (key.toLowerCase() === 'u') { e.preventDefault(); setDockMode('upgrade'); if (selected >= 0) selectPad(selected); }
  else if (key.toLowerCase() === 'b') { e.preventDefault(); setDockMode('build'); }
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

function offsetPoly(points, amount) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    out.push([points[i][0] + (-dy / len) * amount, points[i][1] + (dx / len) * amount]);
  }
  return out;
}

function drawPath(points, foamSide) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#041318';
  ctx.lineWidth = 42;
  ctx.stroke();
  ctx.strokeStyle = '#0a2a32';
  ctx.lineWidth = 34;
  ctx.stroke();
  const foam = offsetPoly(points, 20 * foamSide);
  ctx.beginPath();
  foam.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = '#b8ffd955';
  ctx.lineWidth = 3;
  ctx.setLineDash([5, 9]);
  ctx.lineDashOffset = reduced ? 0 : -clock * 10;
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawLighthouse(x, y) {
  const low = game.lives < Math.ceil(game.maxLives * .4);
  ctx.save();
  const sweep = reduced ? -2.35 : -2.35 + Math.sin(clock * 0.22) * 0.18;
  ctx.translate(x, y - 28);
  const cone = ctx.createLinearGradient(0, 0, 260, 40);
  cone.addColorStop(0, 'rgba(255,209,146,0.32)');
  cone.addColorStop(1, 'rgba(255,209,146,0)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(sweep - 0.32) * 280, Math.sin(sweep - 0.32) * 280);
  ctx.lineTo(Math.cos(sweep + 0.32) * 280, Math.sin(sweep + 0.32) * 280);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(x - 10, y + 18);
  ctx.lineTo(x - 6, y - 16);
  ctx.lineTo(x + 6, y - 16);
  ctx.lineTo(x + 10, y + 18);
  ctx.closePath();
  ctx.fillStyle = '#c5d6ce';
  ctx.fill();
  ctx.strokeStyle = '#e2eee855';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = '#9bb0a8';
  ctx.fillRect(x - 8, y - 20, 16, 6);
  circle(ctx, x, y - 26, 5, low ? '#ff8094' : '#ffd192');
  ctx.fillStyle = 'rgba(255,209,146,0.35)';
  ctx.beginPath();
  ctx.arc(x, y - 26, 11, 0, Math.PI * 2);
  ctx.fill();
}

function drawFog() {
  if (reduced) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(8, 28, 34, 0.28)');
    g.addColorStop(1, 'rgba(8, 28, 34, 0.08)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  ctx.save();
  ctx.globalAlpha = 0.12;
  for (let i = 0; i < 6; i++) {
    const x = ((clock * 12 + i * 190) % (W + 280)) - 140;
    const y = 40 + i * 88;
    ctx.fillStyle = i % 2 ? '#9bb8b8' : '#6f8c8c';
    ctx.beginPath();
    ctx.ellipse(x, y, 210, 46, -0.18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  const vig = ctx.createRadialGradient(W / 2, H / 2, 180, W / 2, H / 2, 560);
  vig.addColorStop(0, 'rgba(7,30,39,0)');
  vig.addColorStop(1, 'rgba(7,30,39,0.45)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

function drawLand() {
  game.level.pads.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.ellipse(x, y + 6, 34, 22, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0a2229';
    ctx.fill();
    ctx.strokeStyle = '#e2eee812';
    ctx.lineWidth = 1;
    ctx.stroke();
  });
}

function drawShip(e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  circle(ctx, 0, 8, e.size * 1.15, e.ring + '55', e.ring, 1.4);
  ctx.rotate(e.angle);
  const s = e.size;
  const t = e.tier || 1;
  ctx.beginPath();
  if (e.family === 'ironclad' || e.family === 'juggernaut') {
    ctx.moveTo(s * 1.35, 0);
    ctx.lineTo(s * .35, -s * 0.95);
    ctx.lineTo(-s * 1.05, -s * .75);
    ctx.lineTo(-s * 1.05, s * .75);
    ctx.lineTo(s * .35, s * 0.95);
  } else if (e.family === 'swarm') {
    const boats = t >= 3 ? 2 : 3;
    for (let i = 0; i < boats; i++) {
      const ox = (i - (boats - 1) / 2) * s * 0.85;
      const oy = boats === 2 ? 0 : (i === 1 ? 0 : i === 0 ? -s * 0.42 : s * 0.42);
      ctx.beginPath();
      ctx.moveTo(s * 0.85 + ox, oy);
      ctx.lineTo(-s * 0.5 + ox, -s * 0.32 + oy);
      ctx.lineTo(-s * 0.3 + ox, oy);
      ctx.lineTo(-s * 0.5 + ox, s * 0.32 + oy);
      ctx.closePath();
      ctx.fillStyle = e.flash > 0 ? '#fff0df' : e.color;
      ctx.fill();
      ctx.strokeStyle = '#e2eee855';
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
    ctx.restore();
    return;
  } else {
    ctx.moveTo(s * (1.5 + t * 0.12), 0);
    ctx.lineTo(-s, -s * .5);
    ctx.lineTo(-s * .55, 0);
    ctx.lineTo(-s, s * .5);
  }
  ctx.closePath();
  ctx.fillStyle = e.flash > 0 ? '#fff0df' : e.color;
  ctx.fill();
  ctx.strokeStyle = '#e2eee855';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = e.family === 'juggernaut' ? '#ff8094' : '#ffd192';
  const windows = 1 + t;
  for (let i = 0; i < windows; i++) {
    ctx.fillRect(-s * 0.35 + i * (s * 0.35), -s * 0.18, s * 0.22, s * 0.16);
  }
  if (e.family === 'juggernaut') {
    ctx.fillStyle = '#ff8094';
    ctx.fillRect(-s * 0.2, -s * 0.7, s * 0.18, s * 0.5);
    ctx.fillRect(s * 0.15, -s * 0.55, s * 0.16, s * 0.4);
  }
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, viewW, viewH);
  ctx.save();
  ctx.translate(mapX, mapY);
  ctx.scale(mapScale, mapScale);

  ctx.fillStyle = '#071e27';
  ctx.fillRect(-40, -40, W + 80, H + 80);

  drawLand();
  const foam = game.level.foam || 1;
  for (const points of game.level.paths) drawPath(points, foam);

  const [lx, ly] = game.level.lighthouse;
  drawLighthouse(lx, ly);

  const active = selected >= 0 ? selected : hover;
  const t = game.towerAt(active);
  const type = t?.type || (dockMode === 'build' ? blueprint : null);
  if (active >= 0 && type) {
    const [x, y] = game.level.pads[active];
    const s = game.towerStats(t || { type, level: 1 });
    circle(ctx, x, y, s.range, s.color + '10', s.color + '55', 1);
  }

  game.level.pads.forEach(([x, y], i) => {
    const tower = game.towerAt(i);
    const isSelected = i === selected || i === hover;
    circle(ctx, x, y, 24, '#071e27cc', isSelected ? '#b8ffd9' : tower ? '#7eab9266' : '#b8ffd970', isSelected ? 2 : 1.4);
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

  for (const tw of game.towers) {
    turret(ctx, tw.x, tw.y, tw.type, tw.angle, tw.level);
    if (tw.cool > game.towerStats(tw).rate - .07) {
      circle(ctx, tw.x + Math.cos(tw.angle) * 22, tw.y + Math.sin(tw.angle) * 22, 4, TYPES[tw.type].color);
    }
  }

  for (const e of game.enemies) {
    drawShip(e);
    if (e.slow > 0) circle(ctx, e.x, e.y, e.size + 7, null, '#e2eee888', 2);
    if (e.hp < e.maxHp || e.family === 'ironclad' || e.family === 'juggernaut') {
      const w = e.family === 'juggernaut' ? 44 : e.family === 'ironclad' ? 36 : 26;
      ctx.fillStyle = '#071e27';
      ctx.fillRect(e.x - w / 2, e.y - e.size - 12, w, 3);
      ctx.fillStyle = e.slow > 0 ? '#e2eee8' : e.family === 'juggernaut' ? '#ff8094' : e.family === 'ironclad' ? '#ffd192' : '#b8ffd9';
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

  drawFog();
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
