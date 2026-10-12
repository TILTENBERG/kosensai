'use strict';
// npm run check-assets
// まだ画像が無い（絵文字で代わりに表示している）ものを一覧にする。
// 画像は public/assets/<種類>/<ID>.png（512×512、背景透過）に置く。

const { loadGameData, listAssets } = require('../server/data');

const data = loadGameData();
const assets = listAssets();

const KINDS = [
  ['ingredients', '食材', data.ingredients],
  ['seasonings', '調味料', data.seasonings],
  ['tools', '道具（調理方法）', data.methods.map((m) => ({ ...m, name: `${m.name}（${m.tool}）` }))],
  ['dishes', '料理', data.dishes],
];

let missingTotal = 0;
let total = 0;
console.log('画像のチェック\n');
for (const [kind, label, items] of KINDS) {
  const have = new Set(assets[kind] || []);
  const missing = items.filter((it) => !have.has(it.id));
  total += items.length;
  missingTotal += missing.length;
  console.log(`■ ${label}：${items.length - missing.length} / ${items.length} 枚あり`);
  for (const it of missing) console.log(`    まだ無い  public/assets/${kind}/${it.id}.png   ${it.emoji || ''} ${it.name}`);
  const extra = [...have].filter((id) => !items.some((it) => it.id === id));
  for (const id of extra) console.log(`    （使われていない画像  public/assets/${kind}/${id}.png）`);
  console.log('');
}
console.log(`ぜんぶで ${total - missingTotal} / ${total} 枚。のこり ${missingTotal} 枚は絵文字で表示しています。`);
