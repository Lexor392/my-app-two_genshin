import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Rebuild the bundled boss descriptions and location maps from the public Genshin Impact Wiki.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WIKI_API = "https://genshin-impact.fandom.com/api.php";
const DATA_BASE = "https://raw.githubusercontent.com/theBowja/genshin-db/main/src/data";
const ENEMY_API = "https://genshin-db-api.vercel.app/api/v5/enemies";
const MAP_DIR = path.join(ROOT, "public", "assets", "boss-maps");
const DATA_FILE = path.join(ROOT, "src", "data", "bossDetails.generated.json");
const DESCRIPTION_LANGUAGES = { ru: "russian", en: "english", zh: "chinese", ja: "japanese", ko: "korean" };
const TRANSLATE_LANGUAGES = { ru: "ru", zh: "zh-CN", ja: "ja", ko: "ko" };
const LOCAL_LEGEND_NAMES = {
  "Battlegoat and Ironclaw": { ru: "Боевой козёл и Железный Коготь", zh: "战斗山羊与铁爪", ja: "バトルゴートとアイアンクロー", ko: "배틀고트와 아이언클로" },
  Cocijo: { ru: "Косихо", zh: "科西霍", ja: "コシホ", ko: "코시호" },
  "Crab Tsar": { ru: "Краб-царь", zh: "蟹王", ja: "クラブツァーリ", ko: "크랩 차르" },
  "He Never Dies": { ru: "Он никогда не умирает", zh: "他永不死去", ja: "彼は決して死なない", ko: "그는 결코 죽지 않는다" },
  "Hexadecatonic Mandragora": { ru: "Гексадекатоническая Мандрагора", zh: "十六音曼德拉草", ja: "十六音マンドラゴラ", ko: "헥사데카토닉 맨드라고라" },
  Hiljetta: { ru: "Хильетта", zh: "希尔耶塔", ja: "ヒルイェッタ", ko: "힐예타" },
  Liam: { ru: "Лиам", zh: "利亚姆", ja: "リアム", ko: "리암" },
  "Rocky Avildsen": { ru: "Рокки Авильдсен", zh: "洛奇·阿维尔德森", ja: "ロッキー・アヴィルドセン", ko: "로키 아빌드센" },
  "The Peak": { ru: "Пик", zh: "巅峰", ja: "ピーク", ko: "더 피크" },
  "The Homesick Lone Wolf": { ru: "Тоскующий одинокий волк", zh: "思乡孤狼", ja: "望郷の一匹狼", ko: "향수병에 걸린 외로운 늑대" },
  "The Last Survivor of Tenochtzitoc": { ru: "Последний выживший из Теночцитока", zh: "特诺奇兹托克的最后幸存者", ja: "テノチツトク最後の生存者", ko: "테노치츠토크의 마지막 생존자" },
  Sigurd: { ru: "Сигурд", zh: "西格德", ja: "シグルド", ko: "시구르드" },
};
const aliases = {
  lupusboreasdominatorofwolves: ["Andrius"],
  stormterror: ["Dvalin"],
  shoukinokamitheprodigal: ["Everlasting Lord of Arcane Wisdom"],
  theknave: ["Arlecchino"],
  lasignora: ["Signora"],
  azhdaha: ["Azhdaha (Weekly Boss)"],
};
const bossLocationOverrides = {
  bolteaterbathysmalvishap: { region: "Inazuma", area: "Enkanomiya", subarea: "Dainichi Mikoshi" },
  rimebiterbathysmalvishap: { region: "Inazuma", area: "Enkanomiya", subarea: "Dainichi Mikoshi" },
};
const localLocationAliases = {
  "local-legend-huntersray": "The Fairy Knight Twins",
};

const fetchJson = async (url) => {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
};
const translationCache = new Map();
const locationNameCache = new Map();
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

const fetchDatabaseDescriptionForLanguage = async (query, language) => {
  const params = new URLSearchParams({ query, matchNames: "true", resultLanguage: DESCRIPTION_LANGUAGES[language] });
  const entry = await fetchJson(`${ENEMY_API}?${params}`);
  return entry?.description || entry?.investigation?.description || "";
};

const translateDescription = async (text, language) => {
  if (!text || language === "en") return text || "";
  const params = new URLSearchParams({ client: "gtx", sl: "en", tl: TRANSLATE_LANGUAGES[language], dt: "t", q: text });
  const result = await fetchJson(`https://translate.googleapis.com/translate_a/single?${params}`);
  return (result?.[0] || []).map((part) => part?.[0] || "").join("").trim();
};

const translateValue = async (text, language) => {
  if (!text || language === "en") return text || "";
  const cacheKey = `${language}:${text}`;
  if (!translationCache.has(cacheKey)) translationCache.set(cacheKey, translateDescription(text, language).catch(() => text));
  return translationCache.get(cacheKey);
};

const getLocationNameTranslations = async (name) => {
  if (!name) return {};
  if (!locationNameCache.has(name)) {
    locationNameCache.set(name, (async () => {
      const translations = {};
      try {
        const page = await getPages(name);
        const languageSection = page?.wikitext.match(/==Other Languages==([\s\S]*?)(?=\n==|$)/i)?.[1] || "";
        const fieldMap = { ru: "ru", zh: "zhs", ja: "ja", ko: "ko" };
        for (const [language, field] of Object.entries(fieldMap)) {
          const match = languageSection.match(new RegExp(`^\\|${field}\\s*=\\s*(.+)$`, "im"));
          const raw = (match?.[1] || "")
            .replace(/\{\{Rubi\|([^{}]+)\}\}/gi, (_, content) => content.split("|").filter((_, index) => index % 2 === 0).join(""))
            .replace(/\{\{(?:tt|ruby)\|([^|{}]+)(?:\|[^{}]*)?\}\}/gi, "$1");
          const value = cleanWiki(raw);
          if (value) translations[language] = value;
        }
      } catch { /* Fall back to a machine translation for unmatched location pages. */ }
      return translations;
    })());
  }
  return locationNameCache.get(name);
};

const getLocalizedLocation = async (location) => {
  const localized = { en: { ...location } };
  await Promise.all(Object.keys(DESCRIPTION_LANGUAGES).filter((language) => language !== "en").map(async (language) => {
    localized[language] = {};
    await Promise.all(["region", "area", "subarea"].map(async (field) => {
      const value = location[field] || "";
      const fromWiki = await getLocationNameTranslations(value);
      localized[language][field] = fromWiki[language] || await translateValue(value, language);
    }));
  }));
  return localized;
};

const getLocalizedNames = async (record) => {
  const names = { en: record.name };
  await Promise.all(Object.keys(DESCRIPTION_LANGUAGES).filter((language) => language !== "en").map(async (language) => {
    names[language] = record.names?.[language]
      || LOCAL_LEGEND_NAMES[record.name]?.[language]
      || await translateValue(record.name, language);
  }));
  return names;
};

const getLocalizedDescription = async (record, wikiDescription) => {
  let english = wikiDescription || "";
  let officialEnglish = false;
  try {
    const entry = await fetchJson(`${ENEMY_API}?${new URLSearchParams({ query: record.name, matchNames: "true", resultLanguage: "english" })}`);
    if (entry?.name && keyify(entry.name) === keyify(record.name)) {
      english = entry.description || entry.investigation?.description || english;
      officialEnglish = Boolean(english);
    }
  } catch { /* Keep the wiki description and translate it below. */ }
  const descriptions = { en: cleanWiki(english) };
  await Promise.all(Object.keys(DESCRIPTION_LANGUAGES).filter((language) => language !== "en").map(async (language) => {
    let value = "";
    if (officialEnglish) {
      try { value = cleanWiki(await fetchDatabaseDescriptionForLanguage(record.name, language)); } catch { /* Use the translation fallback. */ }
    }
    if (!value) {
      try { value = await translateDescription(descriptions.en, language); } catch { /* Keep the source text if the translator is unavailable. */ }
    }
    descriptions[language] = value || descriptions.en;
  }));
  return descriptions;
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
  const indexLanguages = { en: "English", ru: "Russian", zh: "ChineseSimplified", ja: "Japanese", ko: "Korean" };
  const indexes = await Promise.all(Object.entries(indexLanguages).map(async ([language, folder]) => [
    language,
    await fetchJson(`${DATA_BASE}/index/${folder}/enemies.json`).catch(() => null),
  ]));
  const indexMap = Object.fromEntries(indexes);
  const index = indexMap.en;
  const nameMaps = Object.fromEntries(Object.entries(indexMap).map(([language, data]) => [language, data?.namemap || index.namemap || {}]));
  const nameMap = nameMaps.en;
  const weeklyIds = new Set(index.categories?.["Enemies of Note"] || []);
  const ids = [...new Set([...(index.categories?.BOSS || []), ...weeklyIds])];
  const oldDetails = JSON.parse(await readFile(path.join(ROOT, "src", "data", "bossDetails.json"), "utf8"));
  let legacyImageAssets = {};
  try {
    legacyImageAssets = JSON.parse(await readFile(path.join(ROOT, "src", "data", "bossImageAssets.json"), "utf8"));
  } catch {
    // Older checkouts kept portraits in a separate file; current data keeps them in bossDetails.json.
  }
  const imageAssets = Object.fromEntries(Object.keys(oldDetails).map((id) => [id, oldDetails[id]?.image || legacyImageAssets[id] || ""]));
  const records = ids.map((id) => {
    const name = nameMap[id] || id;
    return {
      id,
      name,
      names: Object.fromEntries(Object.keys(indexLanguages).map((language) => [language, nameMaps[language][id] || name])),
      category: weeklyIds.has(id) ? "weekly" : "ascension",
      image: imageAssets[id] || "",
      titles: [name, ...(aliases[id] || [])],
    };
  });

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
        names: Object.fromEntries(Object.keys(indexLanguages).map((language) => [language, LOCAL_LEGEND_NAMES[name]?.[language] || name])),
        category: "localLegend",
        image: imageAssets[id] || "",
        titles: [...new Set([linkedName, source, name].filter(Boolean))],
        localLocation: localLegendLocations.get(keyify(name))
          || localLegendLocations.get(keyify(linkedName))
          || localLegendLocations.get(keyify(source))
          || localLegendLocations.get(keyify(localLocationAliases[id] || "")),
      });
    }
  }

  // Include any already-shipped local legend assets as a safeguard for new entries in the app catalog.
  for (const id of Object.keys(imageAssets)) {
    if (records.some((record) => record.id === id)) continue;
    const baseId = id.replace(/^local-legend-/, "");
    const name = nameMap[baseId] || baseId.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
    records.push({
      id,
      name,
      names: Object.fromEntries(Object.keys(indexLanguages).map((language) => [language, LOCAL_LEGEND_NAMES[name]?.[language] || name])),
      category: "localLegend",
      image: imageAssets[id] || "",
      titles: [name],
      localLocation: localLegendLocations.get(keyify(name))
        || localLegendLocations.get(keyify(baseId))
        || localLegendLocations.get(keyify(localLocationAliases[id] || "")),
    });
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
          region: bossLocationOverrides[record.id]?.region || record.localLocation?.region || "",
          area: bossLocationOverrides[record.id]?.area || record.localLocation?.area || "",
          subarea: bossLocationOverrides[record.id]?.subarea || "",
        };
        const map = await saveMap(record.id, record.localLocation?.mapFilename);
        const description = await fetchDatabaseDescription(record);
        output[record.id] = {
          id: record.id,
          name: record.name,
          names: await getLocalizedNames(record),
          category: record.category,
          image: record.image,
          splash: record.image,
          description: await getLocalizedDescription(record, description),
          details: Object.fromEntries(Object.keys(DESCRIPTION_LANGUAGES).map((language) => [language, ""])),
          location: await getLocalizedLocation(location),
          map,
          sourcePage: "https://genshin-impact.fandom.com/wiki/Local_Legend",
        };
        console.log(`${map ? "MAP" : "INFO"} ${record.name}: ${location.region || "?"} / ${location.area || "?"}${map ? ` → ${map}` : ""}`);
        continue;
      }
      const location = {
        region: bossLocationOverrides[record.id]?.region || getField(page.wikitext, "region") || record.localLocation?.region || "",
        area: record.id.startsWith("local-legend-")
          ? (record.localLocation?.area || bossLocationOverrides[record.id]?.area || getField(page.wikitext, "area") || getField(page.wikitext, "location") || "")
          : (bossLocationOverrides[record.id]?.area || getField(page.wikitext, "area") || getField(page.wikitext, "location") || ""),
        subarea: bossLocationOverrides[record.id]?.subarea || getField(page.wikitext, "subarea"),
      };
      const map = await saveMap(record.id, record.localLocation?.mapFilename || chooseMap(page.images));
      const description = extractDescription(page.wikitext) || await fetchDatabaseDescription(record);
      const localizedDescription = await getLocalizedDescription(record, description);
      output[record.id] = {
        id: record.id,
        name: record.name,
        names: await getLocalizedNames(record),
        category: record.category,
        image: record.image,
        splash: record.image,
        description: localizedDescription,
        details: Object.fromEntries(Object.keys(DESCRIPTION_LANGUAGES).map((language) => [language, ""])),
        location: await getLocalizedLocation(location),
        map,
        sourcePage: `https://genshin-impact.fandom.com/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`,
      };
      console.log(`${map ? "MAP" : "INFO"} ${record.name}: ${location.region || "?"} / ${location.area || "?"} / ${location.subarea || "?"}${map ? ` → ${map}` : ""}`);
    } catch (error) {
      output[record.id] = {
        id: record.id,
        name: record.name,
        names: await getLocalizedNames(record),
        category: record.category,
        image: record.image || "",
        splash: record.image || "",
        description: Object.fromEntries(Object.keys(DESCRIPTION_LANGUAGES).map((language) => [language, ""])),
        details: Object.fromEntries(Object.keys(DESCRIPTION_LANGUAGES).map((language) => [language, ""])),
        location: Object.fromEntries(Object.keys(DESCRIPTION_LANGUAGES).map((language) => [language, {}])),
        map: "",
        sourcePage: "",
      };
      console.log(`ERROR ${record.name}: ${error.message}`);
    }
  }
});
await Promise.all(workers);
await writeFile(DATA_FILE, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Wrote ${Object.keys(output).length} entries; ${Object.values(output).filter((item) => item.map).length} local maps.`);
