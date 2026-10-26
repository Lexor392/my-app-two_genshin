# Boss details data

Edit [`bossDetails.json`](./bossDetails.json) to add or correct a boss name, category, portrait, map, description, location, or extra notes. This is the single source of boss artwork and hover-card information.

Each top-level key is the boss ID used by the app. A record has this shape:

```json
{
  "id": "lupusboreasdominatorofwolves",
  "description": {
    "ru": "Описание на русском",
    "en": "Description in English",
    "zh": "简体中文描述",
    "ja": "日本語の説明",
    "ko": "한국어 설명"
  },
  "details": { "ru": "", "en": "", "zh": "", "ja": "", "ko": "" },
  "names": { "ru": "Андриус", "en": "Andrius", "zh": "安德留斯", "ja": "アンドリアス", "ko": "안드리우스" },
  "category": "weekly",
  "image": "assets/bosses/lupusboreasdominatorofwolves.webp",
  "splash": "assets/bosses/lupusboreasdominatorofwolves.webp",
  "location": {
    "en": { "region": "Mondstadt", "area": "Windwail Highland", "subarea": "Wolvendom" },
    "ru": { "region": "Мондштадт", "area": "Вольфендом", "subarea": "Вольфендом" },
    "zh": { "region": "蒙德", "area": "奔狼领", "subarea": "奔狼领" },
    "ja": { "region": "モンド", "area": "奔狼領", "subarea": "奔狼領" },
    "ko": { "region": "몬드", "area": "울프 영지", "subarea": "울프 영지" }
  },
  "map": "assets/boss-maps/lupusboreasdominatorofwolves.png"
}
```

Put portrait files in `public/assets/bosses/` and location maps in `public/assets/boss-maps/`. `image`, `splash`, and `map` paths are relative to `public/`. Keep the locale keys `ru`, `en`, `zh`, `ja`, and `ko` in `description`, `names`, `location`, and `details`. `location` is localized directly for each language. `details` is an optional additional paragraph for facts that do not fit the location fields.

The optional `mapSourcePage` field records the page used to find a local map screenshot. It is metadata only and is not shown in the app. Keep downloaded map files under version control so the hover card works without an external request.

The sync script writes a separate `bossDetails.generated.json` file so it does not overwrite hand-edited `bossDetails.json`.
