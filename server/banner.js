'use strict';
// 起動時の表示。PC2で開くURLとIPアドレスを大きく出す。

const os = require('os');

// VirtualBox・Hyper-V・WSL などの仮想ネットワーク（PC2からはつながらない）
const VIRTUAL_RE = /virtual|vbox|vmware|vethernet|hyper-v|wsl|loopback|docker|tailscale|zerotier|bluetooth/i;

function lanAddresses() {
  const list = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      list.push({
        name,
        address: a.address,
        virtual: VIRTUAL_RE.test(name) || a.address.startsWith('192.168.56.') || a.address.startsWith('169.254.'),
      });
    }
  }
  // 本物のネットワークを先に
  return list.sort((x, y) => Number(x.virtual) - Number(y.virtual));
}

// 大きな文字（5行）
const BIG = {
  0: ['███', '█ █', '█ █', '█ █', '███'],
  1: [' █ ', '██ ', ' █ ', ' █ ', '███'],
  2: ['███', '  █', '███', '█  ', '███'],
  3: ['███', '  █', '███', '  █', '███'],
  4: ['█ █', '█ █', '███', '  █', '  █'],
  5: ['███', '█  ', '███', '  █', '███'],
  6: ['███', '█  ', '███', '█ █', '███'],
  7: ['███', '  █', '  █', '  █', '  █'],
  8: ['███', '█ █', '███', '█ █', '███'],
  9: ['███', '█ █', '███', '  █', '███'],
  '.': ['   ', '   ', '   ', '   ', ' █ '],
};

function bigText(text) {
  const rows = ['', '', '', '', ''];
  for (const ch of text) {
    const g = BIG[ch];
    if (!g) continue;
    for (let i = 0; i < 5; i++) rows[i] += `${g[i]} `;
  }
  return rows.map((r) => `    ${r}`).join('\n');
}

function printBanner(config) {
  const ips = lanAddresses();
  const real = ips.filter((a) => !a.virtual);
  const line = '='.repeat(64);

  console.log('');
  console.log(line);
  console.log('   料理伝言ゲーム サーバー起動中   （この黒い画面は閉じないでね）');
  console.log(line);
  console.log('');
  console.log(`  ■ PC1（このPC・送信側）で開く:  http://localhost:${config.port}/sender.html`);
  console.log('');

  if (real.length === 0) {
    console.log('  ■ PC2（受信側）で開くURLが見つかりません！');
    console.log('    → LANケーブル／ルーターの電源・接続を確認してから、もう一度起動してください。');
  } else {
    console.log('  ■ PC2（受信側）で開く:');
    for (const a of real) console.log(`        http://${a.address}:${config.port}/receiver.html     （${a.name}）`);
    console.log('');
    console.log('    PC1 の IP アドレス:');
    console.log('');
    console.log(bigText(real[0].address));
    console.log('');
    if (real.length > 1) {
      console.log('    ※ IPアドレスが2つ以上あります。ルーターにつながっている方（ふつうは 192.168.x.x）を使ってください。');
    }
  }
  const virtual = ips.filter((a) => a.virtual);
  if (virtual.length) {
    console.log(`    （使わない仮想ネットワーク: ${virtual.map((a) => a.address).join(', ')}）`);
  }
  console.log('');
  console.log(`  難易度: ${config.difficulty}   効果音: ${config.sound ? 'ON' : 'OFF'}   放置で戻る: ${config.idleTimeoutSec}秒`);
  console.log('  スタッフ用リセット: どちらかのPCで Ctrl + Shift + R');
  console.log('  終了: この画面で Ctrl + C');
  console.log(line);
  console.log('');
}

module.exports = { lanAddresses, printBanner, bigText };
