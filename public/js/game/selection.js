// 選択ルール。max 個まで選べる。
//   max = 1 … 別のものを押すと入れ替わる
//   max > 1 … いっぱいの時は追加できない（選んだものを押すと外れるので選び直せる）

export class Picker {
  constructor(max) {
    this.max = max;
    this.values = [];
  }

  has(id) {
    return this.values.includes(id);
  }

  // 戻り値：'added' | 'removed' | 'replaced' | 'full'
  toggle(id) {
    const idx = this.values.indexOf(id);
    if (idx >= 0) {
      this.values.splice(idx, 1);
      return 'removed';
    }
    if (this.max === 1 && this.values.length === 1) {
      this.values = [id];
      return 'replaced';
    }
    if (this.values.length >= this.max) return 'full';
    this.values.push(id);
    return 'added';
  }

  isComplete() {
    return this.values.length === this.max;
  }

  clear() {
    this.values = [];
  }
}
