'use strict';
// npm run check-dishes
// 料理データをチェックして、区別できない料理の組み合わせを一覧表示する。
//   [A] 食材＋調味料＋調理方法 がまったく同じ → 送る情報では絶対に区別できない（要修正）
//   [B] 食材＋調理方法 が同じ → 調味料だけで区別している
//   [C] 食材 が同じ（参考）

const { loadGameData } = require('../server/data');
const { RULES } = require('../server/game');

const data = loadGameData();
const { dishes } = data;
const nameOf = (list, id) => (list.find((x) => x.id === id) || {}).name || `？(${id})`;

// ---- データの形チェック ----
const errors = [];
const ids = new Set();
const ingredientIds = new Set(data.ingredients.map((i) => i.id));
for (const d of dishes) {
  if (!/^[a-z0-9]+$/i.test(d.id)) errors.push(`${d.name}: IDは英数字にしてください (${d.id})`);
  if (ids.has(d.id)) errors.push(`${d.name}: IDが重複しています (${d.id})`);
  ids.add(d.id);
  const uniq = new Set(d.ingredients);
  if (uniq.size !== RULES.ingredientCount) {
    errors.push(`${d.name}: 食材はちがうもの${RULES.ingredientCount}つにしてください`);
  }
  for (const i of d.ingredients) if (!ingredientIds.has(i)) errors.push(`${d.name}: 食材IDがありません (${i})`);
  if (!data.seasonings.some((s) => s.id === d.seasoning)) errors.push(`${d.name}: 調味料IDがありません (${d.seasoning})`);
  if (!data.methods.some((m) => m.id === d.method)) errors.push(`${d.name}: 調理方法IDがありません (${d.method})`);
}

// ---- 同じ組み合わせを探す ----
const ingKey = (d) => [...new Set(d.ingredients)].sort().join('+');

function groupBy(keyFn) {
  const map = new Map();
  for (const d of dishes) {
    const k = keyFn(d);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(d);
  }
  return [...map.values()].filter((g) => g.length > 1);
}

function describe(d) {
  const ing = d.ingredients.map((i) => nameOf(data.ingredients, i)).join('、');
  return `${d.name}（${ing}｜${nameOf(data.seasonings, d.seasoning)}｜${nameOf(data.methods, d.method)}）`;
}

function printGroups(title, groups) {
  console.log(`\n${title}: ${groups.length}組`);
  if (groups.length === 0) console.log('  なし');
  groups.forEach((g, n) => {
    console.log(`  ${n + 1}.`);
    for (const d of g) console.log(`     - ${describe(d)}`);
  });
}

console.log(`料理データチェック（${dishes.length}品）`);

if (errors.length) {
  console.log(`\n[!] データの間違い: ${errors.length}件`);
  for (const e of errors) console.log(`  - ${e}`);
}

const full = groupBy((d) => `${ingKey(d)}|${d.seasoning}|${d.method}`);
const ingMethod = groupBy((d) => `${ingKey(d)}|${d.method}`);
const ingOnly = groupBy(ingKey);

printGroups('[A] 食材＋調味料＋調理方法 がまったく同じ（区別できない・要修正）', full);
printGroups('[B] 食材＋調理方法 が同じ（調味料だけで区別）', ingMethod);
printGroups('[C] 食材 が同じ（参考）', ingOnly);
console.log('');

process.exitCode = errors.length || full.length ? 1 : 0;
