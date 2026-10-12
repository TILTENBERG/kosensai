'use strict';
// ゲーム状態の管理と、送られてきた情報のチェック。
//
// 状態の流れ:
//   idle      … 送信側はタイトル、受信側は待機
//   composing … 送信側がお題を見て情報を選んでいる（受信側は待機のまま）
//   guessing  … 情報が受信側に届き、受信側が料理を選んでいる（送信側は「考え中…」）
//   cooking   … 受信側で調理アニメ中（送信側は「考え中…」のまま）
//   result    … 両方にリザルト表示。一定時間後か「もう一回」で idle へ

const { buildResult, scoreDish } = require('./scoring');

const RULES = {
  ingredientCount: 3,
};

// 調理アニメが終わった連絡が来なくても、送信側にリザルトを出すまでの上限
const COOKING_FALLBACK_MS = 20000;

// 放置でタイトルに戻る何秒前から「だれかいるかな？」を出すか
const IDLE_WARNING_SEC = 15;

// 放置チェックをする状態（だれかが操作しているはずの状態）
const IDLE_PHASES = new Set(['composing', 'guessing']);

// 送信側から届いた情報が正しい形か確認する。正しければ整えた info を、ダメなら null を返す。
function validateInfo(raw, data) {
  if (!raw || typeof raw !== 'object') return null;

  const ingredientIds = new Set(data.ingredients.map((i) => i.id));
  const ingredients = Array.isArray(raw.ingredients) ? [...new Set(raw.ingredients)] : [];
  if (ingredients.length !== RULES.ingredientCount) return null;
  if (!ingredients.every((id) => ingredientIds.has(id))) return null;

  if (!data.seasonings.some((s) => s.id === raw.seasoning)) return null;
  if (!data.methods.some((m) => m.id === raw.method)) return null;
  if (!data.memoWords.includes(raw.memo)) return null;

  return {
    ingredients,
    seasoning: raw.seasoning,
    method: raw.method,
    memo: raw.memo,
  };
}

// 受信側に見せる情報を作る。hard では一言メモ以外から1つを隠す（隠した値は送らない）。
// hidden: null | { kind: 'ingredient', index } | { kind: 'seasoning' } | { kind: 'method' }
function makeReceiverView(info, difficulty, rng = Math.random) {
  const view = {
    ingredients: [...info.ingredients],
    seasoning: info.seasoning,
    method: info.method,
    memo: info.memo,
    hidden: null,
  };
  if (difficulty !== 'hard') return view;

  const candidates = [
    ...info.ingredients.map((_, index) => ({ kind: 'ingredient', index })),
    { kind: 'seasoning' },
    { kind: 'method' },
  ];
  const hidden = candidates[Math.floor(rng() * candidates.length)];
  if (hidden.kind === 'ingredient') view.ingredients[hidden.index] = null;
  else view[hidden.kind] = null;
  view.hidden = hidden;
  return view;
}

// 受信側に見せる料理の選択肢を作る。count が 0 か料理の数以上なら null（＝全部の料理から選ぶ）。
// 選択肢 = お題 ＋ 送った情報にいちばん近い料理（ひっかけ）＋ のこりはランダム。順番はシャッフル。
function makeChoices(targetDishId, info, dishes, count, rng = Math.random) {
  if (!(count > 0) || count >= dishes.length) return null;
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const others = dishes.filter((d) => d.id !== targetDishId);

  const scored = others.map((d) => ({ id: d.id, score: scoreDish(info, d).score }));
  const best = Math.max(...scored.map((s) => s.score));
  const chosen = [targetDishId];
  if (count >= 2) chosen.push(pick(scored.filter((s) => s.score === best)).id);

  let rest = others.map((d) => d.id).filter((id) => !chosen.includes(id));
  while (chosen.length < count && rest.length) {
    const id = pick(rest);
    chosen.push(id);
    rest = rest.filter((x) => x !== id);
  }
  // シャッフル（お題がいつも同じ場所にならないように）
  for (let i = chosen.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
  }
  return chosen;
}

class GameRoom {
  // send(role, type, payload) でクライアントへ送る。loadData / loadConfig は毎ラウンド読み直す。
  // onResult(result) は1ラウンドの答えが出たときに呼ばれる（記録用）。
  constructor({ send, loadData, loadConfig, onResult = () => {}, rng = Math.random, now = Date.now }) {
    this.send = send;
    this.loadData = loadData;
    this.loadConfig = loadConfig;
    this.onResult = onResult;
    this.rng = rng;
    this.now = now;
    this.lastTargetId = null;
    this.timer = null;
    this.lastActivity = now();
    this.idleWarned = false;
    this.reset(null);
  }

  clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  // 両方の画面を最初に戻す。reason: 'again' | 'timeout' | 'idle' | 'staff'（null なら通知しない）
  reset(reason = 'timeout') {
    this.clearTimer();
    this.phase = 'idle';
    this.round = null;
    this.idleWarned = false;
    if (reason) {
      this.send('sender', 'reset', { reason });
      this.send('receiver', 'reset', { reason });
    }
  }

  // だれかが画面をさわった
  touch() {
    this.lastActivity = this.now();
    if (this.idleWarned) {
      this.idleWarned = false;
      this.send('sender', 'idle_clear', {});
      this.send('receiver', 'idle_clear', {});
    }
  }

  // 1秒ごとに呼ぶ。遊んでいる途中で放置されたら警告を出し、それでも操作が無ければ最初に戻す。
  checkIdle() {
    if (!IDLE_PHASES.has(this.phase)) return;
    const { idleTimeoutSec } = this.loadConfig();
    if (!(idleTimeoutSec > 0)) return;
    const left = idleTimeoutSec - (this.now() - this.lastActivity) / 1000;
    if (left <= 0) {
      this.reset('idle');
    } else if (left <= IDLE_WARNING_SEC && !this.idleWarned) {
      this.idleWarned = true;
      const seconds = Math.ceil(left);
      this.send('sender', 'idle_warning', { seconds });
      this.send('receiver', 'idle_warning', { seconds });
    }
  }

  // 再接続したクライアントに今の状態を渡す
  snapshotFor(role) {
    const r = this.round;
    switch (this.phase) {
      case 'composing':
        return role === 'sender' ? { phase: 'composing', targetDishId: r.targetDishId } : { phase: 'idle' };
      case 'guessing':
        return role === 'sender' ? { phase: 'waiting' } : { phase: 'guessing', view: r.view };
      case 'cooking':
        return role === 'sender' ? { phase: 'waiting' } : { phase: 'result', result: r.result };
      case 'result':
        return { phase: 'result', result: r.result };
      default:
        return { phase: 'idle' };
    }
  }

  // 送信側「スタート」：お題を決める
  start() {
    if (this.phase !== 'idle' && this.phase !== 'composing') return;
    this.clearTimer();
    const { dishes } = this.loadData();
    let pool = dishes.filter((d) => d.id !== this.lastTargetId);
    if (pool.length === 0) pool = dishes;
    const target = pool[Math.floor(this.rng() * pool.length)];
    this.lastTargetId = target.id;
    this.touch();
    this.phase = 'composing';
    this.round = { targetDishId: target.id };
    this.send('sender', 'round_start', { targetDishId: target.id });
  }

  // 送信側「送信」
  submitInfo(raw) {
    if (this.phase !== 'composing') return { ok: false, message: 'いまは送信できません' };
    const info = validateInfo(raw, this.loadData());
    if (!info) return { ok: false, message: '送る情報の形が正しくありません' };

    const { difficulty, choices } = this.loadConfig();
    const count = choices && Number(choices[difficulty]);
    this.round.info = info;
    this.round.view = makeReceiverView(info, difficulty, this.rng);
    this.round.view.choices = makeChoices(this.round.targetDishId, info, this.loadData().dishes, count, this.rng);
    this.phase = 'guessing';
    this.touch();
    this.send('receiver', 'info', { view: this.round.view });
    return { ok: true, info };
  }

  // 受信側の回答
  answer(dishId) {
    if (this.phase !== 'guessing') return { ok: false, message: 'いまは回答できません' };
    const { dishes } = this.loadData();
    if (!dishes.some((d) => d.id === dishId)) return { ok: false, message: 'その料理はありません' };
    const { choices } = this.round.view;
    if (choices && !choices.includes(dishId)) return { ok: false, message: 'その料理は選択肢にありません' };

    this.round.result = buildResult({
      info: this.round.info,
      dishes,
      targetDishId: this.round.targetDishId,
      answerDishId: dishId,
    });
    this.phase = 'cooking';
    this.onResult(this.round.result);
    // 受信側は調理アニメのあとリザルトを出す。終わったら cooking_done が来る。
    this.send('receiver', 'result', { result: this.round.result });
    this.timer = setTimeout(() => this.cookingDone(), COOKING_FALLBACK_MS);
    return { ok: true };
  }

  // 受信側の調理アニメが終わった → 送信側にもリザルトを出す
  cookingDone() {
    if (this.phase !== 'cooking') return;
    this.clearTimer();
    this.phase = 'result';
    this.send('sender', 'result', { result: this.round.result });
    const { resultReturnSec } = this.loadConfig();
    this.timer = setTimeout(() => this.reset('timeout'), resultReturnSec * 1000);
  }

  // どちらかの「もう一回」
  again() {
    if (this.phase !== 'result') return;
    this.reset('again');
  }
}

module.exports = { RULES, COOKING_FALLBACK_MS, IDLE_WARNING_SEC, validateInfo, makeReceiverView, makeChoices, GameRoom };
