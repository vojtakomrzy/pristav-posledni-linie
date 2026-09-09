export const W = 960;
export const H = 600;

export const PALETTE = {
  bg: '#071e27',
  mint: '#b8ffd9',
  amber: '#ffd192',
  text: '#e2eee8',
  danger: '#ff8094',
};

export const SAVE_KEY = 'pristav-linie-v2';
export const SAVE_KEY_LEGACY = 'pristav-linie-v1';
export const SOUND_KEY = 'pristav-linie-sound';
export const LEGACY_META_KEY = 'pristav-defense-meta';

export const DEMO = {
  runs: 2,
  rankCap: 1,
};

export const MAP_UNLOCK_COST = 60;

export const TYPES = {
  cannon: {
    name: 'Cannon',
    role: 'Single',
    tag: 'Single target',
    cost: 80,
    color: '#ffd192',
    desc: 'Steady shot. Cheap first line.',
    damage: 24,
    range: 145,
    rate: 0.52,
  },
  tesla: {
    name: 'Tesla',
    role: 'Support',
    tag: 'Chain arc',
    cost: 140,
    color: '#7fd4ff',
    desc: 'Arc jumps up to 3 hulls. Ignores armor.',
    damage: 16,
    range: 125,
    rate: 0.85,
  },
  frost: {
    name: 'Cryo',
    role: 'Slow',
    tag: 'Slow field',
    cost: 105,
    color: '#8ecbff',
    desc: 'Cuts speed by 45% for 2s. Place before damage.',
    damage: 8,
    range: 135,
    rate: 0.88,
  },
  mortar: {
    name: 'Mortar',
    role: 'AOE',
    tag: 'Area blast',
    cost: 155,
    color: '#c4a574',
    desc: 'Shell hits every hull in the blast.',
    damage: 30,
    range: 170,
    rate: 1.5,
  },
};

const sx = (x, y) => [Math.round(x * 1.6), Math.round(y * 1.6)];

export const ENEMIES = {
  scout1: { name: 'Scout', family: 'scout', tier: 1, role: 'Fast', hp: 34, speed: 102, size: 11, color: '#7a8f8a', bounty: 11, harm: 1, armor: 0, ring: '#b8ffd9' },
  scout2: { name: 'Scout L2', family: 'scout', tier: 2, role: 'Fast', hp: 52, speed: 108, size: 14, color: '#6d8280', bounty: 15, harm: 1, armor: 0, ring: '#b8ffd9' },
  scout3: { name: 'Scout L3', family: 'scout', tier: 3, role: 'Fast', hp: 78, speed: 114, size: 17, color: '#5f7474', bounty: 20, harm: 1, armor: 0, ring: '#b8ffd9' },
  swarm1: { name: 'Swarm', family: 'swarm', tier: 1, role: 'Swarm', hp: 28, speed: 68, size: 9, color: '#6f8680', bounty: 8, harm: 1, armor: 0, ring: '#b8ffd9' },
  swarm2: { name: 'Swarm L2', family: 'swarm', tier: 2, role: 'Swarm', hp: 42, speed: 72, size: 12, color: '#647a76', bounty: 11, harm: 1, armor: 0, ring: '#b8ffd9' },
  swarm3: { name: 'Swarm L3', family: 'swarm', tier: 3, role: 'Swarm', hp: 62, speed: 66, size: 15, color: '#586e6c', bounty: 15, harm: 1, armor: 0, ring: '#b8ffd9' },
  ironclad1: { name: 'Ironclad', family: 'ironclad', tier: 1, role: 'Tank', hp: 150, speed: 36, size: 16, color: '#5c6570', bounty: 24, harm: 2, armor: 1, ring: '#ffd192' },
  ironclad2: { name: 'Ironclad L2', family: 'ironclad', tier: 2, role: 'Tank', hp: 220, speed: 34, size: 20, color: '#535c66', bounty: 32, harm: 2, armor: 1, ring: '#ffd192' },
  ironclad3: { name: 'Ironclad L3', family: 'ironclad', tier: 3, role: 'Tank', hp: 320, speed: 32, size: 24, color: '#4a535c', bounty: 42, harm: 3, armor: 1, ring: '#ffd192' },
  juggernaut: { name: 'Juggernaut', family: 'juggernaut', tier: 3, role: 'Boss', hp: 980, speed: 26, size: 34, color: '#3d3344', bounty: 90, harm: 5, armor: 1, ring: '#ff8094' },
};

export function parseEnemy(kind) {
  return ENEMIES[kind] || ENEMIES.swarm1;
}

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

export function metaCost(id, rank) {
  const spec = META_UPGRADES.find(u => u.id === id);
  return spec?.costs[rank];
}

const repeat = (type, n) => Array(n).fill(type);

const PATROL_WAVES = [
  repeat('swarm1', 10),
  [...repeat('swarm1', 8), ...repeat('scout1', 5)],
  [...repeat('swarm1', 10), ...repeat('scout1', 6)],
  [...repeat('swarm2', 8), ...repeat('ironclad1', 3)],
  [...repeat('scout2', 8), ...repeat('swarm2', 8)],
  [...repeat('ironclad2', 4), ...repeat('swarm2', 8), ...repeat('scout2', 5)],
  [...repeat('swarm3', 10), ...repeat('scout3', 6), ...repeat('ironclad2', 3)],
  [...repeat('ironclad3', 4), ...repeat('scout3', 8), ...repeat('swarm3', 6), 'juggernaut'],
];

export const LEVELS = [
  {
    id: 'a',
    name: 'S-Curve',
    area: 'MAP A · DEMO',
    tip: 'One lane. Hold the bends.',
    waves: PATROL_WAVES.length,
    money: 360,
    foam: 1,
    lighthouse: [930, 168],
    paths: [[
      [-48, 188], [90, 198], [200, 220], [340, 275], [500, 328],
      [640, 292], [760, 218], [880, 172], [1010, 158],
    ]],
    pads: [
      sx(100, 130), sx(180, 145), sx(260, 175),
      sx(340, 195), sx(420, 175), sx(500, 130),
      [224, 268], [736, 236],
    ],
  },
  {
    id: 'b',
    name: 'Merge Y',
    area: 'MAP B · MERGE',
    tip: 'Two inlets. Cover the choke.',
    waves: PATROL_WAVES.length,
    money: 380,
    foam: 1,
    lighthouse: [930, 176],
    paths: [
      [[-48, 128], [150, 136], [290, 210], [448, 248], [608, 248], [770, 200], [1010, 168]],
      [[-48, 358], [150, 344], [290, 268], [448, 248], [608, 248], [770, 200], [1010, 168]],
    ],
    pads: [
      sx(90, 85), sx(90, 215), sx(180, 140),
      sx(280, 155), sx(380, 155), sx(480, 130),
      [224, 168], [224, 312], [368, 200], [368, 280], [688, 180],
    ],
  },
  {
    id: 'c',
    name: 'Horseshoe',
    area: 'MAP C · HORSESHOE',
    tip: 'Arms watch the channel. Island holds the line.',
    waves: PATROL_WAVES.length,
    money: 400,
    foam: 1,
    lighthouse: [480, 72],
    paths: [[
      [480, 650], [480, 540], [480, 430], [480, 320], [480, 200], [480, 40],
    ]],
    pads: [
      [168, 236], [148, 392],
      [792, 236], [812, 392],
      [408, 318], [552, 318], [408, 448], [552, 448],
      [480, 148],
      [268, 318], [692, 318], [480, 252], [480, 520],
    ],
  },
];

const SPACING = { swarm: 0.22, scout: 0.34, ironclad: 0.7, juggernaut: 1.7 };

export function wavePlan(index, wave, qa = false) {
  const plans = qa ? PATROL_WAVES.slice(0, 2) : PATROL_WAVES;
  return plans[wave - 1] || [];
}

export function distance(a, b) {
  const ax = Array.isArray(a) ? a[0] : a.x;
  const ay = Array.isArray(a) ? a[1] : a.y;
  const bx = Array.isArray(b) ? b[0] : b.x;
  const by = Array.isArray(b) ? b[1] : b.y;
  return Math.hypot(bx - ax, by - ay);
}

export function pathData(points) {
  const lengths = [0];
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += distance(points[i - 1], points[i]);
    lengths.push(length);
  }
  return { points, lengths, length };
}

export function onPath(path, dist) {
  const d = Math.max(0, Math.min(path.length, dist));
  const pts = path.points;
  const lengths = path.lengths;
  let i = 1;
  while (i < lengths.length && lengths[i] < d) i++;
  const a = pts[i - 1];
  const b = pts[Math.min(i, pts.length - 1)];
  const span = Math.max(0.0001, lengths[i] - lengths[i - 1]);
  const t = (d - lengths[i - 1]) / span;
  const x = a[0] + (b[0] - a[0]) * t;
  const y = a[1] + (b[1] - a[1]) * t;
  return { x, y, angle: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}

export function stats(tower, mods = {}) {
  const base = TYPES[tower.type];
  const level = tower.level || 1;
  return {
    name: base.name,
    role: base.role,
    desc: base.desc,
    color: base.color,
    damage: +(base.damage * (1 + (level - 1) * 0.38)).toFixed(1),
    range: Math.round(base.range + (level - 1) * 18 + (mods.range || 0)),
    rate: +(base.rate * (1 - (level - 1) * 0.08)).toFixed(2),
  };
}

export function upgradeCost(tower) {
  return Math.round(TYPES[tower.type].cost * (0.65 + tower.level * 0.5));
}

export function normalizeMods(mods = {}) {
  const towers = Array.isArray(mods.towers)
    ? mods.towers.filter(t => TYPES[t])
    : Object.keys(TYPES);
  return {
    money: Math.max(0, Math.round(Number(mods.money) || 0)),
    lives: Math.max(0, Math.round(Number(mods.lives) || 0)),
    interest: Math.min(0.25, Math.max(0, Number(mods.interest) || 0)),
    range: Math.max(0, Math.round(Number(mods.range) || 0)),
    towers,
    qa: !!mods.qa,
  };
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
    unlockedTowers: ['cannon', 'tesla', 'frost'],
    cleared: [],
    runs: 0,
    last: null,
  };
}

function clampRank(id, n) {
  const max = META_UPGRADES.find(u => u.id === id)?.max || 0;
  return Math.max(0, Math.min(max, Math.round(Number(n) || 0)));
}

function migrateUpgrades(src) {
  const u = src?.upgrades && typeof src.upgrades === 'object' ? src.upgrades : {};
  return {
    gold: clampRank('gold', u.gold ?? u.chest ?? u.money),
    wall: clampRank('wall', u.wall ?? u.lights ?? u.lives),
    arsenal: clampRank('arsenal', u.arsenal ?? ((u.yard || u.discount) ? 1 : 0)),
    interest: clampRank('interest', u.interest),
    radar: clampRank('radar', u.radar),
  };
}

export function parseSave(raw, legacy = null) {
  const next = blankSave();
  const src = raw && typeof raw === 'object' ? raw : (legacy && typeof legacy === 'object' ? legacy : null);
  if (!src) return next;
  const bank = src.anchors ?? src.remnants;
  next.anchors = Math.max(0, Math.round(Number(bank) || 0));
  const upgrades = migrateUpgrades(src);
  for (const id of Object.keys(next.upgrades)) {
    next.upgrades[id] = Math.min(DEMO.rankCap, upgrades[id]);
  }
  if (next.upgrades.arsenal) {
    if (!next.unlockedTowers.includes('mortar')) next.unlockedTowers.push('mortar');
  }
  next.runs = Math.max(0, Math.round(Number(src.runs) || 0));
  const maps = Array.isArray(src.unlockedMaps) ? src.unlockedMaps : ['a'];
  next.unlockedMaps = ['a', ...maps.filter(id => id === 'b' || id === 'c')]
    .filter((id, i, arr) => arr.indexOf(id) === i);
  const towers = Array.isArray(src.unlockedTowers) ? src.unlockedTowers : next.unlockedTowers;
  next.unlockedTowers = ['cannon', 'tesla', 'frost', ...towers.filter(t => t === 'mortar')]
    .filter((id, i, arr) => arr.indexOf(id) === i);
  if (next.upgrades.arsenal && !next.unlockedTowers.includes('mortar')) next.unlockedTowers.push('mortar');
  next.cleared = Array.isArray(src.cleared)
    ? src.cleared.filter(id => ['a', 'b', 'c'].includes(id))
    : [];
  if (src.last && typeof src.last === 'object') {
    next.last = {
      won: !!src.last.won,
      gain: Math.max(0, Math.round(Number(src.last.gain) || 0)),
      kills: Math.max(0, Math.round(Number(src.last.kills) || 0)),
      wave: Math.max(0, Math.round(Number(src.last.wave) || 0)),
      lives: Math.max(0, Math.round(Number(src.last.lives) || 0)),
      boss: !!src.last.boss,
      mapId: ['a', 'b', 'c'].includes(src.last.mapId) ? src.last.mapId : null,
    };
  }
  return next;
}

export function loadSave(storage) {
  let raw = null;
  let legacy = null;
  try { raw = JSON.parse(storage.getItem(SAVE_KEY) || 'null'); } catch {}
  if (!raw) {
    try { raw = JSON.parse(storage.getItem(SAVE_KEY_LEGACY) || 'null'); } catch {}
  }
  try { legacy = JSON.parse(storage.getItem(LEGACY_META_KEY) || 'null'); } catch {}
  return parseSave(raw, legacy);
}

export function persistSave(storage, save) {
  storage.setItem(SAVE_KEY, JSON.stringify(save));
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
  if (id === 'a' || !['b', 'c'].includes(id) || mapUnlocked(save, id)) return false;
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
  if (result.won && result.mapId && ['a', 'b', 'c'].includes(result.mapId)) {
    if (!save.cleared.includes(result.mapId)) save.cleared.push(result.mapId);
  }
  save.last = { ...result, gain };
  return gain;
}

export class Defense {
  constructor(index = 0, mods = {}) {
    const level = LEVELS[index] || LEVELS[0];
    this.index = LEVELS[index] ? index : 0;
    this.mods = normalizeMods(mods);
    this.level = {
      ...level,
      waves: this.mods.qa ? 2 : level.waves,
      money: level.money + (this.mods.qa ? 120 : 0),
    };
    this.paths = this.level.paths.map(pathData);
    this.state = 'build';
    this.money = this.level.money + this.mods.money;
    this.maxLives = 18 + this.mods.lives;
    this.lives = this.maxLives;
    this.wave = 0;
    this.kills = 0;
    this.bossDown = false;
    this.towers = [];
    this.enemies = [];
    this.queue = [];
    this.projectiles = [];
    this.events = [];
    this.spawnWait = 0;
    this.id = 1;
  }

  allowed(type) {
    return this.mods.towers.includes(type);
  }

  towerStats(tower) {
    return stats(tower, this.mods);
  }

  price(base) {
    return Math.round(base);
  }

  towerCost(type) {
    return this.price(TYPES[type].cost);
  }

  upgradePrice(tower) {
    return this.price(upgradeCost(tower));
  }

  towerAt(pad) {
    return this.towers.find(t => t.pad === pad);
  }

  build(pad, type) {
    if (!['build', 'wave'].includes(this.state) || this.towerAt(pad) || !TYPES[type]) return false;
    if (!this.allowed(type)) return false;
    const cost = this.towerCost(type);
    if (this.money < cost) return false;
    const [x, y] = this.level.pads[pad];
    this.money -= cost;
    this.towers.push({
      pad, x, y, type, level: 1, angle: -Math.PI / 2, cool: 0, invested: cost,
    });
    this.events.push({ type: 'build', x, y, color: TYPES[type].color });
    return true;
  }

  upgrade(pad) {
    const tower = this.towerAt(pad);
    if (!tower || tower.level >= 3) return false;
    const cost = this.upgradePrice(tower);
    if (this.money < cost) return false;
    this.money -= cost;
    tower.level += 1;
    tower.invested += cost;
    this.events.push({ type: 'build', x: tower.x, y: tower.y, color: TYPES[tower.type].color });
    return true;
  }

  sell(pad) {
    const tower = this.towerAt(pad);
    if (!tower) return false;
    this.money += Math.floor(tower.invested * 0.7);
    this.towers = this.towers.filter(t => t !== tower);
    return true;
  }

  startWave() {
    if (this.state !== 'build' || this.wave >= this.level.waves) return false;
    this.wave += 1;
    this.state = 'wave';
    const plan = wavePlan(this.index, this.wave, this.mods.qa);
    let wait = 0.45;
    this.queue = plan.map(kind => {
      const spec = parseEnemy(kind);
      wait += SPACING[spec.family] || 0.4;
      return { kind, wait };
    });
    this.spawnWait = 0;
    this.events.push({ type: 'wave', wave: this.wave });
    return true;
  }

  spawnEnemy(kind) {
    const spec = parseEnemy(kind);
    const pathIndex = this.paths.length > 1 ? (this.id % this.paths.length) : 0;
    const path = this.paths[pathIndex];
    const start = onPath(path, 0);
    const hp = spec.hp * (1 + (this.wave - 1) * 0.06);
    this.enemies.push({
      id: this.id++,
      type: kind,
      family: spec.family,
      tier: spec.tier,
      pathIndex,
      dist: 0,
      x: start.x,
      y: start.y,
      angle: start.angle,
      hp,
      maxHp: hp,
      speed: spec.speed,
      size: spec.size,
      color: spec.color,
      ring: spec.ring,
      bounty: spec.bounty,
      harm: spec.harm,
      armor: spec.armor,
      slow: 0,
      flash: 0,
    });
  }

  hurt(enemy, amount, source) {
    let dmg = amount;
    if (enemy.armor && source !== 'tesla' && source !== 'frost') dmg *= 0.5;
    enemy.hp -= dmg;
    enemy.flash = 0.1;
    if (enemy.hp <= 0) this.sink(enemy);
  }

  sink(enemy) {
    if (!this.enemies.includes(enemy)) return;
    this.enemies = this.enemies.filter(e => e !== enemy);
    this.kills += 1;
    this.money += enemy.bounty;
    if (enemy.family === 'juggernaut') this.bossDown = true;
    this.events.push({ type: 'kill', x: enemy.x, y: enemy.y, bounty: enemy.bounty, color: enemy.color });
  }

  target(tower, extra = 0) {
    const s = this.towerStats(tower);
    let best = null;
    let bestDist = 0;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - tower.x, e.y - tower.y);
      if (d <= s.range + extra && e.dist > bestDist) {
        best = e;
        bestDist = e.dist;
      }
    }
    return best;
  }

  fire(tower, dt) {
    tower.cool -= dt;
    const s = this.towerStats(tower);
    const foe = this.target(tower);
    if (foe) tower.angle = Math.atan2(foe.y - tower.y, foe.x - tower.x);
    if (tower.cool > 0 || !foe) return;
    tower.cool = s.rate;
    if (tower.type === 'tesla' || tower.type === 'frost') {
      const chain = [foe];
      if (tower.type === 'tesla') {
        const rest = this.enemies.filter(e => e !== foe)
          .sort((a, b) => Math.hypot(a.x - foe.x, a.y - foe.y) - Math.hypot(b.x - foe.x, b.y - foe.y));
        for (const e of rest) {
          if (chain.length >= 3) break;
          const last = chain[chain.length - 1];
          if (Math.hypot(e.x - last.x, e.y - last.y) < 95) chain.push(e);
        }
      }
      let from = tower;
      for (const e of chain) {
        this.events.push({
          type: 'beam',
          x: from.x ?? tower.x,
          y: from.y ?? tower.y,
          tx: e.x,
          ty: e.y,
          color: s.color,
          frost: tower.type === 'frost',
        });
        this.hurt(e, s.damage, tower.type);
        if (tower.type === 'frost') e.slow = 2;
        from = e;
      }
      return;
    }
    const travel = Math.hypot(foe.x - tower.x, foe.y - tower.y);
    this.projectiles.push({
      type: tower.type,
      ox: tower.x,
      oy: tower.y,
      tx: foe.x,
      ty: foe.y,
      age: 0,
      duration: tower.type === 'mortar' ? 0.52 : Math.max(0.08, travel / 780),
      color: s.color,
      damage: s.damage,
      target: foe,
    });
  }

  finish(won) {
    this.state = won ? 'won' : 'lost';
    this.events.push({
      type: 'end',
      won,
      kills: this.kills,
      wave: this.wave,
      lives: this.lives,
      boss: this.bossDown,
      mapId: this.level.id,
    });
  }

  step(dt) {
    if (this.state !== 'wave') return;

    this.spawnWait += dt;
    while (this.queue.length && this.spawnWait >= this.queue[0].wait) {
      this.spawnEnemy(this.queue.shift().kind);
    }

    const [lx, ly] = this.level.lighthouse;

    for (const e of [...this.enemies]) {
      e.flash = Math.max(0, e.flash - dt);
      e.slow = Math.max(0, e.slow - dt);
      const slowMul = e.slow > 0 ? 0.55 : 1;
      e.dist += e.speed * slowMul * dt;
      const path = this.paths[e.pathIndex];
      if (e.dist >= path.length) {
        this.enemies = this.enemies.filter(x => x !== e);
        this.lives = Math.max(0, this.lives - e.harm);
        this.events.push({ type: 'leak', x: lx, y: ly, harm: e.harm });
        continue;
      }
      const p = onPath(path, e.dist);
      e.x = p.x;
      e.y = p.y;
      e.angle = p.angle;
    }

    for (const tower of this.towers) this.fire(tower, dt);

    for (const p of [...this.projectiles]) {
      p.age += dt;
      if (p.age < p.duration) continue;
      this.projectiles = this.projectiles.filter(x => x !== p);
      if (p.type === 'mortar') {
        this.events.push({ type: 'blast', x: p.tx, y: p.ty, color: p.color });
        for (const e of [...this.enemies]) {
          if (Math.hypot(e.x - p.tx, e.y - p.ty) <= 65) this.hurt(e, p.damage, 'mortar');
        }
      } else if (this.enemies.includes(p.target)) {
        this.hurt(p.target, p.damage, p.type);
      } else {
        const near = this.enemies
          .map(e => ({ e, d: Math.hypot(e.x - p.tx, e.y - p.ty) }))
          .sort((a, b) => a.d - b.d)[0];
        if (near && near.d < 28) this.hurt(near.e, p.damage, p.type);
      }
    }

    if (this.lives <= 0) {
      this.finish(false);
      return;
    }

    if (!this.queue.length && !this.enemies.length) {
      const bonus = 18 + this.wave * 8;
      this.money += bonus;
      if (this.mods.interest > 0) {
        const paid = Math.floor(this.money * this.mods.interest);
        this.money += paid;
        this.events.push({ type: 'clear', bonus, interest: paid });
      } else {
        this.events.push({ type: 'clear', bonus });
      }
      if (this.wave >= this.level.waves) this.finish(true);
      else this.state = 'build';
    }
  }
}
