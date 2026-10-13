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
  // mystery … リザルトの「なぞの料理」用（無ければ作れた料理を変な色で出す）
  ['dishes', '料理', [...data.dishes, { id: 'mystery', name: 'なぞの料理（リザルト用）', emoji: '❓' }]],
];

// キャラクターのポーズ（docs/ART_PROMPTS.md）。無いポーズは近いポーズで代わりに出す
const POSES = {
  sender: ['idle', 'guide', 'think', 'happy', 'almost', 'oops', 'send'],
  receiver: ['idle', 'guide', 'think', 'happy', 'almost', 'oops', 'receive'],
};
const BACKGROUNDS = [['sender', 'おくる人の背景'], ['receiver', 'あてる人の背景'], ['cooking', '調理画面の背景']];

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
// キャラと背景（無くてもゲームは動く。今までどおりの見た目になるだけ）
for (const [side, label] of [['sender', 'おくる人'], ['receiver', 'あてる人']]) {
  const have = new Set(assets.chara[side]);
  const missing = POSES[side].filter((p) => !have.has(p));
  total += POSES[side].length;
  missingTotal += missing.length;
  console.log(`■ キャラ（${label}）：${POSES[side].length - missing.length} / ${POSES[side].length} 枚あり${have.size === 0 ? '（1枚も無いのでキャラは出ません）' : ''}`);
  for (const p of missing) console.log(`    まだ無い  public/assets/chara/${side}/${p}.png`);
  console.log('');
}
const bgMissing = BACKGROUNDS.filter(([id]) => !assets.bg[id]);
total += BACKGROUNDS.length;
missingTotal += bgMissing.length;
console.log(`■ 背景：${BACKGROUNDS.length - bgMissing.length} / ${BACKGROUNDS.length} 枚あり`);
for (const [id, label] of bgMissing) console.log(`    まだ無い  public/assets/bg/${id}.jpg   ${label}`);
console.log('');

console.log(`ぜんぶで ${total - missingTotal} / ${total} 枚。のこり ${missingTotal} 枚は、絵文字や今までの見た目で代わりに表示しています。`);
