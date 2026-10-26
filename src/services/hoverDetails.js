const DETAIL_CACHE_KEY = "genshin-random-lab:hover-details:v4";
const DETAIL_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
const DETAIL_CACHE_LIMIT = 120;
const GENDATA_API = "https://genshin-db-api.vercel.app/api/v5";
const FANDOM_API = "https://genshin-impact.fandom.com/api.php";
const APP_BASE_URL = import.meta.env?.BASE_URL || "/";
const RESULT_LANGUAGES = { ru: "russian", en: "english", zh: "chinese", ja: "japanese", ko: "korean" };
const memoryCache = new Map();
const pendingRequests = new Map();
let bossDetailsPromise;

const loadBossDetails = () => {
  bossDetailsPromise ||= import("../data/bossDetails.json", { with: { type: "json" } }).then((module) => module.default);
  return bossDetailsPromise;
};

const normalizeBossKey = (value = "") => String(value).toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

const findLocalBoss = (catalog, item) => {
  const itemId = normalizeBossKey(item?.id);
  const itemNames = [item?.name, item?.nameRu, item?.nameZh, item?.nameJa, item?.nameKo]
    .filter(Boolean).map(normalizeBossKey);
  return catalog[item?.id]
    || Object.values(catalog).find((record) => {
      const aliases = [record.id, record.name, ...Object.values(record.names || {})].filter(Boolean).map(normalizeBossKey);
      return aliases.includes(itemId) || itemNames.some((name) => aliases.includes(name));
    })
    || null;
};

const cleanWikiValue = (value = "") => value
  .replace(/<!--.*?-->/gs, "")
  .replace(/\[\[([^\]|]+\|([^\]]+))\]\]/g, "$2")
  .replace(/\[\[([^\]]+)\]\]/g, "$1")
  .replace(/\{\{[^{}]*\}\}/g, "")
  .replace(/'''?|<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const readStoredDetails = (key) => {
  try {
    const stored = JSON.parse(localStorage.getItem(DETAIL_CACHE_KEY) || "{}");
    const record = stored[key];
    if (record?.savedAt && Date.now() - record.savedAt < DETAIL_CACHE_TTL) return record.value;
  } catch { /* Local storage is optional. */ }
  return null;
};

const saveStoredDetails = (key, value) => {
  try {
    const stored = JSON.parse(localStorage.getItem(DETAIL_CACHE_KEY) || "{}");
    stored[key] = { savedAt: Date.now(), value };
    const trimmed = Object.fromEntries(Object.entries(stored).slice(-DETAIL_CACHE_LIMIT));
    localStorage.setItem(DETAIL_CACHE_KEY, JSON.stringify(trimmed));
  } catch { /* Details still work without local storage. */ }
};

const fetchJson = async (url, signal) => {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Detail request failed: ${response.status}`);
  return response.json();
};

const fetchDatabaseEntry = async (item, kind, lang, signal) => {
  const queryNames = kind === "characters" && String(item.id).startsWith("traveler-duo-")
    ? ["Traveler"]
    : [item.name, ...(item.imageLookupTitles || [])].filter(Boolean);
  for (const query of queryNames) {
    try {
      const params = new URLSearchParams({
        query,
        matchNames: "true",
        matchAltNames: "false",
        matchAliases: "false",
        resultLanguage: RESULT_LANGUAGES[lang] || "english",
      });
      const entry = await fetchJson(`${GENDATA_API}/${kind === "characters" ? "characters" : "enemies"}?${params}`, signal);
      if (entry?.description || entry?.name) return entry;
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }
  return null;
};

const fetchFandomPage = async (title, signal) => {
  const params = new URLSearchParams({
    action: "parse",
    page: title,
    prop: "wikitext|images",
    format: "json",
    origin: "*",
  });
  return fetchJson(`${FANDOM_API}?${params}`, signal);
};

const searchFandomPages = async (query, signal) => {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: "5",
    format: "json",
    origin: "*",
  });
  const response = await fetchJson(`${FANDOM_API}?${params}`, signal);
  return (response?.query?.search || []).map(({ title }) => title).filter(Boolean);
};

const getInfoboxField = (wikitext, field) => {
  const match = wikitext.match(new RegExp(`^\\|\\s*${field}\\s*=\\s*([^\\r\\n]+)`, "im"));
  return cleanWikiValue(match?.[1] || "");
};

const fetchMapImage = async (filename, signal) => {
  if (!filename) return "";
  try {
    const params = new URLSearchParams({
      action: "query",
      titles: `File:${filename.replaceAll("_", " ")}`,
      prop: "imageinfo",
      iiprop: "url",
      format: "json",
      origin: "*",
    });
    const response = await fetchJson(`${FANDOM_API}?${params}`, signal);
    return Object.values(response?.query?.pages || {})[0]?.imageinfo?.[0]?.url || "";
  } catch (error) {
    if (signal?.aborted) throw error;
    return "";
  }
};

const fetchBossLocation = async (item, signal) => {
  const titles = [...new Set([item.name, item.imageLookupTitle, ...(item.imageLookupTitles || [])].filter(Boolean))];
  const tryTitles = async (candidateTitles) => {
    for (const title of candidateTitles) {
      try {
        const parsed = await fetchFandomPage(title, signal);
        const wikitext = parsed?.parse?.wikitext?.["*"] || "";
        if (!wikitext) continue;
        const location = {
          region: getInfoboxField(wikitext, "region"),
          area: getInfoboxField(wikitext, "area"),
          subarea: getInfoboxField(wikitext, "subarea"),
        };
        const mapFile = (parsed?.parse?.images || [])
          .filter((filename) => /(?:location|map)/i.test(filename) && !/(?:world map|interactive map)/i.test(filename))
          .sort((left, right) => {
            const score = (filename) => /location/i.test(filename) ? 2 : /map/i.test(filename) ? 1 : 0;
            return score(right) - score(left);
          })[0] || "";
        const mapImage = await fetchMapImage(mapFile, signal);
        if (mapImage || location.region || location.area || location.subarea) return { location, mapImage };
      } catch (error) {
        if (signal?.aborted) throw error;
      }
    }
    return null;
  };

  const directResult = await tryTitles(titles);
  if (directResult) return directResult;

  // Boss names in the app are often localized or use a gameplay title rather than the wiki article title.
  const queries = [...new Set([item.name, item.imageLookupTitle, ...(item.imageLookupTitles || [])].filter(Boolean))]
    .map((title) => `${title} Genshin Impact`);
  for (const query of queries) {
    try {
      const searchTitles = await searchFandomPages(query, signal);
      const searchResult = await tryTitles(searchTitles.filter((title) => !titles.includes(title)));
      if (searchResult) return searchResult;
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }
  return { location: {}, mapImage: "" };
};

const loadHoverDetails = async (item, kind, lang, signal) => {
  if (kind === "bosses") {
    const bossDetails = await loadBossDetails();
    const local = findLocalBoss(bossDetails, item);
    if (local) {
      const description = typeof local.description === "string"
        ? local.description
        : (local.description?.[lang] || local.description?.en || Object.values(local.description || {}).find(Boolean) || "");
      const location = local.location?.[lang] || local.localizedLocation?.[lang] || {};
      return {
        title: local.names?.[lang] || local.name || item.name,
        description,
        additionalInfo: local.details?.[lang] || local.details?.en || "",
        affiliation: "",
        region: location.region || local.location?.region || "",
        area: location.area || local.location?.area || "",
        subarea: location.subarea || local.location?.subarea || "",
        constellation: "",
        birthday: "",
        weapon: "",
        element: "",
        mapImage: local.map ? `${APP_BASE_URL}${local.map.replace(/^\//, "")}` : "",
        sourceUrl: local.sourcePage || "",
      };
    }
  }

  const entry = await fetchDatabaseEntry(item, kind, lang, signal);
  const wiki = kind === "bosses" ? await fetchBossLocation(item, signal) : { location: {}, mapImage: "" };
  return {
    title: entry?.title || "",
    description: entry?.description || entry?.investigation?.description || "",
    affiliation: entry?.affiliation || "",
    region: entry?.region || wiki.location.region || "",
    area: wiki.location.area || "",
    subarea: wiki.location.subarea || "",
    constellation: entry?.constellation || "",
    birthday: entry?.birthday || "",
    weapon: entry?.weaponText || "",
    element: entry?.elementText || "",
    mapImage: wiki.mapImage,
    sourceUrl: entry?.url?.fandom || "",
  };
};

export const fetchHoverDetails = (item, kind, lang, signal) => {
  if (!item?.id || !["characters", "bosses"].includes(kind)) return Promise.resolve(null);
  const key = `${kind}:${lang}:${item.id}`;
  const useCache = kind !== "bosses";
  if (useCache && memoryCache.has(key)) return Promise.resolve(memoryCache.get(key));
  if (useCache) {
    const stored = readStoredDetails(key);
    if (stored) {
      memoryCache.set(key, stored);
      return Promise.resolve(stored);
    }
  }
  if (useCache && pendingRequests.has(key)) return pendingRequests.get(key);

  const request = loadHoverDetails(item, kind, lang, signal)
    .then((details) => {
      if (useCache) {
        memoryCache.set(key, details);
        saveStoredDetails(key, details);
      }
      return details;
    })
    .finally(() => {
      if (useCache) pendingRequests.delete(key);
    });
  if (useCache) pendingRequests.set(key, request);
  return request;
};
