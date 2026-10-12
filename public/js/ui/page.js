// 送信側・受信側で共通のページ準備。
import { setAssets } from './icons.js';
import { setFuriganaDictionary, watchFurigana } from './furigana.js';
import { fitStage, lockInteractions } from './stage.js';
import { initSound } from './sound.js';
import { setAnimationData } from './animation.js';

// タイトル画面のまわりにふわふわ浮かぶ食材（[左%, 上%, 遅れ秒]）
// タイトル文字（中央）にかぶらないよう、左右と下の端に置く
const DECOR_SPOTS = [
  [3, 6, 0], [12, 34, 0.6], [4, 60, 1.2], [14, 82, 1.8], [26, 84, 0.9],
  [90, 6, 0.3], [81, 32, 0.9], [91, 58, 1.5], [80, 82, 2.1], [67, 84, 2.4],
];

export function initPage(game) {
  setAssets(game.assets);
  initSound(game);
  setAnimationData(game);
  setFuriganaDictionary(game.furigana || {});
  const app = document.getElementById('app');
  watchFurigana(app);
  fitStage(app);
  lockInteractions();

  const decor = document.getElementById('title-decor');
  if (decor) {
    const emojis = game.ingredients.map((i) => i.emoji);
    DECOR_SPOTS.forEach(([x, y, delay], n) => {
      const s = document.createElement('span');
      s.textContent = emojis[n % emojis.length];
      s.style.left = `${x}%`;
      s.style.top = `${y}%`;
      s.style.animationDelay = `${delay}s`;
      decor.append(s);
    });
  }
}

// 上のバーの「相手の接続状態」
export function setPeerStatus(el, label, connected) {
  el.textContent = `${label}：${connected ? 'OK' : 'まだ'}`;
  el.classList.toggle('is-ok', connected);
}

// ---------- 展示用の機能（記録・放置対策・スタッフ用リセット） ----------

const ACTIVITY_INTERVAL_MS = 3000;

export function connectPageFeatures(net) {
  // きょうのきろく
  net.on('stats', ({ stats }) => {
    for (const el of document.querySelectorAll('[data-stats]')) {
      const title = document.createElement('span');
      title.className = 'today-stats__title';
      title.textContent = 'きょうのきろく';
      el.replaceChildren(
        title,
        statItem('🎮', 'あそんだ', stats.plays),
        statItem('⭕', '正解', stats.correct),
        statItem('🏆', '100%', stats.perfect),
      );
      el.hidden = false;
    }
  });

  // 画面がさわられたらサーバーに知らせる（放置対策。送りすぎないよう間引く）
  let lastSent = 0;
  const onActivity = () => {
    hideIdleWarning();
    const now = Date.now();
    if (now - lastSent < ACTIVITY_INTERVAL_MS) return;
    lastSent = now;
    net.send('activity');
  };
  window.addEventListener('pointerdown', onActivity);
  window.addEventListener('keydown', onActivity);

  // スタッフ用リセット：Ctrl + Shift + R（ブラウザの再読み込みより先に送る）
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
      e.preventDefault();
      net.send('staff_reset');
    }
  }, true);

  net.on('idle_warning', ({ seconds }) => showIdleWarning(seconds));
  net.on('idle_clear', hideIdleWarning);
  net.on('reset', ({ reason }) => {
    hideIdleWarning();
    if (reason === 'staff') toast('スタッフリセットしました');
    if (reason === 'idle') toast('しばらく操作がなかったので、さいしょにもどりました');
  });
}

function statItem(emoji, label, value) {
  const el = document.createElement('span');
  el.className = 'today-stats__item';
  el.innerHTML = `<span class="today-stats__emoji">${emoji}</span><span class="today-stats__label"></span><strong></strong>`;
  el.querySelector('.today-stats__label').textContent = label;
  el.querySelector('strong').textContent = `${value}回`;
  return el;
}

// 「だれかいるかな？」カウントダウン
let idleTimer = null;

function showIdleWarning(seconds) {
  hideIdleWarning();
  const app = document.getElementById('app');
  const el = document.createElement('div');
  el.className = 'idle-warning';
  el.innerHTML = `
    <div class="idle-warning__box">
      <p class="idle-warning__title">まだあそんでるかな？</p>
      <p class="idle-warning__count"><strong></strong></p>
      <p class="idle-warning__hint">画面をさわると つづけられるよ</p>
    </div>`;
  app.append(el);
  let left = seconds;
  const num = el.querySelector('strong');
  num.textContent = left;
  idleTimer = setInterval(() => {
    left = Math.max(0, left - 1);
    num.textContent = left;
  }, 1000);
}

function hideIdleWarning() {
  if (idleTimer) clearInterval(idleTimer);
  idleTimer = null;
  for (const el of document.querySelectorAll('.idle-warning')) el.remove();
}

// 画面の下に少しだけ出るお知らせ
function toast(text) {
  for (const old of document.querySelectorAll('.toast')) old.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  document.getElementById('app').append(el);
  setTimeout(() => el.remove(), 3500);
}
