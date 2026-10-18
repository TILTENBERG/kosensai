// サーバーから config とゲームデータを読み込み、IDで引けるようにする。

export async function loadBootstrap() {
  // サーバー起動直後などで失敗しても、つながるまで再試行する
  for (;;) {
    try {
      const res = await fetch('/api/bootstrap', { cache: 'no-store' });
      if (res.ok) return buildGameData(await res.json());
    } catch {
      // 再試行
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
}

function buildGameData({ config, data, assets }) {
  const byId = (list) => new Map(list.map((x) => [x.id, x]));
  return {
    config,
    assets: {
      ingredients: new Set(assets.ingredients),
      seasonings: new Set(assets.seasonings),
      dishes: new Set(assets.dishes),
      tools: new Set(assets.tools),
      chara: {
        sender: new Set((assets.chara && assets.chara.sender) || []),
        receiver: new Set((assets.chara && assets.chara.receiver) || []),
      },
      bg: assets.bg || {},
      ui: new Set(assets.ui || []),
      sounds: assets.sounds,
    },
    ...data,
    ingredientById: byId(data.ingredients),
    seasoningById: byId(data.seasonings),
    methodById: byId(data.methods),
    dishById: byId(data.dishes),
  };
}

// サーバーから来たリザルトを、表示に使うオブジェクトに置きかえる
export function resolveResult(result, game) {
  const info = result.sentInfo;
  return {
    percent: result.percent,
    tier: result.tier,
    correct: result.correct,
    madeDish: game.dishById.get(result.made.dishId),
    targetDish: game.dishById.get(result.targetDishId),
    answerDish: game.dishById.get(result.answerDishId),
    breakdown: result.made,
    sent: {
      ingredients: info.ingredients.map((id) => game.ingredientById.get(id)),
      seasoning: game.seasoningById.get(info.seasoning),
      method: game.methodById.get(info.method),
      memo: info.memo,
    },
  };
}
