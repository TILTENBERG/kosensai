// 画面に出た文字に自動でふりがな（<ruby>）を付ける。
// 辞書は data/furigana.json。{漢字|よみ} の形で書く。
// MutationObserver で見張るので、あとから JS で追加した文字にも付く。

const SKIP_TAGS = new Set(['RUBY', 'RT', 'RP', 'SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT']);

let entries = []; // [言葉, 部品の配列] 長い順
let pattern = null;

// "{玉|たま}ねぎ" → [{base:'玉', rt:'たま'}, 'ねぎ']
function parseAnnotated(s) {
  const parts = [];
  const re = /\{([^|}]+)\|([^}]+)\}|([^{]+)/g;
  let m;
  while ((m = re.exec(s))) {
    parts.push(m[3] !== undefined ? m[3] : { base: m[1], rt: m[2] });
  }
  return parts;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function setFuriganaDictionary(dict) {
  entries = Object.entries(dict)
    .map(([word, annotated]) => [word, parseAnnotated(annotated)])
    .sort((a, b) => b[0].length - a[0].length);
  pattern = entries.length ? new RegExp(entries.map(([w]) => escapeRe(w)).join('|'), 'g') : null;
}

function partsFor(word) {
  const e = entries.find(([w]) => w === word);
  return e ? e[1] : [word];
}

function annotateTextNode(node) {
  const text = node.nodeValue;
  pattern.lastIndex = 0;
  if (!pattern.test(text)) return;
  pattern.lastIndex = 0;

  const frag = document.createDocumentFragment();
  let last = 0;
  let m;
  while ((m = pattern.exec(text))) {
    if (m.index > last) frag.append(text.slice(last, m.index));
    for (const p of partsFor(m[0])) {
      if (typeof p === 'string') {
        frag.append(p);
      } else {
        const ruby = document.createElement('ruby');
        const rt = document.createElement('rt');
        rt.textContent = p.rt;
        ruby.append(p.base, rt);
        frag.append(ruby);
      }
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) frag.append(text.slice(last));
  // 1つの span にまとめる（flex の中で文字がバラバラの部品にならないように）
  const wrap = document.createElement('span');
  wrap.className = 'furi';
  wrap.append(frag);
  node.replaceWith(wrap);
}

function skipped(el) {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP_TAGS.has(e.tagName) || (e.dataset && 'noRuby' in e.dataset)) return true;
  }
  return false;
}

export function annotate(root) {
  if (!pattern) return;
  if (root.nodeType === Node.TEXT_NODE) {
    if (root.parentElement && !skipped(root.parentElement)) annotateTextNode(root);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE || skipped(root)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (skipped(n.parentElement) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(annotateTextNode);
}

// root 以下を今すぐ処理し、これから追加される文字も見張る
export function watchFurigana(root) {
  annotate(root);
  new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'characterData') annotate(m.target);
      else m.addedNodes.forEach((n) => annotate(n));
    }
  }).observe(root, { childList: true, subtree: true, characterData: true });
}
