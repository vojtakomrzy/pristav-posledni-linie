import mapsCoords from './assets/maps-coords.json' with { type: 'json' };

export const MAP_COORDS = mapsCoords;
export const W = mapsCoords.coordinateSpace.width;
export const H = mapsCoords.coordinateSpace.height;

export const PALETTE = {
  bg: '#071e27',
  mint: '#b8ffd9',
  amber: '#ffd192',
  text: '#e2eee8',
  danger: '#ff8094',
};

export const MAP_IDS = ['a', 'b', 'c'];
export const STARTER_TOWERS = ['cannon', 'tesla', 'cryo'];
export const TOWER_IDS = [...STARTER_TOWERS, 'mortar'];

export const TYPES = {
  cannon: {
    name: 'Cannon',
    role: 'Single',
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
    cost: 140,
    color: '#7fd4ff',
    desc: 'Arc jumps up to 3 hulls. Ignores armor.',
    damage: 16,
    range: 125,
    rate: 0.85,
  },
  cryo: {
    name: 'Cryo',
    role: 'Slow',
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
    cost: 155,
    color: '#c4a574',
    desc: 'Shell hits every hull in the blast.',
    damage: 30,
    range: 170,
    rate: 1.5,
  },
};

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

const repeat = (type, n) => Array(n).fill(type);

export const WAVES = [
  repeat('swarm1', 10),
  [...repeat('swarm1', 8), ...repeat('scout1', 5)],
  [...repeat('swarm1', 10), ...repeat('scout1', 6)],
  [...repeat('swarm2', 8), ...repeat('ironclad1', 3)],
  [...repeat('scout2', 8), ...repeat('swarm2', 8)],
  [...repeat('ironclad2', 4), ...repeat('swarm2', 8), ...repeat('scout2', 5)],
  [...repeat('swarm3', 10), ...repeat('scout3', 6), ...repeat('ironclad2', 3)],
  [...repeat('ironclad3', 4), ...repeat('scout3', 8), ...repeat('swarm3', 6), 'juggernaut'],
];

function samePoint(a, b) {
  return a && b && a[0] === b[0] && a[1] === b[1];
}

function joinPoints(...segments) {
  const out = [];
  for (const seg of segments) {
    for (const p of seg) {
      if (!samePoint(out[out.length - 1], p)) out.push(p);
    }
  }
  return out;
}

function toLighthouse(path, base) {
  return joinPoints(path, [base]);
}

const MAP_META = {
  A: { id: 'a', name: 'S-Curve', area: 'MAP A · DEMO', tip: 'One lane. Hold the bends.', money: 360, foam: 1 },
  B: { id: 'b', name: 'Merge Y', area: 'MAP B · MERGE', tip: 'Two inlets. Cover the choke.', money: 380, foam: 1 },
  C: { id: 'c', name: 'Horseshoe', area: 'MAP C · HORSESHOE', tip: 'Arms watch the channel. Island holds the line.', money: 400, foam: 1 },
};

function pathsFromGrafik(spec) {
  if (spec.lanes === 2 && spec.paths) {
    return [
      toLighthouse(joinPoints(spec.paths.left, spec.paths.merged), spec.base),
      toLighthouse(joinPoints(spec.paths.right, spec.paths.merged), spec.base),
    ];
  }
  return [toLighthouse(spec.path, spec.base)];
}

function levelFromGrafik(key) {
  const spec = mapsCoords.maps[key];
  const meta = MAP_META[key];
  return {
    id: meta.id,
    grafikId: spec.id,
    name: meta.name,
    area: meta.area,
    tip: meta.tip,
    waves: WAVES.length,
    money: meta.money,
    foam: meta.foam,
    lighthouse: spec.base,
    spawn: spec.spawn || spec.spawns?.[0],
    mergePoint: spec.mergePoint || null,
    islandCenter: spec.islandCenter || null,
    paths: pathsFromGrafik(spec),
    pads: spec.pads.map(([x, y]) => [x, y]),
  };
}

export const LEVELS = ['A', 'B', 'C'].map(levelFromGrafik);

export function wavePlan(wave, qa = false) {
  const plans = qa ? WAVES.slice(0, 2) : WAVES;
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

export function unique(list) {
  return [...new Set(list)];
}

export function canonTower(id) {
  return TOWER_IDS.includes(id) ? id : null;
}
