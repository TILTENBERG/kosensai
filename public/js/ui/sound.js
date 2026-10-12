// 効果音。
// public/assets/sounds/<名前>.mp3|wav|ogg があればそれを鳴らす。
// 無いときは WebAudio で作った簡単な音で代用する（ファイルが無くてもエラーにならない）。
// config.json の "sound": false で全部消える。
//
// 名前：button, select, send, drop, cooking, complete, correct, wrong, fanfare, funny

let enabled = true;
let files = {};
const pool = new Map(); // 名前 → 読み込み済み Audio
let ctx = null;

export function initSound(game) {
  enabled = game.config.sound !== false;
  files = game.assets.sounds || {};
  if (!enabled) return;

  for (const [name, url] of Object.entries(files)) {
    const a = new Audio(url);
    a.preload = 'auto';
    a.addEventListener('error', () => pool.delete(name)); // 壊れたファイルは合成音で代用
    pool.set(name, a);
  }

  // ブラウザは「一度画面にさわるまで音を出さない」ので、最初の操作で音を有効にする
  const unlock = () => {
    getCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  // ボタンを押した音
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('button');
    if (!el || el.disabled) return;
    play(el.matches('.choice, .dish-card') ? 'select' : 'button');
  });
}

export function play(name) {
  if (!enabled) return;
  try {
    const base = pool.get(name);
    if (base) {
      // 同じ音を重ねて鳴らせるように複製する
      const a = base.cloneNode();
      a.play().catch(() => {});
      return;
    }
    synth(name);
  } catch {
    // 音が出なくてもゲームは止めない
  }
}

// ---------- 合成音（音ファイルが無いとき用） ----------

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

// 1つの音：周波数 from→to、長さ dur 秒、start 秒後
function tone({ from, to = from, dur = 0.15, start = 0, type = 'sine', vol = 0.25, vibrato = 0 }) {
  const c = getCtx();
  if (!c || c.state !== 'running') return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + dur);
  if (vibrato) {
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 9;
    lfoGain.gain.value = vibrato;
    lfo.connect(lfoGain).connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t0 + dur);
  }
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// ジュージュー用のノイズ
function noise({ dur = 1, start = 0, vol = 0.12, freq = 3000 }) {
  const c = getCtx();
  if (!c || c.state !== 'running') return;
  const t0 = c.currentTime + start;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (Math.random() < 0.3 ? 1 : 0.3);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.08);
  gain.gain.setValueAtTime(vol, t0 + dur - 0.2);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
}

const NOTE = { C5: 523, D5: 587, E5: 659, F5: 698, G5: 784, A5: 880, B5: 988, C6: 1047, E6: 1319, G6: 1568 };

const SYNTH = {
  button: () => tone({ from: 660, to: 760, dur: 0.08, type: 'triangle' }),
  select: () => {
    tone({ from: NOTE.A5, dur: 0.07, type: 'triangle' });
    tone({ from: NOTE.E6, dur: 0.1, start: 0.06, type: 'triangle' });
  },
  send: () => tone({ from: 300, to: 1800, dur: 0.6, type: 'sawtooth', vol: 0.12 }),
  drop: () => tone({ from: 900, to: 250, dur: 0.18, type: 'sine', vol: 0.3 }),
  cooking: () => noise({ dur: 1.6, freq: 3500 }),
  complete: () => {
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f, i) => tone({ from: f, dur: 0.18, start: i * 0.09, type: 'triangle' }));
  },
  correct: () => {
    tone({ from: NOTE.E6, dur: 0.25, type: 'sine', vol: 0.3 });
    tone({ from: NOTE.C6, dur: 0.45, start: 0.22, type: 'sine', vol: 0.3 });
  },
  wrong: () => {
    tone({ from: 220, dur: 0.25, type: 'square', vol: 0.12 });
    tone({ from: 165, dur: 0.45, start: 0.25, type: 'square', vol: 0.12 });
  },
  fanfare: () => {
    const seq = [[NOTE.G5, 0, 0.12], [NOTE.G5, 0.13, 0.12], [NOTE.G5, 0.26, 0.12], [NOTE.C6, 0.4, 0.5]];
    for (const [f, s, d] of seq) tone({ from: f, dur: d, start: s, type: 'square', vol: 0.12 });
    for (const f of [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6]) tone({ from: f, dur: 0.9, start: 0.92, type: 'triangle', vol: 0.12 });
  },
  funny: () => tone({ from: 900, to: 120, dur: 0.9, type: 'sine', vol: 0.3, vibrato: 40 }),
};

function synth(name) {
  const fn = SYNTH[name];
  if (fn) fn();
}
