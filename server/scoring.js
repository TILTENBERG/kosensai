'use strict';
// 採点モジュール。送った情報と全料理を比べて点数を出す。
//   食材の一致数 × 20点（最大60点）＋ 調味料一致 20点 ＋ 調理方法一致 20点 ＝ 100点満点

const POINTS = {
  ingredient: 20,
  seasoning: 20,
  method: 20,
};

// 1つの料理と比べた点数
function scoreDish(info, dish) {
  const sent = new Set(info.ingredients);
  // 食材は集合として扱う（順番・重複は関係なし）
  const ingredientMatches = [...new Set(dish.ingredients)].filter((id) => sent.has(id)).length;
  const seasoningMatch = info.seasoning === dish.seasoning;
  const methodMatch = info.method === dish.method;
  const score =
    ingredientMatches * POINTS.ingredient +
    (seasoningMatch ? POINTS.seasoning : 0) +
    (methodMatch ? POINTS.method : 0);
  return { dishId: dish.id, score, ingredientMatches, seasoningMatch, methodMatch };
}

// 最高点の料理 ＝「送った情報で作れた料理」。同点ならお題の料理を優先し、次にリスト順。
function findBestDish(info, dishes, targetDishId) {
  let best = null;
  for (const dish of dishes) {
    const s = scoreDish(info, dish);
    if (
      !best ||
      s.score > best.score ||
      (s.score === best.score && s.dishId === targetDishId && best.dishId !== targetDishId)
    ) {
      best = s;
    }
  }
  return best;
}

// 演出の種類：100% 大成功 / 60〜80% おしい / 40%以下 なぞの料理
function resultTier(percent) {
  if (percent >= 100) return 'perfect';
  if (percent >= 60) return 'close';
  return 'mystery';
}

// リザルト画面用のデータをまとめて作る
function buildResult({ info, dishes, targetDishId, answerDishId }) {
  const made = findBestDish(info, dishes, targetDishId);
  const percent = Math.max(0, Math.min(100, made.score));
  return {
    made,
    percent,
    tier: resultTier(percent),
    targetDishId,
    answerDishId,
    correct: answerDishId === targetDishId,
    sentInfo: info,
  };
}

module.exports = { POINTS, scoreDish, findBestDish, resultTier, buildResult };
