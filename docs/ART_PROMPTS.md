# Art prompts (Gemini / Nano Banana)

Art direction: **hand-painted anime food, like the food scenes in 1990s Japanese animated films** (warm, glossy, appetizing, soft light), plus **two kid chef characters**, one for each PC.

All images are made in Gemini (Nano Banana) for free, then saved into `art-raw/`.
`scripts/process-art.py` removes the magenta background, trims, resizes and copies them into `public/assets/`.

---

## How to generate (read this first)

1. Open https://gemini.google.com and start a **new chat for each section** below (characters, ingredients, dishes, etc.).
2. Paste the **section's START message** first. It fixes the style for the whole chat.
3. Then send **one subject line per message**, in order.
4. When the first image of a section looks good, **attach it as a reference** in the next messages ("same style as this image") so every image matches.
5. Download each image and save it as **`art-raw/<folder>/<filename>.png`** (the exact name in the table). Any size is fine as long as it's square, 1024×1024 or larger.
6. If an image comes out with text, a watermark, a shadow on the background, or more than one object, regenerate it.

**Why magenta?** Gemini can't make transparent PNGs. A flat magenta (#FF00FF) background is easy for the script to cut out, and no food in this game is magenta.

---

## Shared style (already included in each START message)

> Hand-painted Japanese anime film style, like the delicious food scenes in classic 1990s hand-drawn anime movies. Warm gouache and watercolor texture, soft cel shading, rich saturated but natural colors, glossy highlights that make food look juicy and freshly cooked, gentle warm light from the upper left. Clean readable silhouette, no black outlines. Single object, centered, filling about 80% of the frame, viewed from a slightly high 3/4 angle. Background: perfectly flat solid magenta #FF00FF, no gradient, no floor, no cast shadow, no texture. No text, no letters, no logos, no watermark, no border, no extra objects.

---

## 1. Characters (do these first, they take the longest)

Two kids about 11 years old, chibi-ish but not too baby-like (about 3.5 heads tall), friendly to elementary and middle schoolers.

- **おくる人 (sender, PC1, orange):** energetic, short spiky brown hair, orange bandana, orange apron over a white T-shirt, big smile, holds a wooden spatula.
- **あてる人 (receiver, PC2, blue):** curious and calm, black bob hair with a blue hairclip, tall white chef hat, blue apron, holds a big wooden spoon.

### START message (characters)

```
For this whole chat, make anime character illustrations with these rules:
Hand-painted Japanese anime film style, like classic 1990s hand-drawn anime movies. Soft cel shading, warm gouache texture, clean thin brown line art, gentle warm light. Full body, centered, whole character visible with space around it. Background: perfectly flat solid magenta #FF00FF, no gradient, no floor, no cast shadow. No text, no logos, no watermark. Square image.
Reply "OK" and wait for my next message.
```

### Step A: character sheet (one per character)

Make the sheet, pick the best one, then **attach it to every pose request** for that character.

```
Character sheet of an 11-year-old Japanese kid chef, about 3.5 heads tall: energetic, short spiky brown hair, orange bandana, orange apron over a white T-shirt, black shorts, red sneakers, big friendly smile, holding a wooden spatula. Front view, standing, neutral happy pose.
```

```
Character sheet of an 11-year-old Japanese kid chef, about 3.5 heads tall: curious and calm, black bob hair with a light-blue hairclip, tall white chef hat, blue apron over a white shirt, navy shorts, white sneakers, gentle smile, holding a big wooden spoon. Front view, standing, neutral happy pose.
```

### Step B: poses

Send with the character sheet attached: `Same character as the attached image, same outfit and colors. Pose: <pose>`

| Save as `art-raw/chara/sender/…` | Pose (paste after "Pose:") |
|---|---|
| `idle.png` | standing and waving one hand, cheerful smile |
| `guide.png` | pointing to the right side with the spatula, explaining, mouth open |
| `think.png` | hand on chin, looking up, thinking, small sweat drop |
| `happy.png` | jumping with both arms up, eyes closed with joy, sparkles around |
| `almost.png` | clenched fist, determined face, "so close!" expression |
| `oops.png` | comically falling over backwards, swirly eyes, spatula flying |
| `send.png` | throwing a paper airplane forward with energy |

| Save as `art-raw/chara/receiver/…` | Pose |
|---|---|
| `idle.png` | standing, holding the spoon with both hands, gentle smile |
| `guide.png` | pointing to the left side with the spoon, explaining |
| `think.png` | looking at a small note card, tilting head, question mark above head |
| `happy.png` | jumping with both arms up, eyes closed with joy, chef hat bouncing |
| `almost.png` | both hands on cheeks, surprised "so close!" face |
| `oops.png` | comically falling over, swirly eyes, chef hat falling off |
| `receive.png` | catching a paper airplane with both hands, excited |

---

## 2. Ingredients (10)

### START message (ingredients / seasonings / tools / dishes)

Use this same START message for sections 2–5 (new chat each time).

```
For this whole chat, make single-object game item illustrations with these rules:
Hand-painted Japanese anime film style, like the delicious food scenes in classic 1990s hand-drawn anime movies. Warm gouache and watercolor texture, soft cel shading, rich saturated but natural colors, glossy highlights that make food look juicy and freshly cooked, gentle warm light from the upper left. Clean readable silhouette, no black outlines. Single object, centered, filling about 80% of the frame, slightly high 3/4 angle. Background: perfectly flat solid magenta #FF00FF, no gradient, no floor, no cast shadow, no texture. No text, no letters, no logos, no watermark, no border, no extra objects. Square image.
Reply "OK" and wait for my next message.
```

| Save as `art-raw/ingredients/…` | Subject |
|---|---|
| `meat.png` | a thick raw slab of pork belly with marbled fat, on nothing |
| `cabbage.png` | a whole fresh green cabbage with crisp outer leaves |
| `pepper.png` | one shiny Japanese green bell pepper (piman) |
| `carrot.png` | one fresh carrot with leafy green top |
| `flour.png` | a small burlap sack of white flour, open at the top, a little flour spilling |
| `onion.png` | one golden-brown onion with papery skin |
| `potato.png` | two round potatoes with small eyes and soil-brown skin |
| `rice.png` | a Japanese rice bowl filled with fluffy steaming white rice |
| `tomato.png` | one ripe red tomato with green stem, glossy |
| `egg.png` | two brown chicken eggs, one cracked open showing a bright yolk |

## 3. Seasonings (10)

Keep the bottles **without readable labels** (just colored labels or simple shapes, no letters).

| Save as `art-raw/seasonings/…` | Subject |
|---|---|
| `toubanjan.png` | a small glass jar of red chili bean paste (doubanjiang) with a red lid, no label text |
| `consomme.png` | three golden consommé bouillon cubes wrapped in gold foil, one unwrapped |
| `sauce.png` | a Japanese brown okonomiyaki sauce bottle, dark sauce, plain label with no text |
| `ketchup.png` | a red squeeze ketchup bottle, plain label with no text |
| `soysauce.png` | a small glass soy sauce dispenser with red cap, dark soy sauce inside |
| `roux.png` | two blocks of Japanese roux side by side on plastic trays, broken into squares: one brown curry roux and one creamy white stew roux |
| `cheese.png` | a wedge of yellow cheese with holes and a small pile of shredded cheese |
| `vinegar.png` | a clear glass bottle of rice vinegar, pale gold liquid, plain label with no text |
| `saltpepper.png` | a salt-and-pepper shaker set, white and black, wooden caps |
| `mayo.png` | a Japanese squeeze mayonnaise bottle with red cap, plain label with no text |

## 4. Tools (5)

| Save as `art-raw/tools/…` | Subject |
|---|---|
| `stirfry.png` | an empty black Chinese wok with a wooden handle, seen from slightly above |
| `simmer.png` | an empty silver cooking pot with two handles and a lid tilted open |
| `bake.png` | an empty black frying pan with a wooden handle, seen from slightly above |
| `mix.png` | an empty large white ceramic mixing bowl with a wooden spoon |
| `deepfry.png` | a deep fryer pot full of golden bubbling oil, with a wire basket |

## 5. Dishes (23 + 1)

Each dish is served on a plate or bowl, freshly cooked, with a little steam.

| Save as `art-raw/dishes/…` | Subject |
|---|---|
| `hoikoro.png` | Hoikoro: stir-fried pork belly, cabbage and green pepper in glossy red chili bean sauce, on a white plate |
| `rollcabbage.png` | Japanese cabbage rolls in clear golden consommé soup in a shallow bowl, with large bright orange carrot chunks clearly visible in the soup next to the rolls |
| `okonomiyaki.png` | okonomiyaki pancake with brown sauce, mayonnaise zigzag, bonito flakes and green seaweed, on a plate |
| `nikuzume.png` | green peppers stuffed with meat, pan-fried, with ketchup sauce, on a plate |
| `nikujaga.png` | nikujaga: simmered beef, potatoes, onion and carrot in sweet soy broth, in a Japanese bowl |
| `curry.png` | Japanese curry rice: thick brown curry with potato, carrot and meat next to white rice, on a plate |
| `stew.png` | Japanese cream stew with chicken, potato and carrot in a white sauce, in a deep bowl |
| `dakgalbi.png` | cheese dakgalbi: spicy chicken and vegetables in a hot pan with stretchy melted cheese |
| `hamburg.png` | Japanese hamburg steak with shiny demi-glace sauce, with a side of vegetables on a plate |
| `gapao.png` | gapao rice: Thai basil minced meat with lots of green bell pepper pieces next to white rice on a plate, no egg |
| `tacorice.png` | Okinawan taco rice: seasoned ground meat, shredded lettuce, tomato and cheese over rice |
| `minestrone.png` | minestrone: red tomato soup with small pieces of meat, onion and tomato, in a deep soup bowl |
| `subuta.png` | sweet-and-sour pork: crispy fried pork, carrot and green pepper in shiny sweet-and-sour sauce |
| `gyudon.png` | gyudon: thin simmered beef and onion over rice in a large donburi bowl |
| `oyakodon.png` | oyakodon: chicken and soft fluffy egg over rice in a donburi bowl |
| `omurice.png` | omurice: fluffy yellow omelette over ketchup rice, with a heart drawn in ketchup on top |
| `chahan.png` | Japanese fried rice with egg, pork and green onion, dome-shaped on a plate |
| `potatosalad.png` | Japanese potato salad with egg, carrot and cucumber, creamy, in a bowl |
| `tonpeiyaki.png` | tonpeiyaki: pork and cabbage wrapped in an omelette, with brown sauce and mayonnaise on top |
| `chickennanban.png` | chicken nanban: crispy fried chicken with sweet vinegar glaze and thick tartar sauce, on a plate |
| `salad.png` | fresh salad of shredded cabbage, carrot and onion with creamy dressing, in a bowl |
| `consommesoup.png` | clear golden consommé soup with cabbage, carrot and onion pieces, in a soup cup |
| `hayashi.png` | hayashi rice: glossy dark brown beef and onion sauce next to white rice, on a plate |
| `mystery.png` | a funny weird mystery dish: neon-green and bright-blue bubbling goo on a plate (no purple or pink) with a cute confused face drawn in it, swirls of odd-colored steam (for the "なぞの料理" result) |

---

### Redo list (2026-10-18, after a cooking check from a teammate's mom)

These four changed. Make them in the dishes chat (or a new chat with the START message above), save with the same names, and run the script again.

| Save as | Why |
|---|---|
| `art-raw/dishes/rollcabbage.png` | the carrot must be easy to see (it's one of the 3 ingredients) |
| `art-raw/dishes/gapao.png` | the old picture had a fried egg, but egg isn't one of its ingredients |
| `art-raw/dishes/minestrone.png` | new dish (replaces トマトマリネ) |
| `art-raw/seasonings/roux.png` | the same ルー is used for curry, hayashi **and** cream stew, so show brown and white roux together |

---

## 6. Backgrounds (3)

Backgrounds are **not** on magenta. Ask for **16:9 landscape**. Save as `.png` (the script converts to `.jpg`).

### START message (backgrounds)

```
For this whole chat, make background art for a children's cooking game with these rules:
Hand-painted Japanese anime film background art, like the cozy painted backgrounds in classic 1990s hand-drawn anime movies. Watercolor and gouache texture, warm soft light, slightly blurred and low detail so game buttons on top stay readable. The center of the picture must be calm and fairly empty. No people, no characters, no text, no logos, no watermark. Wide 16:9 landscape image.
Reply "OK" and wait for my next message.
```

| Save as `art-raw/bg/…` | Subject |
|---|---|
| `sender.png` | a cozy sunny Japanese home kitchen in the morning, warm orange and cream colors, wooden shelves with jars and hanging pans at the edges, sunlight through a window |
| `receiver.png` | a cozy Japanese dining room next to the kitchen, cool light blue and white colors, a wooden table edge at the bottom, a window with blue sky and clouds |
| `cooking.png` | close-up of a kitchen stove counter, tiles in the back, warm light, the stovetop area in the lower center is empty and clear |

---

## 7. Game parts (1)

Use the same START message as sections 2–5 (new chat, or continue the tools chat). Attach `tools/simmer.png` as a style reference.

| Save as `art-raw/ui/…` | Subject |
|---|---|
| `pot.png` | a big round cooking pot for a kids' cooking game, warm red-orange enamel with a cream-colored rim and two small round side handles, seen from a slightly high angle so the wide open top is clearly visible as an oval, the inside is empty and dark brown, no lid, no food, no steam, no stove. The pot is wider than it is tall. |

This is the pot the sender drops ingredients into. The game draws it twice (once behind the ingredients, once in front, cut at the rim), so the **open top must be clearly visible** and the pot must be **empty**.

---

## Checklist

When you've saved a batch, tell me and I'll run the script and wire them in.

- [ ] Characters: 2 sheets + 14 poses
- [ ] Ingredients: 10
- [ ] Seasonings: 10
- [ ] Tools: 5
- [ ] Dishes: 24
- [ ] Backgrounds: 3
- [ ] Game parts: 1 (pot)

**Priority if time is short:** characters → dishes → backgrounds → ingredients → tools → seasonings. Anything missing falls back to the old image or emoji, so the game always works.
