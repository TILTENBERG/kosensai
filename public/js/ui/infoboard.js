// 料理の情報（食材3つ・調味料・調理方法・一言メモ）を並べて見せる部品。
// 送信側の確認画面と、受信側の情報画面で使う。null の項目は「？」で表示する。
import { h } from '../game/screens.js';
import { iconEl, hiddenIconEl } from './icons.js';

function tile(kind, item, sub) {
  if (!item) {
    return h('div', { class: 'tile is-hidden' }, hiddenIconEl('icon icon--tile'), h('span', { class: 'tile__name' }, 'ひみつ'));
  }
  return h('div', { class: 'tile', dataset: { id: item.id } },
    iconEl(kind, item, 'icon icon--tile'),
    h('span', { class: 'tile__name' }, item.name),
    sub ? h('span', { class: 'tile__sub' }, sub) : null,
  );
}

export function renderInfoBoard(container, view, game, { compact = false } = {}) {
  const ingredients = view.ingredients.map((id) => id && game.ingredientById.get(id));
  const seasoning = view.seasoning && game.seasoningById.get(view.seasoning);
  const method = view.method && game.methodById.get(view.method);

  if (compact) {
    const chip = (kind, item) =>
      item
        ? h('span', { class: 'mini-chip' }, iconEl(kind, item, 'icon icon--mini'), item.name)
        : h('span', { class: 'mini-chip is-hidden' }, '？');
    container.replaceChildren(
      ...ingredients.map((i) => chip('ingredients', i)),
      h('span', { class: 'mini-sep' }),
      chip('seasonings', seasoning),
      chip('tools', method),
      h('span', { class: 'mini-chip mini-chip--memo' }, `💬 ${view.memo}`),
    );
    return;
  }

  container.replaceChildren(
    h('div', { class: 'board-group board-group--ingredients' },
      h('p', { class: 'board-group__label' }, '🥕 食材'),
      h('div', { class: 'board-group__tiles' }, ...ingredients.map((i) => tile('ingredients', i))),
    ),
    h('div', { class: 'board-group' },
      h('p', { class: 'board-group__label' }, '🧂 調味料'),
      h('div', { class: 'board-group__tiles' }, tile('seasonings', seasoning)),
    ),
    h('div', { class: 'board-group' },
      h('p', { class: 'board-group__label' }, '🔥 調理方法'),
      h('div', { class: 'board-group__tiles' }, tile('tools', method, method && method.tool)),
    ),
    h('div', { class: 'board-group board-group--memo' },
      h('p', { class: 'board-group__label' }, '💬 一言メモ'),
      h('div', { class: 'memo-bubble' }, view.memo),
    ),
  );
}
