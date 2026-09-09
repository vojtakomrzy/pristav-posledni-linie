import {
  Defense, TYPES, ENEMIES, LEVELS, anchorsFor, blankSave, parseSave,
  persistSave, loadSave, buyMeta, buyMap, applyRunPayout, modsFromSave, demoCta,
  demoRankLocked, DEMO, SAVE_KEY, META_UPGRADES, MAP_UNLOCK_COST, mapUnlocked, metaCost,
} from '../engine.mjs';
import { readFile } from 'node:fs/promises';

const fails = [];
function assert(cond, msg) {
  if (!cond) fails.push(msg);
}

function memory() {
  const map = new Map();
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: k => { map.delete(k); },
  };
}

function pump(game, seconds, step = 1 / 60) {
  let t = 0;
  while (t < seconds && ['build', 'wave'].includes(game.state)) {
    game.step(step);
    t += step;
  }
}

assert(TYPES.cannon.role === 'Single', 'cannon is single');
assert(TYPES.mortar.role === 'AOE', 'mortar is aoe');
assert(TYPES.cryo.role === 'Slow', 'cryo is slow');
assert(TYPES.tesla.role === 'Support', 'tesla is support');
assert(!TYPES.frost, 'no leftover frost type key');
assert(TYPES.cannon.color === '#ffd192', 'cannon accent');
assert(TYPES.tesla.color === '#7fd4ff', 'tesla accent');
assert(TYPES.cryo.color === '#8ecbff', 'cryo accent');
assert(TYPES.mortar.color === '#c4a574', 'mortar accent');
assert(META_UPGRADES.map(u => u.id).join() === 'gold,wall,arsenal,interest,radar', 'designer shop ids');
assert(metaCost('gold', 0) === 25 && metaCost('gold', 1) === 55 && metaCost('gold', 2) === 95, 'starting gold costs');
assert(metaCost('wall', 0) === 40 && metaCost('wall', 1) === 100, 'dock wall costs');
assert(metaCost('arsenal', 0) === 50, 'arsenal cost');
assert(metaCost('interest', 0) === 35 && metaCost('interest', 1) === 80, 'interest costs');
assert(metaCost('radar', 0) === 45, 'radar cost');
assert(MAP_UNLOCK_COST === 60, 'map unlock 60 anchors');
assert(ENEMIES.scout1.family === 'scout' && ENEMIES.swarm1.ring === '#b8ffd9', 'scout/swarm teal ring');
assert(ENEMIES.ironclad1.ring === '#ffd192' && ENEMIES.ironclad3.tier === 3, 'ironclad amber L1-L3');
assert(ENEMIES.juggernaut.ring === '#ff8094' && ENEMIES.juggernaut.role === 'Boss', 'juggernaut magenta boss');
assert(LEVELS.length === 3, 'maps A/B/C');
assert(LEVELS[0].id === 'a' && LEVELS[0].pads.length >= 6 && LEVELS[0].pads.length <= 9, 'map A S-lane pads');
assert(LEVELS[1].id === 'b' && LEVELS[1].paths.length === 2, 'map B dual merge');
assert(LEVELS[2].id === 'c' && LEVELS[2].pads.length >= 9 && LEVELS[2].pads.length <= 14, 'map C horseshoe pads');
assert(LEVELS[0].lighthouse[0] > 800, 'map A lighthouse east');
assert(LEVELS[2].paths[0].at(-1)[1] <= LEVELS[2].lighthouse[1] + 20, 'map C path ends at lighthouse');
assert(!Object.values(TYPES).some(t => /kampaň|sektor/i.test(t.name)), 'no campaign tower names');

const lossPay = anchorsFor({ won: false, wave: 1, boss: false });
const winPay = anchorsFor({ won: true, wave: 8, boss: true });
const capped = anchorsFor({ won: true, wave: 80, boss: true });
assert(lossPay === 2, `wave×2 on loss, got ${lossPay}`);
assert(winPay === 8 * 2 + 15 + 10, `clear 15 + boss 10, got ${winPay}`);
assert(capped === 100, `soft cap 100, got ${capped}`);

let save = blankSave();
assert(save.anchors === 0 && save.unlockedMaps.includes('a'), 'map A free');
assert(!('remnants' in save), 'canonical save has no remnants field');
assert(!mapUnlocked(save, 'b') && !mapUnlocked(save, 'c'), 'B/C locked');
const r1 = applyRunPayout(save, { won: false, wave: 3, kills: 12, lives: 0, mapId: 'a' });
assert(save.runs === 1 && save.anchors === r1 && r1 === 6, 'run 1 anchors stored');
assert(!('kills' in save.last) && !('lives' in save.last), 'last run drops superseded combat keys');
save.anchors += 25;
assert(buyMeta(save, 'gold'), 'can buy starting gold rank 1');
assert(save.upgrades.gold === 1, 'gold rank 1');
assert(!buyMeta(save, 'gold'), 'rank 2 blocked in demo');
assert(demoRankLocked(save.upgrades.gold), 'demo rank cap');

const r2 = applyRunPayout(save, { won: true, wave: 8, kills: 90, lives: 14, boss: true, mapId: 'a' });
assert(save.runs === 2, 'two runs counted');
assert(demoCta(save.runs), 'cta after 2 runs');
assert(save.cleared.includes('a'), 'clear A recorded');
assert(mapUnlocked(save, 'b'), 'clear A unlocks B');
assert(buyMeta(save, 'radar'), 'can still spend anchors on remaining rank-1');
assert(!buyMeta(save, 'radar'), 'radar max 1');
applyRunPayout(save, { won: false, wave: 4, kills: 20, lives: 0, mapId: 'b' });
assert(save.runs === 3, 'third run still allowed');
assert(save.anchors >= 0, 'no negative anchors');

save.anchors += MAP_UNLOCK_COST;
assert(buyMap(save, 'c'), 'buy map C for 60');
assert(mapUnlocked(save, 'c'), 'C unlocked by anchors');
assert(!buyMap(save, 'c'), 'cannot buy twice');

const store = memory();
persistSave(store, save);
const stored = JSON.parse(store.getItem(SAVE_KEY));
assert(!('remnants' in stored) && !stored.upgrades.chest, 'persisted JSON is anchors-only');
const loaded = loadSave(store);
assert(loaded.anchors === save.anchors, 'anchors persist');
assert(loaded.upgrades.gold === save.upgrades.gold, 'upgrades persist');
assert(loaded.runs === save.runs, 'runs persist');
assert(loaded.unlockedMaps.includes('c'), 'unlocked maps persist');
assert(store.getItem(SAVE_KEY), 'saved under pristav-linie-v2');

const tamper = blankSave();
tamper.upgrades.gold = 5;
const clamped = parseSave(tamper);
assert(clamped.upgrades.gold === DEMO.rankCap, 'loaded meta clamped to demo cap');

const migrated = parseSave({ remnants: 40, upgrades: { chest: 1 }, runs: 2 });
assert(migrated.anchors === 40, 'one-shot v1 bank becomes anchors');
assert(migrated.upgrades.gold === 1, 'one-shot v1 chest becomes starting gold');
assert(!('remnants' in migrated), 'migrated object is not dual-currency');

const legacyStore = memory();
legacyStore.setItem('pristav-linie-v1', JSON.stringify({ remnants: 12, runs: 1, upgrades: { chest: 1 } }));
const fromOld = loadSave(legacyStore);
assert(fromOld.anchors === 12 && fromOld.upgrades.gold === 1, 'loadSave imports old key once');
assert(!legacyStore.getItem('pristav-linie-v1'), 'old save key is removed after migrate');
assert(legacyStore.getItem(SAVE_KEY), 'canonical key written after migrate');

const frostListed = parseSave({ unlockedTowers: ['cannon', 'frost', 'mortar'] });
assert(frostListed.unlockedTowers.includes('cryo') && !frostListed.unlockedTowers.includes('frost'), 'frost tower id maps to cryo');

const mods = modsFromSave({ upgrades: { gold: 1, wall: 1, arsenal: 1, interest: 1, radar: 1 }, unlockedTowers: ['cannon', 'tesla', 'cryo', 'mortar'] });
const g = new Defense(0, mods);
assert(g.money === LEVELS[0].money + 50, 'starting gold adds credits not anchors');
assert(g.maxLives === 23, 'dock wall adds lives');
assert(g.towerStats({ type: 'cannon', level: 1 }).range > TYPES.cannon.range, 'radar adds range');
assert(g.money !== save.anchors, 'credits are not anchors');
assert(g.allowed('mortar'), 'arsenal unlocks mortar');

const locked = new Defense(0, modsFromSave(blankSave()));
assert(!locked.allowed('mortar'), 'mortar locked before arsenal');
assert(locked.build(0, 'cannon'), 'free towers still build');
assert(!locked.build(1, 'mortar'), 'cannot build locked mortar');

const combat = new Defense(0, { money: 500 });
assert(combat.build(0, 'cannon'), 'build cannon');
assert(combat.build(1, 'mortar'), 'build mortar');
assert(combat.build(2, 'cryo'), 'build cryo');
assert(combat.build(3, 'tesla'), 'build tesla');
assert(!combat.build(0, 'cannon'), 'no double build');
assert(combat.startWave(), 'start wave 1');
pump(combat, 25);
assert(combat.kills > 0, `cannon/mortar/cryo sink hulls, kills=${combat.kills}`);
assert(combat.state === 'build' || combat.state === 'won' || combat.lives < combat.maxLives || combat.kills > 0, 'wave resolved without crash');

const zap = new Defense(0, { money: 500 });
zap.build(0, 'tesla');
zap.startWave();
zap.spawnEnemy('swarm1');
zap.spawnEnemy('swarm1');
const [aShip, bShip] = zap.enemies;
aShip.x = zap.towers[0].x + 20; aShip.y = zap.towers[0].y; aShip.dist = 100;
bShip.x = aShip.x + 40; bShip.y = aShip.y; bShip.dist = 110;
zap.fire(zap.towers[0], 1);
assert(zap.events.filter(e => e.type === 'beam').length >= 2, 'tesla chain arc');
assert(aShip.hp < aShip.maxHp && bShip.hp < bShip.maxHp, 'tesla hits chained hulls');

const cryo = new Defense(0, { money: 400 });
cryo.build(0, 'cryo');
cryo.startWave();
cryo.spawnEnemy('scout1');
const runner = cryo.enemies[0];
runner.x = cryo.towers[0].x + 18;
runner.y = cryo.towers[0].y;
runner.dist = 120;
cryo.fire(cryo.towers[0], 1);
assert(runner.slow > 0, 'cryo applies slow');

const blast = new Defense(0, { money: 400 });
blast.build(0, 'mortar');
blast.startWave();
blast.spawnEnemy('swarm1');
blast.spawnEnemy('swarm1');
const [a, b] = blast.enemies;
a.x = 400; a.y = 300; a.dist = 200;
b.x = 410; b.y = 305; b.dist = 210;
blast.towers[0].x = 400;
blast.towers[0].y = 250;
blast.fire(blast.towers[0], 2);
const shell = blast.projectiles[0];
assert(shell && shell.type === 'mortar', 'mortar fired');
shell.age = shell.duration;
blast.step(0.01);
assert(blast.events.some(e => e.type === 'blast') || blast.kills > 0 || blast.enemies.some(e => e.hp < e.maxHp), 'mortar blast lands');

const boss = new Defense(0, { money: 800 });
boss.build(0, 'cannon');
boss.startWave();
boss.spawnEnemy('juggernaut');
boss.enemies[0].hp = 1;
boss.hurt(boss.enemies[0], 50, 'tesla');
assert(boss.bossDown, 'juggernaut counts as boss');

const interest = new Defense(0, { money: 0, interest: 0.08 });
interest.build(0, 'cannon');
interest.money = 100;
interest.startWave();
interest.queue.length = 0;
interest.enemies.length = 0;
interest.step(0.016);
assert(interest.money > 100, 'harbor interest pays after a wave');

const run = new Defense(0, { qa: true, money: 300 });
['cannon', 'cannon', 'cryo', 'mortar'].forEach((type, i) => assert(run.build(i, type), `qa build ${type}`));
let guard = 0;
while (!['won', 'lost'].includes(run.state) && guard++ < 20000) {
  if (run.state === 'build') assert(run.startWave(), 'qa wave starts');
  run.step(1 / 60);
}
assert(['won', 'lost'].includes(run.state), `qa run ends, state=${run.state} guard=${guard}`);
assert(run.events.some(e => e.type === 'end'), 'qa run emits end');

const leak = new Defense(0);
leak.startWave();
leak.spawnEnemy('swarm1');
const hull = leak.enemies[0];
hull.dist = leak.paths[0].length;
leak.step(0.02);
assert(leak.lives < leak.maxLives, 'leak costs lives');
assert(leak.lives >= 0, 'lives never negative');

const lose = new Defense(0);
lose.lives = 0;
lose.state = 'wave';
lose.step(0.016);
assert(lose.state === 'lost', 'zero lives ends run');
assert(lose.events.some(e => e.type === 'end' && e.won === false), 'loss event');

const files = ['index.html', 'game.js', 'engine.mjs', 'content.mjs', 'combat.mjs', 'draw.mjs', 'style.css'];
const uiSrc = (await Promise.all(files.map(f => readFile(new URL(`../${f}`, import.meta.url), 'utf8')))).join('\n');
const saveSrc = await readFile(new URL('../save.mjs', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../style.css', import.meta.url), 'utf8');
const battle = html.split('id="battle"')[1].split('id="result"')[0];
assert(!/stripe|paypal|checkout|payment|buy now|koupit hru/i.test(uiSrc + saveSrc), 'no payment gateway');
assert(!/id="campaign"|Klasické sektory|Mapa sektorů/i.test(uiSrc), 'campaign is not the main path');
assert(!/REPLACE/i.test(battle), 'replace out of scope');
assert(!/ANCHORS|Anchors|remnant|zbytek/i.test(battle), 'no anchors on battle HUD');
assert(!/remnant|zbytek|zbytky|chest|yard|lights/i.test(uiSrc), 'no leftover remnants/campaign keys in live UI');
assert(!/\bfrost\b/.test(uiSrc), 'no leftover frost type in live modules');
assert(/src\.remnants/.test(saveSrc), 'save keeps one-shot remnants import only');
assert(/id="hq-anchors"/.test(html) && /ANCHORS/.test(html), 'anchors on HQ');
assert(/id="result-anchors"/.test(html), 'anchors on end-of-run');
assert(/id="mode-build"/.test(html) && />BUILD</.test(html) && />UPGRADE</.test(html) && />SELL</.test(html), 'dock modes');
assert(/START WAVE/.test(html) && /start-wave/.test(css), 'start wave amber dock button');
assert(/mode-chip/.test(html) && /BUILDING/.test(html), 'mode chip BUILDING');
assert(/hud-top/.test(html) && /id="credits"/.test(html) && /id="lives"/.test(html) && /wave-bar/.test(html), 'top strip credits lives wave');
assert(!/mission-name|sector-label|id="money"|gold-mark/.test(html), 'no battle title or gold leftover ids');
assert(/assets\/credits\.svg/.test(html) && /assets\/anchors\.svg/.test(html) && /assets\/lives\.svg/.test(html), 'hud icons');
assert(/drawFog|lighthouse/.test(await readFile(new URL('../draw.mjs', import.meta.url), 'utf8')), 'flat overlay fog + lighthouse');
assert(/level >= 2/.test(await readFile(new URL('../draw.mjs', import.meta.url), 'utf8')), 'tower L2/L3 extra detail');

const anchorsSvg = await readFile(new URL('../assets/anchors.svg', import.meta.url), 'utf8');
const creditsSvg = await readFile(new URL('../assets/credits.svg', import.meta.url), 'utf8');
assert(/fill="none"[\s\S]*stroke="#b8ffd9"/.test(anchorsSvg), 'anchors hollow mint diamond');
assert(/fill="#ffd192"/.test(creditsSvg) && /<circle/.test(creditsSvg), 'credits amber filled circle');
assert((await readFile(new URL('../assets/ships/juggernaut.svg', import.meta.url), 'utf8')).includes('#ff8094'), 'juggernaut asset');
assert((await readFile(new URL('../assets/ships/scout-l3.svg', import.meta.url), 'utf8')).length > 40, 'scout L3 asset');
assert((await readFile(new URL('../assets/meta/radar.svg', import.meta.url), 'utf8')).length > 40, 'radar meta icon');

if (fails.length) {
  console.error('FAIL');
  for (const f of fails) console.error(' -', f);
  process.exit(1);
}
console.log('ok', {
  lossPay, winPay, r1, r2, anchors: save.anchors, runs: save.runs,
  kills: combat.kills, teslaBeams: zap.events.filter(e => e.type === 'beam').length, gold: g.money,
  maps: LEVELS.map(l => l.id), pads: LEVELS.map(l => l.pads.length),
});
