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

The catalog is loaded from [genshin-db](https://github.com/theBowja/genshin-db); local-legend data and some fallback images use the Genshin Impact Fandom API. Character and boss images are preloaded before the application opens. Responses are cached in session storage for up to 14 days. Remote image and data availability depends on those services.

Settings, selected pools, saved squads, and history are stored in browser cookies. The application does not require an account.
