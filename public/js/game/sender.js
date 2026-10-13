// 送信側（PC1）
// タイトル → お題 → 食材3つ → 調味料 → 調理方法 → 一言メモ → 確認 → 送信アニメ → 待機 → リザルト
import { Net } from './net.js';
import { loadBootstrap, resolveResult } from './data.js';
import { Picker } from './selection.js';
import { showScreen, currentScreen, onScreen, h } from './screens.js';
import { iconEl } from '../ui/icons.js';
import { initPage, setPeerStatus, connectPageFeatures } from '../ui/page.js';
import { renderInfoBoard } from '../ui/infoboard.js';
import { playSendAnimation, showResult, sparkleOn } from '../ui/animation.js';
import { setChara } from '../ui/chara.js';

const game = await loadBootstrap();
initPage(game, 'sender');
const net = new Net('sender');
connectPageFeatures(net);
const $ = (id) => document.getElementById(id);

// 画面ごとのキャラのポーズとセリフ（リザルトは animation.js の showResult が決める）
const CHARA_LINES = {
  title: ['idle', 'いっしょに 料理を つたえよう！'],
  topic: ['guide', 'この料理の ヒントを えらんでね！'],
  confirm: ['guide', 'じゅんび OK？'],
  sending: ['send', 'とどけー！'],
  waiting: ['think', 'あてる人が 考えてるよ…'],
};
onScreen((name) => {
  if (CHARA_LINES[name]) setChara(...CHARA_LINES[name]);
  // 選択ステップでは、下の段のヒント（あと○つ…）をキャラがしゃべる
  const step = steps.find((s) => s.screen === name);
  if (step) setChara(step.picker.isComplete() ? 'happy' : 'guide', step.hintText);
});

let targetDishId = null;
let busy = false; // 送信アニメ中

// ---------- 選択ステップ ----------

const steps = [
  {
    key: 'ingredients',
    max: 3,
    short: '食材',
    instruction: '食材を3つえらんでね',
    items: game.ingredients.map((i) => ({ id: i.id, label: i.name, icon: () => iconEl('ingredients', i) })),
  },
  {
    key: 'seasoning',
    max: 1,
    short: '調味料',
    instruction: '調味料を1つえらんでね',
    items: game.seasonings.map((s) => ({ id: s.id, label: s.name, icon: () => iconEl('seasonings', s) })),
  },
  {
    key: 'method',
    max: 1,
    short: '調理方法',
    instruction: '調理方法を1つえらんでね',
    items: game.methods.map((m) => ({ id: m.id, label: m.name, sub: m.tool, icon: () => iconEl('tools', m) })),
  },
  {
    key: 'memo',
    max: 1,
    short: '一言メモ',
    instruction: '一言メモを1つえらんでね',
    items: game.memoWords.map((w) => ({ id: w, label: w })),
  },
];

for (const step of steps) {
  step.picker = new Picker(step.max);
  step.buttons = new Map();
  step.screen = `step-${step.key}`;
}

function buildStepScreens() {
  const container = $('steps');
  steps.forEach((step, n) => {
    const grid = h('div', { class: `choices choices--${step.key}` });
    for (const item of step.items) {
      const btn = h('button', { class: 'choice', dataset: { id: item.id } },
        item.icon ? item.icon() : null,
        h('span', { class: 'choice__label' }, item.label),
        item.sub ? h('span', { class: 'choice__sub' }, item.sub) : null,
      );
      btn.addEventListener('click', () => onPick(step, item.id));
      step.buttons.set(item.id, btn);
      grid.append(btn);
    }
    step.items.byId = new Map(step.items.map((it) => [it.id, it]));
    step.plate = h('div', { class: 'plate' });
    // 食材のステップは「おなべ」に入れていく（おさらの代わり）
    if (step.key === 'ingredients') {
      step.pot = buildPot(step);
      step.plate = h('div', { class: 'pot-names' });
    }
    step.nextBtn = h('button', { class: 'btn btn--primary', onClick: () => goStep(n + 1) }, 'つぎへ ▶');
    step.hint = h('p', { class: 'nav__hint' });
    const backBtn = h('button', { class: 'btn btn--secondary', onClick: () => goStep(n - 1) }, '◀ もどる');

    container.append(
      h('section', { class: 'screen', dataset: { screen: step.screen }, hidden: true },
        h('div', { class: 'step-head' },
          h('div', { class: 'topic-mini', 'data-topic-mini': true }),
          h('p', { class: 'instruction' }, step.instruction),
        ),
        step.pot
          ? h('div', { class: 'step-body' }, grid, h('div', { class: 'pot-panel' }, step.pot.el, step.plate))
          : [step.plate, grid],
        h('div', { class: 'nav' }, backBtn, step.hint, step.nextBtn),
      ),
    );
    refreshStep(step);
  });
}

// 「おなべ」：選んだ食材が鍋に落ちて入る。3つそろうと湯気が出る。鍋の中の食材を押すと取り出せる
function buildPot(step) {
  const items = h('div', { class: 'pot__items' });
  const el = h('div', { class: 'pot' },
    h('div', { class: 'pot__steam' }, h('i'), h('i'), h('i')),
    h('div', { class: 'pot__back' }),
    items,
    h('div', { class: 'pot__handle pot__handle--l' }),
    h('div', { class: 'pot__handle pot__handle--r' }),
    h('div', { class: 'pot__front' }),
    h('div', { class: 'pot__stove' }),
  );
  return { el, items, lastAdded: null };
}

function refreshPot(step) {
  const pot = step.pot;
  pot.items.replaceChildren(...step.picker.values.map((id, i) => {
    const item = step.items.byId.get(id);
    const btn = h('button', { class: `pot__item${id === pot.lastAdded ? ' drop-in' : ''}`, 'aria-label': `${item.label}をとりだす` }, item.icon());
    btn.style.setProperty('--tilt', `${[-12, 4, 14][i]}deg`);
    btn.addEventListener('click', () => onPick(step, id));
    return btn;
  }));
  pot.el.classList.toggle('is-full', step.picker.isComplete());
  pot.lastAdded = null;
}

function hop(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

function onPick(step, id) {
  const r = step.picker.toggle(id);
  if (r === 'added' || r === 'replaced') sparkleOn(step.buttons.get(id));
  if (r === 'added' && step.pot) {
    step.pot.lastAdded = id;
    hop(step.pot.el, 'hop');
  }
  if (r === 'full') {
    // いっぱい：ボタンとおさら（おなべ）をゆらして知らせる
    for (const el of [step.buttons.get(id), step.pot ? step.pot.el : step.plate]) {
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
    }
  }
  refreshStep(step);
}

function refreshStep(step) {
  for (const [id, btn] of step.buttons) btn.classList.toggle('selected', step.picker.has(id));

  // おさら：選んだものが入る枠
  const slots = [];
  for (let i = 0; i < step.max; i++) {
    const id = step.picker.values[i];
    const item = id && step.items.byId.get(id);
    slots.push(
      item
        ? h('div', { class: 'plate__slot is-filled' }, item.icon ? item.icon() : null, item.label)
        : h('div', { class: 'plate__slot' }, '？'),
    );
  }
  step.plate.replaceChildren(...slots);
  if (step.pot) refreshPot(step);

  const left = step.max - step.picker.values.length;
  step.hintText = left > 0 ? `あと${left}つ えらんでね` : 'OK！「つぎへ」をおしてね';
  step.hint.textContent = step.hintText;
  if (currentScreen() === step.screen) setChara(left > 0 ? 'guide' : 'happy', step.hintText);
  step.nextBtn.disabled = !step.picker.isComplete();
  step.nextBtn.classList.toggle('btn--pulse', step.picker.isComplete());
}

// 上のバーの進みぐあい（n: 0..3 = 選択ステップ、4 = 確認、null = 非表示）
function setProgress(n) {
  const bar = $('progress');
  if (n === null) {
    bar.hidden = true;
    return;
  }
  const labels = [...steps.map((s) => s.short), 'かくにん'];
  const parts = [];
  labels.forEach((label, i) => {
    if (i > 0) parts.push(h('span', { class: 'progress__arrow' }, '▶'));
    const cls = i < n ? 'is-done' : i === n ? 'is-current' : '';
    parts.push(h('span', { class: `progress__step ${cls}` }, i < n ? '✓' : `${i + 1}`, ' ', label));
  });
  bar.replaceChildren(...parts);
  bar.hidden = false;
}

// n: -1 = お題、0..3 = 選択ステップ、4 = 確認
function goStep(n) {
  if (n < 0) return showTopic();
  if (n >= steps.length) return showConfirm();
  setProgress(n);
  showScreen(steps[n].screen);
}

function currentInfo() {
  const [ing, sea, met, memo] = steps.map((s) => s.picker.values);
  return { ingredients: [...ing], seasoning: sea[0], method: met[0], memo: memo[0] };
}

// ---------- 各画面 ----------

function startRound(dishId) {
  targetDishId = dishId;
  for (const step of steps) {
    step.picker.clear();
    refreshStep(step);
  }
  const dish = game.dishById.get(dishId);
  $('topic-card').replaceChildren(
    h('p', { class: 'topic-card__label' }, 'お題'),
    iconEl('dishes', dish, 'icon icon--xl'),
    h('p', { class: 'topic-card__name' }, dish.name),
  );
  for (const el of document.querySelectorAll('[data-topic-mini]')) {
    el.replaceChildren(
      iconEl('dishes', dish),
      h('span', {}, h('span', { class: 'topic-mini__label' }, 'お題'), h('br'), dish.name),
    );
  }
  showTopic();
}

function showTopic() {
  setProgress(null);
  showScreen('topic');
}

function showConfirm() {
  renderInfoBoard($('summary'), currentInfo(), game);
  $('confirm-status').textContent = '';
  $('send-btn').disabled = false;
  setProgress(steps.length);
  showScreen('confirm');
}

function showResultScreen(result) {
  setProgress(null);
  showResult(resolveResult(result, game));
  showScreen('result');
}

function goTitle() {
  targetDishId = null;
  setProgress(null);
  showScreen('title');
}

// ---------- ボタン ----------

$('start-btn').addEventListener('click', () => net.send('start'));
$('topic-next').addEventListener('click', () => goStep(0));
$('confirm-back').addEventListener('click', () => goStep(steps.length - 1));
$('send-btn').addEventListener('click', () => {
  $('send-btn').disabled = true;
  if (!net.send('send_info', { info: currentInfo() })) {
    $('confirm-status').textContent = 'サーバーにつながっていません';
    $('send-btn').disabled = false;
  }
});
for (const btn of document.querySelectorAll('[data-again]')) {
  btn.addEventListener('click', () => net.send('again'));
}

// ---------- 通信 ----------

net.on('round_start', (msg) => startRound(msg.targetDishId));

net.on('info_sent', async () => {
  busy = true;
  setProgress(null);
  showScreen('sending');
  await playSendAnimation(currentInfo());
  busy = false;
  if (currentScreen() === 'sending') showScreen('waiting');
});

net.on('error', (msg) => {
  $('confirm-status').textContent = msg.message;
  $('send-btn').disabled = false;
});

net.on('result', (msg) => showResultScreen(msg.result));
net.on('reset', goTitle);

// 接続（再接続）したときに、サーバーの状態に合わせる
net.on('sync', ({ state }) => {
  switch (state.phase) {
    case 'composing': {
      // 選んでいる途中で再接続しただけなら、そのまま続ける
      const composing = ['topic', 'confirm', ...steps.map((s) => s.screen)].includes(currentScreen());
      if (!composing || targetDishId !== state.targetDishId) startRound(state.targetDishId);
      break;
    }
    case 'waiting':
      if (!busy) {
        setProgress(null);
        showScreen('waiting');
      }
      break;
    case 'result':
      showResultScreen(state.result);
      break;
    default:
      goTitle();
  }
});

net.on('peers', (msg) => setPeerStatus($('peer-status'), 'あてる人', msg.receiver));

buildStepScreens();
goTitle();
