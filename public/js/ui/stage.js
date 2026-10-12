// 1920×1080 のステージを、ウィンドウの大きさに合わせて拡大・縮小する。
// フルスクリーン（F11）でも、少し小さいモニターでもレイアウトがくずれない。

export const STAGE_W = 1920;
export const STAGE_H = 1080;

export function fitStage(el = document.getElementById('app')) {
  const fit = () => {
    const scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
    el.style.transform = `translate(-50%, -50%) scale(${scale})`;
  };
  window.addEventListener('resize', fit);
  fit();
}

// 右クリックメニュー・ドラッグ・ダブルタップ拡大など、展示中に困る操作を止める
export function lockInteractions() {
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('dragstart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
}
