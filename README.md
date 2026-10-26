# Genshin Impact Random Lab

A responsive Genshin Impact character and boss randomizer with filters, multi-lane roulettes, saved squads, roll history, five interface languages, and light/dark themes.

## Requirements

- Node.js 22 or newer
- npm

## Run locally

```sh
npm install
npm start
```

Vite serves the development site at `http://localhost:5173`.

## Checks and release build

```sh
npm test
npm run build
```

The production output is written to `dist/`. `npm run deploy` publishes that output to the `gh-pages` branch through the `gh-pages` package.

## Data and images

The catalog is refreshed from [genshin-db](https://github.com/theBowja/genshin-db) on every visit, so newly added characters are picked up automatically; local-legend data and some fallback images use the Genshin Impact Fandom API. Character and boss images are preloaded before the application opens and cached as image files in IndexedDB for faster later visits. Catalog responses use session storage as a 14-day offline fallback. Image loading falls back between Ambr, Hakush, and repaired Fandom image URLs.

Settings, selected pools, saved squads, and history are stored in browser cookies. The application does not require an account.

## Support and donations

Before enabling public feedback and donations, set `SUPPORT_EMAIL` and `DONATION_URL` in `src/config/support.js`. Support submissions use the free FormSubmit email form endpoint; its first submission must be confirmed from the receiving inbox. The donation page uses a creator-owned Donatello profile URL. The project owner must create and verify that account and review its current payout, fee, and tax terms before publishing the link.
