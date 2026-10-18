'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGameData } = require('../server/data');
const { validateInfo, makeReceiverView, GameRoom } = require('../server/game');

const data = loadGameData();
const curryInfo = { ingredients: ['meat', 'potato', 'rice'], seasoning: 'roux', method: 'simmer', memo: 'とろとろ' };

test('validateInfo：正しい情報は通る', () => {
  assert.deepEqual(validateInfo(curryInfo, data), curryInfo);
});

test('validateInfo：おかしな情報ははじく', () => {
  const bad = [
    null,
    { ...curryInfo, ingredients: ['meat', 'potato'] },
    { ...curryInfo, ingredients: ['meat', 'potato', 'rice', 'egg'] },
    { ...curryInfo, ingredients: ['meat', 'meat', 'rice'] },
    { ...curryInfo, ingredients: ['meat', 'potato', 'banana'] },
    { ...curryInfo, seasoning: 'sugar' },
    { ...curryInfo, method: 'boil' },
    { ...curryInfo, memo: 'カレー' }, // 語群にない自由入力
  ];
  for (const b of bad) assert.equal(validateInfo(b, data), null, JSON.stringify(b));
});

test('makeReceiverView：easy は何も隠さない', () => {
  const v = makeReceiverView(curryInfo, 'easy');
  assert.equal(v.hidden, null);
  assert.deepEqual(v.ingredients, curryInfo.ingredients);
  assert.equal(v.seasoning, 'roux');
  assert.equal(v.method, 'simmer');
});

test('makeReceiverView：hard はメモ以外から1つだけ隠し、値を送らない', () => {
  const seen = new Set();
  for (let i = 0; i < 5; i++) {
    const v = makeReceiverView(curryInfo, 'hard', () => i / 5);
    const nulls =
      v.ingredients.filter((x) => x === null).length + (v.seasoning === null) + (v.method === null);
    assert.equal(nulls, 1);
    assert.equal(v.memo, 'とろとろ');
    seen.add(JSON.stringify(v.hidden));
  }
  assert.equal(seen.size, 5); // 食材3つ・調味料・調理方法のどれも隠れうる
});

function makeRoom(config = {}) {
  const sent = [];
  const room = new GameRoom({
    send: (role, type, payload) => sent.push({ role, type, ...payload }),
    loadData: () => data,
    loadConfig: () => ({ difficulty: 'easy', resultReturnSec: 20, ...config }),
    rng: () => 0, // お題はリストの先頭（ホイコーロー）
  });
  return { room, sent };
}

test('GameRoom：1ラウンドの流れ', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { room, sent } = makeRoom();

  room.start();
  assert.equal(room.phase, 'composing');
  assert.deepEqual(sent.pop(), { role: 'sender', type: 'round_start', targetDishId: 'hoikoro' });

  // 受信側にはお題を送らない
  assert.ok(sent.every((m) => m.role !== 'receiver' || !('targetDishId' in m)));

  assert.equal(room.answer('hoikoro').ok, false); // まだ回答できない
  assert.equal(room.submitInfo(curryInfo).ok, true);
  assert.equal(room.phase, 'guessing');
  const infoMsg = sent.pop();
  assert.equal(infoMsg.role, 'receiver');
  assert.equal(infoMsg.type, 'info');
  assert.equal(infoMsg.view.targetDishId, undefined);

  assert.equal(room.submitInfo(curryInfo).ok, false); // 二重送信はできない
  assert.equal(room.answer('curry').ok, true);
  assert.equal(room.phase, 'cooking');
  const recvResult = sent.pop();
  assert.equal(recvResult.role, 'receiver');
  assert.equal(recvResult.result.made.dishId, 'curry');
  assert.equal(recvResult.result.correct, false); // お題はホイコーロー

  room.cookingDone();
  assert.equal(room.phase, 'result');
  assert.equal(sent.pop().role, 'sender');

  // 一定時間で両方リセット
  t.mock.timers.tick(20000);
  assert.equal(room.phase, 'idle');
  assert.deepEqual(sent.slice(-2).map((m) => `${m.role}:${m.type}`), ['sender:reset', 'receiver:reset']);
});

test('GameRoom：調理完了の連絡が来なくても送信側にリザルトが出る', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { room, sent } = makeRoom();
  room.start();
  room.submitInfo(curryInfo);
  room.answer('curry');
  t.mock.timers.tick(20000);
  assert.equal(room.phase, 'result');
  assert.equal(sent.at(-1).role, 'sender');
  assert.equal(sent.at(-1).type, 'result');
});

test('GameRoom：もう一回でリセット', () => {
  const { room } = makeRoom();
  room.start();
  room.again(); // リザルト以外では無視
  assert.equal(room.phase, 'composing');
  room.submitInfo(curryInfo);
  room.answer('curry');
  room.cookingDone();
  room.again();
  assert.equal(room.phase, 'idle');
  room.clearTimer();
});

test('GameRoom：同じお題が2回続かない', () => {
  const { room } = makeRoom();
  room.start();
  const first = room.round.targetDishId;
  room.reset(null);
  room.start();
  assert.notEqual(room.round.targetDishId, first);
});

test('GameRoom：再接続時の状態', () => {
  const { room } = makeRoom();
  assert.deepEqual(room.snapshotFor('receiver'), { phase: 'idle' });
  room.start();
  assert.equal(room.snapshotFor('sender').phase, 'composing');
  assert.deepEqual(room.snapshotFor('receiver'), { phase: 'idle' });
  room.submitInfo(curryInfo);
  assert.equal(room.snapshotFor('sender').phase, 'waiting');
  assert.equal(room.snapshotFor('receiver').phase, 'guessing');
  room.answer('curry');
  assert.equal(room.snapshotFor('receiver').phase, 'result');
  room.clearTimer();
});

test('GameRoom：結果が出たら onResult が呼ばれる（記録用）', () => {
  const results = [];
  const room = new GameRoom({
    send: () => {},
    loadData: () => data,
    loadConfig: () => ({ difficulty: 'easy', resultReturnSec: 20 }),
    onResult: (r) => results.push(r),
    rng: () => 0,
  });
  room.start();
  room.submitInfo(curryInfo);
  room.answer('curry');
  assert.equal(results.length, 1);
  assert.equal(results[0].percent, 100);
  room.clearTimer();
});

function idleRoom() {
  const sent = [];
  let now = 0;
  const room = new GameRoom({
    send: (role, type, payload) => sent.push({ role, type, ...payload }),
    loadData: () => data,
    loadConfig: () => ({ difficulty: 'easy', resultReturnSec: 20, idleTimeoutSec: 90 }),
    rng: () => 0,
    now: () => now,
  });
  return { room, sent, advance: (sec) => { now += sec * 1000; room.checkIdle(); } };
}

test('放置対策：90秒操作が無ければ最初に戻る（15秒前に警告）', () => {
  const { room, sent, advance } = idleRoom();
  room.start();
  advance(70);
  assert.equal(room.phase, 'composing');
  assert.equal(sent.filter((m) => m.type === 'idle_warning').length, 0);
  advance(6); // 残り14秒
  assert.deepEqual(sent.filter((m) => m.type === 'idle_warning').map((m) => m.seconds), [14, 14]);
  advance(5);
  assert.equal(sent.filter((m) => m.type === 'idle_warning').length, 2); // 警告は1回だけ
  advance(10);
  assert.equal(room.phase, 'idle');
  assert.deepEqual(sent.slice(-2).map((m) => `${m.role}:${m.type}:${m.reason}`), ['sender:reset:idle', 'receiver:reset:idle']);
});

test('放置対策：さわれば警告が消えて続けられる', () => {
  const { room, sent, advance } = idleRoom();
  room.start();
  advance(80);
  room.touch();
  assert.equal(sent.at(-1).type, 'idle_clear');
  advance(80);
  assert.equal(room.phase, 'composing');
  advance(11);
  assert.equal(room.phase, 'idle');
});

test('放置対策：タイトル・調理中・リザルトでは放置チェックしない', () => {
  const { room, advance } = idleRoom();
  advance(500);
  assert.equal(room.phase, 'idle');
  room.start();
  room.submitInfo(curryInfo);
  room.answer('curry');
  advance(500);
  assert.equal(room.phase, 'cooking');
  room.clearTimer();
});

// ---------- 選択肢（easy は4択） ----------
const { makeChoices } = require('../server/game');

test('makeChoices：お題を必ずふくむ4つ（重なりなし）', () => {
  for (let n = 0; n < 50; n++) {
    const c = makeChoices('curry', curryInfo, data.dishes, 4);
    assert.equal(c.length, 4);
    assert.equal(new Set(c).size, 4);
    assert.ok(c.includes('curry'));
    assert.ok(c.every((id) => data.dishes.some((d) => d.id === id)));
  }
});

test('makeChoices：送った情報にいちばん近い料理（ひっかけ）が入る', () => {
  // 肉・芋・米｜ルー｜煮る を送った。お題はシチュー → いちばん近いのはカレー（100点）
  for (let n = 0; n < 20; n++) {
    const c = makeChoices('stew', curryInfo, data.dishes, 4);
    assert.ok(c.includes('stew'));
    assert.ok(c.includes('curry'));
  }
});

test('makeChoices：ひっかけは全部、送った情報に近い料理から選ぶ（かんたんすぎないように）', () => {
  const { scoreDish } = require('../server/scoring');
  const score = (id) => scoreDish(curryInfo, data.dishes.find((d) => d.id === id)).score;
  for (let n = 0; n < 40; n++) {
    const c = makeChoices('curry', curryInfo, data.dishes, 4);
    const decoys = c.filter((id) => id !== 'curry');
    const left = data.dishes.map((d) => d.id).filter((id) => !c.includes(id));
    const worstDecoy = Math.min(...decoys.map(score));
    const bestLeft = Math.max(...left.map(score));
    assert.ok(worstDecoy >= bestLeft, `${decoys} の中に、選ばれなかった料理より遠いものがある`);
    // カレーの情報なら、シチューとハヤシライス（80点）は必ず入る
    assert.ok(c.includes('stew') && c.includes('hayashi'), String(c));
  }
});

test('makeChoices：同点のひっかけはランダムに入れかわる', () => {
  const seen = new Set();
  for (let n = 0; n < 60; n++) {
    for (const id of makeChoices('curry', curryInfo, data.dishes, 4)) seen.add(id);
  }
  // 60点の牛丼と親子丼は、どちらも出ることがある
  assert.ok(seen.has('gyudon') && seen.has('oyakodon'), [...seen].join(','));
});

test('makeChoices：0 や料理の数以上なら null（全部から選ぶ）', () => {
  assert.equal(makeChoices('curry', curryInfo, data.dishes, 0), null);
  assert.equal(makeChoices('curry', curryInfo, data.dishes, undefined), null);
  assert.equal(makeChoices('curry', curryInfo, data.dishes, data.dishes.length), null);
});

test('makeChoices：お題の位置はいつも同じではない', () => {
  const positions = new Set();
  for (let n = 0; n < 60; n++) positions.add(makeChoices('curry', curryInfo, data.dishes, 4).indexOf('curry'));
  assert.ok(positions.size >= 3);
});

test('GameRoom：easy は4択を受信側に送り、選択肢にない答えははじく', () => {
  const sent = [];
  const room = new GameRoom({
    send: (role, type, payload) => sent.push({ role, type, ...payload }),
    loadData: () => data,
    loadConfig: () => ({ difficulty: 'easy', resultReturnSec: 20, choices: { easy: 4, hard: 0 } }),
    rng: Math.random,
  });
  room.start();
  const target = room.round.targetDishId;
  room.submitInfo(curryInfo);
  const { view } = sent.find((m) => m.type === 'info');
  assert.equal(view.choices.length, 4);
  assert.ok(view.choices.includes(target));
  const outside = data.dishes.find((d) => !view.choices.includes(d.id)).id;
  assert.equal(room.answer(outside).ok, false);
  assert.equal(room.answer(target).ok, true);
  room.clearTimer();
});

test('GameRoom：hard は全部の料理から選ぶ（choices は null）', () => {
  const sent = [];
  const room = new GameRoom({
    send: (role, type, payload) => sent.push({ role, type, ...payload }),
    loadData: () => data,
    loadConfig: () => ({ difficulty: 'hard', resultReturnSec: 20, choices: { easy: 4, hard: 0 } }),
  });
  room.start();
  room.submitInfo(curryInfo);
  assert.equal(sent.find((m) => m.type === 'info').view.choices, null);
  room.clearTimer();
});
