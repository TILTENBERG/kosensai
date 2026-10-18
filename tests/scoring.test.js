'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGameData } = require('../server/data');
const { scoreDish, findBestDish, resultTier, buildResult } = require('../server/scoring');

const { dishes } = loadGameData();
const dish = (id) => dishes.find((d) => d.id === id);
const info = (ingredients, seasoning, method) => ({ ingredients, seasoning, method, memo: 'あまい' });

test('全部一致で100点', () => {
  const s = scoreDish(info(['meat', 'potato', 'rice'], 'roux', 'simmer'), dish('curry'));
  assert.deepEqual(s, { dishId: 'curry', score: 100, ingredientMatches: 3, seasoningMatch: true, methodMatch: true });
});

test('食材の順番は関係ない', () => {
  const a = scoreDish(info(['rice', 'meat', 'potato'], 'roux', 'simmer'), dish('curry'));
  assert.equal(a.score, 100);
});

test('項目ごとの点数：食材1つ20点、調味料20点、調理方法20点', () => {
  const curry = dish('curry'); // 肉、芋、米｜ルー｜煮る
  assert.equal(scoreDish(info(['egg', 'tomato', 'flour'], 'mayo', 'bake'), curry).score, 0);
  assert.equal(scoreDish(info(['meat', 'tomato', 'flour'], 'mayo', 'bake'), curry).score, 20);
  assert.equal(scoreDish(info(['meat', 'potato', 'flour'], 'mayo', 'bake'), curry).score, 40);
  assert.equal(scoreDish(info(['meat', 'potato', 'rice'], 'mayo', 'bake'), curry).score, 60);
  assert.equal(scoreDish(info(['meat', 'potato', 'rice'], 'roux', 'bake'), curry).score, 80);
  assert.equal(scoreDish(info(['egg', 'tomato', 'flour'], 'roux', 'simmer'), curry).score, 40);
});

test('最高点の料理を選ぶ（ハヤシライスと牛丼は調味料で区別）', () => {
  assert.equal(findBestDish(info(['meat', 'onion', 'rice'], 'roux', 'simmer'), dishes).dishId, 'hayashi');
  assert.equal(findBestDish(info(['meat', 'onion', 'rice'], 'soysauce', 'simmer'), dishes).dishId, 'gyudon');
});

test('同点ならお題の料理を優先する', () => {
  // 牛丼（醤油）とハヤシライス（ルー）が両方80点になる
  const sent = info(['meat', 'onion', 'rice'], 'saltpepper', 'simmer');
  assert.equal(scoreDish(sent, dish('gyudon')).score, 80);
  assert.equal(scoreDish(sent, dish('hayashi')).score, 80);
  assert.equal(findBestDish(sent, dishes, 'hayashi').dishId, 'hayashi');
  assert.equal(findBestDish(sent, dishes, 'gyudon').dishId, 'gyudon');
});

test('同点でお題が含まれないならリストの順番が先の料理', () => {
  const sent = info(['meat', 'onion', 'rice'], 'saltpepper', 'simmer');
  assert.equal(findBestDish(sent, dishes, 'curry').dishId, 'gyudon');
  assert.equal(findBestDish(sent, dishes).dishId, 'gyudon');
});

test('お題が後ろにあって同点でも、より高い点の料理が勝つ', () => {
  // カレーの情報を送ったが、お題はシチュー → カレー100点 > シチュー80点
  const sent = info(['meat', 'potato', 'rice'], 'roux', 'simmer');
  assert.equal(findBestDish(sent, dishes, 'stew').dishId, 'curry');
});

test('演出の種類', () => {
  assert.equal(resultTier(100), 'perfect');
  assert.equal(resultTier(80), 'close');
  assert.equal(resultTier(60), 'close');
  assert.equal(resultTier(40), 'mystery');
  assert.equal(resultTier(20), 'mystery');
  assert.equal(resultTier(0), 'mystery');
});

test('buildResult：正解のとき', () => {
  const r = buildResult({
    info: info(['meat', 'potato', 'rice'], 'roux', 'simmer'),
    dishes,
    targetDishId: 'curry',
    answerDishId: 'curry',
  });
  assert.equal(r.made.dishId, 'curry');
  assert.equal(r.percent, 100);
  assert.equal(r.tier, 'perfect');
  assert.equal(r.correct, true);
  assert.equal(r.targetDishId, 'curry');
});

test('buildResult：なぞの料理・不正解のとき', () => {
  const r = buildResult({
    info: info(['tomato', 'flour', 'pepper'], 'vinegar', 'deepfry'),
    dishes,
    targetDishId: 'curry',
    answerDishId: 'hamburg',
  });
  assert.equal(r.percent, 40);
  assert.equal(r.tier, 'mystery');
  assert.equal(r.made.dishId, 'nikuzume'); // 40点の料理（ピーマンの肉詰め・酢豚）のうちリストで最初
  assert.equal(r.correct, false);
  assert.equal(r.answerDishId, 'hamburg');
});

test('作れた料理と回答は別：作れた料理が違ってもお題を当てれば正解', () => {
  const r = buildResult({
    info: info(['meat', 'potato', 'rice'], 'roux', 'simmer'), // カレーの情報
    dishes,
    targetDishId: 'stew',
    answerDishId: 'stew',
  });
  assert.equal(r.made.dishId, 'curry');
  assert.equal(r.correct, true);
});

test('データの全料理が自分自身の情報で100点・自分が選ばれる', () => {
  for (const d of dishes) {
    const sent = info(d.ingredients, d.seasoning, d.method);
    const best = findBestDish(sent, dishes, d.id);
    assert.equal(best.score, 100, d.id);
    assert.equal(best.dishId, d.id, d.id);
  }
});
