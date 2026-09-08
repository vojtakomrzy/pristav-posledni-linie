window.Pristav = (function () {
const W = 960;
const H = 600;

const TYPES = {
  cannon: {
    name: 'Kanón',
    tag: 'Spolehlivá palba',
    cost: 85,
    color: '#b8ffd9',
    desc: 'Rychlá přesná střelba na jeden cíl. Levný základ obrany.',
    damage: 22,
    range: 145,
    rate: 0.55,
  },
  tesla: {
    name: 'Tesla',
    tag: 'Řetězový výboj',
    cost: 140,
    color: '#c8b5ff',
    desc: 'Výboj přeskočí až na 3 lodě. Ignoruje pancíř.',
    damage: 16,
    range: 125,
    rate: 0.85,
  },
  frost: {
    name: 'Kryo',
    tag: 'Zpomalení',
    cost: 110,
    color: '#80dfff',
    desc: 'Zpomalí lodě o 45 % na 2 sekundy. Dej ho před silné věže.',
    damage: 8,
    range: 135,
    rate: 0.9,
  },
  mortar: {
    name: 'Minomet',
    tag: 'Plošný zásah',
    cost: 165,
    color: '#ffd192',
    desc: 'Granát zasáhne všechny lodě v okruhu 65 m. Účinný na skupiny.',
    damage: 32,
    range: 175,
    rate: 1.55,
  },
};

const ENEMIES = {
  clun: { name: 'Člun', hp: 48, speed: 58, size: 14, color: '#8fb9a8', bounty: 12, harm: 1, armor: 0 },
  skuter: { name: 'Skútr', hp: 36, speed: 92, size: 12, color: '#c5e0a8', bounty: 14, harm: 1, armor: 0 },
  obrnenec: { name: 'Obrněnec', hp: 150, speed: 40, size: 18, color: '#8a97a6', bounty: 24, harm: 2, armor: 1 },
  boss: { name: 'Dreadnought', hp: 1100, speed: 26, size: 28, color: '#c45a6e', bounty: 90, harm: 5, armor: 1 },
};

const repeat = (type, n) => Array(n).fill(type);

function wavePlan(index, wave) {
  const plans = [
    [
      repeat('clun', 9),
      [...repeat('clun', 8), ...repeat('skuter', 4)],
      [...repeat('clun', 7), ...repeat('skuter', 6)],
      [...repeat('clun', 8), ...repeat('obrnenec', 3)],
      [...repeat('clun', 10), ...repeat('skuter', 5), ...repeat('obrnenec', 2)],
    ],
    [
      [...repeat('clun', 8), ...repeat('skuter', 4)],
      [...repeat('clun', 8), ...repeat('skuter', 6)],
      [...repeat('clun', 6), ...repeat('obrnenec', 4)],
      [...repeat('skuter', 10), ...repeat('obrnenec', 3)],
      [...repeat('clun', 10), ...repeat('skuter', 6), ...repeat('obrnenec', 4)],
      [...repeat('clun', 8), ...repeat('skuter', 6), ...repeat('obrnenec', 4), 'boss'],
    ],
    [
      [...repeat('clun', 6), ...repeat('clun', 6)],
      [...repeat('clun', 6), ...repeat('skuter', 8)],
      [...repeat('skuter', 10), ...repeat('obrnenec', 4)],
      [...repeat('clun', 8), ...repeat('skuter', 8), ...repeat('obrnenec', 4)],
      [...repeat('clun', 10), ...repeat('obrnenec', 6)],
      [...repeat('clun', 8), ...repeat('skuter', 8), ...repeat('obrnenec', 4), 'boss'],
    ],
    [
      [...repeat('clun', 6), ...repeat('obrnenec', 4)],
      [...repeat('clun', 8), ...repeat('obrnenec', 6)],
      [...repeat('skuter', 8), ...repeat('obrnenec', 6)],
      [...repeat('clun', 10), ...repeat('obrnenec', 8)],
      [...repeat('skuter', 10), ...repeat('obrnenec', 8)],
      [...repeat('clun', 8), ...repeat('skuter', 6), ...repeat('obrnenec', 8)],
      [...repeat('obrnenec', 10), 'boss'],
    ],
    [
      [...repeat('clun', 8), ...repeat('skuter', 8)],
      [...repeat('clun', 8), ...repeat('obrnenec', 6)],
      [...repeat('skuter', 12), ...repeat('obrnenec', 6)],
      [...repeat('clun', 10), ...repeat('skuter', 8), ...repeat('obrnenec', 6)],
      [...repeat('obrnenec', 10), ...repeat('skuter', 8)],
      [...repeat('clun', 12), ...repeat('obrnenec', 8)],
      [...repeat('skuter', 10), ...repeat('obrnenec', 10)],
      [...repeat('clun', 8), ...repeat('skuter', 8), ...repeat('obrnenec', 8), 'boss'],
    ],
    [
      [...repeat('clun', 8), ...repeat('clun', 8)],
      [...repeat('clun', 8), ...repeat('skuter', 10)],
      [...repeat('skuter', 10), ...repeat('obrnenec', 6)],
      [...repeat('clun', 10), ...repeat('skuter', 8), ...repeat('obrnenec', 6)],
      [...repeat('obrnenec', 10), ...repeat('skuter', 10)],
      [...repeat('clun', 10), ...repeat('obrnenec', 10)],
      [...repeat('skuter', 12), ...repeat('obrnenec', 10)],
      [...repeat('clun', 8), ...repeat('skuter', 10), ...repeat('obrnenec', 10)],
      [...repeat('obrnenec', 12), ...repeat('skuter', 8), 'boss'],
    ],
  ];
  return plans[index]?.[wave - 1] || [];
}

const LEVELS = [
  {
    name: 'První světla',
    area: 'VNITŘNÍ ZÁLIV',
    waves: 5,
    money: 340,
    tip: 'Věž u zatáčky drží nepřátele déle v dostřelu.',
    paths: [[[-40, 300], [140, 300], [260, 180], [430, 180], [540, 320], [700, 320], [800, 300], [960, 300]]],
    pads: [[210, 248], [360, 248], [500, 250], [620, 250], [730, 240], [250, 368], [470, 392], [640, 392]],
  },
  {
    name: 'Hadí průliv',
    area: 'PRŮLIV',
    waves: 6,
    money: 380,
    tip: 'Hadí zatáčky natahují lodě. Kryo je tu zlato.',
    paths: [[[-40, 120], [180, 120], [250, 250], [180, 390], [320, 500], [520, 500], [620, 380], [520, 240], [680, 140], [820, 220], [960, 300]]],
    pads: [[160, 196], [300, 196], [220, 330], [360, 430], [500, 430], [580, 310], [700, 210], [790, 300], [430, 300]],
  },
  {
    name: 'Dva proudy',
    area: 'DVOJITÝ KANÁL',
    waves: 6,
    money: 400,
    tip: 'Dvě trasy chtějí pokrytí obou břehů.',
    paths: [
      [[-40, 140], [200, 140], [380, 140], [560, 200], [740, 240], [960, 300]],
      [[-40, 460], [200, 460], [380, 460], [560, 400], [740, 360], [960, 300]],
    ],
    pads: [[160, 212], [340, 212], [500, 268], [680, 196], [160, 388], [340, 388], [500, 332], [680, 404], [430, 300]],
  },
  {
    name: 'Železný příliv',
    area: 'DOCKY',
    waves: 7,
    money: 430,
    tip: 'Tesla ignoruje pancíř obrněnců.',
    paths: [[[-40, 300], [120, 180], [280, 120], [460, 180], [540, 340], [420, 460], [600, 520], [780, 420], [860, 300], [960, 300]]],
    pads: [[150, 250], [300, 196], [430, 250], [500, 270], [360, 380], [520, 430], [680, 450], [780, 340], [640, 250]],
  },
  {
    name: 'Černá flotila',
    area: 'OTEVŘENÉ MOŘE',
    waves: 8,
    money: 460,
    tip: 'Minomet čistí shluky. Drž dostřel na rovince.',
    paths: [[[-40, 80], [220, 90], [360, 220], [220, 360], [380, 500], [620, 500], [760, 380], [640, 220], [780, 140], [960, 300]]],
    pads: [[180, 168], [320, 168], [280, 300], [360, 420], [520, 430], [680, 430], [700, 300], [720, 210], [840, 220], [500, 300]],
  },
  {
    name: 'Poslední linie',
    area: 'MAJÁK',
    waves: 9,
    money: 500,
    tip: 'Obě trasy končí u majáku. Nech jednu stranu holou a padneš.',
    paths: [
      [[-40, 90], [180, 90], [340, 160], [480, 120], [680, 180], [800, 220], [960, 300]],
      [[-40, 510], [180, 510], [340, 440], [520, 500], [700, 430], [820, 380], [960, 300]],
    ],
    pads: [[140, 162], [300, 228], [460, 196], [620, 140], [740, 268], [140, 438], [300, 372], [460, 404], [640, 468], [760, 340], [520, 300]],
  },
];

function distance(a, b) {
  const ax = Array.isArray(a) ? a[0] : a.x;
  const ay = Array.isArray(a) ? a[1] : a.y;
  const bx = Array.isArray(b) ? b[0] : b.x;
  const by = Array.isArray(b) ? b[1] : b.y;
  return Math.hypot(bx - ax, by - ay);
}

function pathData(points) {
  const lengths = [0];
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += distance(points[i - 1], points[i]);
    lengths.push(length);
  }
  return { points, lengths, length };
}

function onPath(path, dist) {
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

function stats(tower) {
  const base = TYPES[tower.type];
  const level = tower.level || 1;
  return {
    name: base.name,
    desc: base.desc,
    color: base.color,
    damage: base.damage * (1 + (level - 1) * 0.38),
    range: Math.round(base.range + (level - 1) * 18),
    rate: +(base.rate * (1 - (level - 1) * 0.08)).toFixed(2),
  };
}

function upgradeCost(tower) {
  return Math.round(TYPES[tower.type].cost * (0.65 + tower.level * 0.5));
}

function starsFromLives(lives) {
  if (lives >= 20) return 3;
  if (lives >= 12) return 2;
  return 1;
}

class Defense {
  constructor(index = 0) {
    this.index = index;
    this.level = LEVELS[index];
    this.paths = this.level.paths.map(pathData);
    this.state = 'build';
    this.money = this.level.money;
    this.lives = 20;
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

  towerAt(pad) {
    return this.towers.find(t => t.pad === pad);
  }

  build(pad, type) {
    if (!['build', 'wave'].includes(this.state) || this.towerAt(pad) || !TYPES[type]) return false;
    const cost = TYPES[type].cost;
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
    const cost = upgradeCost(tower);
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
    const plan = wavePlan(this.index, this.wave);
    this.queue = plan.map((kind, i) => ({
      kind,
      wait: 0.55 + i * (kind === 'boss' ? 1.4 : 0.42),
    }));
    this.spawnWait = 0;
    this.events.push({ type: 'wave', wave: this.wave });
    if (plan.includes('boss')) this.events.push({ type: 'boss' });
    return true;
  }

  spawnEnemy(kind) {
    const spec = ENEMIES[kind];
    const pathIndex = this.paths.length > 1 ? (this.id % this.paths.length) : 0;
    const path = this.paths[pathIndex];
    const start = onPath(path, 0);
    this.enemies.push({
      id: this.id++,
      type: kind,
      pathIndex,
      dist: 0,
      x: start.x,
      y: start.y,
      angle: start.angle,
      hp: spec.hp * (1 + this.index * 0.08 + (this.wave - 1) * 0.05),
      maxHp: spec.hp * (1 + this.index * 0.08 + (this.wave - 1) * 0.05),
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
    if (enemy.armor && source !== 'tesla') dmg *= 0.45;
    enemy.hp -= dmg;
    enemy.flash = 0.12;
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
    const foe = this.target(tower);
    if (foe) tower.angle = Math.atan2(foe.y - tower.y, foe.x - tower.x);
    if (tower.cool > 0 || !foe) return;
    const s = stats(tower);
    tower.cool = s.rate;
    if (tower.type === 'tesla' || tower.type === 'frost') {
      const chain = [foe];
      if (tower.type === 'tesla') {
        const rest = this.enemies.filter(e => e !== foe).sort((a, b) => Math.hypot(a.x - foe.x, a.y - foe.y) - Math.hypot(b.x - foe.x, b.y - foe.y));
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
      duration: tower.type === 'mortar' ? 0.55 : Math.max(0.08, travel / 780),
      color: s.color,
      damage: s.damage,
      target: foe,
    });
  }

  step(dt) {
    if (!['build', 'wave'].includes(this.state)) return;
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
      this.state = 'lost';
      this.events.push({ type: 'end', won: false, stars: 0 });
      return;
    }

    if (!this.queue.length && !this.enemies.length) {
      const bonus = 20 + this.wave * 8;
      this.money += bonus;
      this.events.push({ type: 'clear', bonus });
      if (this.wave >= this.level.waves) {
        this.state = 'won';
        this.events.push({ type: 'end', won: true, stars: starsFromLives(this.lives) });
      } else {
        this.state = 'build';
      }
    }
  }
}

window.Pristav = { Defense, LEVELS, TYPES, ENEMIES, W, H, stats, upgradeCost, wavePlan, onPath, pathData, distance };
return window.Pristav;
})();
