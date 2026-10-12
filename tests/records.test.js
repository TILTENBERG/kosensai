'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Records, localDateKey } = require('../server/records');

function tempFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'records-'));
  return path.join(dir, 'records.json');
}

test('ファイルが無くても 0 から始まる', () => {
  const r = new Records(tempFile());
  assert.deepEqual(r.today(), { plays: 0, correct: 0, perfect: 0 });
});

test('プレイ回数・正解数・100%達成回数を数えて保存する', () => {
  const file = tempFile();
  const r = new Records(file);
  r.addResult({ correct: true, percent: 100 });
  r.addResult({ correct: false, percent: 100 });
  r.addResult({ correct: true, percent: 60 });
  assert.deepEqual(r.today(), { plays: 3, correct: 2, perfect: 2 });

  // 読みなおしても残っている
  const again = new Records(file);
  assert.deepEqual(again.today(), { plays: 3, correct: 2, perfect: 2 });
});

test('日付がかわると 0 から（前の日の記録は残る）', () => {
  const file = tempFile();
  let now = new Date(2026, 9, 12, 15, 0);
  const r = new Records(file, () => now);
  r.addResult({ correct: true, percent: 100 });
  now = new Date(2026, 9, 13, 9, 0);
  assert.deepEqual(r.today(), { plays: 0, correct: 0, perfect: 0 });
  r.addResult({ correct: false, percent: 40 });
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(saved.days['2026-10-12'], { plays: 1, correct: 1, perfect: 1 });
  assert.deepEqual(saved.days['2026-10-13'], { plays: 1, correct: 0, perfect: 0 });
});

test('こわれたファイルでも動く', () => {
  const file = tempFile();
  fs.writeFileSync(file, '{ こわれた');
  const r = new Records(file);
  assert.deepEqual(r.today(), { plays: 0, correct: 0, perfect: 0 });
  r.addResult({ correct: true, percent: 100 });
  assert.equal(new Records(file).today().plays, 1);
});

test('日付キーはその PC の時計の日付', () => {
  assert.equal(localDateKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});
