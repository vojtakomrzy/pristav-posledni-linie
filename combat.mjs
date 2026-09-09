import {
  LEVELS, TYPES, parseEnemy, pathData, onPath, stats, upgradeCost, wavePlan, STARTER_TOWERS,
} from './content.mjs';

const SPACING = { swarm: 0.22, scout: 0.34, ironclad: 0.7, juggernaut: 1.7 };

export function normalizeMods(mods = {}) {
  const towers = Array.isArray(mods.towers)
    ? mods.towers.filter(t => TYPES[t])
    : [...STARTER_TOWERS, 'mortar'];
  return {
    money: Math.max(0, Math.round(Number(mods.money) || 0)),
    lives: Math.max(0, Math.round(Number(mods.lives) || 0)),
    interest: Math.min(0.25, Math.max(0, Number(mods.interest) || 0)),
    range: Math.max(0, Math.round(Number(mods.range) || 0)),
    towers,
    qa: !!mods.qa,
  };
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

  towerCost(type) {
    return TYPES[type].cost;
  }

  upgradePrice(tower) {
    return upgradeCost(tower);
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
    const plan = wavePlan(this.wave, this.mods.qa);
    let wait = 0.45;
    this.queue = plan.map(kind => {
      wait += SPACING[parseEnemy(kind).family] || 0.4;
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
    if (enemy.armor && source !== 'tesla' && source !== 'cryo') dmg *= 0.5;
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

  target(tower) {
    const s = this.towerStats(tower);
    let best = null;
    let bestDist = 0;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - tower.x, e.y - tower.y);
      if (d <= s.range && e.dist > bestDist) {
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
    if (tower.type === 'tesla' || tower.type === 'cryo') {
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
          slow: tower.type === 'cryo',
        });
        this.hurt(e, s.damage, tower.type);
        if (tower.type === 'cryo') e.slow = 2;
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
      e.dist += e.speed * (e.slow > 0 ? 0.55 : 1) * dt;
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
      const paid = this.mods.interest > 0 ? Math.floor(this.money * this.mods.interest) : 0;
      this.money += paid;
      this.events.push({ type: 'clear', bonus, interest: paid || undefined });
      if (this.wave >= this.level.waves) this.finish(true);
      else this.state = 'build';
    }
  }
}
