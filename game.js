import {
  Defense, LEVELS, TYPES, W, H, wavePlan, nextWaveLabel,
  SAVE_KEY, SOUND_KEY, META_UPGRADES, MAP_UNLOCK_COST,
  loadSave, persistSave, modsFromSave, buyMeta, buyMap, applyRunPayout,
  demoRankLocked, demoCta, mapUnlocked, metaCost,
} from './engine.mjs';
import { renderBoard, loadAssets } from './draw.mjs';

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
    removeItem: k => { map.delete(k); },
  };
};

let save;
try { save = loadSave(storage); }
catch { save = loadSave(memoryStore()); }

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

function hideScreens() {
  $('hq').classList.add('hidden');
  $('battle').classList.add('hidden');
  $('result').classList.add('hidden');
}

function setNote(id, text) {
  if (!text) {
    $(id).classList.add('hidden');
    $(id).textContent = '';
    return;
  }
  $(id).classList.remove('hidden');
  $(id).textContent = text;
}

function drawHq() {
  $('hq-anchors').textContent = fmt(save.anchors);
  $('demo-cta').classList.toggle('hidden', !demoCta(save.runs));
  setNote('last-run', save.last ? `${save.last.won ? 'Held' : 'Broken'} · +${save.last.gain} anchors` : '');
  setNote('hq-note', '');

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
    const lockNote = open ? `${waves} waves · ${level.tip}` : `Locked · ${MAP_UNLOCK_COST} anchors or clear`;
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
        setNote('hq-note', `Need ${MAP_UNLOCK_COST} anchors, or clear the previous map.`);
        return;
      }
      persist();
      mapIndex = LEVELS.findIndex(l => l.id === b.dataset.unlock);
      drawHq();
      tone(520, .12, .035);
    };
  });
  if (!mapUnlocked(save, LEVELS[mapIndex]?.id)) mapIndex = 0;
  $('start-run').disabled = !mapUnlocked(save, LEVELS[mapIndex].id);
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
    ['New patrol', () => startRun(game.index), true],
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
    <li><b>Die or hold.</b> Spend anchors, start another patrol.</li>
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
      <img src="./assets/hud/dock_${type}.png" width="48" height="48" alt="">
      <strong>${t.name}</strong>
      <span class="tower-cost"></span>
      <span class="tower-key">${i + 1}</span>
    </button>`).join('');
  document.querySelectorAll('[data-tower]').forEach(b => {
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

function syncUI() {
  if (screen !== 'battle') return;
  $('credits').textContent = fmt(game.money);
  $('lives').textContent = game.lives;
  $('lives-wrap').classList.toggle('low-health', game.lives < Math.ceil(game.maxLives * .4));
  $('wave').textContent = `${game.wave}/${game.level.waves}`;
  $('wave-fill').style.width = `${Math.min(1, game.wave / game.level.waves) * 100}%`;
  const chip = paused ? 'PAUSE' : dockMode === 'upgrade' ? 'UPGRADING' : dockMode === 'sell' ? 'SELLING' : 'BUILDING';
  $('mode-chip').textContent = chip;
  $('send-wave').disabled = game.state !== 'build' || paused;
  $('send-wave').textContent = 'START WAVE';
  $('next-enemies').textContent = nextWaveLabel({
    radar: game.mods.radar,
    state: game.state,
    plan: wavePlan(game.wave + 1, qa),
    hulls: game.enemies.length + game.queue.length,
  });

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
    if (e.type === 'beam') effects.push({ ...e, age: 0, life: e.slow ? .2 : .18 });
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
    renderBoard(ctx, game, { viewW, viewH, mapX, mapY, mapScale, clock, reduced }, {
      selected, hover, blueprint, dockMode, effects,
    });
  }
  requestAnimationFrame(frame);
}

makeTowerCards();
drawHq();
loadAssets().then(() => {
  makeTowerCards();
  if (screen === 'battle') syncUI();
});
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
