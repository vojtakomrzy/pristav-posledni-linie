import { LEVELS, MAP_IDS, STARTER_TOWERS, canonTower, unique } from './content.mjs';

export const SAVE_KEY = 'pristav-linie-v2';
export const SOUND_KEY = 'pristav-linie-sound';

const OLD_SAVE_KEYS = ['pristav-linie-v1', 'pristav-defense-meta'];

export const DEMO = {
  runs: 2,
  rankCap: 1,
};

export const MAP_UNLOCK_COST = 60;

export const META_UPGRADES = [
  {
    id: 'gold',
    name: 'Starting gold',
    desc: 'Deploy with a heavier purse.',
    icon: 'gold',
    max: 3,
    costs: [25, 55, 95],
    bonus: [50, 110, 180],
    label: n => (n ? `+${[50, 110, 180][n - 1]} credits` : 'No bonus yet'),
  },
  {
    id: 'wall',
    name: 'Dock wall',
    desc: 'The lantern holds more hits.',
    icon: 'wall',
    max: 2,
    costs: [40, 100],
    lives: [5, 12],
    label: n => (n ? `+${[5, 12][n - 1]} lives` : 'No bonus yet'),
  },
  {
    id: 'arsenal',
    name: 'Arsenal tower',
    desc: 'Unlock Mortar on the dock.',
    icon: 'arsenal',
    max: 1,
    costs: [50],
    label: n => (n ? 'Mortar unlocked' : 'Mortar locked'),
  },
  {
    id: 'interest',
    name: 'Harbor interest',
    desc: 'Unused credits pay after each wave.',
    icon: 'interest',
    max: 2,
    costs: [35, 80],
    rate: [0.08, 0.16],
    label: n => (n ? `+${[8, 16][n - 1]}% after waves` : 'No interest yet'),
  },
  {
    id: 'radar',
    name: 'Radar',
    desc: 'Towers see farther through the fog.',
    icon: 'radar',
    max: 1,
    costs: [45],
    range: 18,
    label: n => (n ? '+18 m range' : 'No bonus yet'),
  },
];

const META_IDS = META_UPGRADES.map(u => u.id);

export function metaCost(id, rank) {
  return META_UPGRADES.find(u => u.id === id)?.costs[rank];
}

export function anchorsFor({ won, wave, boss }) {
  const w = Math.max(0, Math.round(Number(wave) || 0));
  let gain = w * 2;
  if (won) gain += 15;
  if (boss) gain += 10;
  return Math.min(100, Math.max(0, gain));
}

export function blankSave() {
  return {
    version: 2,
    anchors: 0,
    upgrades: { gold: 0, wall: 0, arsenal: 0, interest: 0, radar: 0 },
    unlockedMaps: ['a'],
    unlockedTowers: [...STARTER_TOWERS],
    cleared: [],
    runs: 0,
    last: null,
  };
}

function clampRank(id, n) {
  const max = META_UPGRADES.find(u => u.id === id)?.max || 0;
  return Math.max(0, Math.min(max, Math.round(Number(n) || 0)));
}

function ranksFrom(src) {
  const u = src?.upgrades && typeof src.upgrades === 'object' ? src.upgrades : {};
  return {
    gold: clampRank('gold', u.gold ?? u.chest ?? u.money),
    wall: clampRank('wall', u.wall ?? u.lights ?? u.lives),
    arsenal: clampRank('arsenal', u.arsenal ?? (u.yard || u.discount ? 1 : 0)),
    interest: clampRank('interest', u.interest),
    radar: clampRank('radar', u.radar),
  };
}

function bankFrom(src) {
  const n = src.anchors ?? src.remnants;
  return Math.max(0, Math.round(Number(n) || 0));
}

function mapsFrom(src) {
  const listed = Array.isArray(src.unlockedMaps) ? src.unlockedMaps : ['a'];
  return unique(['a', ...listed.filter(id => MAP_IDS.includes(id))]);
}

function towersFrom(src, arsenalRank) {
  const listed = Array.isArray(src.unlockedTowers) ? src.unlockedTowers : STARTER_TOWERS;
  const mapped = listed.map(id => (id === 'frost' ? 'cryo' : id)).map(canonTower).filter(Boolean);
  const next = unique([...STARTER_TOWERS, ...mapped]);
  if (arsenalRank) next.push('mortar');
  return unique(next);
}

export function parseSave(raw) {
  const next = blankSave();
  if (!raw || typeof raw !== 'object') return next;
  next.anchors = bankFrom(raw);
  const ranks = ranksFrom(raw);
  for (const id of META_IDS) next.upgrades[id] = Math.min(DEMO.rankCap, ranks[id]);
  next.runs = Math.max(0, Math.round(Number(raw.runs) || 0));
  next.unlockedMaps = mapsFrom(raw);
  next.unlockedTowers = towersFrom(raw, next.upgrades.arsenal);
  next.cleared = Array.isArray(raw.cleared)
    ? raw.cleared.filter(id => MAP_IDS.includes(id))
    : [];
  if (raw.last && typeof raw.last === 'object') {
    next.last = {
      won: !!raw.last.won,
      gain: Math.max(0, Math.round(Number(raw.last.gain) || 0)),
      wave: Math.max(0, Math.round(Number(raw.last.wave) || 0)),
      boss: !!raw.last.boss,
      mapId: MAP_IDS.includes(raw.last.mapId) ? raw.last.mapId : null,
    };
  }
  return next;
}

function readJson(storage, key) {
  try { return JSON.parse(storage.getItem(key) || 'null'); }
  catch { return null; }
}

export function persistSave(storage, save) {
  storage.setItem(SAVE_KEY, JSON.stringify(parseSave(save)));
}

export function loadSave(storage) {
  const current = readJson(storage, SAVE_KEY);
  let legacy = null;
  if (!current || typeof current !== 'object') {
    for (const key of OLD_SAVE_KEYS) {
      const raw = readJson(storage, key);
      if (raw && typeof raw === 'object') { legacy = raw; break; }
    }
  }
  const save = parseSave(current || legacy);
  persistSave(storage, save);
  if (legacy) {
    for (const key of OLD_SAVE_KEYS) {
      try { storage.removeItem(key); } catch {}
    }
  }
  return save;
}

export function modsFromSave(save) {
  const gold = META_UPGRADES.find(u => u.id === 'gold');
  const wall = META_UPGRADES.find(u => u.id === 'wall');
  const interest = META_UPGRADES.find(u => u.id === 'interest');
  const g = save.upgrades.gold;
  const w = save.upgrades.wall;
  const i = save.upgrades.interest;
  return {
    money: g ? gold.bonus[g - 1] : 0,
    lives: w ? wall.lives[w - 1] : 0,
    interest: i ? interest.rate[i - 1] : 0,
    range: save.upgrades.radar ? 18 : 0,
    towers: save.unlockedTowers,
  };
}

export function demoRankLocked(rank) {
  return rank >= DEMO.rankCap;
}

export function demoCta(runs) {
  return runs >= DEMO.runs;
}

export function mapUnlocked(save, id) {
  if (id === 'a') return true;
  if (save.unlockedMaps.includes(id)) return true;
  if (id === 'b' && save.cleared.includes('a')) return true;
  if (id === 'c' && save.cleared.includes('b')) return true;
  return false;
}

export function buyMap(save, id) {
  if (!MAP_IDS.includes(id) || id === 'a' || mapUnlocked(save, id)) return false;
  if (save.anchors < MAP_UNLOCK_COST) return false;
  save.anchors -= MAP_UNLOCK_COST;
  if (!save.unlockedMaps.includes(id)) save.unlockedMaps.push(id);
  return true;
}

export function buyMeta(save, id) {
  const spec = META_UPGRADES.find(u => u.id === id);
  if (!spec) return false;
  const rank = save.upgrades[id];
  if (rank >= spec.max || demoRankLocked(rank)) return false;
  const cost = spec.costs[rank];
  if (cost == null || save.anchors < cost) return false;
  save.anchors -= cost;
  save.upgrades[id] += 1;
  if (id === 'arsenal' && !save.unlockedTowers.includes('mortar')) {
    save.unlockedTowers.push('mortar');
  }
  return true;
}

export function applyRunPayout(save, result) {
  const gain = anchorsFor(result);
  save.anchors += gain;
  save.runs += 1;
  if (result.won && MAP_IDS.includes(result.mapId) && !save.cleared.includes(result.mapId)) {
    save.cleared.push(result.mapId);
  }
  save.last = {
    won: !!result.won,
    gain,
    wave: Math.max(0, Math.round(Number(result.wave) || 0)),
    boss: !!result.boss,
    mapId: MAP_IDS.includes(result.mapId) ? result.mapId : null,
  };
  return gain;
}

export function levelIndex(id) {
  const i = LEVELS.findIndex(l => l.id === id);
  return i >= 0 ? i : 0;
}
