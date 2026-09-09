import { TYPES, W, H } from './content.mjs';

export const TOWER_LEVELS = [1, 2, 3];
export const MANIFEST_URL = './assets/asset_manifest.json';
export const FX_FOG = './assets/fx/fog_overlay.png';
export const FX_LIGHTHOUSE = './assets/fx/lighthouse.svg';
export const FX_CONE = './assets/fx/lighthouse_cone.png';

const MAP_KEYS = { a: 'a_demo', b: 'b_merge', c: 'c_horseshoe' };

export function towerAsset(type, level = 1) {
  const lv = level >= 3 ? 3 : level >= 2 ? 2 : 1;
  return `./assets/towers/${type}-l${lv}.svg`;
}

export function shipAsset(family, tier = 1) {
  if (family === 'juggernaut') return './assets/ships/juggernaut.svg';
  return `./assets/ships/${family}-l${tier}.svg`;
}

export function mapAsset(id) {
  const named = { a: 'map_a_demo', b: 'map_b_merge', c: 'map_c_horseshoe' }[id];
  return named ? `./assets/maps/${named}.png` : `./assets/maps/${id}.png`;
}

export function assetUrl(file) {
  if (!file) return '';
  const p = String(file).replace(/^\.\//, '');
  return p.startsWith('assets/') ? './' + p : './assets/' + p;
}

const images = new Map();
let manifest = null;

export function getManifest() {
  return manifest;
}

function collectUrls() {
  const urls = new Set([
    ...['cannon', 'tesla', 'cryo', 'mortar'].flatMap(type => TOWER_LEVELS.map(level => towerAsset(type, level))),
    ...['scout', 'swarm', 'ironclad'].flatMap(family => [1, 2, 3].map(tier => shipAsset(family, tier))),
    shipAsset('juggernaut'), mapAsset('a'), mapAsset('b'), mapAsset('c'),
    FX_FOG, FX_LIGHTHOUSE, FX_CONE,
    './assets/maps/a.png', './assets/maps/b.png', './assets/maps/c.png', './assets/fx/fog.png',
  ]);
  if (manifest) {
    for (const m of Object.values(manifest.maps || {})) urls.add(assetUrl(m.file));
    for (const sheet of Object.values(manifest.towers?.sheets || {})) urls.add(assetUrl(sheet.file));
    for (const sheet of Object.values(manifest.enemies?.sheets || {})) urls.add(assetUrl(sheet.file));
    for (const file of Object.values(manifest.hud || {})) urls.add(assetUrl(file));
    for (const file of Object.values(manifest.fx || {})) urls.add(assetUrl(file));
  }
  return [...urls];
}

function loadImage(src) {
  return new Promise(resolve => {
    if (images.has(src)) { resolve(images.get(src)); return; }
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { images.set(src, img); resolve(img); };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function loadAssets() {
  if (typeof Image === 'undefined') return images;
  if (typeof fetch === 'function') {
    try {
      manifest = await fetch(MANIFEST_URL).then(r => r.json());
    } catch { manifest = null; }
  }
  await Promise.all(collectUrls().map(loadImage));
  return images;
}

function pic(src) {
  return images.get(src) || null;
}

function blit(c, img, x, y, w, h, angle = 0, alpha = 1) {
  if (!img || !img.width) return false;
  c.save();
  c.globalAlpha *= alpha;
  c.translate(x, y);
  if (angle) c.rotate(angle);
  c.drawImage(img, -w / 2, -h / 2, w, h);
  c.restore();
  return true;
}

function blitFrame(c, img, frame, x, y, w, h, angle = 0) {
  if (!img || !frame) return false;
  c.save();
  c.translate(x, y);
  if (angle) c.rotate(angle);
  c.drawImage(img, frame.x, frame.y, frame.w, frame.h, -w / 2, -h / 2, w, h);
  c.restore();
  return true;
}

function towerFrame(type, level = 1) {
  const lv = level >= 3 ? 3 : level >= 2 ? 2 : 1;
  const sheet = manifest?.towers?.sheets?.[type];
  const frame = sheet?.frames?.[lv - 1];
  const img = pic(assetUrl(sheet?.file));
  return img && frame ? { img, frame } : null;
}

function shipFrame(family, tier = 1) {
  const sheet = manifest?.enemies?.sheets?.[family];
  const frames = sheet?.frames || [];
  const frame = family === 'juggernaut' ? frames[0] : frames[Math.max(0, (tier || 1) - 1)];
  const img = pic(assetUrl(sheet?.file));
  return img && frame ? { img, frame } : null;
}

export function circle(c, x, y, r, fill, stroke, width = 1) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}

export function turret(c, x, y, type, angle = -Math.PI / 2, level = 1, scale = 1) {
  const grow = 1 + (level - 1) * 0.16;
  const size = 48 * scale * grow;
  const packed = towerFrame(type, level);
  if (packed && blitFrame(c, packed.img, packed.frame, x, y, size, size, angle)) return;
  if (blit(c, pic(towerAsset(type, level)), x, y, size, size, angle)) return;

  const color = TYPES[type].color;
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
  } else if (type === 'cryo') {
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

function drawPath(ctx, points, foamSide, clock, reduced, faint) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (!faint) {
    ctx.strokeStyle = '#041318';
    ctx.lineWidth = 42;
    ctx.stroke();
    ctx.strokeStyle = '#0a2a32';
    ctx.lineWidth = 34;
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#0e2428aa';
    ctx.lineWidth = 28;
    ctx.stroke();
  }
  const foam = offsetPoly(points, 20 * foamSide);
  ctx.beginPath();
  foam.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = faint ? '#b8ffd933' : '#b8ffd955';
  ctx.lineWidth = 3;
  ctx.setLineDash([5, 9]);
  ctx.lineDashOffset = reduced ? 0 : -clock * 10;
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawLighthouseCone(ctx, x, y, low, clock, reduced) {
  ctx.save();
  const sweep = reduced ? -2.35 : -2.35 + Math.sin(clock * 0.22) * 0.18;
  ctx.translate(x, y - 36);
  ctx.globalCompositeOperation = 'lighter';
  const coneImg = pic(assetUrl(manifest?.fx?.lighthouse_cone)) || pic(FX_CONE);
  if (coneImg) {
    ctx.rotate(sweep - Math.PI / 2);
    const h = 280;
    const w = h * ((coneImg.naturalWidth || coneImg.width) / (coneImg.naturalHeight || coneImg.height || 1));
    ctx.globalAlpha = low ? 0.55 : 0.9;
    ctx.drawImage(coneImg, -w / 2, 0, w, h);
    ctx.restore();
    return;
  }
  const cone = ctx.createLinearGradient(0, 0, 280, 30);
  cone.addColorStop(0, low ? 'rgba(255,128,148,0.42)' : 'rgba(255,209,146,0.5)');
  cone.addColorStop(0.35, low ? 'rgba(255,128,148,0.12)' : 'rgba(255,209,146,0.16)');
  cone.addColorStop(1, 'rgba(255,209,146,0)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(sweep - 0.28) * 320, Math.sin(sweep - 0.28) * 320);
  ctx.lineTo(Math.cos(sweep + 0.28) * 320, Math.sin(sweep + 0.28) * 320);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawLighthouse(ctx, x, y, low, clock, reduced, skipTower = false) {
  drawLighthouseCone(ctx, x, y, low, clock, reduced);
  if (skipTower) {
    circle(ctx, x, y - 40, 6, low ? '#ff8094' : '#ffd192');
    ctx.fillStyle = low ? 'rgba(255,128,148,0.28)' : 'rgba(255,209,146,0.38)';
    ctx.beginPath();
    ctx.arc(x, y - 40, 14, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (!blit(ctx, pic(FX_LIGHTHOUSE), x, y - 10, 52, 78)) {
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
  }
  circle(ctx, x, y - 40, 6, low ? '#ff8094' : '#ffd192');
  ctx.fillStyle = low ? 'rgba(255,128,148,0.28)' : 'rgba(255,209,146,0.38)';
  ctx.beginPath();
  ctx.arc(x, y - 40, 14, 0, Math.PI * 2);
  ctx.fill();
}

function drawFog(ctx, clock, reduced) {
  const fog = pic(assetUrl(manifest?.fx?.fog_overlay)) || pic(FX_FOG) || pic('./assets/fx/fog.png');
  if (fog) {
    ctx.save();
    ctx.globalAlpha = reduced ? 0.28 : 0.48;
    const drift = reduced ? 0 : (clock * 10) % 64;
    ctx.drawImage(fog, -drift, -12, W + 48, H + 24);
    ctx.restore();
  } else if (!reduced) {
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
  }
  if (reduced) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(8, 28, 34, 0.22)');
    g.addColorStop(1, 'rgba(8, 28, 34, 0.06)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  const vig = ctx.createRadialGradient(W / 2, H / 2, 220, W / 2, H / 2, 580);
  vig.addColorStop(0, 'rgba(7,30,39,0)');
  vig.addColorStop(1, 'rgba(7,30,39,0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

function drawShip(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  circle(ctx, 0, 8, e.size * 1.15, e.ring + '55', e.ring, 1.6);
  const packed = shipFrame(e.family, e.tier || 1);
  const s = e.size;
  if (packed) {
    ctx.rotate(e.angle);
    const w = s * 4.4;
    const h = w * (packed.frame.h / packed.frame.w);
    ctx.globalAlpha = e.flash > 0 ? 0.85 : 1;
    ctx.drawImage(packed.img, packed.frame.x, packed.frame.y, packed.frame.w, packed.frame.h, -w / 2, -h / 2, w, h);
    ctx.restore();
    return;
  }
  const img = pic(shipAsset(e.family, e.tier || 1));
  if (img) {
    ctx.rotate(e.angle);
    const w = s * 4.4;
    const h = w * (img.naturalHeight / img.naturalWidth || 0.5);
    ctx.globalAlpha = e.flash > 0 ? 0.85 : 1;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    return;
  }
  ctx.rotate(e.angle);
  const t = e.tier || 1;
  if (e.family === 'swarm') {
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
  }
  ctx.beginPath();
  if (e.family === 'ironclad' || e.family === 'juggernaut') {
    ctx.moveTo(s * 1.35, 0);
    ctx.lineTo(s * .35, -s * 0.95);
    ctx.lineTo(-s * 1.05, -s * .75);
    ctx.lineTo(-s * 1.05, s * .75);
    ctx.lineTo(s * .35, s * 0.95);
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

function drawPadGlow(ctx, x, y, { tower, hot, photo }) {
  ctx.save();
  if (photo) ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(x, y, 2, x, y, 40);
  glow.addColorStop(0, hot ? 'rgba(127,212,255,0.62)' : tower ? 'rgba(127,212,255,0.2)' : 'rgba(127,212,255,0.42)');
  glow.addColorStop(1, 'rgba(127,212,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const fill = photo ? null : '#071e27ee';
  circle(ctx, x, y, 24, fill, hot ? '#7fd4ff' : tower ? '#7eab92cc' : '#7fd4ff', hot ? 2.6 : 2);
  if (!tower) {
    ctx.strokeStyle = hot ? '#7fd4ff' : '#7fd4ff99';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x + 6, y);
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x, y + 6);
    ctx.stroke();
  }
}

export function renderBoard(ctx, game, view, ui) {
  const { viewW, viewH, mapX, mapY, mapScale, clock, reduced } = view;
  const { selected, hover, blueprint, dockMode, effects } = ui;

  ctx.clearRect(0, 0, viewW, viewH);
  ctx.save();
  ctx.translate(mapX, mapY);
  ctx.scale(mapScale, mapScale);

  ctx.fillStyle = '#041016';
  ctx.fillRect(-40, -40, W + 80, H + 80);

  const base = pic(mapAsset(game.level.id)) || pic(assetUrl(manifest?.maps?.[MAP_KEYS[game.level.id]]?.file));
  if (base) ctx.drawImage(base, 0, 0, W, H);

  if (!base) {
    const foam = game.level.foam || 1;
    for (const points of game.level.paths) drawPath(ctx, points, foam, clock, reduced, false);
  }

  drawFog(ctx, clock, reduced);

  const [lx, ly] = game.level.lighthouse;
  drawLighthouse(ctx, lx, ly, game.lives < Math.ceil(game.maxLives * .4), clock, reduced, !!base);

  const active = selected >= 0 ? selected : hover;
  const t = game.towerAt(active);
  const type = t?.type || (dockMode === 'build' ? blueprint : null);
  if (active >= 0 && type) {
    const [x, y] = game.level.pads[active];
    const s = game.towerStats(t || { type, level: 1 });
    circle(ctx, x, y, s.range, s.color + '10', s.color + '55', 1);
  }

  game.level.pads.forEach(([x, y], i) => {
    drawPadGlow(ctx, x, y, { tower: game.towerAt(i), hot: i === selected || i === hover, photo: !!base });
  });

  for (const tw of game.towers) {
    turret(ctx, tw.x, tw.y, tw.type, tw.angle, tw.level);
    if (tw.cool > game.towerStats(tw).rate - .07) {
      circle(ctx, tw.x + Math.cos(tw.angle) * 22, tw.y + Math.sin(tw.angle) * 22, 4, TYPES[tw.type].color);
    }
  }

  for (const e of game.enemies) {
    drawShip(ctx, e);
    if (e.slow > 0) circle(ctx, e.x, e.y, e.size + 7, null, '#e2eee888', 2);
    if (e.hp < e.maxHp || e.family === 'ironclad' || e.family === 'juggernaut') {
      const w = e.family === 'juggernaut' ? 44 : e.family === 'ironclad' ? 36 : 26;
      ctx.fillStyle = '#071e27';
      ctx.fillRect(e.x - w / 2, e.y - e.size - 12, w, 3);
      ctx.fillStyle = e.slow > 0 ? '#e2eee8' : e.family === 'juggernaut' ? '#ff8094' : e.family === 'ironclad' ? '#ffd192' : e.family === 'scout' ? '#7fd4ff' : '#b8ffd9';
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
