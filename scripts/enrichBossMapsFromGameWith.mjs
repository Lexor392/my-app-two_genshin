import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG = path.join(ROOT, "src", "data", "bossDetails.json");
const MAP_DIR = path.join(ROOT, "public", "assets", "boss-maps");
const BOSS_LIST_URL = "https://gamewith.net/genshin-impact/article/show/22421";
const LANGUAGE_KEYS = ["en", "ru", "zh", "ja", "ko"];
const GUIDE_OVERRIDES = {
  childe: "https://gamewith.net/genshin-impact/article/show/24018",
  goldenwolflord: "https://gamewith.net/genshin-impact/article/show/30063",
  jadeplumeterrorshroom: "https://gamewith.net/genshin-impact/article/show/34647",
  chimericwingedlion: "https://allthings.how/genshin-impact-7-0-how-to-beat-the-chimeric-winged-lion-boss/",
  guardianbladeofdriftingsnow: "https://allthings.how/how-to-beat-the-guardian-blade-of-drifting-snow-boss-in-genshin-impact-7-1/",
  immortalconstruct: "https://allthings.how/genshin-impact-7-0-how-to-beat-the-immortal-construct-boss/",
  lasignora: "https://gamewith.net/genshin-impact/article/show/29607",
  magatsumitakenarukaminomikoto: "https://gamewith.net/genshin-impact/article/show/30982",
  perpetualmechanicalarray: "https://gamewith.net/genshin-impact/article/show/29424",
  "local-legend-geovishap": "https://game8.co/games/Genshin-Impact/archives/388736",
  "local-legend-fatuiskirmisherpyroslingerbracer": "https://gamewith.net/genshin-impact/article/show/47865",
  "local-legend-fatuiskirmishercryogunnerlegionnaire": "https://gamewith.net/genshin-impact/article/show/47865",
  "local-legend-fatuiskirmisherelectrohammervanguard": "https://gamewith.net/genshin-impact/article/show/47865",
  ildottore: "https://gamewith.net/genshin-impact/article/show/77347",
};
const ALIASES = {
  lupusboreasdominatorofwolves: ["Andrius"],
  stormterror: ["Dvalin Stormterror"],
  childe: ["Childe Boss"],
  lasignora: ["La Signora Boss"],
  guardianofapepsoasis: ["Apep"],
  bolteaterbathysmalvishap: ["Bathysmal Vishap Herd"],
  rimebiterbathysmalvishap: ["Bathysmal Vishap Herd"],
};

const normalize = (value = "") => value.toLowerCase().replace(/&amp;/g, "&").replace(/&#039;/g, "'").replace(/[^a-z0-9]/g, "");
const decode = (value = "") => value
  .replace(/&amp;/g, "&")
  .replace(/&#039;|&apos;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/&nbsp;/g, " ")
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/<[^>]*>/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const responseText = async (url) => {
  const response = await fetch(url, { headers: { "User-Agent": "GenshinImpactRandomLab/1.0 (boss location images)" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.text();
};

const getGuidePages = (html) => [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
  .map(([, href, content]) => ({ url: new URL(href, BOSS_LIST_URL).href, title: decode(content) }))
  .filter(({ url, title }) => url.includes("/article/show/") && title)
  .filter((page, index, all) => all.findIndex((candidate) => candidate.url === page.url) === index);

const findGuide = (record, pages) => {
  const wantedNames = [record.name, record.names?.en, ...(ALIASES[record.id] || [])]
    .filter(Boolean).map(normalize).filter(Boolean);
  return pages.find(({ title }) => wantedNames.some((name) => normalize(title) === name))
    || pages.find(({ title }) => wantedNames.some((name) => normalize(title).startsWith(name) || name.startsWith(normalize(title))));
};

const getMapImageUrl = (html, pageUrl) => {
  const headings = [...html.matchAll(/<h[2-4]\b[^>]*>[\s\S]*?<\/h[2-4]>/gi)];
  const heading = headings.find((match) => /map|location/i.test(decode(match[0])));
  if (!heading) return "";
  const nextHeading = headings.find((match) => match.index > heading.index);
  const section = html.slice(heading.index + heading[0].length, nextHeading?.index || heading.index + heading[0].length + 18000);
  const images = [...section.matchAll(/<img\b[^>]*>/gi)].map(([tag]) => {
    const get = (key) => tag.match(new RegExp(`\\b${key}=["']([^"']+)["']`, "i"))?.[1] || "";
    const url = get("data-original") || get("data-src") || get("preview") || get("src");
    const alt = get("alt");
    return { url, alt };
  }).filter(({ url, alt }) => url && alt && !url.includes("transparent1px") && /map|location/i.test(alt))
    .filter(({ url }) => !/thumbnail\/rectangle|thumbnail\/square|transparent1px/i.test(url));
  const candidate = images.find(({ alt }) => /map/i.test(alt)) || images[0];
  if (!candidate) return "";
  return new URL(candidate.url.replace(/&amp;/g, "&"), pageUrl).href;
};

const run = async () => {
  const catalog = JSON.parse(await readFile(CATALOG, "utf8"));
  const pages = getGuidePages(await responseText(BOSS_LIST_URL));
  await mkdir(MAP_DIR, { recursive: true });
  let downloaded = 0;
  let skipped = 0;

  for (const record of Object.values(catalog)) {
    if (record.map) continue;
    const page = GUIDE_OVERRIDES[record.id]
      ? { url: GUIDE_OVERRIDES[record.id], title: "Verified boss location guide" }
      : findGuide(record, pages);
    if (!page) { skipped += 1; continue; }
    try {
      const html = await responseText(page.url);
      const imageUrl = getMapImageUrl(html, page.url);
      if (!imageUrl) { skipped += 1; continue; }
      const imageResponse = await fetch(imageUrl, { headers: { "User-Agent": "GenshinImpactRandomLab/1.0 (boss location images)" } });
      if (!imageResponse.ok) { skipped += 1; continue; }
      const bytes = new Uint8Array(await imageResponse.arrayBuffer());
      if (bytes.length < 1000) { skipped += 1; continue; }
      const extension = path.extname(new URL(imageUrl).pathname).toLowerCase() || ".jpg";
      const filename = `${record.id}${extension}`;
      await writeFile(path.join(MAP_DIR, filename), bytes);
      record.map = `assets/boss-maps/${filename}`;
      record.mapSourcePage = page.url;
      downloaded += 1;
      console.log(`MAP ${record.name} <- ${page.title} (${Math.round(bytes.length / 1024)} KB)`);
    } catch (error) {
      skipped += 1;
      console.log(`SKIP ${record.name}: ${error.message}`);
    }
  }

  for (const record of Object.values(catalog)) {
    for (const locale of LANGUAGE_KEYS) {
      if (!record.location?.[locale]) record.location[locale] = {};
      if (!record.description?.[locale]) record.description[locale] = "";
      if (!record.details?.[locale]) record.details[locale] = "";
      if (!record.names?.[locale]) record.names[locale] = record.name || "";
    }
  }

  await writeFile(CATALOG, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  console.log(`Downloaded ${downloaded} maps; ${skipped} bosses had no guide map image. Catalog contains ${Object.keys(catalog).length} bosses.`);
};

await run();
