// 画像があれば画像、無ければ絵文字で表示するアイコン。
// kind: 'ingredients' | 'seasonings' | 'dishes' | 'tools'（public/assets/<kind>/<id>.png）

let assets = { ingredients: new Set(), seasonings: new Set(), dishes: new Set(), tools: new Set() };

export function setAssets(a) {
  assets = a;
}

export function hasAsset(kind, id) {
  return !!(assets[kind] && assets[kind].has(id));
}

export function iconEl(kind, item, className = 'icon') {
  const el = document.createElement('span');
  el.className = className;
  if (kind && assets[kind] && assets[kind].has(item.id)) {
    const img = document.createElement('img');
    img.src = `assets/${kind}/${item.id}.png`;
    img.alt = item.name || '';
    img.draggable = false;
    // 置いてあるはずの画像が壊れていたら絵文字に戻す
    img.addEventListener('error', () => {
      el.classList.add('icon--emoji');
      el.textContent = item.emoji || '？';
    });
    el.appendChild(img);
  } else {
    // 画像がまだ無いものは絵文字。イラストと並んでも浮かないよう、シール風のふちを付ける（CSS）
    el.classList.add('icon--emoji');
    el.textContent = item.emoji || '？';
  }
  return el;
}

// 隠された情報用の「？」
export function hiddenIconEl(className = 'icon') {
  const el = document.createElement('span');
  el.className = `${className} icon--hidden`;
  el.textContent = '？';
  return el;
}
