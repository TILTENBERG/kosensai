'use strict';
// 料理伝言ゲーム サーバー（PC1で起動）
// - public/ の静的ファイル配信
// - /api/bootstrap で config とゲームデータを配信
// - WebSocket で送信側(sender)と受信側(receiver)を中継

const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');
const { ROOT, DATA_DIR, loadConfig, loadGameData, listAssets } = require('./data');
const { GameRoom } = require('./game');
const { Records } = require('./records');
const { printBanner } = require('./banner');

const PUBLIC_DIR = path.join(ROOT, 'public');
const config = loadConfig();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function serveStatic(req, res) {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  if (urlPath === '/') urlPath = '/sender.html';

  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403).end();
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url.startsWith('/api/bootstrap')) {
    try {
      const { difficulty, sound, idleTimeoutSec, resultReturnSec } = loadConfig();
      sendJson(res, 200, {
        config: { difficulty, sound, idleTimeoutSec, resultReturnSec },
        data: loadGameData(),
        assets: listAssets(),
      });
    } catch (e) {
      console.error('[api] データ読み込みエラー:', e.message);
      sendJson(res, 500, { error: e.message });
    }
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end();
    return;
  }
  serveStatic(req, res);
});

// ---------- WebSocket ----------

const wss = new WebSocketServer({ server, path: '/ws' });
// ws は http サーバーのエラー（ポート使用中など）を自分にも流すので、ここでは受け取るだけにする。
// 実際の処理（メッセージを出して終了）は下の server.on('error') で行う。
wss.on('error', () => {});
const ROLES = ['sender', 'receiver'];

function send(ws, type, payload = {}) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, ...payload }));
}

function clientsOf(role) {
  return [...wss.clients].filter((c) => c.role === role && c.readyState === WebSocket.OPEN);
}

function broadcast(type, payload, role) {
  for (const c of wss.clients) {
    if (!role || c.role === role) send(c, type, payload);
  }
}

function broadcastPeers() {
  broadcast('peers', {
    sender: clientsOf('sender').length > 0,
    receiver: clientsOf('receiver').length > 0,
  });
}

const records = new Records(path.join(DATA_DIR, 'records.json'));

const room = new GameRoom({
  send: (role, type, payload) => broadcast(type, payload, role),
  loadData: loadGameData,
  loadConfig,
  onResult: (result) => {
    const today = records.addResult(result);
    console.log(`[記録] きょう ${today.plays}回 / 正解 ${today.correct}回 / 100% ${today.perfect}回`);
    broadcast('stats', { stats: today });
  },
});

// 遊んでいる途中で放置されたら最初に戻す
setInterval(() => room.checkIdle(), 1000).unref();

const handlers = {
  hello(ws, msg) {
    if (!ROLES.includes(msg.role)) return;
    ws.role = msg.role;
    // 同じ役割の画面は1台だけ。新しく開いた方を使い、古い方は止める
    for (const other of wss.clients) {
      if (other !== ws && other.role === ws.role) {
        send(other, 'replaced', {});
        other.role = null;
        other.close(4000, 'replaced');
      }
    }
    console.log(`[ws] ${ws.role} が接続しました (${ws.remote})`);
    send(ws, 'sync', { state: room.snapshotFor(ws.role) });
    send(ws, 'stats', { stats: records.today() });
    broadcastPeers();
  },

  // 画面がさわられた（放置対策）
  activity() {
    room.touch();
  },

  // スタッフ用リセット（Ctrl+Shift+R）
  staff_reset(ws) {
    console.log(`[スタッフ] ${ws.role || '?'} から強制リセット`);
    room.reset('staff');
  },

  start(ws) {
    if (ws.role !== 'sender') return;
    room.start();
    console.log(`[game] お題: ${room.round && room.round.targetDishId}`);
  },

  send_info(ws, msg) {
    if (ws.role !== 'sender') return;
    const r = room.submitInfo(msg.info);
    if (!r.ok) {
      send(ws, 'error', { message: r.message });
      return;
    }
    console.log('[game] 情報を受信側へ送りました:', JSON.stringify(r.info));
    send(ws, 'info_sent', { delivered: clientsOf('receiver').length > 0 });
  },

  answer(ws, msg) {
    if (ws.role !== 'receiver') return;
    const r = room.answer(msg.dishId);
    if (!r.ok) {
      send(ws, 'error', { message: r.message });
      return;
    }
    const res = room.round.result;
    console.log(`[game] 回答: ${msg.dishId} / 作れた料理: ${res.made.dishId} (${res.percent}%) / ${res.correct ? '正解' : '不正解'}`);
  },

  cooking_done(ws) {
    if (ws.role !== 'receiver') return;
    room.cookingDone();
  },

  again() {
    room.again();
  },
};

wss.on('connection', (ws, req) => {
  ws.remote = req.socket.remoteAddress;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    const handler = handlers[msg && msg.type];
    // 名乗っていない（または止められた）画面からは hello 以外受けつけない
    if (handler && (ws.role || msg.type === 'hello')) handler(ws, msg);
  });

  ws.on('close', () => {
    if (ws.role) console.log(`[ws] ${ws.role} が切断しました`);
    broadcastPeers();
  });
});

// 抜けたLANケーブルなどで死んだ接続を掃除する
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 10000).unref();

// ---------- 起動 ----------

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`
[エラー] ポート ${config.port} はすでに使われています。`);
    console.error('  ・このゲームのサーバー（黒い画面）が2つ起動していないか確認してください。');
    console.error('  ・ほかのアプリ（別のゲームのサーバーなど）が使っている場合は、それを止めるか、');
    console.error(`    config.json の "port" を別の番号（例：3001）に変えてください。
`);
  } else {
    console.error('[エラー]', e);
  }
  process.exit(1);
});

server.listen(config.port, '0.0.0.0', () => {
  printBanner(config);
  // start.bat から起動したときは、送信側の画面を自動で開く
  if (process.env.OPEN_SENDER === '1' && process.platform === 'win32') {
    exec(`start "" "http://localhost:${config.port}/sender.html"`);
  }
});
