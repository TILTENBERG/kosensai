'use strict';
// data/*.json と config.json の読み込み。
// 毎回ファイルから読むので、料理や語群を増減してもサーバー再起動だけで反映される。

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');

const DEFAULT_CONFIG = {
  port: 3000,
  difficulty: 'easy',
  sound: true,
  idleTimeoutSec: 90,
  resultReturnSec: 20,
  // 受信側が選ぶ料理の数（0 = 全部の料理から選ぶ）
  choices: { easy: 4, hard: 0 },
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadConfig() {
  let user = {};
  try {
    user = readJson(path.join(ROOT, 'config.json'));
  } catch (e) {
    console.warn('[config] config.json を読めませんでした。初期値で動きます:', e.message);
  }
  const config = { ...DEFAULT_CONFIG, ...user };
  // 一時的にポートを変えたいときは環境変数 PORT で上書きできる（例：set PORT=3001）
  const envPort = Number(process.env.PORT);
  if (Number.isInteger(envPort) && envPort > 0) config.port = envPort;
  return config;
}

function loadGameData() {
  return {
    ingredients: readJson(path.join(DATA_DIR, 'ingredients.json')),
    seasonings: readJson(path.join(DATA_DIR, 'seasonings.json')),
    methods: readJson(path.join(DATA_DIR, 'methods.json')),
    dishes: readJson(path.join(DATA_DIR, 'dishes.json')),
    memoWords: readJson(path.join(DATA_DIR, 'memo_words.json')),
    furigana: loadFurigana(),
  };
}

// ふりがな辞書は無くても動く（ふりがなが付かないだけ）
function loadFurigana() {
  try {
    const dict = readJson(path.join(DATA_DIR, 'furigana.json'));
    delete dict._説明;
    return dict;
  } catch (e) {
    console.warn('[data] furigana.json を読めませんでした:', e.message);
    return {};
  }
}

// public/assets にある画像・音のファイルを調べる。
// 置いてあるものだけをブラウザに教えるので、無いファイルは絵文字・無音で代用される。
const ASSETS_DIR = path.join(ROOT, 'public', 'assets');
const SOUND_EXTS = ['.mp3', '.wav', '.ogg'];

function listFiles(dir) {
  try {
    return fs.readdirSync(path.join(ASSETS_DIR, dir));
  } catch {
    return [];
  }
}

function listAssets() {
  const pngIds = (dir) =>
    listFiles(dir)
      .filter((f) => path.extname(f).toLowerCase() === '.png')
      .map((f) => path.basename(f, path.extname(f)));
  const sounds = {};
  for (const f of listFiles('sounds')) {
    const ext = path.extname(f).toLowerCase();
    if (SOUND_EXTS.includes(ext)) sounds[path.basename(f, ext)] = `assets/sounds/${f}`;
  }
  return {
    ingredients: pngIds('ingredients'),
    seasonings: pngIds('seasonings'),
    dishes: pngIds('dishes'),
    tools: pngIds('tools'),
    sounds,
  };
}

module.exports = { ROOT, DATA_DIR, loadConfig, loadGameData, listAssets };
