const GITHUB_DATA_BASE = "https://raw.githubusercontent.com/theBowja/genshin-db/main/src/data";
const FANDOM_API = "https://genshin-impact.fandom.com/api.php";
const HAKUSH_UI_BASE = "https://api.hakush.in/gi/UI";

const DEFAULT_HEADERS = {
  Accept: "application/json",
};

const LOCAL_LEGEND_PAGE = "Local Legend";

const LOCAL_LEGEND_NAME_TRANSLATIONS = {
  "Battlegoat and Ironclaw": {
    ru: "Боевой козёл и Железный Коготь",
    zh: "战斗山羊与铁爪",
    ja: "バトルゴートとアイアンクロー",
    ko: "배틀고트와 아이언클로",
  },
  Cocijo: {
    ru: "Косихо",
    zh: "科西霍",
    ja: "コシホ",
    ko: "코시호",
  },
  "Crab Tsar": {
    ru: "Краб-царь",
    zh: "蟹王",
    ja: "クラブツァーリ",
    ko: "크랩 차르",
  },
  "He Never Dies": {
    ru: "Он никогда не умирает",
    zh: "他永不死去",
    ja: "彼は決して死なない",
    ko: "그는 결코 죽지 않는다",
  },
  "Hexadecatonic Mandragora": {
    ru: "Гексадекатоническая Мандрагора",
    zh: "十六音曼德拉草",
    ja: "十六音マンドラゴラ",
    ko: "헥사데카토닉 맨드라고라",
  },
  Hiljetta: {
    ru: "Хильетта",
    zh: "希尔耶塔",
    ja: "ヒルイェッタ",
    ko: "힐예타",
  },
  Liam: {
    ru: "Лиам",
    zh: "利亚姆",
    ja: "リアム",
    ko: "리암",
  },
  "Rocky Avildsen": {
    ru: "Рокки Авильдсен",
    zh: "洛奇·阿维尔德森",
    ja: "ロッキー・アヴィルドセン",
    ko: "로키 아빌드센",
  },
  "The Peak": {
    ru: "Пик",
    zh: "巅峰",
    ja: "ピーク",
    ko: "더 피크",
  },
  "The Homesick Lone Wolf": {
    ru: "Тоскующий одинокий волк",
    zh: "思乡孤狼",
    ja: "望郷の一匹狼",
    ko: "향수병에 걸린 외로운 늑대",
  },
  "The Last Survivor of Tenochtzitoc": {
    ru: "Последний выживший из Теночцитока",
    zh: "特诺奇兹托克的最后幸存者",
    ja: "テノチツトク最後の生存者",
    ko: "테노치츠토크의 마지막 생존자",
  },
  Sigurd: {
    ru: "Сигурд",
    zh: "西格德",
    ja: "シグルド",
    ko: "시구르드",
  },
};

const withRetry = async (fn, retries = 3, delay = 180) => {
  let attempt = 0;
  let lastError = null;

  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError;
};

const fetchJson = async (url, retries = 3) =>
  withRetry(async () => {
    const response = await fetch(url, { headers: DEFAULT_HEADERS });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    if (!text) {
      throw new Error("Empty response");
    }

    return JSON.parse(text);
  }, retries);

const normalizeSpaces = (value) => value.replace(/\s+/g, " ").trim();

const cleanWikiText = (value = "") =>
  normalizeSpaces(
    value
      .replace(/<!--.*?-->/g, "")
      .replace(/\[\[|\]\]/g, "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, "")
      .replace(/&mdash;/gi, "-")
      .replace(/_/g, " ")
      .replace(/\(Local Legend\)/gi, "")
      .replace(/^"|"$/g, "")
      .replace(/^'|'$/g, "")
  );

const keyify = (value = "") =>
  value
    .toLowerCase()
    .replace(/\(local legend\)/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();

const toSlug = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildHakushImage = (filename) => (filename ? `${HAKUSH_UI_BASE}/${filename}.webp` : "");
const buildHakushPng = (filename) => (filename ? `${HAKUSH_UI_BASE}/${filename}.png` : "");
const uniqueUrls = (list) => Array.from(new Set(list.filter(Boolean)));

const getNameMap = (indexData) => indexData?.namemap || {};
const getNameFromMap = (nameMap, id, fallback) => nameMap?.[id] || fallback;
const getLocalizedLegendName = (name, lang) => LOCAL_LEGEND_NAME_TRANSLATIONS[name]?.[lang] || "";

const pickLocalizedName = (left, right, englishName) => {
  if (left && left !== englishName) {
    return left;
  }
  if (right && right !== englishName) {
    return right;
  }
  return left || right || englishName;
};

const mergeBossEntries = (base, candidate) => {
  const name = base.name || candidate.name || "";
  return {
    ...base,
    ...candidate,
    name,
    nameRu: pickLocalizedName(base.nameRu, candidate.nameRu, name),
    nameZh: pickLocalizedName(base.nameZh, candidate.nameZh, name),
    nameJa: pickLocalizedName(base.nameJa, candidate.nameJa, name),
    nameKo: pickLocalizedName(base.nameKo, candidate.nameKo, name),
    image: base.image || candidate.image || "",
    splash: base.splash || candidate.splash || base.image || candidate.image || "",
    imageFallbacks: uniqueUrls([...(base.imageFallbacks || []), ...(candidate.imageFallbacks || [])]),
    splashFallbacks: uniqueUrls([...(base.splashFallbacks || []), ...(candidate.splashFallbacks || [])]),
  };
};

const dedupeById = (items) => {
  const map = new Map();

  for (const item of items) {
    if (!item?.id) {
      continue;
    }
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
      continue;
    }
    map.set(item.id, mergeBossEntries(existing, item));
  }

  return Array.from(map.values());
};

const getCharacterImageCandidates = (entry = {}) =>
  uniqueUrls([
    buildHakushImage(entry.filename_icon),
    buildHakushImage(entry.filename_iconCard),
    buildHakushPng(entry.filename_icon),
    buildHakushPng(entry.filename_iconCard),
    entry.card,
    entry.image,
    entry.portrait,
    entry.mihoyo_icon,
  ]);

const getCharacterSplashCandidates = (entry = {}) =>
  uniqueUrls([
    buildHakushImage(entry.filename_gachaSplash),
    buildHakushPng(entry.filename_gachaSplash),
    buildHakushImage(entry.filename_sideIcon),
    buildHakushPng(entry.filename_sideIcon),
    buildHakushImage(entry.filename_icon),
    buildHakushPng(entry.filename_icon),
    entry.cover1,
    entry.cover2,
    entry.image,
    entry.portrait,
    entry.mihoyo_sideIcon,
    ...getCharacterImageCandidates(entry),
  ]);

const getEnemyImageCandidates = (entry = {}) =>
  uniqueUrls([
    buildHakushImage(entry.filename_icon),
    buildHakushImage(entry.filename_investigationIcon),
    buildHakushPng(entry.filename_icon),
    buildHakushPng(entry.filename_investigationIcon),
  ]);

const getEnemySplashCandidates = (entry = {}) =>
  uniqueUrls([
    buildHakushImage(entry.filename_iconBig),
    buildHakushPng(entry.filename_iconBig),
    buildHakushImage(entry.filename_investigationIcon),
    buildHakushPng(entry.filename_investigationIcon),
    buildHakushImage(entry.filename_icon),
    buildHakushPng(entry.filename_icon),
    ...getEnemyImageCandidates(entry),
  ]);

const extractCharacterMeta = (indexData) => {
  const map = {};
  const categories = indexData?.categories || {};

  for (const [categoryKey, ids] of Object.entries(categories)) {
    if (!Array.isArray(ids)) {
      continue;
    }

    for (const id of ids) {
      if (!map[id]) {
        map[id] = {
          rarity: 4,
          element: "NONE",
          weapon: "WEAPON_SWORD_ONE_HAND",
          region: "Unknown",
        };
      }

      if (categoryKey === "5" || categoryKey === "4") {
        map[id].rarity = Number(categoryKey);
      }
      if (categoryKey.startsWith("ELEMENT_")) {
        map[id].element = categoryKey.replace("ELEMENT_", "");
      }
      if (categoryKey.startsWith("WEAPON_")) {
        map[id].weapon = categoryKey;
      }
    }
  }

  return map;
};

const mapCharacters = (nameMaps, imageData, metaSourceIndex) => {
  const nameMapEn = nameMaps.en;
  const metaMap = extractCharacterMeta(metaSourceIndex);

  return Object.entries(nameMapEn)
    .map(([id, nameEn]) => {
      const imageEntry = imageData?.[id] || {};
      const meta = metaMap[id] || {};
      const imageCandidates = getCharacterImageCandidates(imageEntry);
      const splashCandidates = getCharacterSplashCandidates(imageEntry);

      return {
        id,
        slug: id,
        name: nameEn,
        nameRu: getNameFromMap(nameMaps.ru, id, nameEn),
        nameZh: getNameFromMap(nameMaps.zh, id, nameEn),
        nameJa: getNameFromMap(nameMaps.ja, id, nameEn),
        nameKo: getNameFromMap(nameMaps.ko, id, nameEn),
        rarity: meta.rarity || 4,
        element: meta.element || "NONE",
        weapon: meta.weapon || "WEAPON_SWORD_ONE_HAND",
        image: imageCandidates[0] || "",
        imageFallbacks: imageCandidates.slice(1),
        splash: splashCandidates[0] || imageCandidates[0] || "",
        splashFallbacks: splashCandidates.slice(1),
      };
    })
    .filter((item) => item.image)
    .sort((a, b) => {
      if (a.rarity !== b.rarity) {
        return b.rarity - a.rarity;
      }
      return a.name.localeCompare(b.name);
    });
};

const parseLegendTemplate = (line) => {
  const raw = line.trim().replace(/^\*\s*\{\{Enemy\|/, "").replace(/\}\}\s*$/, "");
  const parts = raw.split("|");
  const firstArg = cleanWikiText(parts[0] || "");

  let textArg = "";
  let linkArg = "";

  for (const param of parts.slice(1)) {
    const value = param.trim();
    if (value.startsWith("text=")) {
      textArg = cleanWikiText(value.slice(5));
    }
    if (value.startsWith("link=")) {
      linkArg = cleanWikiText(value.slice(5));
    }
  }

  let displayName = (textArg || firstArg).replace(/"/g, "").trim();
  if (displayName.includes("\u2014")) {
    displayName = displayName.split("\u2014")[0].trim();
  }
  if (displayName.includes(" - ")) {
    displayName = displayName.split(" - ")[0].trim();
  }
  if (displayName.startsWith("Polychrome Tri-Stars:")) {
    displayName = "Polychrome Tri-Stars";
  }

  return {
    name: cleanWikiText(displayName),
    source: firstArg,
    link: linkArg,
  };
};

const fetchFandomThumb = async (title) => {
  const direct = await fetchJson(
    `${FANDOM_API}?action=query&titles=${encodeURIComponent(
      title
    )}&prop=pageimages&piprop=thumbnail&pithumbsize=1024&format=json&origin=*`,
    2
  );

  const directPage = Object.values(direct?.query?.pages || {})[0];
  if (directPage?.thumbnail?.source) {
    return directPage.thumbnail.source;
  }

  const search = await fetchJson(
    `${FANDOM_API}?action=query&generator=search&gsrsearch=${encodeURIComponent(
      `${title} genshin impact enemy`
    )}&gsrlimit=8&prop=pageimages&piprop=thumbnail&pithumbsize=1024&format=json&origin=*`,
    2
  );

  const pages = Object.values(search?.query?.pages || {});
  const ranked = pages
    .filter((page) => page?.thumbnail?.source)
    .sort((left, right) => {
      const leftPenalty =
        Number(/\(Achievement\)/i.test(left.title || "")) + Number(/Change History/i.test(left.title || ""));
      const rightPenalty =
        Number(/\(Achievement\)/i.test(right.title || "")) + Number(/Change History/i.test(right.title || ""));
      return leftPenalty - rightPenalty;
    });

  return ranked[0]?.thumbnail?.source || "";
};

const mapWithConcurrency = async (items, mapper, limit = 8) => {
  const results = new Array(items.length);
  let pointer = 0;

  const workers = Array.from({ length: limit }, async () => {
    while (pointer < items.length) {
      const currentIndex = pointer;
      pointer += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
};

const mapBossList = async (ids, nameMaps, imageMap, group) => {
  const mapped = await mapWithConcurrency(ids, async (id) => {
    const entry = imageMap[id] || {};
    const imageCandidates = getEnemyImageCandidates(entry);
    const splashCandidates = getEnemySplashCandidates(entry);
    const name = getNameFromMap(nameMaps.en, id, id);

    let image = imageCandidates[0] || "";
    if (!image) {
      try {
        image = await fetchFandomThumb(name);
      } catch {
        image = "";
      }
    }

    return {
      id,
      slug: id,
      group,
      name,
      nameRu: getNameFromMap(nameMaps.ru, id, name),
      nameZh: getNameFromMap(nameMaps.zh, id, name),
      nameJa: getNameFromMap(nameMaps.ja, id, name),
      nameKo: getNameFromMap(nameMaps.ko, id, name),
      image,
      imageFallbacks: imageCandidates.slice(1),
      splash: splashCandidates[0] || image,
      splashFallbacks: splashCandidates.slice(1),
    };
  });

  return dedupeById(mapped.filter((item) => item.image)).sort((a, b) => a.name.localeCompare(b.name));
};

const mapLocalLegends = async (enemyNameMaps, enemyImageMap) => {
  const parsed = await fetchJson(
    `${FANDOM_API}?action=parse&page=${encodeURIComponent(
      LOCAL_LEGEND_PAGE
    )}&prop=wikitext&format=json&origin=*`
  );

  const wikitext = parsed?.parse?.wikitext?.["*"] || "";
  const listSection = wikitext.split("==Locations==")[0] || "";
  const legendLines = listSection.split("\n").filter((line) => line.trim().startsWith("* {{Enemy|"));
  const parsedLegends = legendLines.map(parseLegendTemplate).filter((legend) => legend.name);

  const uniqueLegends = [];
  const seen = new Set();
  for (const legend of parsedLegends) {
    const key = legend.name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    uniqueLegends.push(legend);
  }

  const mapped = await mapWithConcurrency(uniqueLegends, async (legend) => {
    const candidates = [legend.link, legend.source, legend.name].map(cleanWikiText).filter(Boolean);
    const enemyIdCandidate = candidates
      .map((candidate) => keyify(candidate))
      .find((candidateKey) => Boolean(enemyNameMaps.en[candidateKey]));

    const wikiFallbackCandidates = uniqueUrls([legend.link, legend.source, legend.name].filter(Boolean));
    let wikiImage = "";
    for (const candidate of wikiFallbackCandidates) {
      try {
        wikiImage = await fetchFandomThumb(candidate);
      } catch {
        wikiImage = "";
      }
      if (wikiImage) {
        break;
      }
    }

    if (enemyIdCandidate) {
      const enemyEntry = enemyImageMap[enemyIdCandidate] || {};
      const enemyCandidates = getEnemyImageCandidates(enemyEntry);
      const enemySplashCandidates = getEnemySplashCandidates(enemyEntry);
      const enemyImage = enemyCandidates[0] || "";
      const image = enemyImage || wikiImage;
      const name = legend.name;

      return {
        id: `local-legend-${enemyIdCandidate}`,
        slug: enemyIdCandidate,
        group: "localLegend",
        name,
        nameRu:
          getNameFromMap(enemyNameMaps.ru, enemyIdCandidate, "") || getLocalizedLegendName(name, "ru") || name,
        nameZh:
          getNameFromMap(enemyNameMaps.zh, enemyIdCandidate, "") || getLocalizedLegendName(name, "zh") || name,
        nameJa:
          getNameFromMap(enemyNameMaps.ja, enemyIdCandidate, "") || getLocalizedLegendName(name, "ja") || name,
        nameKo:
          getNameFromMap(enemyNameMaps.ko, enemyIdCandidate, "") || getLocalizedLegendName(name, "ko") || name,
        image,
        imageFallbacks: uniqueUrls([...enemyCandidates.slice(1), wikiImage && wikiImage !== image ? wikiImage : ""]),
        splash: enemySplashCandidates[0] || image,
        splashFallbacks: enemySplashCandidates.slice(1),
      };
    }

    const name = legend.name;
    return {
      id: `local-legend-${toSlug(name)}`,
      slug: toSlug(name),
      group: "localLegend",
      name,
      nameRu: getLocalizedLegendName(name, "ru") || name,
      nameZh: getLocalizedLegendName(name, "zh") || name,
      nameJa: getLocalizedLegendName(name, "ja") || name,
      nameKo: getLocalizedLegendName(name, "ko") || name,
      image: wikiImage,
      imageFallbacks: [],
      splash: wikiImage,
      splashFallbacks: [],
    };
  });

  return dedupeById(mapped.filter((legend) => legend.image)).sort((a, b) => a.name.localeCompare(b.name));
};

export const fetchGenshinData = async () => {
  const [
    characterIndexEn,
    characterIndexRu,
    characterIndexZh,
    characterIndexJa,
    characterIndexKo,
    characterImages,
    enemyIndexEn,
    enemyIndexRu,
    enemyIndexZh,
    enemyIndexJa,
    enemyIndexKo,
    enemyImages,
  ] = await Promise.all([
    fetchJson(`${GITHUB_DATA_BASE}/index/English/characters.json`),
    fetchJson(`${GITHUB_DATA_BASE}/index/Russian/characters.json`),
    fetchJson(`${GITHUB_DATA_BASE}/index/ChineseSimplified/characters.json`),
    fetchJson(`${GITHUB_DATA_BASE}/index/Japanese/characters.json`),
    fetchJson(`${GITHUB_DATA_BASE}/index/Korean/characters.json`),
    fetchJson(`${GITHUB_DATA_BASE}/image/characters.json`),
    fetchJson(`${GITHUB_DATA_BASE}/index/English/enemies.json`),
    fetchJson(`${GITHUB_DATA_BASE}/index/Russian/enemies.json`),
    fetchJson(`${GITHUB_DATA_BASE}/index/ChineseSimplified/enemies.json`),
    fetchJson(`${GITHUB_DATA_BASE}/index/Japanese/enemies.json`),
    fetchJson(`${GITHUB_DATA_BASE}/index/Korean/enemies.json`),
    fetchJson(`${GITHUB_DATA_BASE}/image/enemies.json`),
  ]);

  const characterNameMaps = {
    en: getNameMap(characterIndexEn),
    ru: getNameMap(characterIndexRu),
    zh: getNameMap(characterIndexZh),
    ja: getNameMap(characterIndexJa),
    ko: getNameMap(characterIndexKo),
  };

  const enemyNameMaps = {
    en: getNameMap(enemyIndexEn),
    ru: getNameMap(enemyIndexRu),
    zh: getNameMap(enemyIndexZh),
    ja: getNameMap(enemyIndexJa),
    ko: getNameMap(enemyIndexKo),
  };

  const characters = mapCharacters(characterNameMaps, characterImages, characterIndexEn);

  const enemyCategoryMap = enemyIndexEn?.categories || {};
  const weeklyIds = enemyCategoryMap["Enemies of Note"] || [];
  const weeklySet = new Set(weeklyIds);
  const allBossIds = enemyCategoryMap.BOSS || [];
  const ascensionIds = allBossIds.filter((id) => !weeklySet.has(id));

  const weeklyBosses = await mapBossList(weeklyIds, enemyNameMaps, enemyImages, "weekly");
  const ascensionBosses = await mapBossList(ascensionIds, enemyNameMaps, enemyImages, "ascension");
  const localLegends = await mapLocalLegends(enemyNameMaps, enemyImages);

  const bossPool = dedupeById([...weeklyBosses, ...ascensionBosses, ...localLegends]).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return {
    characters,
    bosses: {
      all: bossPool,
      weekly: weeklyBosses,
      ascension: ascensionBosses,
      localLegends,
    },
    meta: {
      fetchedAt: new Date().toISOString(),
      source: {
        characters: "theBowja/genshin-db",
        enemies: "theBowja/genshin-db",
        localLegends: "genshin-impact.fandom.com API",
      },
    },
  };
};
