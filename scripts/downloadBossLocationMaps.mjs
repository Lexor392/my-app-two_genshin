import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "src", "data", "bossDetails.json");
const mapDir = path.join(root, "public", "assets", "boss-maps");
const maps = {
  childe: {
    url: "https://images.rpgsite.net/image/da49c9a1/108991/original/Golden-House-Genshin-Impact-Location-Trounce-Domain.jpg",
    source: "https://www.rpgsite.net/feature/12246-genshin-impact-shivada-jade-sliver-locations-and-farming",
  },
  goldenwolflord: {
    url: "https://upload-os-bbs.hoyolab.com/upload/2021/11/25/1561847/9066d42913440b37f07293502b4e4316_483111307274304162.jpg?x-oss-process=image/resize,s_1000/quality,q_80/auto-orient,0/interlace,1/format,jpg",
    source: "https://www.hoyolab.com/article/1458239",
  },
  jadeplumeterrorshroom: {
    url: "https://img.gamewith.net/img/0cb5149a683f60037d07ff15d271e63a.jpg",
    source: "https://gamewith.net/genshin-impact/article/show/34647",
  },
  lasignora: {
    url: "https://www.gamepressure.com/genshin-impact/gfx/word/364901484.jpg",
    source: "https://www.gamepressure.com/genshin-impact/la-signora/zc103d4",
  },
  magatsumitakenarukaminomikoto: {
    url: "https://img.gamewith.jp/img/5eb63c227a29278f80b00380c9115601.png",
    source: "https://gamewith.jp/genshin/article/show/318302",
  },
  perpetualmechanicalarray: {
    url: "https://img.gamewith.net/img/be8cdb49b955b78db8117696ccefc90b.jpg",
    source: "https://gamewith.net/genshin-impact/article/show/29424",
  },
  "local-legend-fatuiskirmisherpyroslingerbracer": {
    url: "https://img.gamewith.net/img/dd21ed75252ffaabd16044a7ba85c071.png",
    source: "https://gamewith.net/genshin-impact/article/show/47865",
  },
  "local-legend-fatuiskirmishercryogunnerlegionnaire": {
    url: "https://img.gamewith.net/img/dd21ed75252ffaabd16044a7ba85c071.png",
    source: "https://gamewith.net/genshin-impact/article/show/47865",
  },
  "local-legend-fatuiskirmisherelectrohammervanguard": {
    url: "https://img.gamewith.net/img/dd21ed75252ffaabd16044a7ba85c071.png",
    source: "https://gamewith.net/genshin-impact/article/show/47865",
  },
  "radiantmoongecko": {
    url: "https://gamedaily.com/.image/MTU6MDAwMDAwMDAwMDQ0Nzk3/genshinimpact_mqb3qbovvn.png?profile=w2560&x=50&y=50",
    source: "https://gamedaily.com/games/where-to-find-lohens-upgrade-materials-genshin-impact-luna-vii-version-6-6",
  },
  "watcherfallenvigil": {
    url: "https://static.icy-veins.com/images/genshin-impact/exploration/mondstadt/windrest-peak/windrest-peak-watcher.webp",
    source: "https://www.icy-veins.com/genshin-impact/windrest-peak",
  },
  "local-legend-geovishap": {
    url: "https://img.game8.co/3831627/16fc8ec242d57c0e99ec964a957f0942.png/show",
    source: "https://game8.co/games/Genshin-Impact/archives/388736",
  },
};

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
await mkdir(mapDir, { recursive: true });
for (const [id, entry] of Object.entries(maps)) {
  const response = await fetch(entry.url, { headers: { "User-Agent": "GenshinImpactRandomLab/1.0" } });
  if (!response.ok) throw new Error(`${id}: image download failed (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 1000) throw new Error(`${id}: downloaded image is unexpectedly small`);
  const contentType = response.headers.get("content-type") || "";
  const extension = contentType.includes("webp") ? ".webp"
    : contentType.includes("png") ? ".png"
      : contentType.includes("jpeg") || contentType.includes("jpg") ? ".jpg"
        : path.extname(new URL(entry.url).pathname) || ".png";
  const filename = `${id}${extension}`;
  await writeFile(path.join(mapDir, filename), bytes);
  catalog[id].map = `assets/boss-maps/${filename}`;
  catalog[id].mapSourcePage = entry.source;
  console.log(`${id}: saved ${filename} (${Math.round(bytes.length / 1024)} KB)`);
}
await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
