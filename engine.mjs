export const W = 960;
export const H = 600;

export const PALETTE = {
  bg: '#071e27',
  mint: '#b8ffd9',
  amber: '#ffd192',
  text: '#e2eee8',
  danger: '#ff8094',
};

export const SAVE_KEY = 'pristav-linie-v1';
export const SOUND_KEY = 'pristav-linie-sound';
export const LEGACY_META_KEY = 'pristav-defense-meta';

export const DEMO = {
  runs: 2,
  rankCap: 1,
};

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

export const ENEMIES = {
  swarm: { name: 'Skiff', role: 'Swarm', hp: 42, speed: 62, size: 11, color: '#8fb9a8', bounty: 9, harm: 1, armor: 0 },
  fast: { name: 'Runner', role: 'Fast', hp: 34, speed: 108, size: 11, color: '#c5e0a8', bounty: 12, harm: 1, armor: 0 },
  tank: { name: 'Ironclad', role: 'Tank', hp: 168, speed: 36, size: 19, color: '#8a97a6', bounty: 26, harm: 2, armor: 1 },
};

export const META_UPGRADES = [
  {
    id: 'chest',
    name: 'Starting credits',
    desc: 'More gold at deploy.',
    icon: 'coins',
    max: 5,
    label: n => (n ? `+${n * 45} gold` : 'No bonus yet'),
  },
  {
    id: 'lights',
    name: 'Stronger lighthouse',
    desc: 'The lantern holds longer.',
    icon: 'lighthouse',
    max: 5,
    label: n => (n ? `+${n * 2} lives` : 'No bonus yet'),
  },
  {
    id: 'yard',
    name: 'Arsenal discount',
    desc: 'Towers and upgrades cost less gold.',
    icon: 'discount',
    max: 5,
    label: n => (n ? `−${n * 7}% gold cost` : 'No bonus yet'),
  },
];

export const META_COST = [10, 18, 28, 40, 55];

const repeat = (type, n) => Array(n).fill(type);

const PATROL_WAVES = [
  repeat('swarm', 10),
  [...repeat('swarm', 8), ...repeat('fast', 5)],
  [...repeat('swarm', 10), ...repeat('fast', 6)],
  [...repeat('swarm', 8), ...repeat('tank', 3)],
  [...repeat('fast', 10), ...repeat('swarm', 6)],
  [...repeat('tank', 4), ...repeat('swarm', 8), ...repeat('fast', 5)],
  [...repeat('swarm', 12), ...repeat('fast', 8), ...repeat('tank', 4)],
  [...repeat('tank', 6), ...repeat('fast', 10), ...repeat('swarm', 10)],
];

export const LEVELS = [
  {
    id: 'inner',
    name: 'Inner Harbor',
    area: 'NIGHT PATROL',
    tip: 'Hold the bend. Cryo first, Cannon second.',
    waves: PATROL_WAVES.length,
    money: 360,
    paths: [[[-40, 300], [140, 300], [260, 180], [430, 180], [540, 320], [700, 320], [800, 300], [960, 300]]],
    pads: [[210, 248], [360, 248], [500, 250], [620, 250], [730, 240], [250, 368], [470, 392], [640, 392]],
  },
  {
    id: 'twin',
    name: 'Twin Channel',
    area: 'NIGHT PATROL',
    tip: 'Two routes. Cover both banks or the lantern dies.',
    waves: PATROL_WAVES.length,
    money: 380,
    paths: [
      [[-40, 140], [200, 140], [380, 140], [560, 200], [740, 240], [960, 300]],
      [[-40, 460], [200, 460], [380, 460], [560, 400], [740, 360], [960, 300]],
    ],
    pads: [[160, 212], [340, 212], [500, 268], [680, 196], [160, 388], [340, 388], [500, 332], [680, 404], [430, 300]],
  },
];

const SPACING = { swarm: 0.28, fast: 0.34, tank: 0.72 };

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

export function stats(tower) {
  const base = TYPES[tower.type];
  const level = tower.level || 1;
  return {
    name: base.name,
    role: base.role,
    desc: base.desc,
    color: base.color,
    damage: +(base.damage * (1 + (level - 1) * 0.38)).toFixed(1),
    range: Math.round(base.range + (level - 1) * 18),
    rate: +(base.rate * (1 - (level - 1) * 0.08)).toFixed(2),
  };
}

export function upgradeCost(tower) {
  return Math.round(TYPES[tower.type].cost * (0.65 + tower.level * 0.5));
}

export function normalizeMods(mods = {}) {
  return {
    money: Math.max(0, Math.round(Number(mods.money) || 0)),
    lives: Math.max(0, Math.round(Number(mods.lives) || 0)),
    discount: Math.min(0.4, Math.max(0, Number(mods.discount) || 0)),
    qa: !!mods.qa,
  };
}

export function remnantsFor({ won, wave, kills, lives }) {
  const sunk = Math.max(0, Math.round(Number(kills) || 0));
  const w = Math.max(0, Math.round(Number(wave) || 0));
  const hp = Math.max(0, Math.round(Number(lives) || 0));
  if (won) return 20 + Math.floor(hp / 2) + Math.floor(sunk / 8);
  return 10 + Math.max(1, w) * 3 + Math.floor(sunk / 10);
}

export function blankSave() {
  return {
    version: 1,
    remnants: 0,
    upgrades: { chest: 0, lights: 0, yard: 0 },
    runs: 0,
    last: null,
  };
}

function clampRank(id, n) {
  const max = META_UPGRADES.find(u => u.id === id)?.max || 0;
  return Math.max(0, Math.min(max, Math.round(Number(n) || 0)));
}

export function parseSave(raw, legacy = null) {
  const next = blankSave();
  const src = raw && typeof raw === 'object' ? raw : null;
  if (src) {
    next.remnants = Math.max(0, Math.round(Number(src.remnants) || 0));
    for (const id of ['chest', 'lights', 'yard']) {
      const legacyId = id === 'chest' ? 'money' : id === 'lights' ? 'lives' : 'discount';
      next.upgrades[id] = Math.min(DEMO.rankCap, clampRank(id, src.upgrades?.[id] ?? src.upgrades?.[legacyId]));
    }
    next.runs = Math.max(0, Math.round(Number(src.runs) || 0));
    if (src.last && typeof src.last === 'object') {
      next.last = {
        won: !!src.last.won,
        gain: Math.max(0, Math.round(Number(src.last.gain) || 0)),
        kills: Math.max(0, Math.round(Number(src.last.kills) || 0)),
        wave: Math.max(0, Math.round(Number(src.last.wave) || 0)),
        lives: Math.max(0, Math.round(Number(src.last.lives) || 0)),
      };
    }
    return next;
  }
  if (legacy && typeof legacy === 'object') {
    next.remnants = Math.max(0, Math.round(Number(legacy.remnants) || 0));
    next.upgrades.chest = Math.min(DEMO.rankCap, clampRank('chest', legacy.upgrades?.money));
    next.upgrades.lights = Math.min(DEMO.rankCap, clampRank('lights', legacy.upgrades?.lives));
    next.upgrades.yard = Math.min(DEMO.rankCap, clampRank('yard', legacy.upgrades?.discount));
    next.runs = Math.max(0, Math.round(Number(legacy.runs) || 0));
  }
  return next;
}

export function loadSave(storage) {
  let raw = null;
  let legacy = null;
  try { raw = JSON.parse(storage.getItem(SAVE_KEY) || 'null'); } catch {}
  try { legacy = JSON.parse(storage.getItem(LEGACY_META_KEY) || 'null'); } catch {}
  return parseSave(raw, legacy);
}

export function persistSave(storage, save) {
  storage.setItem(SAVE_KEY, JSON.stringify(save));
}

export function modsFromSave(save) {
  return {
    money: save.upgrades.chest * 45,
    lives: save.upgrades.lights * 2,
    discount: save.upgrades.yard * 0.07,
  };
}

export function demoRankLocked(rank) {
  return rank >= DEMO.rankCap;
}

export function demoCta(runs) {
  return runs >= DEMO.runs;
}

export function buyMeta(save, id) {
  const spec = META_UPGRADES.find(u => u.id === id);
  if (!spec) return false;
  const rank = save.upgrades[id];
  if (rank >= spec.max || demoRankLocked(rank)) return false;
  const cost = META_COST[rank];
  if (save.remnants < cost) return false;
  save.remnants -= cost;
  save.upgrades[id] += 1;
  return true;
}

export function applyRunPayout(save, result) {
  const gain = remnantsFor(result);
  save.remnants += gain;
  save.runs += 1;
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
    this.towers = [];
    this.enemies = [];
    this.queue = [];
    this.projectiles = [];
    this.events = [];
    this.spawnWait = 0;
    this.id = 1;
  }

  price(base) {
    return Math.round(base * (1 - this.mods.discount));
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
      wait += SPACING[kind] || 0.4;
      return { kind, wait };
    });
    this.spawnWait = 0;
    this.events.push({ type: 'wave', wave: this.wave });
    return true;
  }

  spawnEnemy(kind) {
    const spec = ENEMIES[kind];
    const pathIndex = this.paths.length > 1 ? (this.id % this.paths.length) : 0;
    const path = this.paths[pathIndex];
    const start = onPath(path, 0);
    const hp = spec.hp * (1 + (this.wave - 1) * 0.06);
    this.enemies.push({
      id: this.id++,
      type: kind,
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
    this.events.push({ type: 'kill', x: enemy.x, y: enemy.y, bounty: enemy.bounty, color: enemy.color });
  }

  target(tower, extra = 0) {
    const s = stats(tower);
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
    const s = stats(tower);
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
    });
  }

  step(dt) {
    if (this.state !== 'wave') return;

    this.spawnWait += dt;
    while (this.queue.length && this.spawnWait >= this.queue[0].wait) {
      this.spawnEnemy(this.queue.shift().kind);
    }

    for (const e of [...this.enemies]) {
      e.flash = Math.max(0, e.flash - dt);
      e.slow = Math.max(0, e.slow - dt);
      const slowMul = e.slow > 0 ? 0.55 : 1;
      e.dist += e.speed * slowMul * dt;
      const path = this.paths[e.pathIndex];
      if (e.dist >= path.length) {
        this.enemies = this.enemies.filter(x => x !== e);
        this.lives = Math.max(0, this.lives - e.harm);
        this.events.push({ type: 'leak', x: 931, y: 300, harm: e.harm });
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
      this.events.push({ type: 'clear', bonus });
      if (this.wave >= this.level.waves) this.finish(true);
      else this.state = 'build';
    }
  }
}
