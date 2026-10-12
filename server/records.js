'use strict';
// 今日の記録（プレイ回数・正解数・100%達成回数）を data/records.json に保存する。
// 日付ごとに分けて保存するので、日がかわると自動で 0 から数えなおしになる。
//
// records.json の形：
//   { "days": { "2026-10-12": { "plays": 12, "correct": 5, "perfect": 3 } } }

const fs = require('fs');
const path = require('path');

const EMPTY_DAY = { plays: 0, correct: 0, perfect: 0 };

// その PC の時計での日付（YYYY-MM-DD）
function localDateKey(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

class Records {
  constructor(file, now = () => new Date()) {
    this.file = file;
    this.now = now;
    this.data = { days: {} };
    try {
      const loaded = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (loaded && typeof loaded.days === 'object') this.data = loaded;
    } catch (e) {
      if (e.code !== 'ENOENT') console.warn('[records] records.json を読めませんでした。新しく作ります:', e.message);
    }
  }

  today() {
    return { ...EMPTY_DAY, ...this.data.days[localDateKey(this.now())] };
  }

  // 1ラウンド終わったら呼ぶ
  addResult(result) {
    const key = localDateKey(this.now());
    const day = { ...EMPTY_DAY, ...this.data.days[key] };
    day.plays += 1;
    if (result.correct) day.correct += 1;
    if (result.percent >= 100) day.perfect += 1;
    this.data.days[key] = day;
    this.save();
    return { ...day };
  }

  save() {
    // 書きこみ中に電源が切れてもファイルがこわれないよう、一時ファイルに書いてから置きかえる
    const tmp = `${this.file}.tmp`;
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
      fs.renameSync(tmp, this.file);
    } catch (e) {
      console.error('[records] 記録を保存できませんでした:', e.message);
    }
  }
}

module.exports = { Records, localDateKey };
