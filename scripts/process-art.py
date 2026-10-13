"""Gemini で作った画像（art-raw/）を、ゲームで使える形にして public/assets/ へ置く。

  python scripts/process-art.py            … art-raw/ の全部を処理
  python scripts/process-art.py dishes     … フォルダを指定して処理

- 背景のマゼンタ (#FF00FF) を透明にして、余白を切り詰める
- 食材・調味料・道具・料理 → 512×512 の正方形 PNG
- キャラクター → 高さ 900px までの PNG（縦長のまま）
- 背景 (bg) → 1920×1080 の JPG（マゼンタ処理はしない）

必要なもの：python -m pip install pillow numpy
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "art-raw"
OUT = ROOT / "public" / "assets"

SQUARE_KINDS = ("ingredients", "seasonings", "tools", "dishes")


def key_magenta(img):
    """マゼンタっぽさ（R と B が高く G が低い）から透明度を作る。ふちの色かぶりも取る。"""
    rgba = np.asarray(img.convert("RGBA")).astype(np.float32)
    r, g, b = rgba[..., 0], rgba[..., 1], rgba[..., 2]
    magenta = np.minimum(r, b) - g  # 背景ではほぼ 255、食べ物ではほぼ 0 以下
    # 明るさで割って「どれだけマゼンタか」の割合にする（Gemini の背景は影でうすく暗くなることがある）
    ratio = magenta / np.maximum(np.maximum(r, b), 1.0)
    lo, hi = 0.25, 0.55
    alpha = np.clip(1.0 - (ratio - lo) / (hi - lo), 0.0, 1.0)

    # ふちに残るピンクを消す（R と B の両方が G より高い分だけ引く。赤や緑の食べ物には効かない）
    spill = np.clip(magenta, 0.0, None)
    rgba[..., 0] = r - spill
    rgba[..., 2] = b - spill

    rgba[..., 3] = np.minimum(rgba[..., 3], alpha * 255.0)
    return Image.fromarray(rgba.clip(0, 255).astype(np.uint8), "RGBA")


def trim(img, margin_ratio):
    box = img.getchannel("A").point(lambda a: 255 if a > 12 else 0).getbbox()
    if not box:
        return img
    img = img.crop(box)
    m = int(max(img.size) * margin_ratio)
    canvas = Image.new("RGBA", (img.width + m * 2, img.height + m * 2), (0, 0, 0, 0))
    canvas.paste(img, (m, m))
    return canvas


def to_square(img, size):
    side = max(img.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
    return canvas.resize((size, size), Image.LANCZOS)


def fit_height(img, max_h):
    if img.height <= max_h:
        return img
    w = round(img.width * max_h / img.height)
    return img.resize((w, max_h), Image.LANCZOS)


def cover(img, w, h):
    scale = max(w / img.width, h / img.height)
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    left = (img.width - w) // 2
    top = (img.height - h) // 2
    return img.crop((left, top, left + w, top + h))


def process(src):
    rel = src.relative_to(RAW)
    kind = rel.parts[0]
    with Image.open(src) as im:
        im.load()
        if kind == "bg":
            dst = OUT / rel.with_suffix(".jpg")
            dst.parent.mkdir(parents=True, exist_ok=True)
            cover(im.convert("RGB"), 1920, 1080).save(dst, quality=86, optimize=True)
        elif kind == "chara":
            dst = OUT / rel.with_suffix(".png")
            dst.parent.mkdir(parents=True, exist_ok=True)
            fit_height(trim(key_magenta(im), 0.02), 900).save(dst, optimize=True)
        elif kind in SQUARE_KINDS:
            dst = OUT / rel.with_suffix(".png")
            dst.parent.mkdir(parents=True, exist_ok=True)
            to_square(trim(key_magenta(im), 0.04), 512).save(dst, optimize=True)
        else:
            print(f"  とばす（知らないフォルダ）: {rel}")
            return
    print(f"  OK  {rel}  →  {dst.relative_to(ROOT)}")


def main():
    sys.stdout.reconfigure(encoding="utf-8")  # Windows のコンソールで日本語を出すため
    if not RAW.exists():
        print(f"{RAW} がありません。docs/ART_PROMPTS.md を見て画像を置いてください。")
        return
    targets = [RAW / a for a in sys.argv[1:]] or [RAW]
    files = sorted(p for t in targets for p in t.rglob("*") if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"))
    print(f"{len(files)} 枚を処理します")
    for f in files:
        try:
            process(f)
        except Exception as e:  # 1枚こわれていても残りは続ける
            print(f"  NG  {f.relative_to(RAW)}: {e}")


if __name__ == "__main__":
    main()
