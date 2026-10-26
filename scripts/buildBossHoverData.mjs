import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Rebuild the bundled boss descriptions and location maps from the public Genshin Impact Wiki.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WIKI_API = "https://genshin-impact.fandom.com/api.php";
const DATA_BASE = "https://raw.githubusercontent.com/theBowja/genshin-db/main/src/data";
const ENEMY_API = "https://genshin-db-api.vercel.app/api/v5/enemies";
const MAP_DIR = path.join(ROOT, "public", "assets", "boss-maps");
const DATA_FILE = path.join(ROOT, "src", "data", "bossHoverDetails.json");
const aliases = {
  lupusboreasdominatorofwolves: ["Andrius"],
  stormterror: ["Dvalin"],
  shoukinokamitheprodigal: ["Everlasting Lord of Arcane Wisdom"],
  theknave: ["Arlecchino"],
  lasignora: ["Signora"],
  azhdaha: ["Azhdaha (Weekly Boss)"],
};

const fetchJson = async (url) => {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
};
const keyify = (value = "") => value.toLowerCase().replace(/\(local legend\)/g, "").replace(/[^a-z0-9]/g, "").trim();
const slugify = (value = "") => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const cleanWiki = (value = "") => value
  .replace(/<!--.*?-->/gs, "")
  .replace(/\[\[([^\]|]+\|([^\]]+))\]\]/g, "$2")
  .replace(/\[\[([^\]]+)\]\]/g, "$1")
  .replace(/\[https?:\/\/[^ ]+ ([^\]]+)\]/g, "$1")
  .replace(/\{\{[^{}]*\}\}/g, "")
  .replace(/'''?|<[^>]+>/g, "")
  .replace(/&mdash;/g, "—")
  .replace(/&ndash;/g, "–")
  .replace(/&quot;/g, '"')
  .replace(/&amp;/g, "&")
  .replace(/&nbsp;/g, " ")
  .replace(/\s+/g, " ")
  .trim();
const fileExt = (url) => {
  const name = new URL(url).pathname.toLowerCase();
  const ext = name.match(/\.(png|jpe?g|webp|gif)$/)?.[1] || "png";
  return ext === "jpeg" ? "jpg" : ext;
};

const getPages = async (title) => {
  const params = new URLSearchParams({ action: "parse", page: title, prop: "wikitext|images", format: "json", origin: "*" });
  const result = await fetchJson(`${WIKI_API}?${params}`);
  const page = result?.parse;
  const wikitext = page?.wikitext?.["*"] || "";
  if (!wikitext) return null;
  return { title: page.title || title, wikitext, images: page.images || [] };
};

const searchPages = async (query) => {
  const params = new URLSearchParams({ action: "query", list: "search", srsearch: query, srlimit: "5", format: "json", origin: "*" });
  const result = await fetchJson(`${WIKI_API}?${params}`);
  return (result?.query?.search || []).map((entry) => entry.title).filter(Boolean);
};

const getField = (text, field) => {
  const match = text.match(new RegExp(`^\\|\\s*${field}\\s*=\\s*([^\\r\\n]+)`, "im"));
  return cleanWiki((match?.[1] || "").replace(/\s*\|\s*[a-z][\w-]*\s*=.*$/i, ""));
};

const parseLocalLegendLocations = (wikitext) => {
  const locations = new Map();
  const section = wikitext.split("==Locations==")[1]?.split("==Tutorial==")[0] || "";
  for (const regionBlock of section.split(/(?=^===)/m).filter(Boolean)) {
    const heading = regionBlock.match(/^===\s*(.*?)\s*===/m)?.[1] || "";
    const region = cleanWiki(heading.split(/&mdash;|—/i)[0]);
    for (const gallery of regionBlock.matchAll(/<gallery[^>]*>([\s\S]*?)<\/gallery>/gi)) {
      for (const line of gallery[1].split("\n")) {
        const delimiter = line.indexOf("|");
        if (delimiter < 0) continue;
        const filename = line.slice(0, delimiter).trim();
        const caption = line.slice(delimiter + 1);
        const firstLine = caption.split(/<br\s*\/?\s*>/i)[0] || "";
        const name = cleanWiki(firstLine).replace(/^['\"]|['\"]$/g, "").replace(/\s*[—-].*$/, "").trim();
        const area = cleanWiki((caption.match(/\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]/) || [])[1] || "");
        if (name) locations.set(keyify(name), { region, area, mapFilename: filename });
      }
    }
  }
  return locations;
};

const extractDescription = (wikitext) => {
  const leadStart = wikitext.search(/\n'''/);
  let lead = leadStart >= 0 ? wikitext.slice(leadStart + 1).split(/^==/m)[0] : (wikitext.split(/^==/m)[0] || "");
  // Strip nested templates such as the infobox before taking the first descriptive paragraph.
  for (let pass = 0; pass < 8 && /\{\{/.test(lead); pass += 1) lead = lead.replace(/\{\{[^{}]*\}\}/g, "");
  const paragraphs = lead.split(/\n\s*\n/).map(cleanWiki).filter((part) => part.length > 40);
  return (paragraphs[0] || "").slice(0, 600);
};

const readImageUrl = async (filename) => {
  const params = new URLSearchParams({ action: "query", titles: `File:${filename.replaceAll("_", " ")}`, prop: "imageinfo", iiprop: "url", format: "json", origin: "*" });
  const result = await fetchJson(`${WIKI_API}?${params}`);
  return Object.values(result?.query?.pages || {})[0]?.imageinfo?.[0]?.url || "";
};

const fetchDatabaseDescription = async (record) => {
  for (const query of record.titles) {
    try {
      const params = new URLSearchParams({ query, matchNames: "true", resultLanguage: "english" });
      const entry = await fetchJson(`${ENEMY_API}?${params}`);
      if (entry?.name && (keyify(entry.name) === keyify(query) || keyify(entry.name) === keyify(record.name))) {
        const description = entry.description || entry.investigation?.description || "";
        if (description) return cleanWiki(description).slice(0, 600);
      }
    } catch { /* The wiki article description remains the preferred source. */ }
  }
  return "";
};

const saveMap = async (recordId, mapFilename) => {
  if (!mapFilename) return "";
  const remoteUrl = await readImageUrl(mapFilename).catch(() => "");
  if (!remoteUrl) return "";
  const response = await fetch(remoteUrl).catch(() => null);
  if (!response?.ok) return "";
  const filename = `${recordId}.${fileExt(remoteUrl)}`;
  await writeFile(path.join(MAP_DIR, filename), new Uint8Array(await response.arrayBuffer()));
  return `assets/boss-maps/${filename}`;
};

const chooseMap = (images) => images
  .filter((filename) => /(?:location|map)/i.test(filename) && !/(?:world map|interactive map|map guide)/i.test(filename))
  .map((filename) => ({ filename, score: /location/i.test(filename) ? 4 : /map/i.test(filename) ? 2 : 0 }))
  .sort((a, b) => b.score - a.score || a.filename.length - b.filename.length)[0]?.filename || "";

const getBossRecords = async () => {
  const index = await fetchJson(`${DATA_BASE}/index/English/enemies.json`);
  const nameMap = index.namemap || {};
  const ids = [...new Set([...(index.categories?.BOSS || []), ...(index.categories?.["Enemies of Note"] || [])])];
  const records = ids.map((id) => ({ id, name: nameMap[id] || id, titles: [nameMap[id] || id, ...(aliases[id] || [])] }));

  const localLegend = await getPages("Local Legend");
  const localLegendLocations = parseLocalLegendLocations(localLegend?.wikitext || "");
  if (localLegend) {
    const lines = localLegend.wikitext.split("\n").filter((line) => /^\*\s*\{\{Enemy\|/.test(line));
    for (const line of lines) {
      const raw = line.trim().replace(/^\*\s*\{\{Enemy\|/, "").replace(/\}\}\s*$/, "");
      const parts = raw.split("|");
      const source = cleanWiki(parts[0] || "");
      const params = Object.fromEntries(parts.slice(1).map((part) => {
        const [key, ...value] = part.split("=");
        return [key.trim(), value.join("=").trim()];
      }).filter(([key]) => key));
      let name = cleanWiki(params.text || source).replace(/"/g, "").trim();
      if (name.includes("\u2014")) name = name.split("\u2014")[0].trim();
      if (name.includes(" - ")) name = name.split(" - ")[0].trim();
      if (name.startsWith("Polychrome Tri-Stars:")) name = "Polychrome Tri-Stars";
      if (!name) continue;
      const linkedName = cleanWiki(params.link || "");
      const baseId = [linkedName, source, name].map(keyify).find((candidate) => Boolean(nameMap[candidate]));
      const id = `local-legend-${baseId || slugify(name)}`;
      if (records.some((record) => record.id === id)) continue;
      records.push({
        id,
        name,
        titles: [...new Set([linkedName, source, name].filter(Boolean))],
        localLocation: localLegendLocations.get(keyify(name)) || localLegendLocations.get(keyify(linkedName)) || localLegendLocations.get(keyify(source)),
      });
    }
  }

  // Include any already-shipped local legend assets as a safeguard for new entries in the app catalog.
  const imageAssets = JSON.parse(await readFile(path.join(ROOT, "src", "data", "bossImageAssets.json"), "utf8"));
  for (const id of Object.keys(imageAssets)) {
    if (records.some((record) => record.id === id)) continue;
    const baseId = id.replace(/^local-legend-/, "");
    const name = nameMap[baseId] || baseId.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
    records.push({ id, name, titles: [name], localLocation: localLegendLocations.get(keyify(name)) || localLegendLocations.get(keyify(baseId)) });
  }
  return [...new Map(records.map((record) => [record.id, record])).values()];
};

const resolvePage = async (record) => {
  const directCandidates = [...new Set(record.titles)];
  const isBossArticle = (page) => {
    if (!page) return false;
    const isEnemyArticle = /\{\{\s*Enemy Infobox/i.test(page.wikitext);
    if (!isEnemyArticle && /\{\{\s*Character Infobox/i.test(page.wikitext)) return false;
    return isEnemyArticle || Boolean(
      getField(page.wikitext, "region")
      || getField(page.wikitext, "area")
      || getField(page.wikitext, "subarea")
      || getField(page.wikitext, "location")
    );
  };
  for (const title of directCandidates) {
    try {
      const page = await getPages(title);
      if (isBossArticle(page)) return page;
    } catch { /* Try the next title or a wiki search. */ }
  }
  for (const title of directCandidates) {
    try {
      const results = await searchPages(`${title} Genshin Impact`);
      for (const result of results) {
        try {
          const page = await getPages(result);
          if (isBossArticle(page)) return page;
        } catch { /* Skip unavailable search hits. */ }
      }
    } catch { /* Try the next query. */ }
  }
  return null;
};

const records = await getBossRecords();
await mkdir(MAP_DIR, { recursive: true });
let cursor = 0;
const output = {};
const workers = Array.from({ length: 5 }, async () => {
  while (cursor < records.length) {
    const record = records[cursor++];
    try {
      const page = await resolvePage(record);
      if (!page) {
        const location = {
          region: record.localLocation?.region || "",
          area: record.localLocation?.area || "",
          subarea: "",
        };
        const map = await saveMap(record.id, record.localLocation?.mapFilename);
        output[record.id] = { name: record.name, location, description: await fetchDatabaseDescription(record), map, sourcePage: "https://genshin-impact.fandom.com/wiki/Local_Legend" };
        console.log(`${map ? "MAP" : "INFO"} ${record.name}: ${location.region || "?"} / ${location.area || "?"}${map ? ` → ${map}` : ""}`);
        continue;
      }
      const location = {
        region: getField(page.wikitext, "region") || record.localLocation?.region || "",
        area: record.id.startsWith("local-legend-")
          ? (record.localLocation?.area || getField(page.wikitext, "area") || getField(page.wikitext, "location") || "")
          : (getField(page.wikitext, "area") || getField(page.wikitext, "location") || ""),
        subarea: getField(page.wikitext, "subarea"),
      };
      const map = await saveMap(record.id, record.localLocation?.mapFilename || chooseMap(page.images));
      const description = extractDescription(page.wikitext) || await fetchDatabaseDescription(record);
      output[record.id] = { name: record.name, location, description, map, sourcePage: `https://genshin-impact.fandom.com/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}` };
      console.log(`${map ? "MAP" : "INFO"} ${record.name}: ${location.region || "?"} / ${location.area || "?"} / ${location.subarea || "?"}${map ? ` → ${map}` : ""}`);
    } catch (error) {
      output[record.id] = { name: record.name, location: {}, description: "", map: "", sourcePage: "" };
      console.log(`ERROR ${record.name}: ${error.message}`);
    }
  }
});
await Promise.all(workers);
await writeFile(DATA_FILE, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Wrote ${Object.keys(output).length} entries; ${Object.values(output).filter((item) => item.map).length} local maps.`);
