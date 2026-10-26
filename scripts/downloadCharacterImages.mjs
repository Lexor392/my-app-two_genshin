import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const characterDir = path.join(root, "public", "assets", "characters");
const imageManifestPath = path.join(root, "src", "data", "characterImageManifest.json");
const apiBase = "https://raw.githubusercontent.com/theBowja/genshin-db/main/src/data";

const fetchJson = async (url) => {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
};

const [index, imageData] = await Promise.all([
  fetchJson(`${apiBase}/index/English/characters.json`),
  fetchJson(`${apiBase}/image/characters.json`),
]);
const characterIds = Object.keys(index.namemap || {});
await mkdir(characterDir, { recursive: true });
const manifest = {};
const failures = [];
let nextIndex = 0;

const worker = async () => {
  while (nextIndex < characterIds.length) {
    const id = characterIds[nextIndex++];
    const entry = imageData[id] || {};
    const sources = [...new Set([entry.hoyowiki_icon, entry.mihoyo_icon].filter(Boolean))];
    let saved = false;
    for (const source of sources) {
      try {
        const response = await fetch(source, { headers: { "User-Agent": "GenshinImpactRandomLab/1.0" } });
        if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) continue;
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.length < 500) continue;
        const filename = `${id}.png`;
        await writeFile(path.join(characterDir, filename), bytes);
        manifest[id] = `assets/characters/${filename}`;
        saved = true;
        break;
      } catch {
        // Try the second official icon source before marking this character missing.
      }
    }
    if (!saved) failures.push(id);
  }
};

await Promise.all(Array.from({ length: Math.min(8, characterIds.length) }, worker));
await writeFile(imageManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Saved ${Object.keys(manifest).length}/${characterIds.length} character icons locally.`);
if (failures.length) console.log(`Could not download: ${failures.join(", ")}`);
