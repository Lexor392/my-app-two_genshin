const GITHUB_DATA_BASE = "https://raw.githubusercontent.com/theBowja/genshin-db/main/src/data";
const FANDOM_API = "https://genshin-impact.fandom.com/api.php";
const HAKUSH_UI_BASE = "https://api.hakush.in/gi/UI";
const AMBR_UI_BASE = "https://api.ambr.top/assets/UI";

const DEFAULT_HEADERS = {
  Accept: "application/json",
};
const DATA_CACHE_PREFIX = "genshin-random-lab:data:v1:";
const DATA_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 14;

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withRetry = async (fn, retries = 3, delay = 180, signal) => {
  let attempt = 0;
  let lastError = null;

  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (signal?.aborted) {
        throw error;
      }
      attempt += 1;
      if (attempt < retries) {
        await sleep(delay * attempt);
      }
    }
  }

  throw lastError;
};

const fetchJson = async (url, retries = 3, signal) =>
  withRetry(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(new Error("Request timed out")), 12000);
    const abortRequest = () => controller.abort(signal.reason);
    signal?.addEventListener("abort", abortRequest, { once: true });
    try {
      const response = await fetch(url, { headers: DEFAULT_HEADERS, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    if (!text) {
      throw new Error("Empty response");
    }

      return JSON.parse(text);
    } finally {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", abortRequest);
    }
  }, retries, 180, signal).then((data) => {
    try {
      sessionStorage.setItem(`${DATA_CACHE_PREFIX}${url}`, JSON.stringify({ savedAt: Date.now(), data }));
    } catch {
      // Storage can be disabled or full; the live response remains usable.
    }
    return data;
  }).catch((error) => {
    if (signal?.aborted) {
      throw error;
    }
    try {
      const cached = JSON.parse(sessionStorage.getItem(`${DATA_CACHE_PREFIX}${url}`) || "null");
      if (cached?.data && Date.now() - cached.savedAt < DATA_CACHE_MAX_AGE) {
        return cached.data;
      }
    } catch {
      // Ignore invalid, expired, or unavailable browser storage.
    }
    throw error;
  });

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
const buildAmbrImage = (filename) => (filename ? `${AMBR_UI_BASE}/${filename}.png` : "");
const buildMihoyoIcon = (filename) => filename
  ? `https://upload-os-bbs.mihoyo.com/game_record/genshin/character_icon/${String(filename).replace(/\.(png|webp)$/i, "")}.png`
  : "";
export const repairWikiImageUrl = (url = "") =>
  url.replace("static.wikia.nocookie.net/gensin-impact/", "static.wikia.nocookie.net/genshin-impact/");
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

export const getCharacterImageCandidates = (entry = {}) =>
  uniqueUrls([
    buildMihoyoIcon(entry.filename_icon),
    entry.mihoyo_icon,
    entry.hoyowiki_icon,
    repairWikiImageUrl(entry.card),
    repairWikiImageUrl(entry.image),
    repairWikiImageUrl(entry.portrait),
  ]);

const getCharacterSplashCandidates = (entry = {}) =>
  uniqueUrls([
    buildAmbrImage(entry.filename_gachaSplash),
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
    entry.hoyowiki_sideIcon,
    ...getCharacterImageCandidates(entry),
  ]);

export const getEnemyImageCandidates = (entry = {}) =>
  uniqueUrls([
    entry.image,
    entry.mihoyo_icon,
    entry.hoyowiki_icon,
    repairWikiImageUrl(entry.portrait),
  ]);

const getEnemySplashCandidates = (entry = {}) =>
  uniqueUrls([
    entry.image,
    entry.mihoyo_icon,
    entry.hoyowiki_icon,
    repairWikiImageUrl(entry.portrait),
    ...getEnemyImageCandidates(entry),
  ]);

const fetchPageImageMap = async (items, signal) => {
  const titles = Array.from(new Set(items.map((item) => item.name).filter(Boolean)));
  const titleMap = new Map();
  const chunkSize = 45;

  for (let index = 0; index < titles.length; index += chunkSize) {
    const chunk = titles.slice(index, index + chunkSize);
    const result = await fetchJson(
      `${FANDOM_API}?action=query&titles=${encodeURIComponent(chunk.join("|"))}&prop=pageimages&piprop=thumbnail&pithumbsize=512&format=json&origin=*`,
      2,
      signal
    );
    Object.values(result?.query?.pages || {}).forEach((page) => {
      if (page?.title && page?.thumbnail?.source) {
        const image = repairWikiImageUrl(page.thumbnail.source);
        if (image) titleMap.set(keyify(page.title), image);
      }
    });
  }

  return titleMap;
};


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

export const fetchFallbackImage = async (title, signal) => {
  const direct = await fetchJson(
    `${FANDOM_API}?action=query&titles=${encodeURIComponent(
      title
    )}&prop=pageimages&piprop=thumbnail&pithumbsize=1024&format=json&origin=*`,
    2,
    signal
  );

  const directPage = Object.values(direct?.query?.pages || {})[0];
  if (directPage?.thumbnail?.source) {
    return repairWikiImageUrl(directPage.thumbnail.source);
  }

  const search = await fetchJson(
    `${FANDOM_API}?action=query&generator=search&gsrsearch=${encodeURIComponent(
      `${title} genshin impact enemy`
    )}&gsrlimit=8&prop=pageimages&piprop=thumbnail&pithumbsize=1024&format=json&origin=*`,
    2,
    signal
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

  return repairWikiImageUrl(ranked[0]?.thumbnail?.source || "");
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

const mapBossList = async (ids, nameMaps, imageMap, group, signal) => {
  const mapped = await mapWithConcurrency(ids, async (id) => {
    const entry = imageMap[id] || {};
    const imageCandidates = getEnemyImageCandidates(entry);
    const splashCandidates = getEnemySplashCandidates(entry);
    const name = getNameFromMap(nameMaps.en, id, id);

    const image = imageCandidates[0] || "";

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

  // Keep bosses visible when every remote image source fails.
  return dedupeById(mapped).sort((a, b) => a.name.localeCompare(b.name));
};

const mapLocalLegends = async (enemyNameMaps, enemyImageMap, signal) => {
  const parsed = await fetchJson(
    `${FANDOM_API}?action=parse&page=${encodeURIComponent(
      LOCAL_LEGEND_PAGE
    )}&prop=wikitext&format=json&origin=*`,
    3,
    signal
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

    const enemyEntry = enemyIdCandidate ? enemyImageMap[enemyIdCandidate] || {} : {};
    const enemyCandidates = getEnemyImageCandidates(enemyEntry);
    const wikiImage = "";

    if (enemyIdCandidate) {
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

  return dedupeById(mapped).sort((a, b) => a.name.localeCompare(b.name));
};

export const fetchGenshinData = async ({ signal } = {}) => {
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
    fetchJson(`${GITHUB_DATA_BASE}/index/English/characters.json`, 3, signal),
    fetchJson(`${GITHUB_DATA_BASE}/index/Russian/characters.json`, 2, signal).catch(() => null),
    fetchJson(`${GITHUB_DATA_BASE}/index/ChineseSimplified/characters.json`, 2, signal).catch(() => null),
    fetchJson(`${GITHUB_DATA_BASE}/index/Japanese/characters.json`, 2, signal).catch(() => null),
    fetchJson(`${GITHUB_DATA_BASE}/index/Korean/characters.json`, 2, signal).catch(() => null),
    fetchJson(`${GITHUB_DATA_BASE}/image/characters.json`, 3, signal).catch(() => ({})),
    fetchJson(`${GITHUB_DATA_BASE}/index/English/enemies.json`, 3, signal),
    fetchJson(`${GITHUB_DATA_BASE}/index/Russian/enemies.json`, 2, signal).catch(() => null),
    fetchJson(`${GITHUB_DATA_BASE}/index/ChineseSimplified/enemies.json`, 2, signal).catch(() => null),
    fetchJson(`${GITHUB_DATA_BASE}/index/Japanese/enemies.json`, 2, signal).catch(() => null),
    fetchJson(`${GITHUB_DATA_BASE}/index/Korean/enemies.json`, 2, signal).catch(() => null),
    fetchJson(`${GITHUB_DATA_BASE}/image/enemies.json`, 3, signal).catch(() => ({})),
  ]);

  const characterIndexRuSafe = characterIndexRu || characterIndexEn;
  const characterIndexZhSafe = characterIndexZh || characterIndexEn;
  const characterIndexJaSafe = characterIndexJa || characterIndexEn;
  const characterIndexKoSafe = characterIndexKo || characterIndexEn;
  const enemyIndexRuSafe = enemyIndexRu || enemyIndexEn;
  const enemyIndexZhSafe = enemyIndexZh || enemyIndexEn;
  const enemyIndexJaSafe = enemyIndexJa || enemyIndexEn;
  const enemyIndexKoSafe = enemyIndexKo || enemyIndexEn;

  const characterNameMaps = {
    en: getNameMap(characterIndexEn),
    ru: getNameMap(characterIndexRuSafe),
    zh: getNameMap(characterIndexZhSafe),
    ja: getNameMap(characterIndexJaSafe),
    ko: getNameMap(characterIndexKoSafe),
  };

  const enemyNameMaps = {
    en: getNameMap(enemyIndexEn),
    ru: getNameMap(enemyIndexRuSafe),
    zh: getNameMap(enemyIndexZhSafe),
    ja: getNameMap(enemyIndexJaSafe),
    ko: getNameMap(enemyIndexKoSafe),
  };

  const characters = mapCharacters(characterNameMaps, characterImages, characterIndexEn);

  const enemyCategoryMap = enemyIndexEn?.categories || {};
  const weeklyIds = enemyCategoryMap["Enemies of Note"] || [];
  const weeklySet = new Set(weeklyIds);
  const allBossIds = enemyCategoryMap.BOSS || [];
  const ascensionIds = allBossIds.filter((id) => !weeklySet.has(id));

  const weeklyBosses = await mapBossList(weeklyIds, enemyNameMaps, enemyImages, "weekly", signal);
  const ascensionBosses = await mapBossList(ascensionIds, enemyNameMaps, enemyImages, "ascension", signal);
  const localLegends = await mapLocalLegends(enemyNameMaps, enemyImages, signal).catch(() => []);

  const bossPool = dedupeById([...weeklyBosses, ...ascensionBosses, ...localLegends]).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  let bossImages = new Map();
  try {
    bossImages = await fetchPageImageMap(bossPool, signal);
  } catch {
    // Per-item Fandom lookup is retried during the initial image preparation.
  }
  const resolvedBossPool = bossPool.map((boss) => {
    const image = bossImages.get(keyify(boss.name)) || "";
    return image
      ? { ...boss, image, imageFallbacks: [...(boss.imageFallbacks || [])], splash: image, splashFallbacks: [...(boss.splashFallbacks || [])] }
      : boss;
  });
  const bossById = new Map(resolvedBossPool.map((boss) => [boss.id, boss]));

  return {
    characters,
    bosses: {
      all: resolvedBossPool,
      weekly: weeklyBosses.map((boss) => bossById.get(boss.id) || boss),
      ascension: ascensionBosses.map((boss) => bossById.get(boss.id) || boss),
      localLegends: localLegends.map((boss) => bossById.get(boss.id) || boss),
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
