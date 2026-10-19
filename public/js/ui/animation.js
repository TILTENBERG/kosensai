// 演出まとめ（すべて CSS / JavaScript。動画は使わない）
//   playSendAnimation(info): Promise                       … 送信（PC1）
//   playReceiveAnimation(info): Promise                    … 受信（PC2）
//   playCookingAnimation(info, method, resultDish, chosenDish): Promise … 調理（PC2）
//   showResult(resultData): void                           … リザルト（両方）
import { h } from '../game/screens.js';
import { iconEl, hasAsset } from './icons.js';
import { play } from './sound.js';
import { setChara, charaReact } from './chara.js';

// ---------- 小道具 ----------

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const SPARK_COLORS = ['#fff6a8', '#ffd34d', '#7fe7ff', '#ffffff', '#ff9ad5'];

// 要素は left/top に中心を置き、transform はかならず translate(-50%,-50%) から始める
const tf = (x = 0, y = 0, extra = '') => `translate(-50%, -50%) translate(${x}px, ${y}px) ${extra}`;

function animate(el, keyframes, options) {
  return el.animate(keyframes, { fill: 'forwards', ...options }).finished.catch(() => {});
}

// stage の中に、中心 (x, y) の演出用要素を置く
function fx(stage, className, x, y, ...children) {
  const el = h('div', { class: `fx ${className}` }, ...children);
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  stage.append(el);
  return el;
}

// 要素の中心が stage の中でどこにあるか（#app が拡大・縮小されていても正しく出す）
function centerIn(el, stage) {
  const r = el.getBoundingClientRect();
  const s = stage.getBoundingClientRect();
  const k = s.width / stage.offsetWidth || 1;
  return { x: (r.left + r.width / 2 - s.left) / k, y: (r.top + r.height / 2 - s.top) / k };
}

// 光の粒
function spark(stage, x, y, { size = rand(10, 22), spread = 40, life = 600, color = pick(SPARK_COLORS) } = {}) {
  const el = fx(stage, 'fx-spark', x, y);
  el.style.width = el.style.height = `${size}px`;
  el.style.background = color;
  el.style.boxShadow = `0 0 ${size}px ${color}`;
  const dx = rand(-spread, spread);
  const dy = rand(-spread, spread);
  animate(el, [{ transform: tf(0, 0, 'scale(1)'), opacity: 1 }, { transform: tf(dx, dy, 'scale(0.1)'), opacity: 0 }], {
    duration: life,
    easing: 'ease-out',
  }).then(() => el.remove());
}

// 放射状にはじける粒
function burst(stage, x, y, count = 16, { distance = 220, text = null, life = 800 } = {}) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + rand(-0.2, 0.2);
    const d = rand(distance * 0.5, distance);
    const el = text ? fx(stage, 'fx-burst-text', x, y, text) : fx(stage, 'fx-spark', x, y);
    if (!text) {
      const size = rand(12, 26);
      const color = pick(SPARK_COLORS);
      el.style.width = el.style.height = `${size}px`;
      el.style.background = color;
      el.style.boxShadow = `0 0 ${size}px ${color}`;
    }
    animate(el, [
      { transform: tf(0, 0, 'scale(0.4)'), opacity: 1 },
      { transform: tf(Math.cos(angle) * d, Math.sin(angle) * d, 'scale(1) rotate(180deg)'), opacity: 0 },
    ], { duration: life, easing: 'cubic-bezier(.1,.8,.3,1)' }).then(() => el.remove());
  }
}

// ボタンなどを選んだときのキラキラ（#app の上に出す）
export function sparkleOn(target) {
  const app = document.getElementById('app');
  if (!app || !target) return;
  const p = centerIn(target, app);
  const layer = h('div', { class: 'fx-layer fx-layer--sparkle' });
  app.append(layer);
  burst(layer, p.x, p.y, 12, { distance: 150, life: 600 });
  burst(layer, p.x, p.y, 3, { distance: 120, text: '✦', life: 700 });
  setTimeout(() => layer.remove(), 800);
}

// 動いている要素のうしろに光の粒を出し続ける。止めるときは戻り値の関数を呼ぶ
function trail(stage, el) {
  let alive = true;
  let n = 0;
  const tick = () => {
    if (!alive || !el.isConnected) return;
    if (n++ % 2 === 0) {
      const p = centerIn(el, stage);
      spark(stage, p.x, p.y, { spread: 30, life: 500 });
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return () => { alive = false; };
}

// 「ぐつぐつ」などの文字
function say(stage, text, x, y, { life = 900, rotate = rand(-12, 12) } = {}) {
  const el = fx(stage, 'fx-say', x, y, text);
  animate(el, [
    { transform: tf(0, 20, `rotate(${rotate}deg) scale(0)`), opacity: 0 },
    { transform: tf(0, 0, `rotate(${rotate}deg) scale(1.2)`), opacity: 1, offset: 0.25 },
    { transform: tf(0, -10, `rotate(${rotate}deg) scale(1)`), opacity: 1, offset: 0.75 },
    { transform: tf(0, -40, `rotate(${rotate}deg) scale(0.9)`), opacity: 0 },
  ], { duration: life, easing: 'ease-out' }).then(() => el.remove());
}

// 情報の部品（アイコン＋名前）を作る
function infoParts(info, game) {
  const parts = info.ingredients.map((id) => {
    const i = game.ingredientById.get(id);
    return h('div', { class: 'fly-item' }, iconEl('ingredients', i, 'icon icon--fly'), h('span', {}, i.name));
  });
  const s = game.seasoningById.get(info.seasoning);
  parts.push(h('div', { class: 'fly-item' }, iconEl('seasonings', s, 'icon icon--fly'), h('span', {}, s.name)));
  const m = game.methodById.get(info.method);
  parts.push(h('div', { class: 'fly-item' }, iconEl('tools', m, 'icon icon--fly'), h('span', {}, m.name)));
  parts.push(h('div', { class: 'fly-item fly-item--memo' }, h('span', {}, `💬 ${info.memo}`)));
  return parts;
}

let gameRef = null;
// sender.js / receiver.js から一度だけ呼ぶ（名前やアイコンを引くため）
export function setAnimationData(game) {
  gameRef = game;
}

// ---------- 送信アニメ（PC1） ----------
// 選んだ情報が光の粒を引きながら右の画面の外（＝あてる人のPC）へ飛んでいく

export async function playSendAnimation(info) {
  const stage = document.getElementById('send-stage');
  if (!stage || !gameRef) return wait(1500);
  stage.replaceChildren();
  const W = stage.clientWidth;
  const H = stage.clientHeight;

  // 背景に流れるデータの光の線
  for (let i = 0; i < 12; i++) {
    const beam = h('div', { class: 'fx-beam' });
    beam.style.top = `${rand(40, H - 40)}px`;
    beam.style.animationDelay = `${rand(0, 0.9)}s`;
    beam.style.animationDuration = `${rand(0.7, 1.2)}s`;
    stage.append(beam);
  }

  const portal = fx(stage, 'fx-portal fx-portal--right', W - 40, H / 2, h('span', { class: 'fx-portal__label' }, 'あてる人へ ▶'));
  animate(portal, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });

  // 並べる
  const parts = infoParts(info, gameRef);
  const gap = Math.min(230, (W - 500) / parts.length);
  const startX = W / 2 - 120 - (gap * (parts.length - 1)) / 2;
  const items = parts.map((part, i) => {
    const el = fx(stage, 'fx-carrier', startX + gap * i, H / 2, part);
    animate(el, [{ transform: tf(0, 0, 'scale(0)') }, { transform: tf(0, 0, 'scale(1.15)'), offset: 0.7 }, { transform: tf(0, 0, 'scale(1)') }], {
      duration: 400,
      delay: i * 90,
      easing: 'ease-out',
    });
    return el;
  });
  await wait(400 + parts.length * 90 + 300);

  // 右へ飛ばす（右の方から順に）
  play('send');
  const flights = [...items].reverse().map((el, i) => {
    const x0 = parseFloat(el.style.left);
    const dx = W + 300 - x0;
    const lift = rand(-160, 160);
    const stop = trail(stage, el);
    return animate(el, [
      { transform: tf(0, 0, 'scale(1)') },
      { transform: tf(-40, lift * 0.2, 'scale(1.1)'), offset: 0.2 },
      { transform: tf(dx * 0.6, lift, 'scale(0.7) rotate(20deg)'), offset: 0.7 },
      { transform: tf(dx, 0, 'scale(0.2) rotate(40deg)'), opacity: 0.2 },
    ], { duration: 1000, delay: i * 160, easing: 'cubic-bezier(.5,0,.8,.4)' }).then(() => {
      stop();
      burst(stage, W - 40, H / 2, 10, { distance: 120, life: 500 });
      el.remove();
    });
  });
  await Promise.all(flights);

  say(stage, 'おくったよ！', W / 2, H / 2, { life: 1100, rotate: -4 });
  await wait(900);
}

// ---------- 受信アニメ（PC2） ----------
// 左の画面の外（＝おくる人のPC）から情報カードが飛んでくる

export async function playReceiveAnimation(info) {
  const board = document.getElementById('info-board');
  const screen = board && board.closest('.screen');
  if (!board || !screen) return;

  const targets = [...board.querySelectorAll('.tile, .memo-bubble')];
  for (const t of targets) t.style.opacity = '0';
  const portal = fx(screen, 'fx-portal fx-portal--left', 40, screen.clientHeight / 2 - 60, h('span', { class: 'fx-portal__label' }, '◀ おくる人から'));
  animate(portal, [{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
  play('send');
  await wait(300);

  await Promise.all(targets.map(async (t, i) => {
    await wait(i * 170);
    const end = centerIn(t, screen);
    const startX = -150 - end.x;
    const startY = 340 - end.y + rand(-80, 80);
    t.style.opacity = '';
    const stop = trail(screen, t);
    await animate(t, [
      { transform: `translate(${startX}px, ${startY}px) scale(0.3) rotate(-40deg)` },
      { transform: 'translate(0, 0) scale(1.12) rotate(4deg)', offset: 0.8 },
      { transform: 'translate(0, 0) scale(1) rotate(0deg)' },
    ], { duration: 750, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'none' });
    stop();
    play('drop');
    burst(screen, end.x, end.y, 10, { distance: 140, life: 600 });
  }));

  await animate(portal, [{ opacity: 1 }, { opacity: 0 }], { duration: 400 });
  portal.remove();
}

// ---------- 調理アニメ（PC2） ----------
// 道具が出る → 食材が1つずつ入る → 調理方法ごとの演出 → 料理が「ジャーン！」

const KEEP_ON_TOOL = new Set(['bake', 'stirfry', 'mix']); // 食材が道具の上に見えたまま調理する方法

const COOKING_ACTIONS = {
  // 煮る：鍋に湯気、ぐつぐつ
  async simmer({ stage, tool, cx, toolY }) {
    animate(tool, [{ transform: tf(0, 0, 'rotate(-3deg)') }, { transform: tf(0, 0, 'rotate(3deg)') }], {
      duration: 260, iterations: 6, direction: 'alternate', easing: 'ease-in-out', fill: 'none',
    });
    for (let i = 0; i < 11; i++) {
      setTimeout(() => {
        const s = fx(stage, 'fx-steam', cx + rand(-110, 110), toolY - 110);
        animate(s, [
          { transform: tf(0, 0, 'scale(0.4)'), opacity: 0.9 },
          { transform: tf(rand(-60, 60), -320, 'scale(1.8)'), opacity: 0 },
        ], { duration: 1500, easing: 'ease-out' }).then(() => s.remove());
        const b = fx(stage, 'fx-bubble', cx + rand(-120, 120), toolY - 90);
        animate(b, [{ transform: tf(0, 0, 'scale(0)') }, { transform: tf(0, -30, 'scale(1)'), opacity: 1 }, { transform: tf(0, -40, 'scale(1.3)'), opacity: 0 }], {
          duration: 500,
        }).then(() => b.remove());
      }, i * 140);
    }
    say(stage, 'ぐつぐつ', cx - 330, toolY - 220);
    await wait(700);
    say(stage, 'ぐつぐつ', cx + 330, toolY - 180);
    await wait(800);
  },

  // 焼く：フライパンで食材がひっくり返る
  async bake({ stage, tool, items, cx, toolY }) {
    for (let round = 0; round < 2; round++) {
      animate(tool, [{ transform: tf(0, 0) }, { transform: tf(0, -30, 'rotate(-6deg)'), offset: 0.3 }, { transform: tf(0, 0) }], {
        duration: 500, fill: 'none',
      });
      items.forEach((el, i) => {
        animate(el, [
          { transform: tf(0, 0, 'rotateX(0deg)') },
          { transform: tf(0, -260, 'rotateX(180deg) scale(1.1)'), offset: 0.5 },
          { transform: tf(0, 0, 'rotateX(360deg)') },
        ], { duration: 620, delay: i * 70, easing: 'ease-in-out', fill: 'none' });
      });
      say(stage, round === 0 ? 'ジュージュー' : 'くるっ！', round === 0 ? cx - 340 : cx + 320, toolY - 200);
      for (let i = 0; i < 6; i++) setTimeout(() => {
        const s = fx(stage, 'fx-steam fx-steam--small', cx + rand(-150, 150), toolY - 60);
        animate(s, [{ transform: tf(0, 0, 'scale(0.4)'), opacity: 0.7 }, { transform: tf(rand(-40, 40), -180, 'scale(1.3)'), opacity: 0 }], {
          duration: 1000,
        }).then(() => s.remove());
      }, i * 110);
      await wait(760);
    }
  },

  // 炒める：中華鍋で食材が跳ねる
  async stirfry({ stage, tool, items, cx, toolY }) {
    const flames = [-110, -40, 40, 110].map((dx) => fx(stage, 'fx-flame', cx + dx, toolY + 120, h('i'), h('i')));
    flames.forEach((f, i) => animate(f, [{ transform: tf(0, 0, 'scale(0.9, 0.8)') }, { transform: tf(0, -12, 'scale(1.1, 1.3)') }], {
      duration: 160, delay: i * 50, iterations: 12, direction: 'alternate', fill: 'none',
    }));
    animate(tool, [
      { transform: tf(0, 0, 'rotate(0deg)') },
      { transform: tf(-40, -10, 'rotate(-7deg)') },
      { transform: tf(40, 0, 'rotate(7deg)') },
      { transform: tf(0, 0, 'rotate(0deg)') },
    ], { duration: 420, iterations: 4, fill: 'none' });
    items.forEach((el, i) => {
      animate(el, [
        { transform: tf(0, 0, 'rotate(0deg)') },
        { transform: tf(rand(-90, 90), rand(-340, -220), `rotate(${rand(-200, 200)}deg)`), offset: 0.5 },
        { transform: tf(0, 0, 'rotate(360deg)') },
      ], { duration: 420, delay: i * 60, iterations: 4, easing: 'ease-in-out', fill: 'none' });
    });
    say(stage, 'ジャッ！', cx - 320, toolY - 230);
    await wait(600);
    say(stage, 'ジャッ！', cx + 320, toolY - 200);
    await wait(600);
    say(stage, 'ジャッ！', cx - 260, toolY - 140);
    await wait(400);
    flames.forEach((f) => animate(f, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 }).then(() => f.remove()));
  },

  // 揚げる：油のパチパチ
  async deepfry({ stage, tool, cx, toolY }) {
    animate(tool, [{ transform: tf(-3, 0) }, { transform: tf(3, 0) }], { duration: 60, iterations: 26, direction: 'alternate', fill: 'none' });
    const end = Date.now() + 1600;
    let n = 0;
    while (Date.now() < end) {
      for (let i = 0; i < 4; i++) {
        const x = cx + rand(-130, 130);
        const y = toolY - 100;
        const el = fx(stage, 'fx-oil', x, y);
        animate(el, [
          { transform: tf(0, 0, 'scale(1)'), opacity: 1 },
          { transform: tf(rand(-160, 160), rand(-260, -80), 'scale(0.3)'), opacity: 0 },
        ], { duration: rand(400, 700), easing: 'cubic-bezier(.1,.8,.3,1)' }).then(() => el.remove());
      }
      if (n % 5 === 0) say(stage, 'パチパチ', cx + pick([-1, 1]) * rand(260, 380), toolY - rand(120, 260), { life: 700 });
      n++;
      await wait(110);
    }
  },

  // 和える：ボウルでぐるぐる混ぜる
  async mix({ stage, tool, items, cx, toolY }) {
    const spoon = fx(stage, 'fx-spoon', cx, toolY - 70, '🥄');
    const orbit = (r, turns, phase, ry = 0.35) => {
      const frames = [];
      for (let i = 0; i <= 48; i++) {
        const a = phase + (Math.PI * 2 * turns * i) / 48;
        frames.push({ transform: tf(Math.cos(a) * r, Math.sin(a) * r * ry - 40, `rotate(${(a * 180) / Math.PI}deg)`) });
      }
      return frames;
    };
    animate(spoon, orbit(90, 3, 0, 0.4), { duration: 1700, easing: 'linear' }).then(() => spoon.remove());
    items.forEach((el, i) => {
      animate(el, orbit(120, 2, (Math.PI * 2 * i) / items.length), { duration: 1700, easing: 'ease-in-out', fill: 'none' });
    });
    animate(tool, [{ transform: tf(0, 0, 'rotate(-4deg)') }, { transform: tf(0, 0, 'rotate(4deg)') }], {
      duration: 340, iterations: 5, direction: 'alternate', fill: 'none',
    });
    say(stage, 'ぐるぐる', cx - 330, toolY - 200);
    await wait(800);
    say(stage, 'まぜまぜ', cx + 330, toolY - 170);
    await wait(900);
  },
};

// resultDish … とどいた情報で作れた料理（できあがる料理）、chosenDish … あてる人がえらんだ料理
export async function playCookingAnimation(info, method, resultDish, chosenDish) {
  const stage = document.getElementById('cooking-stage');
  if (!stage || !gameRef) return wait(2000);
  stage.replaceChildren();
  const W = stage.clientWidth;
  const H = stage.clientHeight;
  const cx = W / 2;
  const toolY = H * 0.62;

  fx(stage, 'cook-backdrop', cx, toolY - 60);
  const heat = fx(stage, `cook-heat cook-heat--${method.id}`, cx, toolY + 110);

  // 1. 道具が出る
  const tool = fx(stage, 'cook-tool', cx, toolY,
    iconEl('tools', method, 'icon icon--tool'),
    h('span', { class: 'cook-tool__label' }, method.tool),
  );
  play('select');
  await animate(tool, [
    { transform: tf(0, 60, 'scale(0)') },
    { transform: tf(0, 0, 'scale(1.15)'), offset: 0.7 },
    { transform: tf(0, 0, 'scale(1)') },
  ], { duration: 400, easing: 'ease-out' });
  await wait(100);

  // 2. 食材と調味料が1つずつ落ちて入る
  const keep = KEEP_ON_TOOL.has(method.id);
  const drops = info.ingredients.map((id, i) => ({
    icon: iconEl('ingredients', gameRef.ingredientById.get(id), 'icon icon--cook'),
    dx: (i - 1) * 110,
    stay: keep,
  }));
  drops.push({ icon: iconEl('seasonings', gameRef.seasoningById.get(info.seasoning), 'icon icon--cook'), dx: 0, stay: false });

  const onTool = [];
  const landings = [];
  for (const d of drops) {
    const el = fx(stage, 'cook-item', cx + d.dx, toolY - 80, d.icon);
    if (d.stay) onTool.push(el);
    play('drop');
    landings.push(animate(el, [
      { transform: tf(0, -720, 'rotate(-30deg)') },
      { transform: tf(0, 0, 'rotate(0deg) scale(1.1, 0.85)'), offset: 0.75 },
      { transform: tf(0, -40, 'scale(0.95, 1.05)'), offset: 0.88 },
      { transform: tf(0, 0, 'scale(1)') },
    ], { duration: 480, easing: 'ease-in' }).then(() => {
      animate(tool, [{ transform: tf(0, 0, 'scale(1)') }, { transform: tf(0, 6, 'scale(1.06, 0.92)') }, { transform: tf(0, 0, 'scale(1)') }], {
        duration: 220, fill: 'none',
      });
      if (!d.stay) {
        // 道具の中に入る
        return animate(el, [{ transform: tf(0, 0, 'scale(1)'), opacity: 1 }, { transform: tf(0, 50, 'scale(0.3)'), opacity: 0 }], {
          duration: 260, easing: 'ease-in',
        }).then(() => el.remove());
      }
      return null;
    }));
    await wait(330);
  }
  await Promise.all(landings);

  // 3. 調理方法ごとの演出
  play('cooking');
  const action = COOKING_ACTIONS[method.id] || COOKING_ACTIONS.simmer;
  await action({ stage, tool, items: onTool, cx, toolY });

  // 4. 道具が大きくゆれて、キラキラ
  await animate(tool, [
    { transform: tf(0, 0, 'rotate(0deg)') },
    { transform: tf(0, 0, 'rotate(-10deg) scale(1.08)') },
    { transform: tf(0, 0, 'rotate(10deg) scale(1.12)') },
    { transform: tf(0, 0, 'rotate(-6deg) scale(1.16)') },
    { transform: tf(0, 0, 'rotate(0deg) scale(1.2)') },
  ], { duration: 400 });
  burst(stage, cx, toolY - 40, 28, { distance: 420, life: 900 });
  burst(stage, cx, toolY - 40, 8, { distance: 360, text: '✨', life: 1000 });
  const flash = fx(stage, 'fx-flash', cx, H / 2);
  animate(flash, [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], { duration: 700 }).then(() => flash.remove());
  for (const el of [tool, heat, ...onTool]) {
    animate(el, [{ opacity: 1 }, { opacity: 0, transform: tf(0, 0, 'scale(0.4)') }], { duration: 300 }).then(() => el.remove());
  }
  await wait(250);

  // 5. 料理が「ジャーン！」
  play('complete');
  const rays = fx(stage, 'fx-rays', cx, H * 0.5, h('div', { class: 'fx-rays__inner' }));
  animate(rays, [{ transform: tf(0, 0, 'scale(0)'), opacity: 0 }, { transform: tf(0, 0, 'scale(1)'), opacity: 1 }], {
    duration: 600, easing: 'ease-out',
  });

  const dish = fx(stage, 'cook-dish', cx, H * 0.5,
    iconEl('dishes', resultDish, 'icon icon--hero'),
    h('span', { class: 'cook-dish__name' }, resultDish.name),
  );
  await animate(dish, [
    { transform: tf(0, 0, 'scale(0) rotate(-180deg)') },
    { transform: tf(0, 0, 'scale(1.25) rotate(10deg)'), offset: 0.7 },
    { transform: tf(0, 0, 'scale(1) rotate(0deg)') },
  ], { duration: 600, easing: 'ease-out' });
  say(stage, 'ジャーン！', cx, H * 0.12, { life: 1400, rotate: -6 });
  burst(stage, cx, H * 0.5, 20, { distance: 380, life: 1000 });
  // できる料理は「えらんだ料理」ではなく「とどいた食材で作れた料理」。ちがうときはキャラが知らせる
  if (chosenDish && chosenDish.id !== resultDish.id) setChara('almost', `あれ？ ${resultDish.name}が できた！`);
  else setChara('happy', `${resultDish.name}が できた！`);
  await wait(1300);
}

// ---------- リザルト ----------

const TIER_LABEL = {
  perfect: '🎉 大成功！ 🎉',
  close: 'おしい！',
  mystery: 'なぞの料理…！？',
};

let resultToken = 0;

// 「えらんだ料理」と「作れた料理」がちがうと分かりにくいので、正解ハンコのあとにキャラが説明する。
// 作れた料理がお題どおりで正解なら null（点数のセリフのまま）
function explainLine(r) {
  if (r.correct) {
    if (r.madeDish.id === r.targetDish.id) return null;
    return `こたえは正解！ でも ${r.tier === 'mystery' ? 'なぞの料理' : r.madeDish.name}に なっちゃった`;
  }
  if (r.madeDish.id === r.answerDish.id && r.tier !== 'mystery') return `情報どおりだけど お題は ${r.targetDish.name} だったよ`;
  return `ざんねん！ お題は ${r.targetDish.name} だったよ`;
}

// 完成度を 0 からカウントアップ
function countUp(el, to, duration) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    let lastStep = -1;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const v = Math.round(to * (1 - Math.pow(1 - p, 3)));
      el.textContent = v;
      const step = Math.floor(v / 20);
      if (step !== lastStep && v > 0) {
        lastStep = step;
        play('button');
      }
      if (p < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

// 紙吹雪（画面全体）
function confetti(count = 140) {
  const app = document.getElementById('app');
  const layer = h('div', { class: 'fx-layer' });
  app.append(layer);
  const colors = ['#ff5a6e', '#ffc23c', '#22b573', '#2f9bff', '#a259ff', '#ff8fb1', '#ffffff'];
  for (let i = 0; i < count; i++) {
    const c = h('div', { class: 'confetti' });
    c.style.left = `${rand(0, 1920)}px`;
    c.style.background = pick(colors);
    c.style.width = `${rand(14, 26)}px`;
    c.style.height = `${rand(20, 40)}px`;
    if (Math.random() < 0.3) c.style.borderRadius = '50%';
    layer.append(c);
    const sway = rand(-200, 200);
    animate(c, [
      { transform: `translate(0, -60px) rotate(0deg) rotateY(0deg)` },
      { transform: `translate(${sway}px, 1150px) rotate(${rand(360, 1080)}deg) rotateY(${rand(360, 1080)}deg)` },
    ], { duration: rand(2400, 4200), delay: rand(0, 900), easing: 'cubic-bezier(.3,.1,.6,1)' });
  }
  setTimeout(() => layer.remove(), 5500);
}

// もくもく煙（なぞの料理）
function smokePuff(target) {
  const app = document.getElementById('app');
  const p = centerIn(target, app);
  const layer = h('div', { class: 'fx-layer' });
  app.append(layer);
  for (let i = 0; i < 14; i++) {
    const el = fx(layer, 'fx-smoke', p.x + rand(-60, 60), p.y + rand(-30, 40));
    const size = rand(90, 170);
    el.style.width = el.style.height = `${size}px`;
    animate(el, [
      { transform: tf(0, 0, 'scale(0.2)'), opacity: 0.95 },
      { transform: tf(rand(-200, 200), rand(-260, -80), 'scale(1.4)'), opacity: 0 },
    ], { duration: rand(900, 1500), delay: i * 30, easing: 'cubic-bezier(.1,.7,.3,1)' });
  }
  setTimeout(() => layer.remove(), 2000);
}

// お題・こたえの小さいカード用の料理名（長い名前は小さくして、「ー」だけが次の行に行かないように）
function dishName(dish) {
  return h('p', { class: `result-dish__name${dish.name.length >= 7 ? ' is-long' : ''}` }, dish.name);
}

export function showResult(resultData) {
  const r = resultData;
  const token = ++resultToken;
  const root = r.container || document.getElementById('result-body');
  const b = r.breakdown;
  const hit = (ok, text) => h('span', { class: ok ? 'is-hit' : '' }, `${ok ? '○' : '×'} ${text}`);

  const tier = h('p', { class: `result-tier result-tier--${r.tier}` }, TIER_LABEL[r.tier]);
  const percent = h('strong', {}, '0');
  // なぞの料理：専用イラスト（dishes/mystery.png）があればそれを使う。無ければ作れた料理を変な色にする
  const mysteryArt = r.tier === 'mystery' && hasAsset('dishes', 'mystery');
  const madeIcon = mysteryArt
    ? iconEl('dishes', { id: 'mystery', name: 'なぞの料理', emoji: '❓' }, 'icon icon--xl')
    : iconEl('dishes', r.madeDish, 'icon icon--xl');
  // あてる人の画面では「とどいた情報」「えらんだ料理」、おくる人の画面では「送った情報」「こたえ」
  const isReceiver = document.body.classList.contains('receiver');
  const answerCard = h('div', { class: 'result-dish' },
    h('p', { class: 'result-dish__label' }, isReceiver ? 'えらんだ料理' : 'こたえ'),
    iconEl('dishes', r.answerDish, 'icon icon--l'),
    dishName(r.answerDish),
  );
  const madeCard = h('div', { class: 'result-made' },
    h('p', { class: 'result-made__lead' }, isReceiver ? 'とどいた情報で作れたのは…' : '送った情報で作れたのは…'),
    madeIcon,
    h('p', { class: 'result-made__name' }, r.madeDish.name),
    h('div', {},
      h('p', { class: 'result-made__percent' }, '完成度', percent, '%'),
      h('p', { class: 'result-breakdown' },
        h('span', { class: b.ingredientMatches === 3 ? 'is-hit' : '' }, `食材 ${b.ingredientMatches}/3`),
        hit(b.seasoningMatch, '調味料'),
        hit(b.methodMatch, '調理方法'),
      ),
    ),
  );
  // 送った情報を、お題の正解とくらべて ○× で見せる（次のプレイで何を変えればいいか分かるように）
  const t = r.targetDish;
  const sentChip = (kind, item, ok) => h('span', { class: `mini-chip sent-chip ${ok ? 'is-ok' : 'is-ng'}` },
    h('span', { class: 'sent-chip__mark' }, ok ? '○' : '×'),
    iconEl(kind, item, 'icon icon--mini'),
    item.name,
  );
  const sentChips = [
    ...r.sent.ingredients.map((i) => sentChip('ingredients', i, t.ingredients.includes(i.id))),
    sentChip('seasonings', r.sent.seasoning, r.sent.seasoning.id === t.seasoning),
    sentChip('tools', r.sent.method, r.sent.method.id === t.method),
  ];
  const sentRow = h('div', { class: 'result-sent' },
    h('p', { class: 'result-sent__label' }, `${isReceiver ? 'とどいた' : '送った'}情報`, h('br'), 'お題とくらべると'),
    h('div', { class: 'mini-board' },
      ...sentChips.slice(0, 3),
      h('span', { class: 'mini-sep' }),
      ...sentChips.slice(3),
      h('span', { class: 'mini-sep' }),
      h('span', { class: 'mini-chip mini-chip--memo' }, `💬 ${r.sent.memo}`),
    ),
  );

  tier.style.visibility = 'hidden';
  setChara('think', 'どうかな…？');

  root.replaceChildren(
    tier,
    h('div', { class: 'result-main' },
      madeCard,
      h('div', { class: 'result-side' },
        h('div', { class: 'result-dish' },
          h('p', { class: 'result-dish__label' }, 'お題'),
          iconEl('dishes', r.targetDish, 'icon icon--l'),
          dishName(r.targetDish),
        ),
        answerCard,
      ),
    ),
    sentRow,
  );

  (async () => {
    await wait(300);
    await countUp(percent, r.percent, 1300);
    if (token !== resultToken) return;

    // 点数に応じた演出
    tier.style.visibility = '';
    // ○× を1つずつ出す
    sentChips.forEach((chip, i) => setTimeout(() => chip.classList.add('is-revealed'), 300 + i * 140));
    if (r.tier === 'perfect') {
      play('fanfare');
      confetti();
      animate(tier, [{ transform: 'scale(0)' }, { transform: 'scale(1.2)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 600, easing: 'ease-out' });
      madeIcon.classList.add('is-perfect');
      setChara('happy', 'やったね！ 大成功！');
      charaReact('jump');
    } else if (r.tier === 'close') {
      play('complete');
      animate(tier, [{ transform: 'scale(0)' }, { transform: 'scale(1.1)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 500, easing: 'ease-out' })
        .then(() => animate(tier, [{ transform: 'rotate(-3deg)' }, { transform: 'rotate(3deg)' }], {
          duration: 160, iterations: 6, direction: 'alternate', fill: 'none',
        }));
      setChara('almost', 'おしい！ あと少し！');
      charaReact('shake');
    } else {
      // なぞの料理：変な色でぷるぷる、看板がずっこける
      play('funny');
      madeIcon.classList.add(mysteryArt ? 'is-mystery-art' : 'is-mystery');
      setChara('oops', 'あれれ？ なぞの料理だ！');
      charaReact('fall');
      smokePuff(madeIcon);
      const app = document.getElementById('app');
      animate(app, [
        { translate: '0 0' }, { translate: '-14px 6px' }, { translate: '12px -4px' }, { translate: '-8px 2px' }, { translate: '0 0' },
      ], { duration: 420, delay: 350, fill: 'none' });
      animate(tier, [
        { transform: 'translateY(-300px) rotate(0deg)' },
        { transform: 'translateY(0) rotate(0deg)', offset: 0.45 },
        { transform: 'translateY(0) rotate(-14deg)', offset: 0.7 },
        { transform: 'translateY(16px) rotate(-8deg)' },
      ], { duration: 1000, easing: 'ease-in' });
      for (let i = 0; i < 4; i++) {
        const q = h('span', { class: 'mystery-mark' }, pick(['？', '！？', '？？']));
        q.style.left = `${[20, 200, 30, 200][i]}px`;
        q.style.top = `${[110, 100, 300, 290][i]}px`;
        q.style.animationDelay = `${i * 0.2}s`;
        madeCard.append(q);
      }
    }

    await wait(900);
    if (token !== resultToken) return;

    // 正解ハンコ
    answerCard.append(h('div', { class: `stamp ${r.correct ? 'is-correct' : 'is-wrong'}` }, r.correct ? '正解！' : 'ざんねん'));
    play(r.correct ? 'correct' : 'wrong');

    // ポーズはそのまま（ずっこけ等を消さない）で、セリフだけ説明に変える
    const line = explainLine(r);
    if (line) {
      await wait(700);
      if (token !== resultToken) return;
      setChara({ perfect: 'happy', close: 'almost', mystery: 'oops' }[r.tier], line);
    }
  })();
}
