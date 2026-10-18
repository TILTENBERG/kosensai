// キャラクター（おくる人＝オレンジの子、あてる人＝ブルーの子）。
// public/assets/chara/<side>/<pose>.png があれば表示し、ふきだしでしゃべる。
// 画像が1枚も無いときは何も出さない（今までどおりの画面で動く）。
//
//   initChara(game, side)       … ページ準備のときに1回
//   setChara(pose, text)        … ポーズとセリフを変える（text が空ならふきだしを消す）
//   charaReact(kind)            … 'jump' | 'shake' | 'fall' の一発アクション
//
// 位置と大きさは CSS（#app[data-screen="…"] .chara）で画面ごとに決める。

import { h } from '../game/screens.js';

// 無いポーズの代わりに使うポーズ
const FALLBACK = {
  send: ['happy', 'guide'],
  receive: ['happy', 'guide'],
  happy: ['guide'],
  almost: ['think'],
  oops: ['almost', 'think'],
  guide: [],
  think: [],
};

let side = null;
let poses = new Set();
let el = null;
let img = null;
let bubble = null;
let current = null;
let currentText = '';

export function initChara(game, who) {
  side = who;
  poses = (game.assets.chara && game.assets.chara[who]) || new Set();
  if (poses.size === 0) return;

  img = h('img', { class: 'chara__img', alt: '', draggable: 'false' });
  bubble = h('div', { class: 'chara__bubble', hidden: true });
  el = h('div', { class: `chara chara--${who}`, 'aria-hidden': 'true' }, bubble, h('div', { class: 'chara__body' }, img));
  // 置いてあるはずの画像が壊れていたら、キャラごと消す
  img.addEventListener('error', () => { el.hidden = true; });
  const app = document.getElementById('app');
  app.append(el);
  app.classList.add('has-chara');
}

function resolvePose(pose) {
  for (const p of [pose, ...(FALLBACK[pose] || []), 'idle']) {
    if (poses.has(p)) return p;
  }
  return [...poses][0];
}

export function setChara(pose, text = '') {
  if (!el) return;
  const p = resolvePose(pose);
  if (p !== current) {
    current = p;
    img.src = `assets/chara/${side}/${p}.png`;
    // ポーズが変わったら、前のアクション（ずっこけ等）を消して、ぽよんと出てくる
    el.classList.remove('is-pop', 'is-jump', 'is-shake', 'is-fall');
    void el.offsetWidth;
    el.classList.add('is-pop');
  }
  // ふりがなが足されると textContent が変わるので、前のセリフは変数で覚えておく
  if (currentText !== text) {
    currentText = text;
    // 分かち書きのスペースごとに区切って、言葉の途中（ふりがなの境目）で改行されないようにする
    bubble.replaceChildren(...text.split(' ').flatMap((w, i) => [i ? ' ' : '', h('span', { class: 'chara__phrase' }, w)]));
    bubble.hidden = !text;
    if (text) {
      bubble.classList.remove('is-pop');
      void bubble.offsetWidth;
      bubble.classList.add('is-pop');
    }
  }
}

export function charaReact(kind) {
  if (!el) return;
  const cls = `is-${kind}`;
  el.classList.remove('is-jump', 'is-shake', 'is-fall');
  void el.offsetWidth;
  el.classList.add(cls);
}
