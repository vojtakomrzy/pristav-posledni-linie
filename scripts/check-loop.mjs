import {
  Defense, TYPES, ENEMIES, LEVELS, stats, remnantsFor, blankSave, parseSave,
  persistSave, loadSave, buyMeta, applyRunPayout, modsFromSave, demoCta,
  demoRankLocked, META_COST, DEMO, SAVE_KEY, auraBonus,
} from '../engine.mjs';

const fails = [];
function assert(cond, msg) {
  if (!cond) fails.push(msg);
}

function memory() {
  const map = new Map();
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
  };
}

function pump(game, seconds, step = 1 / 60) {
  const end = seconds;
  let t = 0;
  while (t < end && ['build', 'wave'].includes(game.state)) {
    game.step(step);
    t += step;
  }
}

assert(TYPES.cannon.role === 'Single', 'cannon is single');
assert(TYPES.mortar.role === 'AOE', 'mortar is aoe');
assert(TYPES.frost.role === 'Slow', 'frost is slow');
assert(TYPES.beacon.role === 'Support', 'beacon is support');
assert(ENEMIES.swarm.role === 'Swarm' && ENEMIES.fast.role === 'Fast' && ENEMIES.tank.role === 'Tank', 'three threats');
assert(LEVELS.length >= 1 && LEVELS.length <= 2, 'one or two harbor maps');
assert(!Object.values(TYPES).some(t => /kampaň|sektor/i.test(t.name)), 'no campaign tower names');

const lossPay = remnantsFor({ won: false, wave: 1, kills: 0, lives: 0 });
const winPay = remnantsFor({ won: true, wave: 8, kills: 80, lives: 16 });
assert(lossPay >= 10, `loss pays remnants, got ${lossPay}`);
assert(winPay > lossPay, `win pays more than loss (${winPay} vs ${lossPay})`);
assert(lossPay >= META_COST[0], 'first death can buy a rank-1 upgrade');

let save = blankSave();
const r1 = applyRunPayout(save, { won: false, wave: 3, kills: 12, lives: 0 });
assert(save.runs === 1 && save.remnants === r1, 'run 1 remnants stored');
assert(buyMeta(save, 'chest'), 'run 1 can buy war chest');
assert(save.upgrades.chest === 1, 'chest rank 1');
assert(!buyMeta(save, 'chest'), 'rank 2 blocked in demo');
assert(demoRankLocked(save.upgrades.chest), 'demo rank cap');

const r2 = applyRunPayout(save, { won: true, wave: 8, kills: 90, lives: 14 });
assert(save.runs === 2, 'two runs counted');
assert(demoCta(save.runs), 'cta after 2 runs');
assert(buyMeta(save, 'lights'), 'can still spend remnants on remaining rank-1');
assert(buyMeta(save, 'yard') || save.remnants < META_COST[0], 'yard buy or leftover too small');
assert(!buyMeta(save, 'lights'), 'no rank 2 after gate');
applyRunPayout(save, { won: false, wave: 4, kills: 20, lives: 0 });
assert(save.runs === 3, 'third run still allowed');
assert(save.remnants >= 0, 'no negative remnants');

const store = memory();
persistSave(store, save);
const loaded = loadSave(store);
assert(loaded.remnants === save.remnants, 'remnants persist');
assert(loaded.upgrades.chest === save.upgrades.chest, 'upgrades persist');
assert(loaded.runs === save.runs, 'runs persist');
assert(store.getItem(SAVE_KEY), 'saved under pristav-linie-v1');

const tamper = blankSave();
tamper.upgrades.chest = 5;
const clamped = parseSave(tamper);
assert(clamped.upgrades.chest === DEMO.rankCap, 'loaded meta clamped to demo cap');

const mods = modsFromSave({ upgrades: { chest: 1, lights: 1, yard: 1 } });
const g = new Defense(0, mods);
assert(g.money === LEVELS[0].money + 45, 'chest adds gold not remnants');
assert(g.maxLives === 20, 'lights add lives');
assert(g.towerCost('cannon') < TYPES.cannon.cost, 'yard discounts gold');
assert(g.money !== save.remnants, 'gold is not remnants');

const combat = new Defense(0, { money: 500 });
assert(combat.build(0, 'cannon'), 'build cannon');
assert(combat.build(1, 'mortar'), 'build mortar');
assert(combat.build(2, 'frost'), 'build frost');
assert(combat.build(3, 'beacon'), 'build beacon');
assert(!combat.build(0, 'cannon'), 'no double build');
assert(combat.startWave(), 'start wave 1');
pump(combat, 25);
assert(combat.kills > 0, `cannon/mortar/frost sink hulls, kills=${combat.kills}`);
assert(combat.state === 'build' || combat.state === 'won' || combat.lives < combat.maxLives || combat.kills > 0, 'wave resolved without crash');

const aura = new Defense(0, { money: 500 });
aura.build(0, 'cannon');
aura.build(5, 'beacon');
const cannon = aura.towerAt(0);
const beacon = aura.towerAt(5);
const bonus = auraBonus(cannon, aura.towers);
assert(bonus > 0, `beacon buffs nearby cannon (${bonus})`);
const buffed = stats(cannon, aura.towers).damage;
const bare = stats(cannon, [cannon]).damage;
assert(buffed > bare, 'support raises cannon damage');
assert(stats(beacon, aura.towers).damage === 0, 'beacon deals no direct damage');

const frost = new Defense(0, { money: 400 });
frost.build(0, 'frost');
frost.startWave();
frost.spawnEnemy('fast');
const runner = frost.enemies[0];
runner.x = frost.towers[0].x + 18;
runner.y = frost.towers[0].y;
runner.dist = 120;
frost.fire(frost.towers[0], 1);
assert(runner.slow > 0, 'cryo applies slow');

const blast = new Defense(0, { money: 400 });
blast.build(0, 'mortar');
blast.startWave();
blast.spawnEnemy('swarm');
blast.spawnEnemy('swarm');
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

const run = new Defense(0, { qa: true, money: 300 });
['cannon', 'cannon', 'frost', 'mortar'].forEach((type, i) => assert(run.build(i, type), `qa build ${type}`));
let guard = 0;
while (!['won', 'lost'].includes(run.state) && guard++ < 20000) {
  if (run.state === 'build') assert(run.startWave(), 'qa wave starts');
  run.step(1 / 60);
}
assert(['won', 'lost'].includes(run.state), `qa run ends, state=${run.state} guard=${guard}`);
assert(run.events.some(e => e.type === 'end'), 'qa run emits end');

const leak = new Defense(0);
leak.startWave();
leak.spawnEnemy('swarm');
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

const src = await (await import('node:fs/promises')).readFile(new URL('../engine.mjs', import.meta.url), 'utf8')
  + await (await import('node:fs/promises')).readFile(new URL('../game.js', import.meta.url), 'utf8')
  + await (await import('node:fs/promises')).readFile(new URL('../index.html', import.meta.url), 'utf8');
assert(!/stripe|paypal|checkout|payment|buy now|koupit hru/i.test(src), 'no payment gateway');
assert(!/id="campaign"|Klasické sektory|Mapa sektorů/i.test(src), 'campaign is not the main path');

if (fails.length) {
  console.error('FAIL');
  for (const f of fails) console.error(' -', f);
  process.exit(1);
}
console.log('ok', {
  lossPay, winPay, r1, r2, remnants: save.remnants, runs: save.runs,
  kills: combat.kills, aura: bonus, gold: g.money,
});
