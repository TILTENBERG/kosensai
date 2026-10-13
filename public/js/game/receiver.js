// 受信側（PC2）
// 待機 → 情報表示 → 回答（料理カード）→ 調理アニメ → リザルト
import { Net } from './net.js';
import { loadBootstrap, resolveResult } from './data.js';
import { Picker } from './selection.js';
import { showScreen, currentScreen, onScreen, h } from './screens.js';
import { iconEl } from '../ui/icons.js';
import { initPage, setPeerStatus, connectPageFeatures } from '../ui/page.js';
import { renderInfoBoard } from '../ui/infoboard.js';
import { playReceiveAnimation, playCookingAnimation, showResult, sparkleOn } from '../ui/animation.js';
import { setChara } from '../ui/chara.js';

const game = await loadBootstrap();
initPage(game, 'receiver');
const net = new Net('receiver');
connectPageFeatures(net);
const $ = (id) => document.getElementById(id);

// 画面ごとのキャラのポーズとセリフ（リザルトは animation.js の showResult が決める）
const CHARA_LINES = {
  waiting: ['idle', 'おくる人の 料理を まってるよ！'],
  info: ['think', 'ヒントを よく見てね'],
  answer: ['think', 'どれかな～？ 1つ えらんでね'],
  cooking: ['guide', 'おいしくなあれ！'],
};
onScreen((name) => {
  if (name === 'answer') return refreshAnswer(); // 選んだかどうかでセリフが変わる
  if (CHARA_LINES[name]) setChara(...CHARA_LINES[name]);
});

const answerPicker = new Picker(1);
const dishButtons = new Map();
let currentView = null;
let roundSeq = 0; // リセットされたら古い演出の続きを捨てるための番号

// ---------- 料理カード ----------

function buildDishGrid() {
  const grid = $('dish-grid');
  for (const dish of game.dishes) {
    const btn = h('button', { class: 'dish-card', dataset: { id: dish.id } },
      iconEl('dishes', dish, 'icon icon--dish'),
      h('span', { class: `dish-card__name${dish.name.length >= 7 ? ' is-long' : ''}` }, dish.name),
    );
    btn.addEventListener('click', () => {
      if (answerPicker.toggle(dish.id) !== 'removed') sparkleOn(btn);
      refreshAnswer();
    });
    dishButtons.set(dish.id, btn);
    grid.append(btn);
  }
}

// 選択肢があれば（easy の4択）その料理だけを大きく並べる。null なら全部の料理を出す
function applyChoices(choices) {
  const grid = $('dish-grid');
  grid.classList.toggle('dish-grid--choices', !!choices);
  for (const [id, btn] of dishButtons) {
    const idx = choices ? choices.indexOf(id) : 0;
    btn.hidden = idx < 0;
    btn.style.order = choices ? idx : '';
  }
  $('answer-instruction').textContent = choices
    ? `どの料理かな？${choices.length}つから1つえらんでね`
    : 'どの料理かな？1つえらんでね';
}

function refreshAnswer() {
  for (const [id, btn] of dishButtons) btn.classList.toggle('selected', answerPicker.has(id));
  const done = answerPicker.isComplete();
  $('answer-btn').disabled = !done;
  $('answer-btn').classList.toggle('btn--pulse', done);
  $('answer-status').textContent = done ? '「これにする！」をおしてね' : '';
  if (currentScreen() === 'answer') setChara('think', done ? 'これで いいかな？ 「これにする！」をおしてね' : CHARA_LINES.answer[1]);
}

// ---------- 各画面 ----------

async function receiveInfo(view, animate) {
  roundSeq++;
  currentView = view;
  answerPicker.clear();
  applyChoices(view.choices || null);
  refreshAnswer();
  renderInfoBoard($('info-board'), view, game);
  renderInfoBoard($('info-strip'), view, game, { compact: true });
  showScreen('info');
  if (animate) {
    $('to-answer').disabled = true;
    setChara('receive', 'きたきた！');
    await playReceiveAnimation(view);
    $('to-answer').disabled = false;
    if (currentScreen() === 'info') setChara(...CHARA_LINES.info);
  }
}

async function cookAndShow(result) {
  const seq = roundSeq;
  const r = resolveResult(result, game);
  showScreen('cooking');
  await playCookingAnimation(result.sentInfo, r.sent.method, r.madeDish);
  if (seq !== roundSeq) return; // 途中でリセットされた
  net.send('cooking_done');
  showResultScreen(result);
}

function showResultScreen(result) {
  showResult(resolveResult(result, game));
  showScreen('result');
}

function goWaiting() {
  roundSeq++;
  currentView = null;
  showScreen('waiting');
}

// ---------- ボタン ----------

$('to-answer').addEventListener('click', () => showScreen('answer'));
$('answer-back').addEventListener('click', () => showScreen('info'));
$('answer-btn').addEventListener('click', () => {
  $('answer-btn').disabled = true;
  if (!net.send('answer', { dishId: answerPicker.values[0] })) {
    $('answer-status').textContent = 'サーバーにつながっていません';
    $('answer-btn').disabled = false;
  }
});
for (const btn of document.querySelectorAll('[data-again]')) {
  btn.addEventListener('click', () => net.send('again'));
}

// ---------- 通信 ----------

net.on('info', (msg) => receiveInfo(msg.view, true));
net.on('result', (msg) => cookAndShow(msg.result));
net.on('reset', goWaiting);
net.on('error', (msg) => {
  $('answer-status').textContent = msg.message;
  setChara('almost', msg.message); // 下の段のヒントはキャラがいると見えないので、ふきだしでも知らせる
  refreshAnswer();
});

// 接続（再接続）したときに、サーバーの状態に合わせる
net.on('sync', ({ state }) => {
  switch (state.phase) {
    case 'guessing':
      // 同じ情報を見ている途中なら、そのまま続ける
      if (JSON.stringify(currentView) !== JSON.stringify(state.view)) receiveInfo(state.view, false);
      break;
    case 'result':
      // 調理アニメ中なら、終わったときに cooking_done を送るのでそのまま
      if (currentScreen() === 'cooking') break;
      // ページを開き直した場合は、アニメを飛ばして送信側にもリザルトを出してもらう
      net.send('cooking_done');
      showResultScreen(state.result);
      break;
    default:
      goWaiting();
  }
});

net.on('peers', (msg) => setPeerStatus($('peer-status'), 'おくる人', msg.sender));

buildDishGrid();
showScreen('waiting');
