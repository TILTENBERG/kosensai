// 画面切りかえ。data-screen="名前" を持つ要素のうち1つだけを表示する。

let current = null;
const listeners = [];

// 画面が切りかわったときに呼ばれる関数を登録する（キャラのセリフなど）
export function onScreen(fn) {
  listeners.push(fn);
}

export function showScreen(name) {
  for (const el of document.querySelectorAll('[data-screen]')) {
    el.hidden = el.dataset.screen !== name;
  }
  current = name;
  // CSS で画面ごとにキャラや背景を変えるため
  const app = document.getElementById('app');
  if (app) app.dataset.now = name; // data-screen にすると、上の行で #app ごと隠れてしまう
  window.scrollTo(0, 0);
  for (const fn of listeners) fn(name);
}

export function currentScreen() {
  return current;
}

// 小さな要素作成ヘルパー
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== undefined && v !== null && v !== false) el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}
