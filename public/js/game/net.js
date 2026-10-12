// WebSocket 通信。切れたら自動で再接続し、その間は「接続中…」を表示する。

export class Net {
  constructor(role) {
    this.role = role;
    this.handlers = new Map();
    this.retryMs = 500;
    this.stopped = false;
    this.overlay = createOverlay();
    // 同じ役割の画面が別に開かれたら、こちらは止める（つなぎ直すと取り合いになるため）
    this.on('replaced', () => {
      this.stopped = true;
      this.overlay.querySelector('.net-overlay__box').innerHTML =
        'ほかの<ruby>画面<rt>がめん</rt></ruby>でひらかれました。<br>' +
        '<small>この<ruby>画面<rt>がめん</rt></ruby>をつかうときは F5 でよみこみなおしてね</small>';
      this.overlay.hidden = false;
    });
    this.connect();
  }

  connect() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}/ws`);
    this.ws = ws;
    this.overlay.hidden = false;

    ws.addEventListener('open', () => {
      this.retryMs = 500;
      this.overlay.hidden = true;
      this.send('hello', { role: this.role });
      this.emit('open', {});
    });

    ws.addEventListener('message', (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      this.emit(msg.type, msg);
    });

    ws.addEventListener('close', () => {
      this.overlay.hidden = false;
      this.emit('close', {});
      if (this.stopped) return;
      setTimeout(() => this.connect(), this.retryMs);
      this.retryMs = Math.min(this.retryMs * 2, 5000);
    });

    // error の後には必ず close が来るので、再接続は close 側で行う
    ws.addEventListener('error', () => {});
  }

  send(type, payload = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...payload }));
      return true;
    }
    return false;
  }

  on(type, handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(handler);
  }

  emit(type, msg) {
    for (const h of this.handlers.get(type) || []) h(msg);
  }
}

function createOverlay() {
  const el = document.createElement('div');
  el.className = 'net-overlay';
  el.innerHTML = '<div class="net-overlay__box"><span class="net-overlay__spinner"></span><span><ruby>接続中<rt>せつぞくちゅう</rt></ruby>…</span></div>';
  el.hidden = true;
  document.body.appendChild(el);
  return el;
}
