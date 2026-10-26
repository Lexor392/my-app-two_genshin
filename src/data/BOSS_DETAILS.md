# Boss details data

Edit [`bossDetails.json`](./bossDetails.json) to add or correct a boss description, map, or location.

Each top-level key is the boss ID used by `bossImageAssets.json`. A record has this shape:

```json
{
  "description": {
    "ru": "Описание на русском",
    "en": "Description in English",
    "zh": "简体中文描述",
    "ja": "日本語の説明",
    "ko": "한국어 설명"
  },
  "location": {
    "region": "Mondstadt",
    "area": "Windwail Highland",
    "subarea": "Wolvendom"
  },
  "map": "assets/boss-maps/lupusboreasdominatorofwolves.png"
}
```

Put map files in `public/assets/boss-maps/`; `map` is the path relative to `public/`. The description is selected by the current site language. If one translation is missing, the English text is used. Location labels are translated by the interface; location names are stored as written in the game data.

The optional `sourcePage` field records where the original information came from. It is metadata only and is not shown as a button.

The sync script writes a separate `bossDetails.generated.json` file so it does not overwrite hand-edited `bossDetails.json`.
