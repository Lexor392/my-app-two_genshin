const SITE_URL = "https://lexor392.github.io/my-app-two_genshin/";
const DEFAULT_BASE_URL = import.meta.env?.BASE_URL || "/my-app-two_genshin/";
const ROUTES = {
  dashboard: "",
  characters: "characters",
  characterPool: "character-pool",
  bosses: "bosses",
  bossPool: "boss-pool",
  history: "reroll-statistics",
  settings: "settings",
  donate: "support-project",
};

const SEO_TEXT = {
  dashboard: {
    ru: ["Genshin Impact Random Lab — рулетка персонажей и боссов", "Случайный выбор персонажей и боссов Genshin Impact. Собирайте отряды, настраивайте рулетки и изучайте Тейват."],
    en: ["Genshin Impact Random Lab — Character & Boss Roulette", "Randomly select Genshin Impact characters and bosses, build squads, customize roulette rolls, and explore Teyvat."],
    zh: ["原神随机实验室 — 角色与首领随机抽取", "随机抽取原神角色和首领，组建队伍，自定义转盘并探索提瓦特。"],
    ja: ["原神ランダムラボ — キャラクター＆ボスルーレット", "原神のキャラクターやボスをランダムに選び、チーム編成やルーレットを楽しめます。"],
    ko: ["원신 랜덤 랩 — 캐릭터 및 보스 룰렛", "원신 캐릭터와 보스를 무작위로 선택하고 파티를 구성하며 룰렛을 즐겨 보세요."],
  },
  characters: {
    ru: ["Рулетка персонажей Genshin Impact", "Выбирайте случайных персонажей Genshin Impact. Настройте число рулеток, скорость и состав пула."],
    en: ["Genshin Impact Character Roulette", "Roll random Genshin Impact characters. Customize the number of reels, roll speed, and character pool."],
    zh: ["原神角色随机转盘", "随机抽取原神角色，自定义转盘数量、抽取速度和角色池。"],
    ja: ["原神キャラクタールーレット", "原神キャラクターをランダムに抽選。ルーレット数、速度、対象キャラクターを設定できます。"],
    ko: ["원신 캐릭터 룰렛", "원신 캐릭터를 무작위로 뽑아 보세요. 룰렛 수, 속도, 캐릭터 풀을 설정할 수 있습니다."],
  },
  characterPool: {
    ru: ["Пул персонажей Genshin Impact", "Просматривайте и фильтруйте персонажей Genshin Impact по редкости, оружию и стихии."],
    en: ["Genshin Impact Character Pool", "Browse and filter Genshin Impact characters by rarity, weapon, and element."],
    zh: ["原神角色池", "浏览原神角色，并按稀有度、武器和元素筛选。"],
    ja: ["原神キャラクタープール", "原神キャラクターを閲覧し、レア度、武器、元素で絞り込めます。"],
    ko: ["원신 캐릭터 목록", "원신 캐릭터를 확인하고 희귀도, 무기, 원소별로 필터링하세요."],
  },
  bosses: {
    ru: ["Рулетка боссов Genshin Impact", "Случайный выбор боссов Genshin Impact: еженедельные боссы, боссы прокачки и местные легенды."],
    en: ["Genshin Impact Boss Roulette", "Roll Genshin Impact weekly bosses, character ascension bosses, and local legends."],
    zh: ["原神首领随机转盘", "随机抽取原神周本首领、角色突破首领和地方传奇。"],
    ja: ["原神ボスルーレット", "原神の週ボス、キャラクター突破ボス、地方伝説をランダムに抽選できます。"],
    ko: ["원신 보스 룰렛", "원신 주간 보스, 캐릭터 돌파 보스, 지방 전설을 무작위로 뽑아 보세요."],
  },
  bossPool: {
    ru: ["Пул боссов Genshin Impact", "Изучайте боссов Genshin Impact, их изображения, типы и места обитания; настраивайте пул для рулетки."],
    en: ["Genshin Impact Boss Pool", "Explore Genshin Impact bosses, their types and locations, then customize the roulette pool."],
    zh: ["原神首领列表", "查看原神首领、类型和位置，并自定义随机抽取的首领池。"],
    ja: ["原神ボス一覧", "原神のボス、種類、出現場所を確認し、抽選対象をカスタマイズできます。"],
    ko: ["원신 보스 목록", "원신 보스의 종류와 위치를 확인하고 룰렛 추첨 대상을 설정하세요."],
  },
  history: {
    ru: ["Статистика рероллов Genshin Impact", "Просматривайте историю выпадений персонажей и боссов Genshin Impact, фильтруйте записи по датам."],
    en: ["Genshin Impact Roll History & Statistics", "Review your Genshin Impact character and boss rolls, with date filters and saved results."],
    zh: ["原神抽取历史与统计", "查看原神角色和首领抽取记录，并按日期筛选结果。"],
    ja: ["原神抽選履歴・統計", "原神キャラクターとボスの抽選履歴を確認し、日付で絞り込めます。"],
    ko: ["원신 뽑기 기록 및 통계", "원신 캐릭터와 보스 추첨 기록을 확인하고 날짜별로 필터링하세요."],
  },
  settings: {
    ru: ["Настройки Genshin Impact Random Lab", "Настройте язык, звук, эффекты и скорость рулетки Genshin Impact Random Lab."],
    en: ["Genshin Impact Random Lab Settings", "Configure language, sound, effects, and roulette speed in Genshin Impact Random Lab."],
    zh: ["原神随机实验室设置", "设置原神随机实验室的语言、音效、特效和转盘速度。"],
    ja: ["原神ランダムラボ設定", "言語、サウンド、演出、ルーレット速度を設定できます。"],
    ko: ["원신 랜덤 랩 설정", "언어, 사운드, 효과, 룰렛 속도를 설정하세요."],
  },
  donate: {
    ru: ["Поддержать Genshin Impact Random Lab", "Поддержите развитие Genshin Impact Random Lab криптовалютой через NOWPayments."],
    en: ["Support Genshin Impact Random Lab", "Support the development of Genshin Impact Random Lab with a cryptocurrency donation via NOWPayments."],
    zh: ["支持原神随机实验室", "通过 NOWPayments 加密货币捐赠支持原神随机实验室的发展。"],
    ja: ["原神ランダムラボを支援", "NOWPaymentsの暗号資産寄付で原神ランダムラボの開発を支援できます。"],
    ko: ["원신 랜덤 랩 후원", "NOWPayments 암호화폐 후원으로 원신 랜덤 랩 개발을 지원하세요."],
  },
};

const DEFAULT_META = SEO_TEXT.dashboard.en;

export function sectionFromPath(pathname, baseUrl = DEFAULT_BASE_URL) {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const localPath = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.replace(/^\/+/, "");
  const normalized = localPath.replace(/^\/+|\/+$/g, "");
  return Object.entries(ROUTES).find(([, slug]) => slug === normalized)?.[0] || "dashboard";
}

export function sectionPath(section, baseUrl = DEFAULT_BASE_URL) {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const slug = ROUTES[section] ?? "";
  return slug ? `${base}${slug}/` : base;
}

export function sectionMetadata(section, lang = "en") {
  const [title, description] = (SEO_TEXT[section] || SEO_TEXT.dashboard)[lang] || DEFAULT_META;
  const url = new URL(sectionPath(section), SITE_URL).href;
  return { title, description, url };
}

export function updateSectionMetadata(section, lang = "en") {
  if (typeof document === "undefined") return;
  const metadata = sectionMetadata(section, lang);
  document.title = metadata.title;
  document.documentElement.lang = lang;

  const setMeta = (selector, attributes, content) => {
    let element = document.head.querySelector(selector);
    if (!element) {
      element = document.createElement("meta");
      for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
      document.head.append(element);
    }
    element.setAttribute("content", content);
  };
  setMeta('meta[name="description"]', { name: "description" }, metadata.description);
  setMeta('meta[property="og:title"]', { property: "og:title" }, metadata.title);
  setMeta('meta[property="og:description"]', { property: "og:description" }, metadata.description);
  setMeta('meta[property="og:url"]', { property: "og:url" }, metadata.url);
  setMeta('meta[name="twitter:title"]', { name: "twitter:title" }, metadata.title);
  setMeta('meta[name="twitter:description"]', { name: "twitter:description" }, metadata.description);

  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.append(canonical);
  }
  canonical.href = metadata.url;

  let jsonLd = document.head.querySelector("#seo-jsonld");
  if (!jsonLd) {
    jsonLd = document.createElement("script");
    jsonLd.id = "seo-jsonld";
    jsonLd.type = "application/ld+json";
    document.head.append(jsonLd);
  }
  jsonLd.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: metadata.title,
    description: metadata.description,
    url: metadata.url,
    isPartOf: { "@type": "WebSite", name: "Genshin Impact Random Lab", url: SITE_URL },
  });
}

export const SEO_ROUTES = Object.entries(ROUTES).map(([section, slug]) => ({ section, slug }));
