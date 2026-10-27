import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./App.css";
import { translations } from "./i18n/translations";
import { applyBundledCharacterImages, fetchFallbackImage, fetchGenshinData } from "./services/genshinApi";
import { cacheImageAsset, getCachedImageSource, readCatalogSnapshot, saveCatalogSnapshot } from "./services/imageCache";
import { countRollSessions, createRollHistoryEntries } from "./services/rollHistory";
import { sortCharactersNewestFirst } from "./data/characterReleaseOrder";
import { fetchVisitorCountry, getBrowserLanguage, getLanguageForCountry } from "./services/locale";
import { fetchHoverDetails, getLocalBossDetails } from "./services/hoverDetails";
import { claimSupportSubmission, isSupportHoneypotFilled } from "./services/supportProtection";
import { sectionFromPath, sectionPath, updateSectionMetadata } from "./services/seo.mjs";
import { NOWPAYMENTS_URL, SUPPORT_EMAIL } from "./config/support";
import {
  buildRollSequence,
  getCenteredReelPosition,
  getRollTravelCardCount,
  getRollProgress,
  getWheelTargetRotation,
  pickUniqueWinners,
  ROULETTE_MODES,
  ROULETTE_TRAVEL_CARDS,
  ROULETTE_WINNER_INDEX,
} from "./utils/rouletteEngine";

const LANGS = ["ru", "en", "zh", "ja", "ko"];
const EXTRA_LABELS = {
  squadTitle: { ru: "Ваш отряд", en: "Your squad", zh: "你的队伍", ja: "あなたのチーム", ko: "내 파티" },
  squadSubtitle: { ru: "Собранный состав", en: "Squad lineup", zh: "队伍阵容", ja: "チーム編成", ko: "파티 구성" },
  popupToggle: { ru: "Открывать поп-ап результата", en: "Open result popup", zh: "显示结果弹窗", ja: "結果ポップアップを表示", ko: "결과 팝업 표시" },
  popupEffects: { ru: "Эффекты поп-апа результата", en: "Result popup effects", zh: "结果弹窗特效", ja: "結果ポップアップの演出", ko: "결과 팝업 효과" },
  weapon: { ru: "Оружие", en: "Weapon", zh: "武器", ja: "武器", ko: "무기" },
  element: { ru: "Стихия", en: "Element", zh: "元素", ja: "元素", ko: "원소" },
  saveSquad: { ru: "Сохранить отряд", en: "Save squad", zh: "保存队伍", ja: "チームを保存", ko: "파티 저장" },
  saveRoll: { ru: "Сохранить реролл", en: "Save reroll", zh: "保存本次抽取", ja: "今回の抽選を保存", ko: "이번 뽑기 저장" },
  characterRollSaved: { ru: "Рерол персонажей сохранён в статистику.", en: "Character reroll saved to statistics.", zh: "角色抽取已保存到统计记录。", ja: "キャラクターの抽選結果を統計に保存しました。", ko: "캐릭터 뽑기 결과를 통계에 저장했습니다." },
  bossRollSaved: { ru: "Рерол босса сохранён в статистику.", en: "Boss reroll saved to statistics.", zh: "首领抽取已保存到统计记录。", ja: "ボスの抽選結果を統計に保存しました。", ko: "보스 뽑기 결과를 통계에 저장했습니다." },
  goToHistory: { ru: "Перейти в статистику рероллов", en: "Go to reroll statistics", zh: "查看抽取统计", ja: "抽選統計を見る", ko: "뽑기 통계 보기" },
  reroll: { ru: "Реролл", en: "Reroll", zh: "重新抽取", ja: "もう一度回す", ko: "다시 뽑기" },
  savedSquads: { ru: "Сохранённые отряды", en: "Saved squads", zh: "已保存队伍", ja: "保存済みチーム", ko: "저장된 파티" },
  savedBosses: { ru: "Сохранённые боссы", en: "Saved bosses", zh: "已保存首领", ja: "保存済みボス", ko: "저장된 보스" },
  noSavedBosses: { ru: "Пока нет сохранённых боссов.", en: "No saved bosses yet.", zh: "暂时没有保存的首领。", ja: "保存されたボスはまだありません。", ko: "저장된 보스가 없습니다." },
  saveBoss: { ru: "Сохранить босса", en: "Save boss", zh: "保存首领", ja: "ボスを保存", ko: "보스 저장" },
  bossSaved: { ru: "Босс сохранён", en: "Boss saved", zh: "首领已保存", ja: "ボスを保存しました", ko: "보스가 저장되었습니다" },
  noSavedSquads: { ru: "Пока нет сохранённых отрядов.", en: "No saved squads yet.", zh: "暂时没有保存的队伍。", ja: "保存されたチームはまだありません。", ko: "저장된 파티가 없습니다." },
  home: { ru: "Главная", en: "Home", zh: "主页", ja: "ホーム", ko: "홈" },
  spinCharacters: { ru: "Крутить персонажей", en: "Spin characters", zh: "抽取角色", ja: "キャラクターを回す", ko: "캐릭터 뽑기" },
  spinBosses: { ru: "Крутить боссов", en: "Spin bosses", zh: "抽取首领", ja: "ボスを回す", ko: "보스 뽑기" },
  characterRoulette: { ru: "Рулетка персонажей", en: "Character roulette", zh: "角色轮盘", ja: "キャラクタールーレット", ko: "캐릭터 룰렛" },
  bossRoulette: { ru: "Рулетка боссов", en: "Boss roulette", zh: "首领轮盘", ja: "ボスルーレット", ko: "보스 룰렛" },
  rollSpeed: { ru: "Скорость ролла", en: "Roll speed", zh: "抽取速度", ja: "抽選速度", ko: "뽑기 속도" },
  rollNext: { ru: "Крутить следующего", en: "Spin next", zh: "抽取下一位", ja: "次を回す", ko: "다음 뽑기" },
  squadSaved: { ru: "Ваш отряд сохранён", en: "Your squad is saved", zh: "队伍已保存", ja: "チームを保存しました", ko: "파티가 저장되었습니다" },
  speedVeryFast: { ru: "Очень быстро", en: "Very fast", zh: "非常快", ja: "とても速い", ko: "매우 빠름" },
  speedFast: { ru: "Быстро", en: "Fast", zh: "快速", ja: "速い", ko: "빠름" },
  speedNormal: { ru: "Обычно", en: "Normal", zh: "正常", ja: "普通", ko: "보통" },
  speedSlow: { ru: "Медленно", en: "Slow", zh: "慢速", ja: "遅い", ko: "느림" },
  userStats: { ru: "Ваша статистика", en: "Your stats", zh: "你的统计", ja: "あなたの記録", ko: "내 통계" },
  totalRolls: { ru: "Всего рероллов", en: "Total rolls", zh: "抽取总数", ja: "合計回数", ko: "총 뽑기 횟수" },
  todayRolls: { ru: "Рероллов сегодня", en: "Rolls today", zh: "今日抽取", ja: "今日の回数", ko: "오늘 뽑기" },
  savedSquadsShort: { ru: "Сохранено отрядов", en: "Saved squads", zh: "已保存队伍", ja: "保存済みチーム", ko: "저장된 파티" },
  noData: { ru: "нет данных", en: "no data", zh: "暂无数据", ja: "データなし", ko: "데이터 없음" },
  dashboardHint: { ru: "Быстрый старт и ваша статистика приключений.", en: "Quick start and your adventure stats.", zh: "快速开始并查看冒险统计。", ja: "すぐに始めて冒険の記録を確認。", ko: "바로 시작하고 모험 통계를 확인하세요." },
  stop: { ru: "Стоп", en: "Stop", zh: "停止", ja: "停止", ko: "정지" },
  editRoulette: { ru: "Настроить число рулеток", en: "Edit roulette count", zh: "调整转盘数量", ja: "ルーレット数を変更", ko: "룰렛 개수 편집" },
  removeRoulette: { ru: "Убрать рулетку", en: "Remove roulette", zh: "移除转盘", ja: "ルーレットを削除", ko: "룰렛 제거" },
  addRoulette: { ru: "Добавить рулетку", en: "Add roulette", zh: "添加转盘", ja: "ルーレットを追加", ko: "룰렛 추가" },
  openMenu: { ru: "Открыть меню", en: "Open menu", zh: "打开菜单", ja: "メニューを開く", ko: "메뉴 열기" },
  closeMenu: { ru: "Закрыть меню", en: "Close menu", zh: "关闭菜单", ja: "メニューを閉じる", ko: "메뉴 닫기" },
  spinCount: { ru: "Количество рулеток", en: "Spin count", zh: "转盘数量", ja: "ルーレット数", ko: "룰렛 개수" },
  rouletteModes: { ru: "Выбери способ розыгрыша", en: "Choose a roulette style", zh: "选择抽取方式", ja: "ルーレットの形式を選択", ko: "룰렛 방식 선택" },
  rouletteVertical: { ru: "Вертикальная", en: "Vertical", zh: "垂直卷轴", ja: "縦型", ko: "세로형" },
  rouletteHorizontal: { ru: "Горизонтальная", en: "Horizontal", zh: "横向", ja: "横型", ko: "가로형" },
  poolFilters: { ru: "Фильтры", en: "Filters", zh: "筛选", ja: "フィルター", ko: "필터" },
  shuffleWheel: { ru: "Перемешать сектора колеса", en: "Shuffle wheel segments", zh: "打乱转盘扇区", ja: "ホイールの区画をシャッフル", ko: "휠 구간 섞기" },
  rouletteWheel: { ru: "Колесо", en: "Wheel", zh: "幸运转盘", ja: "ルーレット", ko: "룰렛 휠" },
  specialCharacters: { ru: "Особые персонажи", en: "Special characters", zh: "特殊角色", ja: "特別なキャラクター", ko: "특수 캐릭터" },
  wheelResults: { ru: "Выпавшие персонажи", en: "Selected characters", zh: "抽取结果", ja: "選ばれたキャラクター", ko: "선택된 캐릭터" },
  needLanes: { ru: "В пуле должно быть не менее {count} разных персонажей для {count} рулеток.", en: "Add at least {count} different characters to spin {count} lanes.", zh: "角色池至少需要 {count} 名不同角色才能转动 {count} 个转盘。", ja: "{count} 個のルーレットを回すには、異なるキャラクターが {count} 人以上必要です。", ko: "룰렛 {count}개를 돌리려면 서로 다른 캐릭터가 {count}명 이상 필요합니다." },
  catalogUpdated: { ru: "Каталог обновлён", en: "Catalog updated", zh: "目录更新", ja: "カタログ更新", ko: "목록 업데이트" },
  detailLoading: { ru: "Загружаю подробности…", en: "Loading details…", zh: "正在加载详细信息…", ja: "詳細を読み込み中…", ko: "상세 정보를 불러오는 중…" },
  detailUnavailable: { ru: "Подробности пока недоступны.", en: "Details are unavailable right now.", zh: "暂时无法获取详细信息。", ja: "詳細情報を現在取得できません。", ko: "현재 상세 정보를 불러올 수 없습니다." },
  detailAffiliation: { ru: "Организация", en: "Affiliation", zh: "所属", ja: "所属", ko: "소속" },
  detailRegion: { ru: "Регион", en: "Region", zh: "地区", ja: "地域", ko: "지역" },
  detailArea: { ru: "Область", en: "Area", zh: "区域", ja: "エリア", ko: "지역" },
  detailSubarea: { ru: "Место", en: "Location", zh: "地点", ja: "場所", ko: "위치" },
  detailConstellation: { ru: "Созвездие", en: "Constellation", zh: "命之座", ja: "命ノ星座", ko: "운명의 자리" },
  detailBirthday: { ru: "День рождения", en: "Birthday", zh: "生日", ja: "誕生日", ko: "생일" },
  detailWeapon: { ru: "Оружие", en: "Weapon", zh: "武器", ja: "武器", ko: "무기" },
  detailElement: { ru: "Стихия", en: "Element", zh: "元素", ja: "元素", ko: "원소" },
  detailNotes: { ru: "Дополнительно", en: "Additional details", zh: "补充信息", ja: "追加情報", ko: "추가 정보" },
  detailMap: { ru: "Карта места", en: "Location map", zh: "位置地图", ja: "場所のマップ", ko: "위치 지도" },
  openMap: { ru: "Открыть карту на весь экран", en: "Open map full screen", zh: "全屏打开地图", ja: "地図を全画面で開く", ko: "지도를 전체 화면으로 열기" },
  zoomIn: { ru: "Приблизить", en: "Zoom in", zh: "放大", ja: "拡大", ko: "확대" },
  zoomOut: { ru: "Отдалить", en: "Zoom out", zh: "缩小", ja: "縮小", ko: "축소" },
  resetZoom: { ru: "Исходный размер", en: "Reset zoom", zh: "重置缩放", ja: "ズームをリセット", ko: "확대 초기화" },
  detailMapUnavailable: { ru: "Скриншот карты для этого босса не найден.", en: "No map screenshot was found for this boss.", zh: "未找到该首领的地图截图。", ja: "このボスのマップ画像は見つかりませんでした。", ko: "이 보스의 지도 이미지를 찾지 못했습니다." },
};
const getExtraLabel = (key, lang) => EXTRA_LABELS[key]?.[lang] || EXTRA_LABELS[key]?.en || "";
const getLocale = (lang) => ({ ru: "ru-RU", en: "en-GB", zh: "zh-CN", ja: "ja-JP", ko: "ko-KR" }[lang] || "en-GB");
const LANG_OPTIONS = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
];
const SECTION_IDS = [
  "dashboard",
  "characters",
  "characterPool",
  "bosses",
  "bossPool",
  "history",
  "settings",
  "donate",
];
const ROLL_DURATION_OPTIONS = [2, 3, 4, 5, 8];
const ROLL_SPEED_OPTIONS = ["slow", "normal", "fast", "veryFast"];
const HISTORY_LIMIT_OPTIONS = [30, 60, 90];

const DEFAULT_CHARACTER_FILTERS = {
  search: "",
  viewMode: "cards",
  rarities: [],
  weapons: [],
  elements: [],
  includeSpecial: false,
};

const DEFAULT_BOSS_FILTERS = {
  search: "",
  viewMode: "cards",
  groups: [],
};

const DEFAULT_HISTORY_FILTERS = {
  from: "",
  to: "",
  stage: "all",
};

const DEFAULT_SETTINGS = {
  uiVolume: 0.45,
  tickVolume: 0.5,
  splashEnabled: true,
  splashEffects: true,
  rollDurationSeconds: 2,
  rollSpeed: "normal",
  historyLimit: 60,
};

const ROLL_ACCELERATION_MS = 1200;
const ROLL_DECELERATION_MS = 1800;

const COOKIE_DAYS = 365;
const COOKIE_HISTORY_SIZE_LIMIT = 3300;
const HISTORY_STORAGE_KEY = "gi_rl_history_v1";
const MIN_AUDIO_THRESHOLD = 0.001;

const COOKIE_KEYS = {
  settings: "gi_rl_settings",
  ui: "gi_rl_ui",
  characterFilters: "gi_rl_character_filters",
  bossFilters: "gi_rl_boss_filters",
  selectedIds: "gi_rl_selected_ids",
  history: "gi_rl_history",
  historyFilters: "gi_rl_history_filters",
  savedSquads: "gi_rl_saved_squads",
  savedBosses: "gi_rl_saved_bosses",
};

const ELEMENT_LABELS = {
  PYRO: { ru: "Пиро", en: "Pyro", zh: "火", ja: "炎", ko: "불" },
  HYDRO: { ru: "Гидро", en: "Hydro", zh: "水", ja: "水", ko: "물" },
  ANEMO: { ru: "Анемо", en: "Anemo", zh: "风", ja: "風", ko: "바람" },
  ELECTRO: { ru: "Электро", en: "Electro", zh: "雷", ja: "雷", ko: "번개" },
  CRYO: { ru: "Крио", en: "Cryo", zh: "冰", ja: "氷", ko: "얼음" },
  GEO: { ru: "Гео", en: "Geo", zh: "岩", ja: "岩", ko: "바위" },
  DENDRO: { ru: "Дендро", en: "Dendro", zh: "草", ja: "草", ko: "풀" },
  NONE: { ru: "Неизвестно", en: "Unknown", zh: "未知", ja: "不明", ko: "알 수 없음" },
};

const WEAPON_LABELS = {
  WEAPON_SWORD_ONE_HAND: { ru: "Одноручный меч", en: "Sword", zh: "单手剑", ja: "片手剣", ko: "한손검" },
  WEAPON_CLAYMORE: { ru: "Двуручный меч", en: "Claymore", zh: "双手剑", ja: "両手剣", ko: "양손검" },
  WEAPON_POLE: { ru: "Копьё", en: "Polearm", zh: "长柄武器", ja: "長柄武器", ko: "장병기" },
  WEAPON_CATALYST: { ru: "Катализатор", en: "Catalyst", zh: "法器", ja: "法器", ko: "법구" },
  WEAPON_BOW: { ru: "Лук", en: "Bow", zh: "弓", ja: "弓", ko: "활" },
};

const BOSS_TYPE_LABELS = {
  weekly: { ru: "Еженедельный", en: "Weekly", zh: "周本", ja: "週ボス", ko: "주간 보스" },
  ascension: { ru: "Прокачка", en: "Ascension", zh: "突破素材", ja: "突破素材", ko: "육성 재료" },
  localLegend: { ru: "Местная легенда", en: "Local Legend", zh: "地方传奇", ja: "地方伝説", ko: "지역 전설" },
};

const mediaQueryMatches = (query) =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false;

const getItemName = (item, lang) => {
  if (lang === "ru") {
    return item.nameRu || item.name;
  }
  if (lang === "zh") {
    return item.nameZh || item.name;
  }
  if (lang === "ja") {
    return item.nameJa || item.name;
  }
  if (lang === "ko") {
    return item.nameKo || item.name;
  }
  return item.name;
};
const formatElement = (value, lang) => ELEMENT_LABELS[value]?.[lang] || value;
const formatWeapon = (value, lang) => WEAPON_LABELS[value]?.[lang] || value;
const formatBossType = (value, lang) => BOSS_TYPE_LABELS[value]?.[lang] || value;
const SPECIAL_MAGENTA_CHARACTER_IDS = new Set(["aloy", "playerboy", "playergirl"]);
const SPECIAL_MAGENTA_CHARACTER_TOKENS = [
  "манекен м",
  "манекен ж",
  "манекен (м)",
  "манекен (ж)",
  "элой",
  "aloy",
  "male traveler",
  "female traveler",
];
const normalizeCharacterToken = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
const isSpecialMagentaCharacter = (item) => {
  const values = [
    item?.id,
    item?.slug,
    item?.name,
    item?.nameRu,
    item?.nameZh,
    item?.nameJa,
    item?.nameKo,
  ]
    .map((value) => normalizeCharacterToken(value))
    .filter(Boolean);

  const hasSpecialId = values.some((value) => SPECIAL_MAGENTA_CHARACTER_IDS.has(value.replace(/\s+/g, "")));
  if (hasSpecialId) {
    return true;
  }

  return values.some((value) => SPECIAL_MAGENTA_CHARACTER_TOKENS.some((token) => value.includes(token)));
};
const getTeamPopupTitle = (lang) => getExtraLabel("squadTitle", lang);
const getTeamPopupSubtitle = (lang) => getExtraLabel("squadSubtitle", lang);
const getPopupToggleLabel = (lang) => getExtraLabel("popupToggle", lang);
const getPopupEffectsLabel = (lang) => getExtraLabel("popupEffects", lang);
const getWeaponLabel = (lang) => getExtraLabel("weapon", lang);
const getElementLabel = (lang) => getExtraLabel("element", lang);
const getSaveSquadLabel = (lang) => getExtraLabel("saveSquad", lang);
const getRerollSquadLabel = (lang) => getExtraLabel("reroll", lang);
const getSavedSquadsTitle = (lang) => getExtraLabel("savedSquads", lang);
const getNoSavedSquadsLabel = (lang) => getExtraLabel("noSavedSquads", lang);
const getHomeMenuLabel = (lang) => getExtraLabel("home", lang);
const getSpinCharactersLabel = (lang) => getExtraLabel("spinCharacters", lang);
const getSpinBossesLabel = (lang) => getExtraLabel("spinBosses", lang);
const getUserStatsTitle = (lang) => getExtraLabel("userStats", lang);
const getTodayRollsLabel = (lang) => getExtraLabel("todayRolls", lang);
const getTotalRollsLabel = (lang) => getExtraLabel("totalRolls", lang);
const getSavedSquadsShortLabel = (lang) => getExtraLabel("savedSquadsShort", lang);
const getUnknownOnlineLabel = (lang) => getExtraLabel("noData", lang);
const getDashboardHint = (lang) => getExtraLabel("dashboardHint", lang);
const getTravelerDuoBaseName = (lang) => {
  if (lang === "ru") {
    return "Итер и Люмин";
  }
  if (lang === "zh") {
    return "空与荧";
  }
  if (lang === "ja") {
    return "空と蛍";
  }
  if (lang === "ko") {
    return "아이테르와 루미네";
  }
  return "Aether & Lumine";
};
const TRAVELER_SOURCE_IDS = new Set(["aether", "lumine"]);
const TRAVELER_ELEMENT_ORDER = ["ANEMO", "GEO", "HYDRO", "ELECTRO", "PYRO", "DENDRO", "CRYO"];
const TRAVELER_DUO_ARTWORK = `${import.meta.env.BASE_URL}assets/traveler-twins.webp`;
const EMPTY_IMAGE_FALLBACKS = Object.freeze([]);
const WEAPON_ICONS = {
  WEAPON_SWORD_ONE_HAND: "⚔",
  WEAPON_CLAYMORE: "🗡",
  WEAPON_POLE: "🜂",
  WEAPON_CATALYST: "✦",
  WEAPON_BOW: "🏹",
};
const ELEMENT_ICONS = {
  PYRO: "🔥",
  HYDRO: "💧",
  ANEMO: "🌪",
  ELECTRO: "⚡",
  CRYO: "❄",
  GEO: "🪨",
  DENDRO: "🍃",
  NONE: "✧",
};
const ELEMENT_IMAGE_ASSETS = {
  PYRO: "element-pyro.svg",
  HYDRO: "element-hydro.svg",
  ANEMO: "element-anemo.svg",
  ELECTRO: "element-electro.webp",
  CRYO: "element-cryo.png",
  GEO: "element-geo.png",
  DENDRO: "element-dendro.png",
};
const getElementImage = (element) => {
  const asset = ELEMENT_IMAGE_ASSETS[element];
  return asset ? `${import.meta.env.BASE_URL}assets/${asset}` : "";
};

const PRELOADER_COPY = {
  ru: { title: "Путешествие по Тейвату", data: "Собираем архив приключений…", images: "Пробуждаем образы героев и противников…", count: "Подготовлено изображений", failed: "Не удалось загрузить", retry: "Повторить загрузку" },
  en: { title: "A journey through Teyvat", data: "Gathering the adventure archive…", images: "Awakening the heroes and foes…", count: "Images prepared", failed: "Could not load", retry: "Retry loading" },
  zh: { title: "踏上提瓦特之旅", data: "正在整理冒险档案…", images: "正在唤醒角色与敌人的影像…", count: "已准备图像", failed: "加载失败", retry: "重新加载" },
  ja: { title: "テイワットを巡る旅", data: "冒険の記録を集めています…", images: "キャラクターと敵の姿を呼び覚ましています…", count: "準備済み画像", failed: "読み込めませんでした", retry: "再読み込み" },
  ko: { title: "티바트 여행", data: "모험 기록을 모으는 중…", images: "영웅과 적의 모습을 불러오는 중…", count: "준비된 이미지", failed: "불러오지 못함", retry: "다시 불러오기" },
};

const PRELOAD_TIMEOUT_MS = 9000;
const PRELOAD_CONCURRENCY = 8;
const prioritizeImageCandidates = (candidates) => Array.from(new Set(candidates.filter(Boolean)))
  .map((url, index) => ({ url, index }))
  .sort((left, right) => {
  const rank = (url) => url.includes("/assets/characters/") ? -1
    : url.includes("hoyowiki.com") ? 0
      : url.includes("upload-os-bbs.mihoyo.com") ? 5
        : url.includes("static.wikia.nocookie.net") ? 2
          : url.includes("api.ambr.top") || url.includes("api.hakush.in") ? 4 : 3;
    return rank(left.url) - rank(right.url) || left.index - right.index;
  })
  .map(({ url }) => url);

const loadImageAsset = (url, signal) => new Promise((resolve, reject) => {
  if (!url || signal?.aborted) {
    reject(new Error("Image load cancelled"));
    return;
  }

  cacheImageAsset(url, signal)
    .then(resolve)
    .catch((cacheError) => {
      if (signal?.aborted) {
        reject(cacheError);
        return;
      }
      const image = new Image();
      const timeoutId = window.setTimeout(() => finish(false, new Error("Image load timed out")), PRELOAD_TIMEOUT_MS);
      let settled = false;
      const finish = (success, error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        signal?.removeEventListener("abort", abort);
        image.onload = null;
        image.onerror = null;
        if (success) resolve(url);
        else reject(error);
      };
      const abort = () => finish(false, cacheError);
      image.onload = () => finish(true);
      image.onerror = () => finish(false, cacheError);
      signal?.addEventListener("abort", abort, { once: true });
      image.src = url;
      if (image.complete && image.naturalWidth > 0) finish(true);
    });
});

const preloadCatalogImages = async (catalog, { signal, onProgress }) => {
  const allItems = [...catalog.characters, ...catalog.bosses.all];
  let completed = 0;
  let failed = 0;
  let nextIndex = 0;
  const ready = new Array(allItems.length);

  const worker = async () => {
    while (nextIndex < allItems.length && !signal?.aborted) {
      const index = nextIndex++;
      const item = allItems[index];
      const candidates = prioritizeImageCandidates([item.duoArtwork, item.image, ...(item.imageFallbacks || [])]);
      let workingImage = "";

      for (const candidate of candidates) {
        try {
          workingImage = await loadImageAsset(candidate, signal);
          break;
        } catch {
          if (signal?.aborted) break;
        }
      }

      if (!workingImage && !signal?.aborted && index < catalog.characters.length) {
        try {
          const wikiImage = await fetchFallbackImage(item.name, signal);
          if (wikiImage) workingImage = await loadImageAsset(wikiImage, signal);
        } catch {
          // Keep an illustrated fallback for unavailable external art.
        }
      }

      const travelerImages = [];
      for (const traveler of item.travelerImages || []) {
        const travelerCandidates = prioritizeImageCandidates([traveler.image, ...(traveler.imageFallbacks || [])]);
        let travelerImage = "";
        for (const candidate of travelerCandidates) {
          try {
            travelerImage = await loadImageAsset(candidate, signal);
            break;
          } catch {
            if (signal?.aborted) break;
          }
        }
        travelerImages.push({
          image: travelerImage,
          imageFallbacks: travelerCandidates.filter((candidate) => candidate !== travelerImage),
        });
      }

      if (!workingImage) failed += 1;
      ready[index] = {
        ...item,
        image: workingImage,
        imageFallbacks: candidates.filter((candidate) => candidate !== workingImage),
        travelerImages,
      };
      completed += 1;
      onProgress?.({ completed, total: allItems.length, failed });
    }
  };

  await Promise.all(Array.from({ length: Math.min(PRELOAD_CONCURRENCY, allItems.length) }, worker));
  if (signal?.aborted) throw new DOMException("Loading cancelled", "AbortError");

  const characters = ready.slice(0, catalog.characters.length);
  const bosses = ready.slice(catalog.characters.length);
  const byId = new Map(bosses.map((boss) => [boss.id, boss]));
  return {
    characters,
    bosses: {
      ...catalog.bosses,
      all: bosses,
      weekly: catalog.bosses.weekly.map((boss) => byId.get(boss.id) || boss),
      ascension: catalog.bosses.ascension.map((boss) => byId.get(boss.id) || boss),
      localLegends: catalog.bosses.localLegends.map((boss) => byId.get(boss.id) || boss),
    },
    failedImages: failed,
  };
};

const shuffleArray = (list) => {
  const next = [...list];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
};

const pickRandom = (pool) => pool[Math.floor(Math.random() * pool.length)];

const toSnapshotMember = (item) => ({
  id: item.id,
  name: item.name || "",
  nameRu: item.nameRu || "",
  nameZh: item.nameZh || "",
  nameJa: item.nameJa || "",
  nameKo: item.nameKo || "",
  rarity: item.rarity || 4,
  weapon: item.weapon || "WEAPON_SWORD_ONE_HAND",
  element: item.element || "NONE",
  image: item.image || "",
  duoArtwork: item.duoArtwork || "",
  imageFallbacks: Array.isArray(item.imageFallbacks) ? item.imageFallbacks.slice(0, 2) : [],
  travelerImages: Array.isArray(item.travelerImages) ? item.travelerImages.map((entry) => ({
    image: entry.image || "",
    imageFallbacks: Array.isArray(entry.imageFallbacks) ? entry.imageFallbacks.slice(0, 2) : [],
  })) : [],
});

const toSnapshotBoss = (boss) => ({
  id: boss.id,
  name: boss.name || "",
  nameRu: boss.nameRu || "",
  nameZh: boss.nameZh || "",
  nameJa: boss.nameJa || "",
  nameKo: boss.nameKo || "",
  rarity: boss.rarity || 4,
  group: boss.group || "",
  image: boss.image || "",
  imageFallbacks: Array.isArray(boss.imageFallbacks) ? boss.imageFallbacks.slice(0, 2) : [],
});

const normalizeSavedSquads = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const id = typeof entry.id === "string" ? entry.id : "";
      const timestamp = typeof entry.timestamp === "string" ? entry.timestamp : "";
      const membersRaw = Array.isArray(entry.members) ? entry.members : [];
      const members = membersRaw
        .map((member) => {
          if (!member || typeof member !== "object" || typeof member.id !== "string") {
            return null;
          }
          return toSnapshotMember(member);
        })
        .filter(Boolean);

      if (!id || !timestamp || Number.isNaN(Date.parse(timestamp)) || !members.length) {
        return null;
      }

      return { id, timestamp, members };
    })
    .filter(Boolean)
    .slice(0, 24);
};

const trimSavedSquadsForCookie = (entries) => {
  const next = [...entries].slice(0, 24);
  while (next.length) {
    const encoded = encodeURIComponent(JSON.stringify(next));
    if (encoded.length <= COOKIE_HISTORY_SIZE_LIMIT) {
      return next;
    }
    next.pop();
  }
  return [];
};

const normalizeSavedBosses = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (!entry || typeof entry !== "object") return null;
    const id = typeof entry.id === "string" ? entry.id : "";
    const timestamp = typeof entry.timestamp === "string" ? entry.timestamp : "";
    const boss = entry.boss && typeof entry.boss === "object" && typeof entry.boss.id === "string"
      ? toSnapshotBoss(entry.boss)
      : null;
    if (!id || !timestamp || Number.isNaN(Date.parse(timestamp)) || !boss) return null;
    return { id, timestamp, boss };
  }).filter(Boolean).slice(0, 30);
};

const trimSavedBossesForCookie = (entries) => {
  const next = [...entries].slice(0, 30);
  while (next.length) {
    if (encodeURIComponent(JSON.stringify(next)).length <= COOKIE_HISTORY_SIZE_LIMIT) return next;
    next.pop();
  }
  return [];
};

export const buildTravelerDuoCharacters = (characters) => {
  if (!Array.isArray(characters) || !characters.length) {
    return [];
  }

  const travelers = characters.filter((item) => TRAVELER_SOURCE_IDS.has(String(item.id || "").toLowerCase()));
  const previousDuoCards = characters.filter((item) => String(item.id || "").startsWith("traveler-duo-"));
  const filtered = characters.filter((item) =>
    !TRAVELER_SOURCE_IDS.has(String(item.id || "").toLowerCase()) &&
    !String(item.id || "").startsWith("traveler-duo-")
  );

  const travelerImages = travelers.length ? travelers.map((item) => ({
    id: item.id,
    image: item.image || item.imageFallbacks?.[0] || "",
    imageFallbacks: Array.from(new Set([...(item.imageFallbacks || []), item.splash, ...(item.splashFallbacks || [])].filter(Boolean))),
  })) : (previousDuoCards[0]?.travelerImages || []).map((item, index) => ({
    id: item.id || `traveler-${index}`,
    image: item.image || "",
    imageFallbacks: Array.isArray(item.imageFallbacks) ? item.imageFallbacks : [],
  }));
  const sharedImage = travelerImages.find((entry) => entry.image)?.image || "";
  const sharedFallbacks = Array.from(new Set(travelerImages.flatMap((entry) => [entry.image, ...entry.imageFallbacks]).filter(Boolean)));
  const apiElements = new Set(filtered.map((item) => item.element).filter((element) => element && element !== "NONE" && ELEMENT_LABELS[element]));
  const elements = [
    ...TRAVELER_ELEMENT_ORDER.filter((element) => apiElements.has(element)),
    ...Array.from(apiElements).filter((element) => !TRAVELER_ELEMENT_ORDER.includes(element)).sort(),
  ];

  const duoCards = elements.map((element) => {

    return {
      id: `traveler-duo-${String(element).toLowerCase()}`,
      slug: `traveler-duo-${String(element).toLowerCase()}`,
      name: `${getTravelerDuoBaseName("en")} (${ELEMENT_LABELS[element]?.en || element})`,
      nameRu: `${getTravelerDuoBaseName("ru")} (${ELEMENT_LABELS[element]?.ru || element})`,
      nameZh: `${getTravelerDuoBaseName("zh")} (${ELEMENT_LABELS[element]?.zh || element})`,
      nameJa: `${getTravelerDuoBaseName("ja")} (${ELEMENT_LABELS[element]?.ja || element})`,
      nameKo: `${getTravelerDuoBaseName("ko")} (${ELEMENT_LABELS[element]?.ko || element})`,
      rarity: 5,
      element,
      weapon: "WEAPON_SWORD_ONE_HAND",
      image: sharedImage,
      imageFallbacks: sharedFallbacks,
      duoArtwork: TRAVELER_DUO_ARTWORK,
      splash: sharedImage,
      splashFallbacks: sharedFallbacks,
      travelerImages,
    };
  });

  return [...filtered, ...duoCards];
};

const ItemImage = ({ item, alt, className, loading = "lazy" }) => {
  if (item?.duoArtwork) {
    return (
      <span className={`traveler-duo-portrait element-${String(item.element || "anemo").toLowerCase()} ${className || ""}`} role="img" aria-label={alt}>
        <ElementSigil element={item.element} />
        <ImageWithFallback src={item.duoArtwork} alt="" loading={loading} />
      </span>
    );
  }
  const pair = (item?.travelerImages || []).filter((entry) => entry.image);
  if (pair.length >= 2) {
    return (
      <span className={`traveler-pair-image ${className || ""}`} role="img" aria-label={alt}>
        {pair.slice(0, 2).map((traveler, index) => (
          <ImageWithFallback
            key={`${traveler.id || index}-${traveler.image}`}
            src={traveler.image}
            fallbackSrcs={traveler.imageFallbacks}
            alt=""
            loading={loading}
          />
        ))}
      </span>
    );
  }
  return <ImageWithFallback src={item?.image} fallbackSrcs={item?.imageFallbacks} alt={alt} className={className} loading={loading} />;
};

const ElementSigil = ({ element }) => (
  <img className="traveler-element-sigil traveler-element-sigil-image" src={getElementImage(element)} alt="" aria-hidden="true" />
);

const ElementIcon = ({ element }) => {
  const image = getElementImage(element);
  return image
    ? <img className={`element-icon-image element-icon-${String(element || "none").toLowerCase()}`} src={image} alt="" aria-hidden="true" />
    : <span aria-hidden="true">{ELEMENT_ICONS[element] || "✧"}</span>;
};

const safeJsonParse = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const getCookie = (name) => {
  if (typeof document === "undefined") {
    return "";
  }

  const nameEq = `${name}=`;
  const cookies = document.cookie.split(";");

  for (const rawCookie of cookies) {
    const cookie = rawCookie.trim();
    if (cookie.startsWith(nameEq)) {
      return decodeURIComponent(cookie.slice(nameEq.length));
    }
  }

  return "";
};

const setCookie = (name, value, days = COOKIE_DAYS) => {
  if (typeof document === "undefined") {
    return;
  }

  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

const readCookieJson = (name, fallback) => {
  const raw = getCookie(name);
  if (!raw) {
    return fallback;
  }
  return safeJsonParse(raw, fallback);
};

const setCookieJson = (name, value) => {
  setCookie(name, JSON.stringify(value));
};

const clampHistoryLimit = (value) =>
  HISTORY_LIMIT_OPTIONS.includes(Number(value)) ? Number(value) : DEFAULT_SETTINGS.historyLimit;

const clampVolume = (value, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, numeric));
};

const uniqueStringArray = (value) =>
  Array.from(new Set((Array.isArray(value) ? value : []).filter((entry) => typeof entry === "string")));

const normalizeCharacterFilters = (value) => {
  const source = value && typeof value === "object" ? value : {};
  const rarities = Array.isArray(source.rarities)
    ? source.rarities.filter((entry) => entry === 4 || entry === 5)
    : [];

  return {
    search: typeof source.search === "string" ? source.search : DEFAULT_CHARACTER_FILTERS.search,
    viewMode: source.viewMode === "list" || source.viewMode === "cards" ? source.viewMode : DEFAULT_CHARACTER_FILTERS.viewMode,
    rarities,
    weapons: uniqueStringArray(source.weapons),
    elements: uniqueStringArray(source.elements),
    includeSpecial: source.includeSpecial === true,
  };
};

const normalizeBossFilters = (value) => {
  const source = value && typeof value === "object" ? value : {};
  return {
    search: typeof source.search === "string" ? source.search : DEFAULT_BOSS_FILTERS.search,
    viewMode: source.viewMode === "list" || source.viewMode === "cards" ? source.viewMode : DEFAULT_BOSS_FILTERS.viewMode,
    groups: uniqueStringArray(source.groups),
  };
};

const normalizeHistoryFilters = (value) => {
  const source = value && typeof value === "object" ? value : {};
  return {
    from: typeof source.from === "string" ? source.from : "",
    to: typeof source.to === "string" ? source.to : "",
    stage: source.stage === "characters" || source.stage === "bosses" ? source.stage : "all",
  };
};

const readStoredHistory = () => {
  const cookieHistory = readCookieJson(COOKIE_KEYS.history, []);
  if (typeof window === "undefined") return cookieHistory;
  try {
    const storedHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (storedHistory === null) return cookieHistory;
    const parsed = safeJsonParse(storedHistory, cookieHistory);
    return Array.isArray(parsed) ? parsed : cookieHistory;
  } catch {
    return cookieHistory;
  }
};

const normalizeSettings = (value) => {
  const source = value && typeof value === "object" ? value : {};
  const legacySoundEnabled = typeof source.soundEnabled === "boolean" ? source.soundEnabled : null;

  const defaultUiVolume = legacySoundEnabled === false ? 0 : DEFAULT_SETTINGS.uiVolume;
  const defaultTickVolume = legacySoundEnabled === false ? 0 : DEFAULT_SETTINGS.tickVolume;

  return {
    uiVolume: clampVolume(source.uiVolume, defaultUiVolume),
    tickVolume: clampVolume(source.tickVolume, defaultTickVolume),
    splashEnabled:
      typeof source.splashEnabled === "boolean" ? source.splashEnabled : DEFAULT_SETTINGS.splashEnabled,
    splashEffects:
      typeof source.splashEffects === "boolean" ? source.splashEffects : DEFAULT_SETTINGS.splashEffects,
    rollDurationSeconds: ROLL_DURATION_OPTIONS.includes(Number(source.rollDurationSeconds))
      ? Number(source.rollDurationSeconds)
      : ({ fast: 2, normal: 2, long: 5, epic: 8 }[source.rollSpeed] || DEFAULT_SETTINGS.rollDurationSeconds),
    rollSpeed: ROLL_SPEED_OPTIONS.includes(source.rollSpeed) ? source.rollSpeed : (source.rollSpeed === "epic" ? "slow" : DEFAULT_SETTINGS.rollSpeed),
    historyLimit: clampHistoryLimit(source.historyLimit),
  };
};

const normalizeHistoryEntries = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const stage = entry.stage === "characters" || entry.stage === "bosses" ? entry.stage : "";
      const itemId = typeof entry.itemId === "string" ? entry.itemId : "";
      const timestamp = typeof entry.timestamp === "string" ? entry.timestamp : "";

      if (!stage || !itemId || !timestamp || Number.isNaN(Date.parse(timestamp))) {
        return null;
      }

      return {
        id:
          typeof entry.id === "string"
            ? entry.id
            : `${stage}-${itemId}-${Date.parse(timestamp)}-${Math.random().toString(36).slice(2, 8)}`,
        rollId: typeof entry.rollId === "string" ? entry.rollId : entry.id || `${stage}-${itemId}-${Date.parse(timestamp)}`,
        stage,
        itemId,
        itemName: typeof entry.itemName === "string" ? entry.itemName : "",
        itemNameRu: typeof entry.itemNameRu === "string" ? entry.itemNameRu : "",
        rarity: entry.rarity === 4 || entry.rarity === 5 ? entry.rarity : null,
        group: typeof entry.group === "string" ? entry.group : "",
        timestamp,
      };
    })
    .filter(Boolean);
};

const groupHistoryByRoll = (entries) => {
  const groups = new Map();
  for (const entry of entries) {
    const key = entry.rollId || entry.id;
    if (!groups.has(key)) groups.set(key, { timestamp: entry.timestamp, entries: [] });
    groups.get(key).entries.push(entry);
  }
  return [...groups.values()];
};

const trimHistoryForCookie = (entries) => {
  const next = [...entries];
  while (next.length) {
    const encoded = encodeURIComponent(JSON.stringify(next));
    if (encoded.length <= COOKIE_HISTORY_SIZE_LIMIT) {
      return next;
    }
    next.pop();
  }
  return [];
};

const matchesCharacterFilters = (item, filters, lang) => {
  if (!filters.includeSpecial && isSpecialMagentaCharacter(item)) {
    return false;
  }
  if (filters.rarities.length && !filters.rarities.includes(item.rarity)) {
    return false;
  }
  if (filters.weapons.length && !filters.weapons.includes(item.weapon)) {
    return false;
  }
  if (filters.elements.length && !filters.elements.includes(item.element)) {
    return false;
  }

  const search = filters.search.trim().toLowerCase();
  if (!search) {
    return true;
  }
  return getItemName(item, lang).toLowerCase().includes(search);
};

const matchesBossFilters = (item, filters, lang) => {
  if (filters.groups.length && !filters.groups.includes(item.group)) {
    return false;
  }

  const name = getItemName(item, lang);
  const search = filters.search.trim().toLowerCase();
  if (!search) {
    return true;
  }
  return name.toLowerCase().includes(search);
};

const loadInitialState = () => {
  const settingsCookie = readCookieJson(COOKIE_KEYS.settings, {});
  const uiCookie = readCookieJson(COOKIE_KEYS.ui, {});
  const storedCharacterFilters = normalizeCharacterFilters(readCookieJson(COOKIE_KEYS.characterFilters, DEFAULT_CHARACTER_FILTERS));
  const storedCharacterView = uiCookie.characterPoolViewMode;
  const characterFilters = {
    ...storedCharacterFilters,
    viewMode: storedCharacterView === "list" || storedCharacterView === "cards" ? storedCharacterView : DEFAULT_CHARACTER_FILTERS.viewMode,
  };
  const storedBossFilters = normalizeBossFilters(readCookieJson(COOKIE_KEYS.bossFilters, DEFAULT_BOSS_FILTERS));
  const storedBossView = uiCookie.bossPoolViewMode;
  const bossFilters = {
    ...storedBossFilters,
    viewMode: storedBossView === "list" || storedBossView === "cards" ? storedBossView : DEFAULT_BOSS_FILTERS.viewMode,
  };
  const selectedCookie = readCookieJson(COOKIE_KEYS.selectedIds, {});
  const historyFilters = normalizeHistoryFilters(
    readCookieJson(COOKIE_KEYS.historyFilters, DEFAULT_HISTORY_FILTERS)
  );

  const settings = normalizeSettings(settingsCookie);
  const history = normalizeHistoryEntries(readStoredHistory()).slice(
    0,
    settings.historyLimit
  );
  const savedSquads = normalizeSavedSquads(readCookieJson(COOKIE_KEYS.savedSquads, []));
  const savedBosses = normalizeSavedBosses(readCookieJson(COOKIE_KEYS.savedBosses, []));

  const languageMode = settingsCookie.languageMode === "manual" ? "manual" : "auto";
  const lang = languageMode === "manual" && LANGS.includes(settingsCookie.lang)
    ? settingsCookie.lang
    : getBrowserLanguage();

  return {
    lang,
    languageMode,
    theme: "dark",
    settings,
    activeSection: sectionFromPath(window.location.pathname) || (SECTION_IDS.includes(uiCookie.activeSection) ? uiCookie.activeSection : "dashboard"),
    isSidebarCollapsed: Boolean(uiCookie.isSidebarCollapsed),
    rouletteMode: ROULETTE_MODES.includes(uiCookie.rouletteMode) ? uiCookie.rouletteMode : "vertical",
    characterLaneCount: Math.max(1, Math.min(4, Number(uiCookie.characterLaneCount) || 4)),
    characterFilters,
    bossFilters,
    selectedCharacters: uniqueStringArray(selectedCookie.characters),
    selectedBosses: uniqueStringArray(selectedCookie.bosses),
    hasCharacterSelection: Array.isArray(selectedCookie.characters),
    hasBossSelection: Array.isArray(selectedCookie.bosses),
    history,
    historyFilters,
    savedSquads,
    savedBosses,
  };
};

const FilterChip = ({ label, active, onClick }) => (
  <button type="button" className={`filter-chip ${active ? "is-active" : ""}`} aria-pressed={active} onClick={onClick}>
    {label}
  </button>
);

const LoadingScreen = ({ lang, phase, progress }) => {
  const copy = PRELOADER_COPY[lang] || PRELOADER_COPY.en;
  const percent = progress.total ? Math.round((progress.completed / progress.total) * 100) : null;
  const message = phase === "images" ? copy.images : copy.data;

  return (
    <main className="teyvat-preloader" aria-live="polite" aria-busy="true">
      <div className="preloader-sky" aria-hidden="true" />
      <div className="preloader-orbit preloader-orbit-one" aria-hidden="true" />
      <div className="preloader-orbit preloader-orbit-two" aria-hidden="true" />
      <section className="preloader-card">
        <div className="preloader-emblem" aria-hidden="true"><span>✦</span></div>
        <p className="preloader-kicker">GENSHIN IMPACT · RANDOM LAB</p>
        <h1>{copy.title}</h1>
        <p className="preloader-message">{message}</p>
        <div className="preloader-progress" role="progressbar" aria-label={message} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent ?? undefined}>
          <span className={percent === null ? "is-indeterminate" : ""} style={percent === null ? undefined : { width: `${percent}%` }} />
        </div>
        {phase === "images" && progress.total > 0 ? (
          <div className="preloader-counts">
            <span>{copy.count}</span>
            <strong>{progress.completed} / {progress.total}</strong>
            {progress.failed ? <span className="preloader-failed">{copy.failed}: {progress.failed}</span> : null}
          </div>
        ) : <div className="preloader-stars" aria-hidden="true"><span>✧</span><span>✦</span><span>✧</span></div>}
      </section>
      <p className="preloader-footnote">✦　TEYVAT ADVENTURE ARCHIVE　✦</p>
    </main>
  );
};

const ItemBadge = ({ text }) => <span className="item-badge">{text}</span>;

const ImageWithFallback = ({
  src,
  fallbackSrcs = EMPTY_IMAGE_FALLBACKS,
  alt,
  className,
  loading = "lazy",
  onError,
  onLoad,
}) => {
  const sources = useMemo(() => prioritizeImageCandidates([src, ...fallbackSrcs]), [src, fallbackSrcs]);

  const [sourceIndex, setSourceIndex] = useState(0);
  const [displaySource, setDisplaySource] = useState("");

  useEffect(() => {
    setSourceIndex(0);
  }, [sources]);

  const currentSource = sources[sourceIndex] || "";

  useEffect(() => {
    let active = true;
    setDisplaySource("");
    if (currentSource) {
      getCachedImageSource(currentSource).then((source) => {
        if (active) setDisplaySource(source);
      });
    }
    return () => {
      active = false;
    };
  }, [currentSource]);

  if (!currentSource || !displaySource) {
    const initials = String(alt || "?").trim().slice(0, 1).toUpperCase() || "✦";
    return <div className={`image-fallback ${className || ""}`} role="img" aria-label={alt}>
      <span aria-hidden="true">{initials}</span>
    </div>;
  }

  return (
    <img
      src={displaySource}
      alt={alt}
      className={className}
      loading={loading}
      onLoad={onLoad}
      onError={(event) => {
        if (sourceIndex < sources.length - 1) {
          setSourceIndex((prev) => prev + 1);
          return;
        }
        setSourceIndex(sources.length);
        if (onError) {
          onError(event);
        }
      }}
    />
  );
};

const CharacterOption = ({ item, lang, selected, onToggle, viewMode, onHoverDetails }) => {
  const rarityClass = item.rarity === 5 ? "rarity-5" : "rarity-4";
  const wrapperClass = viewMode === "cards" ? "option-card" : "option-list";
  const specialClass = isSpecialMagentaCharacter(item) ? "special-magenta" : "";

  return (
    <button
      type="button"
      className={`option-item ${wrapperClass} ${rarityClass} ${specialClass} ${selected ? "is-selected" : ""}`}
      aria-pressed={selected}
      onClick={() => onToggle(item.id)}
      onMouseEnter={(event) => onHoverDetails?.(item, "characters", event)}
      onMouseMove={(event) => onHoverDetails?.(item, "characters", event)}
      onMouseLeave={() => onHoverDetails?.(null)}
      onFocus={(event) => onHoverDetails?.(item, "characters", event)}
      onBlur={() => onHoverDetails?.(null)}
    >
      <ItemImage item={item} alt={getItemName(item, lang)} loading="eager" />
      <div className="option-content">
        <p>{getItemName(item, lang)}</p>
        <div className="option-badges">
          <ItemBadge text={`${item.rarity}★`} />
          <ItemBadge text={formatWeapon(item.weapon, lang)} />
          <ItemBadge text={formatElement(item.element, lang)} />
        </div>
      </div>
      <span className="option-check">{selected ? "✓" : "○"}</span>
    </button>
  );
};

export const BossOption = ({ item, lang, selected, onToggle, viewMode, t, onHoverDetails }) => {
  const wrapperClass = viewMode === "cards" ? "option-card boss-option" : "option-list";

  return (
    <button
      type="button"
      className={`option-item ${wrapperClass} ${selected ? "is-selected" : ""}`}
      aria-pressed={selected}
      onClick={() => onToggle(item.id)}
      onMouseEnter={(event) => onHoverDetails?.(item, "bosses", event)}
      onMouseMove={(event) => onHoverDetails?.(item, "bosses", event)}
      onMouseLeave={() => onHoverDetails?.(null)}
      onFocus={(event) => onHoverDetails?.(item, "bosses", event)}
      onBlur={() => onHoverDetails?.(null)}
    >
      <ImageWithFallback
        src={item.image}
        fallbackSrcs={item.imageFallbacks}
        alt={getItemName(item, lang)}
        loading="eager"
      />
      <div className="option-content">
        <p>{getItemName(item, lang)}</p>
        <div className="option-badges">
          <ItemBadge text={formatBossType(item.group, lang)} />
        </div>
      </div>
      <span className="option-check">{selected ? "✓" : "○"}</span>
    </button>
  );
};

const ItemHoverDetail = ({ target, point, lang }) => {
  const detailRef = useRef(null);
  const [details, setDetails] = useState(null);
  const [mapFailed, setMapFailed] = useState(false);
  const [size, setSize] = useState({ width: 340, height: 320 });
  const item = target?.item;
  const isBoss = target?.kind === "bosses";
  const localBossDetails = isBoss && item ? getLocalBossDetails(item, lang) : null;
  const detailKey = item ? `${target.kind}:${item.id}` : "";
  const [visibleDetailKey, setVisibleDetailKey] = useState("");

  useEffect(() => {
    setVisibleDetailKey("");
    if (!detailKey) return undefined;
    const timer = window.setTimeout(() => setVisibleDetailKey(detailKey), 460);
    return () => window.clearTimeout(timer);
  }, [detailKey]);

  useEffect(() => {
    if (!item) return undefined;
    setDetails(null);
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetchHoverDetails(item, target.kind, lang, controller.signal)
        .then((value) => setDetails(value || {}))
        .catch(() => setDetails({}));
    }, 140);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [item?.id, target?.kind, lang]);

  useLayoutEffect(() => {
    if (!detailRef.current) return;
    const measure = () => {
      const bounds = detailRef.current?.getBoundingClientRect();
      if (bounds) setSize((previous) =>
        Math.abs(previous.width - bounds.width) < 2 && Math.abs(previous.height - bounds.height) < 2
          ? previous
          : { width: bounds.width, height: bounds.height }
      );
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (observer && detailRef.current) observer.observe(detailRef.current);
    return () => observer?.disconnect();
  }, [item?.id, details]);

  useEffect(() => setMapFailed(false), [item?.id, details?.mapImage]);

  if (!item || visibleDetailKey !== detailKey || typeof document === "undefined") return null;

  const viewportWidth = typeof window === "undefined" ? 1200 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight;
  const gap = 17;
  const margin = 12;
  const placeRight = point.x + gap + size.width <= viewportWidth - margin;
  const left = placeRight
    ? Math.min(viewportWidth - size.width - margin, point.x + gap)
    : Math.max(margin, point.x - size.width - gap);
  const top = Math.max(margin, Math.min(point.y - 42, viewportHeight - size.height - margin));
  const description = details?.description || localBossDetails?.description || item.description || "";
  const rows = isBoss
    ? [
        [getExtraLabel("detailRegion", lang), details?.region || localBossDetails?.region],
        [getExtraLabel("detailArea", lang), details?.area || localBossDetails?.area],
        [getExtraLabel("detailSubarea", lang), details?.subarea || localBossDetails?.subarea],
      ]
    : [
        [getExtraLabel("detailAffiliation", lang), details?.affiliation],
        [getExtraLabel("detailRegion", lang), details?.region],
        [getExtraLabel("detailConstellation", lang), details?.constellation],
        [getExtraLabel("detailBirthday", lang), details?.birthday],
        [getExtraLabel("detailWeapon", lang), details?.weapon || formatWeapon(item.weapon, lang)],
        [getExtraLabel("detailElement", lang), details?.element || formatElement(item.element, lang)],
      ].filter(([, value]) => value);

  return createPortal(
    <aside
      ref={detailRef}
      className={`item-hover-detail ${isBoss ? "is-boss-detail" : "is-character-detail"}`}
      role="tooltip"
      style={{ left: 0, top: 0, width: Math.min(360, viewportWidth - 24), transform: `translate3d(${left}px, ${top}px, 0)` }}
    >
      <div className="item-hover-detail-head">
        <ItemImage item={item} alt={getItemName(item, lang)} loading="eager" />
        <div>
          <strong>{getItemName(item, lang)}</strong>
          <div className="item-hover-badges">
            {item.rarity ? <ItemBadge text={`${item.rarity}★`} /> : null}
            {isBoss && item.group ? <ItemBadge text={formatBossType(item.group, lang)} /> : null}
          </div>
        </div>
      </div>

      <div className="item-hover-detail-content">
        {description ? <p className="item-hover-description">{description}</p> : <p className="item-hover-description is-muted">{getExtraLabel(details ? "detailUnavailable" : "detailLoading", lang)}</p>}
        {details?.additionalInfo || localBossDetails?.additionalInfo ? (
          <div className="item-hover-additional-info">
            <strong>{getExtraLabel("detailNotes", lang)}</strong>
            <p>{details?.additionalInfo || localBossDetails?.additionalInfo}</p>
          </div>
        ) : null}
        {rows.length ? (
          <dl className="item-hover-meta">
            {rows.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        ) : null}
        {isBoss ? (
          <div className="item-hover-map">
            <strong>{getExtraLabel("detailMap", lang)}</strong>
            {(details?.mapImage || localBossDetails?.mapImage) && !mapFailed ? (
              <img src={details?.mapImage || localBossDetails?.mapImage} alt={`${getItemName(item, lang)} — ${getExtraLabel("detailMap", lang)}`} loading="lazy" onError={() => setMapFailed(true)} />
            ) : (
              <p className="is-muted">{details ? getExtraLabel("detailMapUnavailable", lang) : getExtraLabel("detailLoading", lang)}</p>
            )}
          </div>
        ) : null}
      </div>
    </aside>,
    document.body
  );
};

const CharacterPoolPanel = ({
  t,
  lang,
  allItems,
  activeFilters,
  setActiveFilters,
  selectedIds,
  setSelectedIds,
  onBack,
  isMobileLayout,
  onHoverDetails,
}) => {
  const viewMode = isMobileLayout ? "list" : activeFilters.viewMode;
  const visibleItems = useMemo(
    () => sortCharactersNewestFirst(allItems.filter((item) => matchesCharacterFilters(item, activeFilters, lang))),
    [allItems, activeFilters, lang]
  );

  const toggleSelection = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleItems.forEach((item) => next.add(item.id));
      return next;
    });
  };

  const deselectVisible = () => {
    const visibleIds = new Set(visibleItems.map((item) => item.id));
    setSelectedIds((prev) => new Set([...prev].filter((id) => !visibleIds.has(id))));
  };

  const toggleFilterArray = (key, value) => {
    setActiveFilters((prev) => {
      const hasValue = prev[key].includes(value);
      return {
        ...prev,
        [key]: hasValue ? prev[key].filter((entry) => entry !== value) : [...prev[key], value],
      };
    });
  };

  const resetFilters = () => {
    setActiveFilters(DEFAULT_CHARACTER_FILTERS);
  };

  const weaponKeys = Object.keys(WEAPON_LABELS);
  const elementKeys = Object.keys(ELEMENT_LABELS).filter((key) => key !== "NONE");
  const activeFilterCount = Number(activeFilters.rarities.length > 0) + Number(activeFilters.weapons.length > 0) + Number(activeFilters.elements.length > 0) + Number(activeFilters.includeSpecial);

  return (
    <section className="stage-panel character-pool-panel" id="character-pool">
      <div className="filter-page-head">
        <div className="panel-head">
          <h2>{t.characterPoolMenu}</h2>
          <p>{t.characterPoolHint}</p>
        </div>
        {onBack ? (
          <button type="button" className="btn-secondary" onClick={onBack}>
            {t.goToCharacters}
          </button>
        ) : null}
      </div>

      <div className="filter-modal">
        <div className="filter-modal-head">
        </div>

        <div className="filter-toolbar">
          <label className="search-box">
            <span>{t.search}</span>
            <input
              value={activeFilters.search}
              onChange={(event) =>
                setActiveFilters((prev) => ({
                  ...prev,
                  search: event.target.value,
                }))
              }
              placeholder={t.searchCharacters}
            />
          </label>

        <details className="pool-filter-dropdown">
          <summary className="pool-filter-toggle" aria-label={getExtraLabel("poolFilters", lang)} title={getExtraLabel("poolFilters", lang)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6.2 7.2v5.1l-3.6 1.8v-6.9L4 5Z" /></svg>
            {activeFilterCount ? <span className="active-filter-count">{activeFilterCount}</span> : null}
          </summary>
          <div className="pool-filter-content">
        <div className="filter-groups">
          <div className="filter-group">
            <p>{getExtraLabel("specialCharacters", lang)}</p>
            <div className="chip-row">
              <FilterChip
                label={getExtraLabel("specialCharacters", lang)}
                active={activeFilters.includeSpecial}
                onClick={() => setActiveFilters((prev) => ({ ...prev, includeSpecial: !prev.includeSpecial }))}
              />
            </div>
          </div>

          <div className="filter-group">
            <p>{t.rarity}</p>
            <div className="chip-row">
              <FilterChip
                label={t.fiveStar}
                active={activeFilters.rarities.includes(5)}
                onClick={() => toggleFilterArray("rarities", 5)}
              />
              <FilterChip
                label={t.fourStar}
                active={activeFilters.rarities.includes(4)}
                onClick={() => toggleFilterArray("rarities", 4)}
              />
            </div>
          </div>

          <div className="filter-group">
            <p>{t.weapon}</p>
            <div className="chip-row">
              {weaponKeys.map((weaponKey) => (
                <FilterChip
                  key={weaponKey}
                  label={formatWeapon(weaponKey, lang)}
                  active={activeFilters.weapons.includes(weaponKey)}
                  onClick={() => toggleFilterArray("weapons", weaponKey)}
                />
              ))}
            </div>
          </div>

          <div className="filter-group">
            <p>{t.element}</p>
            <div className="chip-row">
              {elementKeys.map((elementKey) => (
                <FilterChip
                  key={elementKey}
                  label={formatElement(elementKey, lang)}
                  active={activeFilters.elements.includes(elementKey)}
                  onClick={() => toggleFilterArray("elements", elementKey)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="filter-actions">
          <button type="button" className="btn-secondary" onClick={resetFilters}>
            {t.resetFilters}
          </button>
        </div>
          </div>
        </details>
        </div>

        {!isMobileLayout ? (
          <div className="view-toggle pool-view-toggle">
            <span>{t.view}</span>
            <div className="toggle-row">
              <button
                type="button"
                className={viewMode === "cards" ? "is-active" : ""}
                aria-pressed={viewMode === "cards"}
                onClick={() => setActiveFilters((prev) => ({ ...prev, viewMode: "cards" }))}
              >
                {t.viewCards}
              </button>
              <button
                type="button"
                className={viewMode === "list" ? "is-active" : ""}
                aria-pressed={viewMode === "list"}
                onClick={() => setActiveFilters((prev) => ({ ...prev, viewMode: "list" }))}
              >
                {t.viewList}
              </button>
            </div>
          </div>
        ) : null}

        <div className="filter-actions pool-selection-actions">
          <button type="button" className="btn-secondary" onClick={selectVisible}>{t.selectAll}</button>
          <button type="button" className="btn-secondary" onClick={deselectVisible}>{t.deselectAll}</button>
        </div>

        <p className="filter-counter">
          {t.poolSize}: {visibleItems.filter((item) => selectedIds.has(item.id)).length} {t.fromTotal}{" "}
          {allItems.length}
        </p>

        {visibleItems.length ? (
          <div className="options-scroll">
            <div className={`options-grid ${viewMode === "list" ? "is-list" : "is-cards"}`}>
              {visibleItems.map((item) => (
                <CharacterOption
                  key={item.id}
                  item={item}
                  lang={lang}
                  selected={selectedIds.has(item.id)}
                  onToggle={toggleSelection}
                  viewMode={viewMode}
                  onHoverDetails={isMobileLayout ? undefined : onHoverDetails}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="empty-hint">{t.noItems}</p>
        )}
      </div>
    </section>
  );
};

const BossPoolPanel = ({
  t,
  lang,
  allItems,
  activeFilters,
  setActiveFilters,
  selectedIds,
  setSelectedIds,
  onBack,
  isMobileLayout,
  onHoverDetails,
}) => {
  const viewMode = isMobileLayout ? "list" : activeFilters.viewMode;
  const visibleItems = useMemo(
    () => allItems.filter((item) => matchesBossFilters(item, activeFilters, lang)),
    [allItems, activeFilters, lang]
  );

  const toggleSelection = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleFilterArray = (key, value) => {
    setActiveFilters((prev) => {
      const hasValue = prev[key].includes(value);
      return {
        ...prev,
        [key]: hasValue ? prev[key].filter((entry) => entry !== value) : [...prev[key], value],
      };
    });
  };

  const selectVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleItems.forEach((item) => next.add(item.id));
      return next;
    });
  };

  const deselectVisible = () => {
    const visibleIds = new Set(visibleItems.map((item) => item.id));
    setSelectedIds((prev) => new Set([...prev].filter((id) => !visibleIds.has(id))));
  };

  const resetFilters = () => {
    setActiveFilters(DEFAULT_BOSS_FILTERS);
  };

  const groupKeys = Object.keys(BOSS_TYPE_LABELS);
  const activeFilterCount = Number(activeFilters.groups.length > 0);

  return (
    <section className="stage-panel character-pool-panel" id="boss-pool">
      <div className="filter-page-head">
        <div className="panel-head">
          <h2>{t.bossPoolMenu}</h2>
          <p>{t.bossPoolHint}</p>
        </div>
        {onBack ? (
          <button type="button" className="btn-secondary" onClick={onBack}>
            {t.goToBosses}
          </button>
        ) : null}
      </div>

      <div className="filter-modal">
        <div className="filter-modal-head">
        </div>

        <div className="filter-toolbar">
          <label className="search-box">
            <span>{t.search}</span>
            <input
              value={activeFilters.search}
              onChange={(event) =>
                setActiveFilters((prev) => ({
                  ...prev,
                  search: event.target.value,
                }))
              }
              placeholder={t.searchBosses}
            />
          </label>

        <details className="pool-filter-dropdown">
          <summary className="pool-filter-toggle" aria-label={getExtraLabel("poolFilters", lang)} title={getExtraLabel("poolFilters", lang)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6.2 7.2v5.1l-3.6 1.8v-6.9L4 5Z" /></svg>
            {activeFilterCount ? <span className="active-filter-count">{activeFilterCount}</span> : null}
          </summary>
          <div className="pool-filter-content">
        <div className="filter-groups">
          <div className="filter-group">
            <p>{t.bossType}</p>
            <div className="chip-row">
              {groupKeys.map((groupKey) => (
                <FilterChip
                  key={groupKey}
                  label={formatBossType(groupKey, lang)}
                  active={activeFilters.groups.includes(groupKey)}
                  onClick={() => toggleFilterArray("groups", groupKey)}
                />
              ))}
            </div>
          </div>

        </div>

        <div className="filter-actions">
          <button type="button" className="btn-secondary" onClick={resetFilters}>
            {t.resetFilters}
          </button>
        </div>
          </div>
        </details>
        </div>

          {!isMobileLayout ? (
            <div className="view-toggle pool-view-toggle">
              <span>{t.view}</span>
              <div className="toggle-row">
                <button
                  type="button"
                  className={viewMode === "cards" ? "is-active" : ""}
                  aria-pressed={viewMode === "cards"}
                  onClick={() => setActiveFilters((prev) => ({ ...prev, viewMode: "cards" }))}
                >
                  {t.viewCards}
                </button>
                <button
                  type="button"
                  className={viewMode === "list" ? "is-active" : ""}
                  aria-pressed={viewMode === "list"}
                  onClick={() => setActiveFilters((prev) => ({ ...prev, viewMode: "list" }))}
                >
                  {t.viewList}
                </button>
              </div>
            </div>
          ) : null}

        <div className="filter-actions pool-selection-actions">
          <button type="button" className="btn-secondary" onClick={selectVisible}>{t.selectAll}</button>
          <button type="button" className="btn-secondary" onClick={deselectVisible}>{t.deselectAll}</button>
        </div>

        <p className="filter-counter">
          {t.poolSize}: {visibleItems.filter((item) => selectedIds.has(item.id)).length} {t.fromTotal}{" "}
          {allItems.length}
        </p>

        {visibleItems.length ? (
          <div className="options-scroll">
            <div className={`options-grid ${viewMode === "list" ? "is-list" : "is-cards"}`}>
              {visibleItems.map((item) => (
                <BossOption
                  key={item.id}
                  item={item}
                  lang={lang}
                  selected={selectedIds.has(item.id)}
                  onToggle={toggleSelection}
                  viewMode={viewMode}
                  t={t}
                  onHoverDetails={isMobileLayout ? undefined : onHoverDetails}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="empty-hint">{t.noItems}</p>
        )}
      </div>
    </section>
  );
};

const SettingsPanel = ({ t, lang, setLang, languageMode, setAutoLanguage, settings, setSettings }) => (
  <section className="stage-panel settings-panel" id="settings">
    <div className="panel-head">
      <h2>{t.settingsMenu}</h2>
      <p>{t.settingsHint}</p>
    </div>

    <div className="settings-grid">
      <article className="settings-card">
        <h3>{t.interfaceSettings}</h3>
        <div className="settings-block">
          {/* <p>{t.language}</p> */}
          <label className="select-wrap">
            <span>{t.languageSelect}</span>
            <select className="select-field" value={languageMode === "auto" ? "auto" : lang} onChange={(event) => {
              if (event.target.value === "auto") setAutoLanguage();
              else setLang(event.target.value);
            }}>
              <option value="auto">{t.languageAuto}</option>
              {LANG_OPTIONS.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <p className="settings-note">{t.languageAutoHint}</p>
        </div>
      </article>

      <article className="settings-card">
        <h3>{t.audioAndEffects}</h3>

        <div className="settings-block">
          <p>{t.uiVolume}</p>
          <label className="range-wrap">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={Math.round(settings.uiVolume * 100)}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  uiVolume: Number(event.target.value) / 100,
                }))
              }
            />
            <strong>{Math.round(settings.uiVolume * 100)}%</strong>
          </label>
        </div>

        <div className="settings-block">
          <p>{t.tickVolume}</p>
          <label className="range-wrap">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={Math.round(settings.tickVolume * 100)}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  tickVolume: Number(event.target.value) / 100,
                }))
              }
            />
            <strong>{Math.round(settings.tickVolume * 100)}%</strong>
          </label>
        </div>

        <div className="settings-block">
          <p>{getPopupToggleLabel(lang)}</p>
          <div className="toggle-row">
            <button
              type="button"
              className={settings.splashEnabled ? "is-active" : ""}
              onClick={() => setSettings((prev) => ({ ...prev, splashEnabled: true }))}
            >
              {t.on}
            </button>
            <button
              type="button"
              className={!settings.splashEnabled ? "is-active" : ""}
              onClick={() => setSettings((prev) => ({ ...prev, splashEnabled: false }))}
            >
              {t.off}
            </button>
          </div>
        </div>

        <div className="settings-block">
          <p>{getPopupEffectsLabel(lang)}</p>
          <div className="toggle-row">
            <button
              type="button"
              className={settings.splashEffects ? "is-active" : ""}
              onClick={() => setSettings((prev) => ({ ...prev, splashEffects: true }))}
            >
              {t.on}
            </button>
            <button
              type="button"
              className={!settings.splashEffects ? "is-active" : ""}
              onClick={() => setSettings((prev) => ({ ...prev, splashEffects: false }))}
            >
              {t.off}
            </button>
          </div>
        </div>
      </article>

      <article className="settings-card">
        <h3>{t.rollSettings}</h3>
        <div className="settings-block">
          <p>{getExtraLabel("rollSpeed", lang)}</p>
          <div className="toggle-row">
            {ROLL_SPEED_OPTIONS.map((speed) => (
              <button
                key={speed}
                type="button"
                className={settings.rollSpeed === speed ? "is-active" : ""}
                onClick={() => setSettings((prev) => ({ ...prev, rollSpeed: speed }))}
              >
                {getExtraLabel(`speed${speed[0].toUpperCase()}${speed.slice(1)}`, lang)}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-block">
          <p>{t.rollDuration}</p>
          <div className="toggle-row">
            {ROLL_DURATION_OPTIONS.map((seconds) => (
              <button
                key={seconds}
                type="button"
                className={settings.rollDurationSeconds === seconds ? "is-active" : ""}
                onClick={() => setSettings((prev) => ({ ...prev, rollDurationSeconds: seconds }))}
              >
                {seconds} {t.seconds}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-block">
          <p>{t.historyLimit}</p>
          <div className="toggle-row">
            {HISTORY_LIMIT_OPTIONS.map((limit) => (
              <button
                key={limit}
                type="button"
                className={settings.historyLimit === limit ? "is-active" : ""}
                onClick={() => setSettings((prev) => ({ ...prev, historyLimit: limit }))}
              >
                {limit}
              </button>
            ))}
          </div>
        </div>
      </article>
    </div>
  </section>
);

const HistoryPanel = ({
  t,
  lang,
  filteredHistory,
  historyTotal,
  historyFilters,
  setHistoryFilters,
  onDeleteOne,
  onDeleteFiltered,
  onClearAll,
  itemLookup,
  onHoverDetails,
}) => (
  <section className="stage-panel history-panel" id="history">
    <div className="panel-head">
      <h2>{t.historyMenu}</h2>
      <p>{t.historyHint}</p>
    </div>

    <div className="history-toolbar">
      <label className="search-box history-date-input">
        <span>{t.dateFrom}</span>
        <input
          type="date"
          value={historyFilters.from}
          onChange={(event) => setHistoryFilters((prev) => ({ ...prev, from: event.target.value }))}
        />
      </label>

      <label className="search-box history-date-input">
        <span>{t.dateTo}</span>
        <input
          type="date"
          value={historyFilters.to}
          onChange={(event) => setHistoryFilters((prev) => ({ ...prev, to: event.target.value }))}
        />
      </label>

      <div className="view-toggle">
        <span>{t.stageFilter}</span>
        <div className="toggle-row">
          <button
            type="button"
            className={historyFilters.stage === "all" ? "is-active" : ""}
            onClick={() => setHistoryFilters((prev) => ({ ...prev, stage: "all" }))}
          >
            {t.total}
          </button>
          <button
            type="button"
            className={historyFilters.stage === "characters" ? "is-active" : ""}
            onClick={() => setHistoryFilters((prev) => ({ ...prev, stage: "characters" }))}
          >
            {t.characters}
          </button>
          <button
            type="button"
            className={historyFilters.stage === "bosses" ? "is-active" : ""}
            onClick={() => setHistoryFilters((prev) => ({ ...prev, stage: "bosses" }))}
          >
            {t.bosses}
          </button>
        </div>
      </div>

      <button type="button" className="btn-danger history-clear-button" onClick={onClearAll} disabled={!historyTotal} aria-label={t.deleteAllHistory} title={t.deleteAllHistory}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" /></svg>
      </button>
    </div>

    <p className="filter-counter">
      {t.historyVisible}: {filteredHistory.length} {t.fromTotal} {historyTotal}
    </p>

    {filteredHistory.length ? (
      <div className="history-groups">
        {groupHistoryByRoll(filteredHistory).map((group) => (
          <section key={group.entries[0]?.rollId || group.entries[0]?.id} className="history-group">
          <p className="history-group-date">{new Date(group.timestamp).toLocaleString(getLocale(lang), { dateStyle: "medium", timeStyle: "short" })}</p>
          <div className="history-list">
        {group.entries.map((entry) => {
          const knownItem = itemLookup.get(entry.itemId);
          const preview = knownItem?.image || "";
          const displayName =
            lang === "ru" ? entry.itemNameRu || entry.itemName || entry.itemId : entry.itemName || entry.itemId;

          return (
            <article
              key={entry.id}
              className="history-item"
              onMouseEnter={(event) => knownItem && onHoverDetails?.(knownItem, entry.stage, event)}
              onMouseMove={(event) => knownItem && onHoverDetails?.(knownItem, entry.stage, event)}
              onMouseLeave={() => onHoverDetails?.(null)}
            >
              {preview ? (
                knownItem ? <ItemImage item={knownItem} alt={displayName} loading="lazy" /> : <ImageWithFallback src={preview} alt={displayName} loading="lazy" />
              ) : (
                <div className="history-fallback">?</div>
              )}

              <div className="history-main">
                <p className="history-name">{displayName}</p>
                <div className="option-badges">
                  <ItemBadge text={entry.stage === "characters" ? t.characters : t.bosses} />
                  {entry.rarity ? <ItemBadge text={`${entry.rarity}★`} /> : null}
                  {entry.group ? <ItemBadge text={formatBossType(entry.group, lang)} /> : null}
                </div>
              </div>

              <button type="button" className="btn-secondary" onClick={() => onDeleteOne(entry.id)}>
                {t.deleteOne}
              </button>
            </article>
          );
        })}
          </div>
          </section>
        ))}
      </div>
    ) : (
      <p className="empty-hint">{t.noHistoryItems}</p>
    )}
  </section>
);

const BossSplashDetails = ({ item, lang }) => {
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [mapScale, setMapScale] = useState(1);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const mapDragRef = useRef(null);
  const details = getLocalBossDetails(item, lang);
  const description = details?.description || item.description || "";
  const rows = [
    [getExtraLabel("detailRegion", lang), details?.region],
    [getExtraLabel("detailArea", lang), details?.area],
    [getExtraLabel("detailSubarea", lang), details?.subarea],
  ].filter(([, value]) => value);

  useEffect(() => {
    setMapFailed(false);
    setIsMapExpanded(false);
    setMapScale(1);
    setMapOffset({ x: 0, y: 0 });
  }, [item?.id]);

  const openMap = () => {
    setMapScale(1);
    setMapOffset({ x: 0, y: 0 });
    setIsMapExpanded(true);
  };
  const beginMapDrag = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    mapDragRef.current = { x: event.clientX, y: event.clientY };
    setIsDraggingMap(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const moveMap = (event) => {
    if (!mapDragRef.current) return;
    const dx = event.clientX - mapDragRef.current.x;
    const dy = event.clientY - mapDragRef.current.y;
    mapDragRef.current = { x: event.clientX, y: event.clientY };
    setMapOffset((previous) => ({ x: previous.x + dx, y: previous.y + dy }));
  };
  const endMapDrag = () => {
    mapDragRef.current = null;
    setIsDraggingMap(false);
  };
  const closeMap = () => {
    mapDragRef.current = null;
    setIsDraggingMap(false);
    setIsMapExpanded(false);
  };

  return (
    <>
      <div className="boss-popup-details">
        <div className="boss-popup-copy">
          {description ? <p className="boss-popup-description">{description}</p> : null}
          {details?.additionalInfo ? <p className="boss-popup-notes">{details.additionalInfo}</p> : null}
          {rows.length ? <dl className="boss-popup-location">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : null}
        </div>
        <div className="boss-popup-map">
          <strong>{getExtraLabel("detailMap", lang)}</strong>
          {details?.mapImage && !mapFailed ? (
            <button type="button" className="boss-popup-map-open" onClick={openMap} aria-label={getExtraLabel("openMap", lang)} title={getExtraLabel("openMap", lang)}>
              <img src={details.mapImage} alt={`${getItemName(item, lang)} — ${getExtraLabel("detailMap", lang)}`} onError={() => setMapFailed(true)} />
              <span>{getExtraLabel("openMap", lang)}</span>
            </button>
          ) : <p className="boss-popup-map-unavailable">{getExtraLabel("detailMapUnavailable", lang)}</p>}
        </div>
      </div>
      {isMapExpanded && details?.mapImage && typeof document !== "undefined" ? createPortal(
        <div className="boss-map-lightbox" role="dialog" aria-modal="true" aria-label={getExtraLabel("detailMap", lang)} onClick={closeMap} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeMap(); } }} tabIndex={-1}>
          <button type="button" className="boss-map-lightbox-close" onClick={closeMap} aria-label={getExtraLabel("close", lang)} autoFocus>×</button>
          <div
            className={`boss-map-image-stage ${isDraggingMap ? "is-dragging" : ""}`}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={beginMapDrag}
            onPointerMove={moveMap}
            onPointerUp={endMapDrag}
            onPointerCancel={endMapDrag}
            onWheel={(event) => { event.preventDefault(); setMapScale((scale) => Math.max(1, Math.min(4, scale + (event.deltaY < 0 ? .15 : -.15)))); }}
          >
            <img src={details.mapImage} alt={`${getItemName(item, lang)} — ${getExtraLabel("detailMap", lang)}`} draggable="false" style={{ transform: `translate3d(${mapOffset.x}px, ${mapOffset.y}px, 0) scale(${mapScale})` }} />
          </div>
          <div className="boss-map-controls" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setMapScale((scale) => Math.min(4, scale + .25))} aria-label={getExtraLabel("zoomIn", lang)} title={getExtraLabel("zoomIn", lang)} disabled={mapScale >= 4}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.6" /><path d="M16 16 21 21M10.8 7.8v6M7.8 10.8h6" /></svg>
            </button>
            <button type="button" onClick={() => setMapScale((scale) => Math.max(1, scale - .25))} aria-label={getExtraLabel("zoomOut", lang)} title={getExtraLabel("zoomOut", lang)} disabled={mapScale <= 1}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.6" /><path d="M16 16 21 21M7.8 10.8h6" /></svg>
            </button>
            <button type="button" onClick={() => { setMapScale(1); setMapOffset({ x: 0, y: 0 }); }} aria-label={getExtraLabel("resetZoom", lang)} title={getExtraLabel("resetZoom", lang)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4m0 0h5M4 4l4 4a8 8 0 1 1-2 7" /><path d="M12 8v5l3 2" /></svg>
            </button>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
};

const ResultSplashModal = ({ result, t, lang, onClose, onSaveSquad, onSaveBoss, isBossSaved, onSaveResult, onGoToHistory, onReroll, onHoverDetails, effectsEnabled }) => {
  const modalRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const [savedToHistory, setSavedToHistory] = useState(false);
  const [squadSaved, setSquadSaved] = useState(false);
  onCloseRef.current = onClose;

  useEffect(() => { setSavedToHistory(false); setSquadSaved(false); }, [result?.timestamp]);

  useEffect(() => {
    if (!result) return undefined;
    const previousFocus = document.activeElement;
    modalRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      } else if (event.key === "Tab" && modalRef.current) {
        const focusable = Array.from(modalRef.current.querySelectorAll("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [result]);

  if (!result) {
    return null;
  }

  const item = result.item;
  const squad = Array.isArray(result.squad) ? result.squad : [];
  const hasSquad = result.stage === "characters" && squad.length > 0;
  const isBossResult = result.stage === "bosses";

  return (
    <div
      className={`modal-backdrop splash-backdrop ${effectsEnabled ? "with-effects" : ""}`}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`splash-modal ${effectsEnabled ? "with-effects" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-dialog-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="splash-content">
          <p className="splash-stage">
            {hasSquad ? getTeamPopupTitle(lang) : result.stage === "characters" ? t.characters : t.bosses}
          </p>
          <h3 id="result-dialog-title">{hasSquad ? getTeamPopupSubtitle(lang) : getItemName(item, lang)}</h3>
        </div>

        {!hasSquad && !isBossResult ? <button type="button" className="splash-close-icon" onClick={onClose} aria-label={t.close} title={t.close}><span aria-hidden="true">✕</span></button> : null}

        {hasSquad ? (
          <div className="squad-grid">
            {Array.from({ length: 4 }, (_, index) => squad[index] ? (
              (() => { const member = squad[index]; return (
              <article
                key={`${member.id}-${index}`}
                className="squad-card"
                tabIndex={0}
                onMouseEnter={(event) => onHoverDetails?.(member, "characters", event)}
                onMouseMove={(event) => onHoverDetails?.(member, "characters", event)}
                onMouseLeave={() => onHoverDetails?.(null)}
                onFocus={(event) => onHoverDetails?.(member, "characters", event)}
                onBlur={() => onHoverDetails?.(null)}
              >
                <ItemImage item={member} alt={getItemName(member, lang)} loading="lazy" />
                <div className="squad-card-body">
                  <p className="squad-name">{getItemName(member, lang)}</p>
                  <div className="squad-chip-row">
                    {member.rarity ? <span className="type-chip">{member.rarity}★</span> : null}
                  </div>

                  <p className="squad-attr">
                    <span>
                      {getWeaponLabel(lang)}: {formatWeapon(member.weapon, lang)}
                    </span>
                  </p>

                  <p className="squad-attr">
                    <span>
                      {getElementLabel(lang)}: {formatElement(member.element, lang)}
                    </span>
                  </p>
                </div>
              </article>
              ); })()
            ) : (
              <button key={`next-squad-slot-${index}`} type="button" className="squad-card squad-add-slot" onClick={onReroll} aria-label={getExtraLabel("rollNext", lang)}>
                <span aria-hidden="true">+</span><strong>{getExtraLabel("rollNext", lang)}</strong>
              </button>
            ))}
          </div>
        ) : (
          <div className="squad-grid single-item">
            <article
              className={`squad-card ${isBossResult ? "boss-splash-card" : ""}`}
              tabIndex={0}
              onMouseEnter={!isBossResult ? (event) => onHoverDetails?.(item, result.stage, event) : undefined}
              onMouseMove={!isBossResult ? (event) => onHoverDetails?.(item, result.stage, event) : undefined}
              onMouseLeave={!isBossResult ? () => onHoverDetails?.(null) : undefined}
              onFocus={!isBossResult ? (event) => onHoverDetails?.(item, result.stage, event) : undefined}
              onBlur={!isBossResult ? () => onHoverDetails?.(null) : undefined}
            >
              <ItemImage item={item} alt={getItemName(item, lang)} loading="lazy" />
              <div className="squad-card-body">
                <p className="squad-name">{getItemName(item, lang)}</p>
                <div className="squad-chip-row">
                  {item.rarity ? <span className="type-chip">{item.rarity}★</span> : null}
                  {item.group ? <span className="type-chip">{formatBossType(item.group, lang)}</span> : null}
                </div>
                {isBossResult ? <BossSplashDetails item={item} lang={lang} /> : null}
              </div>
            </article>
          </div>
        )}

        {hasSquad ? <div className="splash-actions">
          {!squadSaved ? <button type="button" className="btn-primary splash-save" onClick={() => { onSaveSquad?.(squad); setSquadSaved(true); }}>{getSaveSquadLabel(lang)}</button> : <p className="splash-save-confirmation" role="status">{getExtraLabel("squadSaved", lang)}</p>}
          <button type="button" className="btn-secondary" onClick={onClose}>{t.close}</button>
        </div> : isBossResult ? <div className="splash-actions">
          {!isBossSaved ? <button type="button" className="btn-primary splash-save" onClick={() => onSaveBoss?.(item)}>{getExtraLabel("saveBoss", lang)}</button> : <p className="splash-save-confirmation" role="status">{getExtraLabel("bossSaved", lang)}</p>}
          <button type="button" className="btn-secondary" onClick={onClose}>{t.close}</button>
        </div> : (
          savedToHistory ? <div className="splash-actions"><button type="button" className="btn-primary" onClick={onGoToHistory}>{getExtraLabel("goToHistory", lang)}</button><button type="button" className="btn-secondary" onClick={onClose}>{t.close}</button></div> : <div className="splash-actions">
            <button type="button" className="btn-secondary splash-save" onClick={() => { onSaveResult?.(result); setSavedToHistory(true); }}>{getExtraLabel("saveRoll", lang)}</button>
            <button type="button" className="btn-secondary" onClick={onClose}>{t.close}</button>
            <button type="button" className="btn-primary splash-reroll" onClick={onReroll}>{t.rerollBoss}</button>
          </div>
        )}
      </div>
    </div>
  );
};

const RouletteModeIcon = ({ mode }) => {
  if (mode === "wheel") {
    return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="17" r="11" /><path d="M16 6v11l8 8M12 3h8M16 3v3" /><path d="m16 7 2.4 8.7 7-5.7" /></svg>;
  }
  if (mode === "horizontal") {
    return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 16h20M6 16l6-6m-6 6 6 6M26 16l-6-6m6 6-6 6" /></svg>;
  }
  return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 6v20m0-20-6 6m6-6 6 6m-6 14-6-6m6 6 6-6" /></svg>;
};

const wheelSlicePath = (index, count) => {
  if (count <= 1) return "M50 50m-50 0a50 50 0 1 0 100 0a50 50 0 1 0-100 0";
  const start = (index / count) * Math.PI * 2 - Math.PI / 2;
  const end = ((index + 1) / count) * Math.PI * 2 - Math.PI / 2;
  const startX = 50 + 50 * Math.cos(start);
  const startY = 50 + 50 * Math.sin(start);
  const endX = 50 + 50 * Math.cos(end);
  const endY = 50 + 50 * Math.sin(end);
  const largeArc = end - start > Math.PI ? 1 : 0;
  return `M50 50 L${startX} ${startY} A50 50 0 ${largeArc} 1 ${endX} ${endY} Z`;
};

const getWheelRarityColor = (item) => Number(item?.rarity) >= 5 ? "#c8a85f" : Number(item?.rarity) === 4 ? "#9365b5" : "#506873";

const RouletteEngine = ({
  items,
  selectedItem,
  setSelectedItem,
  mode,
  setMode,
  maxLanes = 1,
  laneCount,
  setLaneCount,
  t,
  lang,
  rollingLabel,
  rollDurationMs,
  rollSpeed = "normal",
  onRollComplete,
  onTick,
  externalRollTrigger = 0,
  externalSingleRollTrigger = 0,
  wheelResultResetTrigger = 0,
  rouletteResetTrigger = 0,
  onHoverDetails,
  detailType = "characters",
}) => {
  const [localLaneCount, setLocalLaneCount] = useState(maxLanes);
  const [isEditingLaneCount, setIsEditingLaneCount] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [spinPlan, setSpinPlan] = useState(null);
  const [lastWinners, setLastWinners] = useState([]);
  const [wheelResults, setWheelResults] = useState([]);
  const [wheelCountdown, setWheelCountdown] = useState(null);
  const [wheelPointerHitCount, setWheelPointerHitCount] = useState(0);
  const [wheelOrderIds, setWheelOrderIds] = useState([]);
  const viewportRefs = useRef([]);
  const trackRefs = useRef([]);
  const wheelRefs = useRef([]);
  const reelPositionRefs = useRef(Array.from({ length: maxLanes }, () => 0));
  const wheelRotationRefs = useRef(Array.from({ length: maxLanes }, () => 0));
  const frameRef = useRef(0);
  const sessionRef = useRef(0);
  const rollingRef = useRef(false);
  const externalTriggerRef = useRef(0);
  const externalSingleTriggerRef = useRef(0);
  const wheelResultResetRef = useRef(wheelResultResetTrigger);
  const rouletteResetRef = useRef(rouletteResetTrigger);
  const animationSessionRef = useRef(null);
  const animationStartTimeRef = useRef(null);
  const animationPreparedSessionRef = useRef(null);
  const lastTickRefs = useRef(Array.from({ length: maxLanes }, () => null));
  const completedWheelStepRef = useRef(-1);
  const lastWheelTickRef = useRef(null);

  const uniqueItems = useMemo(() => {
    const seen = new Set();
    return items.filter((item) => {
      if (!item?.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [items]);

  const wheelItems = useMemo(() => {
    const itemsById = new Map(uniqueItems.map((item) => [item.id, item]));
    const ordered = wheelOrderIds.map((id) => itemsById.get(id)).filter(Boolean);
    const included = new Set(ordered.map((item) => item.id));
    return [...ordered, ...uniqueItems.filter((item) => !included.has(item.id))];
  }, [uniqueItems, wheelOrderIds]);

  const activeLaneCount = laneCount ?? localLaneCount;
  const updateLaneCount = setLaneCount ?? setLocalLaneCount;
  const safeLaneCount = Math.max(1, Math.min(maxLanes, activeLaneCount));
  const canRoll = uniqueItems.length >= safeLaneCount;
  const vertical = mode === "vertical";
  const cardWidth = vertical ? 152 : 144;
  const cardHeight = vertical ? 204 : 190;
  const gap = 10;
  const rollSpeedRatio = ({ slow: 0.65, normal: 1, fast: 1.45, veryFast: 1.9 })[rollSpeed] || 1;
  const unit = (vertical ? cardHeight : cardWidth) + gap;
  const idleItemsByLane = useMemo(() => Array.from({ length: safeLaneCount }, () => {
    if (!uniqueItems.length) return [];
    const ordered = shuffleArray(uniqueItems);
    // Keep several complete cycles in the track so small pools fill the reel
    // on both sides of the pointer throughout the idle loop.
    const trackLength = Math.max(36, ordered.length * 4);
    return Array.from({ length: trackLength }, (_, index) => ordered[index % ordered.length]);
  }), [safeLaneCount, uniqueItems]);
  const winnerById = useMemo(() => new Map(lastWinners.filter(Boolean).map((winner) => [winner.id, winner])), [lastWinners]);

  const setTrackPosition = useCallback((index, value) => {
    reelPositionRefs.current[index] = value;
    const track = trackRefs.current[index];
    if (!track) return;
    track.style.transform = vertical ? `translate3d(0, ${value}px, 0)` : `translate3d(${value}px, 0, 0)`;
  }, [vertical]);

  const setWheelRotation = useCallback((index, value) => {
    wheelRotationRefs.current[index] = value;
    const wheel = wheelRefs.current[index];
    if (wheel) wheel.style.transform = `rotate(${value}deg)`;
  }, []);

  const showWheelItem = useCallback((item, event) => {
    onHoverDetails?.(item, detailType, event);
  }, [detailType, onHoverDetails]);

  useEffect(() => {
    updateLaneCount((current) => Math.max(1, Math.min(maxLanes, current)));
    reelPositionRefs.current = Array.from({ length: maxLanes }, (_, index) => reelPositionRefs.current[index] || 0);
    wheelRotationRefs.current = Array.from({ length: maxLanes }, (_, index) => wheelRotationRefs.current[index] || 0);
  }, [maxLanes, updateLaneCount]);

  useEffect(() => {
    if (isRolling || mode === "wheel" || !uniqueItems.length) return undefined;
    let lastTime = 0;
    const cycleDistance = uniqueItems.length * unit;
    const idleSpeed = mode === "vertical" ? 8 : 9;
    const laneStarts = Array.from({ length: safeLaneCount }, (_, laneIndex) => {
      const viewportWidth = viewportRefs.current[laneIndex]?.clientWidth || 0;
      if (mode !== "horizontal") return 0;
      const centerIndex = Math.floor((idleItemsByLane[laneIndex]?.length || 0) / 2);
      return viewportWidth / 2 - cardWidth / 2 - centerIndex * unit;
    });
    for (let laneIndex = 0; laneIndex < safeLaneCount; laneIndex += 1) {
      const start = laneStarts[laneIndex];
      reelPositionRefs.current[laneIndex] = start;
      setTrackPosition(laneIndex, start);
    }
    const animate = (now) => {
      if (!lastTime) lastTime = now;
      const delta = Math.min(40, now - lastTime);
      lastTime = now;
      for (let laneIndex = 0; laneIndex < safeLaneCount; laneIndex += 1) {
        let next = reelPositionRefs.current[laneIndex] - (delta / 1000) * idleSpeed;
        if (next <= laneStarts[laneIndex] - cycleDistance) next += cycleDistance;
        setTrackPosition(laneIndex, next);
      }
      frameRef.current = window.requestAnimationFrame(animate);
    };
    frameRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };
  }, [idleItemsByLane, isRolling, mode, safeLaneCount, setTrackPosition, uniqueItems.length, unit]);

  useEffect(() => {
    if (isRolling || mode !== "wheel" || !uniqueItems.length) return undefined;
    let lastTime = 0;
    const animate = (now) => {
      if (!lastTime) lastTime = now;
      const delta = Math.min(40, now - lastTime);
      lastTime = now;
      for (let laneIndex = 0; laneIndex < safeLaneCount; laneIndex += 1) {
        setWheelRotation(laneIndex, (wheelRotationRefs.current[laneIndex] + delta * 0.0035) % 360);
      }
      frameRef.current = window.requestAnimationFrame(animate);
    };
    frameRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };
  }, [isRolling, mode, safeLaneCount, setWheelRotation, uniqueItems.length]);

  const shuffleWheel = useCallback(() => {
    if (rollingRef.current || wheelItems.length < 2) return;
    const shuffled = shuffleArray(wheelItems);
    if (shuffled.every((item, index) => item.id === wheelItems[index].id)) shuffled.unshift(shuffled.pop());
    setWheelOrderIds(shuffled.map((item) => item.id));
    onHoverDetails?.(null);
  }, [onHoverDetails, wheelItems]);

  const roll = useCallback((requestedCount = safeLaneCount) => {
    if (!canRoll || rollingRef.current) return;
    const winners = pickUniqueWinners(uniqueItems, Math.min(safeLaneCount, requestedCount));
    if (!winners.length) return;

    const id = sessionRef.current + 1;
    sessionRef.current = id;
    animationSessionRef.current = id;
    animationStartTimeRef.current = null;
    animationPreparedSessionRef.current = null;
    rollingRef.current = true;
    setIsRolling(true);
    setSelectedItem(null);
    setLastWinners([]);
    if (mode === "wheel") setWheelResults([]);
    setWheelCountdown(null);
    onHoverDetails?.(null);
    completedWheelStepRef.current = -1;
    const durationPerStep = rollDurationMs;
    if (mode === "wheel") {
      setWheelCountdown(3);
      let rotation = wheelRotationRefs.current[0] || 0;
      lastWheelTickRef.current = Math.floor(rotation / (360 / wheelItems.length) + 0.5);
      setWheelPointerHitCount(0);
      const steps = winners.map((winner) => {
        const segmentIndex = wheelItems.findIndex((item) => item.id === winner.id);
        const fromRotation = rotation;
        const turns = ({ slow: 5, normal: 8, fast: 11, veryFast: 14 })[rollSpeed] || 8;
        rotation = getWheelTargetRotation(segmentIndex, wheelItems.length, rotation, turns);
        return { winner, segmentIndex, fromRotation, toRotation: rotation };
      });
      setSpinPlan({ id, mode, steps, durationPerStep: Math.max(durationPerStep, 3000), accelerationDuration: 1500, decelerationDuration: 7500, countdownDuration: 1000, stepGap: 0 });
      return;
    }
    const lanes = winners.map((winner, index) => {
      const cards = buildRollSequence(uniqueItems, winner);
      const viewport = viewportRefs.current[index];
      const viewportSize = (vertical ? viewport?.clientHeight : viewport?.clientWidth) || (vertical ? 430 : 760);
      const finalIndex = ROULETTE_WINNER_INDEX;
      const travelCards = Math.round(getRollTravelCardCount(durationPerStep, ROLL_ACCELERATION_MS, ROLL_DECELERATION_MS, ROULETTE_TRAVEL_CARDS) * rollSpeedRatio);
      const fromIndex = finalIndex - travelCards;
      return {
        index,
        winner,
        cards,
        fromIndex,
        finalIndex,
        fromPosition: getCenteredReelPosition(fromIndex, viewportSize, vertical ? cardHeight : cardWidth, gap),
        toPosition: getCenteredReelPosition(finalIndex, viewportSize, vertical ? cardHeight : cardWidth, gap),
        delay: index * 2000,
      };
    });
    const plan = { id, mode, lanes, durationPerStep, accelerationDuration: ROLL_ACCELERATION_MS, decelerationDuration: ROLL_DECELERATION_MS };
    setSpinPlan(plan);
  }, [canRoll, cardHeight, gap, mode, onHoverDetails, rollDurationMs, rollSpeed, rollSpeedRatio, safeLaneCount, setSelectedItem, uniqueItems, wheelItems]);

  const rollSingle = useCallback(() => roll(1), [roll]);

  useEffect(() => {
    if (!spinPlan) return undefined;
    if (animationSessionRef.current !== spinPlan.id) {
      animationSessionRef.current = spinPlan.id;
      animationStartTimeRef.current = null;
    }
    let alive = true;
    let frame = 0;
    frame = window.requestAnimationFrame((firstFrameTime) => {
      if (!alive || spinPlan.id !== sessionRef.current) return;
      if (animationStartTimeRef.current === null) animationStartTimeRef.current = firstFrameTime;
      const startTime = animationStartTimeRef.current;
      if (spinPlan.mode === "wheel") {
        const firstStep = spinPlan.steps[0];
        if (animationPreparedSessionRef.current !== spinPlan.id) {
          setWheelRotation(0, firstStep?.fromRotation || 0);
          animationPreparedSessionRef.current = spinPlan.id;
        }
        const movementDuration = spinPlan.accelerationDuration + spinPlan.durationPerStep + spinPlan.decelerationDuration;
        const stepStride = movementDuration + spinPlan.countdownDuration + spinPlan.stepGap;
        const totalDuration = spinPlan.steps.length * (movementDuration + spinPlan.countdownDuration) + Math.max(0, spinPlan.steps.length - 1) * spinPlan.stepGap;
        const animateWheel = (now) => {
          if (!alive || spinPlan.id !== sessionRef.current) return;
          const elapsed = Math.max(0, now - startTime);
          const stepIndex = Math.min(spinPlan.steps.length - 1, Math.floor(elapsed / stepStride));
          const step = spinPlan.steps[stepIndex];
          for (let completed = completedWheelStepRef.current + 1; completed < stepIndex; completed += 1) {
            setWheelResults((current) => [...current.slice(0, completed), spinPlan.steps[completed].winner]);
            completedWheelStepRef.current = completed;
          }
          const stepElapsed = elapsed - stepIndex * stepStride;
          const countdownRemaining = Math.max(0, Math.ceil((spinPlan.countdownDuration - stepElapsed) / 1000));
          setWheelCountdown(countdownRemaining || null);
          const progress = getRollProgress(stepElapsed - spinPlan.countdownDuration, spinPlan.durationPerStep, spinPlan.accelerationDuration, spinPlan.decelerationDuration);
          const rotation = step.fromRotation + (step.toRotation - step.fromRotation) * progress;
          setWheelRotation(0, rotation);
          const wheelTick = Math.floor(rotation / (360 / wheelItems.length) + 0.5);
          if (lastWheelTickRef.current !== wheelTick) {
            lastWheelTickRef.current = wheelTick;
            setWheelPointerHitCount((count) => count + 1);
            onTick?.();
          }
          if (progress >= 1 && completedWheelStepRef.current < stepIndex) {
            setWheelResults((current) => [...current.slice(0, stepIndex), step.winner]);
            completedWheelStepRef.current = stepIndex;
          }
          if (elapsed >= totalDuration) {
            const winners = spinPlan.steps.map((entry) => entry.winner);
            setWheelResults([]);
            setWheelCountdown(null);
            setWheelRotation(0, spinPlan.steps.at(-1)?.toRotation || 0);
            rollingRef.current = false;
            setIsRolling(false);
            setSpinPlan(null);
            animationSessionRef.current = null;
            animationStartTimeRef.current = null;
            animationPreparedSessionRef.current = null;
            setLastWinners(winners);
            setSelectedItem(winners[0]);
            onRollComplete?.(maxLanes > 1 ? winners : winners[0]);
            return;
          }
          frame = window.requestAnimationFrame(animateWheel);
        };
        frame = window.requestAnimationFrame(animateWheel);
        return;
      }
      if (animationPreparedSessionRef.current !== spinPlan.id) {
        spinPlan.lanes.forEach((lane) => {
          setTrackPosition(lane.index, lane.fromPosition);
          lastTickRefs.current[lane.index] = lane.fromIndex ?? null;
        });
        animationPreparedSessionRef.current = spinPlan.id;
      }

      const animate = (now) => {
        if (!alive || spinPlan.id !== sessionRef.current) return;
        let allDone = true;
        spinPlan.lanes.forEach((lane) => {
          const elapsed = now - startTime - lane.delay;
          if (elapsed < 0) {
            allDone = false;
            return;
          }
          const progress = getRollProgress(elapsed, spinPlan.durationPerStep, spinPlan.accelerationDuration, spinPlan.decelerationDuration);
          const position = lane.fromPosition + (lane.toPosition - lane.fromPosition) * progress;
          setTrackPosition(lane.index, position);
          const viewportSize = (spinPlan.mode === "vertical" ? viewportRefs.current[lane.index]?.clientHeight : viewportRefs.current[lane.index]?.clientWidth) || 430;
          const size = spinPlan.mode === "vertical" ? cardHeight : cardWidth;
          const tickIndex = Math.floor((viewportSize / 2 - position - size / 2) / (size + gap));
          if (tickIndex !== lastTickRefs.current[lane.index]) {
            lastTickRefs.current[lane.index] = tickIndex;
            onTick?.();
          }
          if (progress < 1) allDone = false;
        });

        if (allDone) {
          const winners = spinPlan.lanes.map((lane) => lane.winner);
          rollingRef.current = false;
          setIsRolling(false);
          setSpinPlan(null);
          animationSessionRef.current = null;
          animationStartTimeRef.current = null;
          animationPreparedSessionRef.current = null;
          setLastWinners(winners);
          for (const lane of spinPlan.lanes) setTrackPosition(lane.index, 0);
          setSelectedItem(winners[0]);
          onRollComplete?.(maxLanes > 1 ? winners : winners[0]);
          return;
        }
        frame = window.requestAnimationFrame(animate);
      };
      frame = window.requestAnimationFrame(animate);
    });
    return () => {
      alive = false;
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [cardHeight, gap, maxLanes, onRollComplete, onTick, setSelectedItem, setTrackPosition, setWheelRotation, spinPlan]);

  const stopRoll = useCallback(() => {
    if (!rollingRef.current) return;
    rollingRef.current = false;
    sessionRef.current += 1;
    animationSessionRef.current = null;
    animationStartTimeRef.current = null;
    animationPreparedSessionRef.current = null;
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    setSpinPlan(null);
    setIsRolling(false);
    setWheelCountdown(null);
    setSelectedItem(null);
  }, [setSelectedItem]);

  useEffect(() => {
    if (externalRollTrigger === externalTriggerRef.current) return;
    externalTriggerRef.current = externalRollTrigger;
    roll();
  }, [externalRollTrigger, roll]);

  useEffect(() => {
    if (externalSingleRollTrigger === externalSingleTriggerRef.current) return;
    externalSingleTriggerRef.current = externalSingleRollTrigger;
    rollSingle();
  }, [externalSingleRollTrigger, rollSingle]);

  useEffect(() => {
    if (wheelResultResetTrigger === wheelResultResetRef.current) return;
    wheelResultResetRef.current = wheelResultResetTrigger;
    setWheelResults([]);
    setLastWinners([]);
    setWheelPointerHitCount(0);
  }, [wheelResultResetTrigger]);

  useEffect(() => {
    if (rouletteResetTrigger === rouletteResetRef.current) return;
    rouletteResetRef.current = rouletteResetTrigger;
    const wasRolling = rollingRef.current;
    rollingRef.current = false;
    sessionRef.current += 1;
    animationSessionRef.current = null;
    animationStartTimeRef.current = null;
    animationPreparedSessionRef.current = null;
    completedWheelStepRef.current = -1;
    if (wasRolling && frameRef.current) window.cancelAnimationFrame(frameRef.current);
    if (wasRolling) frameRef.current = 0;
    setSpinPlan(null);
    setIsRolling(false);
    setIsEditingLaneCount(false);
    setWheelCountdown(null);
    setWheelResults([]);
    setLastWinners([]);
    setSelectedItem(null);
    for (let index = 0; index < maxLanes; index += 1) {
      setTrackPosition(index, 0);
      setWheelRotation(index, 0);
    }
  }, [maxLanes, rouletteResetTrigger, setSelectedItem, setTrackPosition, setWheelRotation]);

  useEffect(() => () => {
    rollingRef.current = false;
    sessionRef.current += 1;
    animationSessionRef.current = null;
    animationStartTimeRef.current = null;
    animationPreparedSessionRef.current = null;
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
  }, []);

  const modeLabels = {
    vertical: getExtraLabel("rouletteVertical", lang),
    horizontal: getExtraLabel("rouletteHorizontal", lang),
    wheel: getExtraLabel("rouletteWheel", lang),
  };

  return (
    <div className={`roulette-block roulette-engine roulette-mode-${mode}`}>
      <div className="roulette-shell">
        <div className="roulette-toolbar">
          <span className="roulette-mode-caption">{maxLanes === 1 ? modeLabels[mode] : ""}</span>
          {mode === "wheel" ? (
            <button type="button" className="roulette-refresh-button" onClick={shuffleWheel} disabled={isRolling || wheelItems.length < 2} aria-label={getExtraLabel("shuffleWheel", lang)} title={getExtraLabel("shuffleWheel", lang)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.8-2L20 12M4 12l2.6 5a7 7 0 0 0 11.8-2" /></svg>
            </button>
          ) : null}
          {maxLanes > 1 ? (
            <button type="button" className={`roulette-edit-toggle ${isEditingLaneCount ? "is-active" : ""}`} onClick={() => setIsEditingLaneCount((value) => !value)} disabled={isRolling} aria-label={getExtraLabel("editRoulette", lang)} aria-pressed={isEditingLaneCount}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5M4 20l4.2-1 10.2-10.2a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" /></svg>
            </button>
          ) : null}
          {mode === "wheel" && maxLanes > 1 && isEditingLaneCount ? (
            <div className="wheel-count-controls" role="group" aria-label={getExtraLabel("spinCount", lang)}>
              <button type="button" onClick={() => updateLaneCount((count) => Math.max(1, count - 1))} disabled={safeLaneCount <= 1 || isRolling} aria-label="−">−</button>
              <button type="button" onClick={() => updateLaneCount((count) => Math.min(maxLanes, count + 1))} disabled={safeLaneCount >= maxLanes || isRolling} aria-label="+">+</button>
            </div>
          ) : null}
        </div>

        <div className={`roulette-engine-grid ${mode === "wheel" ? "is-wheel" : "is-reels"} ${mode === "horizontal" ? "is-cases" : ""}`} style={{ "--roulette-lanes": safeLaneCount }}>
          {mode === "wheel" ? (
            <div className="wheel-layout">
              <div className="wheel-main">
                <div className="wheel-viewport" ref={(node) => (viewportRefs.current[0] = node)}>
                  <div key={wheelPointerHitCount} className={`wheel-pointer ${isRolling ? "is-rolling" : ""} ${wheelPointerHitCount ? "is-hitting" : ""}`} aria-hidden="true">
                    <span className="wheel-pointer-pin" />
                  </div>
                    <div className="wheel-disc" ref={(node) => (wheelRefs.current[0] = node)} style={{ transform: `rotate(${wheelRotationRefs.current[0] || 0}deg)` }}>
                    <div className="wheel-rim" />
                    <svg className="wheel-segments" viewBox="0 0 100 100" aria-label={getExtraLabel("rouletteWheel", lang)}>
                      <defs>
                        <pattern id="wheel-sector-pattern" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                          <path d="M0 0V12" fill="none" stroke="#fff0c5" strokeOpacity=".17" strokeWidth=".65" />
                          <path d="M6 4.35 6.48 5.52 7.65 6 6.48 6.48 6 7.65 5.52 6.48 4.35 6 5.52 5.52Z" fill="#fff4d2" fillOpacity=".42" />
                        </pattern>
                      </defs>
                      {wheelItems.map((item, index) => {
                        const angle = ((index + .5) / wheelItems.length) * 360 - 90;
                        const angleRadians = (angle * Math.PI) / 180;
                        const arcWidth = (2 * Math.PI * 36) / wheelItems.length;
                        const imageSize = Math.min(8, arcWidth * .72);
                        const imageRadius = 36;
                        const imageX = 50 + imageRadius * Math.cos(angleRadians) - imageSize / 2;
                        const imageY = 50 + imageRadius * Math.sin(angleRadians) - imageSize / 2;
                        const markerRadius = 47;
                        const markerX = 50 + markerRadius * Math.cos(angleRadians);
                        const markerY = 50 + markerRadius * Math.sin(angleRadians);
                        return (
                          <g
                            key={item.id}
                            aria-hidden="true"
                            onMouseEnter={(event) => showWheelItem(item, event)}
                            onMouseMove={(event) => showWheelItem(item, event)}
                            onMouseLeave={() => onHoverDetails?.(null)}
                          >
                            <path d={wheelSlicePath(index, wheelItems.length)} fill={detailType === "bosses" ? (index % 2 === 0 ? "#c8a85f" : "#9365b5") : getWheelRarityColor(item)} />
                            <path d={wheelSlicePath(index, wheelItems.length)} fill="url(#wheel-sector-pattern)" stroke="none" pointerEvents="none" />
                            {item.image && arcWidth >= 1.6 ? <image href={item.image} x={imageX} y={imageY} width={imageSize} height={imageSize} transform={`rotate(${angle + 90} ${imageX + imageSize / 2} ${imageY + imageSize / 2})`} preserveAspectRatio="xMidYMid slice" /> : null}
                            <circle className="wheel-sector-marker" cx={markerX} cy={markerY} r={wheelItems.length > 72 ? 0.75 : 1.05} />
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                  <div className="wheel-center" aria-hidden="true"><span>✦</span></div>
                  {wheelCountdown !== null ? <div className="wheel-countdown" aria-live="polite">{wheelCountdown}</div> : null}
                </div>
              </div>
              <aside className="wheel-results" aria-label={getExtraLabel("wheelResults", lang)}>
                <h3>{getExtraLabel("wheelResults", lang)}</h3>
                {Array.from({ length: safeLaneCount }, (_, index) => {
                  const result = wheelResults[index];
                  return (
                    <div
                      key={`wheel-result-${index}`}
                      className={`wheel-result-slot ${result ? "has-result" : ""} ${isRolling && index === wheelResults.length ? "is-current" : ""}`}
                      onMouseEnter={(event) => result && showWheelItem(result, event)}
                      onMouseMove={(event) => result && showWheelItem(result, event)}
                      onMouseLeave={() => onHoverDetails?.(null)}
                    >
                      {result ? <ItemImage item={result} alt="" loading="eager" /> : <span className="wheel-result-index" aria-hidden="true">✦</span>}
                      <div>{result ? <><strong>{getItemName(result, lang)}</strong><p>{result.description || `${ELEMENT_LABELS[result.element]?.[lang] || ""}${result.rarity ? ` · ${result.rarity}★` : ""}`}</p></> : null}</div>
                    </div>
                  );
                })}
              </aside>
            </div>
          ) : (
            <div className={`reel-lanes ${mode === "horizontal" ? "is-cases" : "is-vertical"}`}>
              {Array.from({ length: safeLaneCount }, (_, laneIndex) => {
                const spinLane = spinPlan?.lanes.find((lane) => lane.index === laneIndex);
                const displayItems = spinLane?.cards || idleItemsByLane[laneIndex] || [];
                const winner = winnerById.get(spinLane?.winner?.id) || winnerById.get(lastWinners[laneIndex]?.id);
                return (
                  <div key={`roulette-engine-lane-${laneIndex}`} className={`roulette-engine-lane ${isRolling ? "is-spinning" : ""}`}>
                    {isEditingLaneCount && maxLanes > 1 ? <button type="button" className="lane-remove-button" onClick={() => updateLaneCount((count) => Math.max(1, count - 1))} disabled={isRolling || safeLaneCount <= 1} aria-label={getExtraLabel("removeRoulette", lang)}>×</button> : null}
                    <div className={`reel-viewport ${mode === "horizontal" ? "is-horizontal" : "is-vertical"}`} ref={(node) => (viewportRefs.current[laneIndex] = node)}>
                      <div className="reel-pointer" aria-hidden="true" />
                      <div className={`reel-track ${mode === "horizontal" ? "is-horizontal" : "is-vertical"}`} ref={(node) => (trackRefs.current[laneIndex] = node)} style={{ gap: `${gap}px`, transform: vertical ? `translate3d(0, ${reelPositionRefs.current[laneIndex] || 0}px, 0)` : `translate3d(${reelPositionRefs.current[laneIndex] || 0}px, 0, 0)` }}>
                        {displayItems.map((item, index) => (
                          <article key={`${item.id}-${laneIndex}-${index}`} className={`roulette-card ${item.rarity === 5 ? "rarity-5" : item.rarity === 4 ? "rarity-4" : ""} ${isSpecialMagentaCharacter(item) ? "special-magenta" : ""}`} style={{ width: cardWidth, height: cardHeight }}>
                            <ItemImage item={item} alt={getItemName(item, lang)} loading="eager" />
                            <div className="roulette-card-overlay" />
                            <div className="roulette-card-meta"><p>{getItemName(item, lang)}</p></div>
                          </article>
                        ))}
                      </div>
                    </div>
                    {winner ? <p className="roulette-winner-label">{getItemName(winner, lang)}</p> : null}
                  </div>
                );
              })}
              {isEditingLaneCount && safeLaneCount < maxLanes ? <button type="button" className="lane-add-button" onClick={() => updateLaneCount((count) => Math.min(maxLanes, count + 1))} disabled={isRolling} aria-label={getExtraLabel("addRoulette", lang)}>+</button> : null}
            </div>
          )}
        </div>
      </div>

      <div className="roulette-mode-picker" role="group" aria-label={getExtraLabel("rouletteModes", lang)}>
        {ROULETTE_MODES.map((rouletteMode) => (
          <button key={rouletteMode} type="button" className={`roulette-mode-button ${mode === rouletteMode ? "is-active" : ""}`} onClick={() => setMode(rouletteMode)} disabled={isRolling} aria-pressed={mode === rouletteMode}>
            <RouletteModeIcon mode={rouletteMode} />
            <span>{modeLabels[rouletteMode]}</span>
          </button>
        ))}
      </div>

      <div className="roulette-actions">
        <button type="button" className="btn-primary" onClick={() => roll()} disabled={!canRoll || isRolling}>{isRolling ? rollingLabel : t.letsGo}</button>
        {isRolling ? <button type="button" className="btn-secondary" onClick={stopRoll}>{getExtraLabel("stop", lang)}</button> : null}
      </div>
      {!canRoll ? <p className="roulette-hint">{getExtraLabel("needLanes", lang).replaceAll("{count}", safeLaneCount)}</p> : null}
    </div>
  );
};

const MENU_ICON_PATHS = {
  dashboard: "M3 10.5 12 3l9 7.5M5 9v11h14V9M9 20v-6h6v6",
  characters: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0",
  characterPool: "M4 4h11v14H4zM8 7h3M8 10h3M8 13h3M17 7h3v13h-9",
  bosses: "M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3ZM9 12h6M12 9v6",
  bossPool: "M12 3 20 7v5c0 4.7-3.2 7.6-8 9-4.8-1.4-8-4.3-8-9V7l8-4ZM8 13h8M9.5 10h.1M14.5 10h.1",
  history: "M4 19V5M4 19h17M8 16v-5M13 16V7M18 16V3",
  settings: "M19.14 12.94c.04-.31.06-.62.06-.94s-.02-.63-.07-.94l2.03-1.58-2-3.46-2.39.96a7.02 7.02 0 0 0-1.63-.94L14.78 3h-4l-.36 3.04c-.59.23-1.14.55-1.63.94L6.4 6.02l-2 3.46 2.03 1.58a6.6 6.6 0 0 0 0 1.88L4.4 14.52l2 3.46 2.39-.96c.49.39 1.04.71 1.63.94L10.78 21h4l.36-3.04c.59-.23 1.14-.55 1.63-.94l2.39.96 2-3.46-2.02-1.58ZM12.78 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z",
  donate: "M12 3v18M17 7.5c0-1.4-2.2-2.5-5-2.5S7 6.1 7 7.5 9.2 10 12 10s5 1.1 5 2.5-2.2 2.5-5 2.5-5 1.1-5 2.5S9.2 20 12 20s5-1.1 5-2.5",
};

const MenuIcon = ({ name }) => name === "donate" ? <span className="donate-icon-dollar" aria-hidden="true">$</span> : name === "support" ? (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0m4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2" />
    <path d="m2.165 15.803.02-.004c1.83-.363 2.948-.842 3.468-1.105A9 9 0 0 0 8 15c4.418 0 8-3.134 8-7s-3.582-7-8-7-8 3.134-8 7c0 1.76.743 3.37 1.97 4.6a10.4 10.4 0 0 1-.524 2.318l-.003.011a11 11 0 0 1-.244.637c-.079.186.074.394.273.362a22 22 0 0 0 .693-.125m.8-3.108a1 1 0 0 0-.287-.801C1.618 10.83 1 9.468 1 8c0-3.192 3.004-6 7-6s7 2.808 7 6-3.004 6-7 6a8 8 0 0 1-2.088-.272 1 1 0 0 0-.711.074c-.387.196-1.24.57-2.634.893a11 11 0 0 0 .398-2" />
  </svg>
) : (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path d={MENU_ICON_PATHS[name]} stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SupportModal = ({ t, onClose }) => {
  const [topic, setTopic] = useState("suggestion");
  const [status, setStatus] = useState("");
  const [isSending, setIsSending] = useState(false);
  const openedAt = useRef(Date.now());

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const submit = async (event) => {
    event.preventDefault();
    if (!SUPPORT_EMAIL) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    if (isSupportHoneypotFilled(formData.get("_honey")) || Date.now() - openedAt.current < 2500 || !claimSupportSubmission()) {
      setStatus("limited");
      return;
    }
    formData.set("topic", topic === "suggestion" ? t.supportSuggestion : topic === "bug" ? t.supportBug : t.supportOther);
    const replyTo = formData.get("email");
    if (replyTo) formData.set("_replyto", replyTo);
    setIsSending(true);
    setStatus("");
    try {
      const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(SUPPORT_EMAIL)}`, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || result.success === false) throw new Error("Form submission failed");
      setStatus("sent");
      form.reset();
      setTopic("suggestion");
    } catch {
      setStatus("error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="modal-backdrop splash-backdrop support-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="splash-modal support-modal" role="dialog" aria-modal="true" aria-labelledby="support-title">
        <div className="support-modal-head">
          <div><span className="eyebrow">{t.supportMenu}</span><h2 id="support-title">{t.supportTitle}</h2></div>
          <button type="button" className="splash-close-icon" onClick={onClose} aria-label={t.supportClose}>×</button>
        </div>
        <p className="support-hint">{t.supportHint}</p>
        {!SUPPORT_EMAIL ? <p className="support-setup-note" role="status">{t.supportSetup}</p> : null}
        <form className="support-form" onSubmit={submit}>
          <label>{t.supportTopic}
            <select value={topic} onChange={(event) => setTopic(event.target.value)}>
              <option value="suggestion">{t.supportSuggestion}</option>
              <option value="bug">{t.supportBug}</option>
              <option value="other">{t.supportOther}</option>
            </select>
          </label>
          <div className="support-form-row">
            <label>{t.supportName}<input name="name" autoComplete="name" maxLength={100} /></label>
            <label>{t.supportEmail}<input name="email" type="email" autoComplete="email" maxLength={200} /></label>
          </div>
          <label>{t.supportMessage}<textarea name="message" required minLength={8} maxLength={4000} rows={5} /></label>
          <input type="text" name="_honey" className="support-honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <input type="hidden" name="_subject" value="Genshin Impact Random Lab — feedback" />
          {status ? <p className={`support-status ${status}`} role="status">{status === "sent" ? t.supportSent : status === "limited" ? t.supportRateLimited : t.supportError}</p> : null}
          <div className="support-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>{t.supportClose}</button>
            <button type="submit" className="btn-primary" disabled={!SUPPORT_EMAIL || isSending}>{isSending ? t.supportSending : t.supportSend}</button>
          </div>
        </form>
      </section>
    </div>
  );
};

const DonationPage = ({ t }) => (
  <section className="stage-panel donation-panel" id="donate">
    <div className="panel-head">
      <h2>{t.donateTitle}</h2>
      <p>{t.donateHint}</p>
    </div>
    <p className="donation-country-note" role="note">{t.donateCountryLimit}</p>
    <div className="donation-services donation-services-crypto">
      {[
        { name: "NOWPayments", description: t.donateNowpayments, methods: ["BTC", "ETH", "USDT", t.donateManyCoins], href: NOWPAYMENTS_URL, configured: Boolean(NOWPAYMENTS_URL), openLabel: t.donateOpenNowpayments, createLabel: t.donateOpenNowpayments, terms: "https://nowpayments.io/donation-tools" },
      ].map((service) => (
        <article className="donation-card" key={service.name}>
          <div className="donation-card-heading">
            <span className="donation-emblem" aria-hidden="true">✦</span>
            <h3>{service.name}</h3>
          </div>
          <p>{service.description}</p>
          <div className="donation-methods" aria-label={t.donateMethods}>
            <span className="donation-methods-label">{t.donateMethods}</span>
            <ul>{service.methods.map((method) => <li key={method}>{method}</li>)}</ul>
          </div>
          <div className="donation-card-footer">
            <a className="donation-terms" href={service.terms} target="_blank" rel="noreferrer">{t.donateTerms}<span aria-hidden="true">↗</span></a>
          <a className="btn-primary donation-link" href={service.href} target="_blank" rel="noreferrer">{service.configured ? service.openLabel : service.createLabel}<span aria-hidden="true">↗</span></a>
          </div>
        </article>
      ))}
    </div>
  </section>
);

function App() {
  const bootRef = useRef(null);
  if (!bootRef.current) {
    bootRef.current = loadInitialState();
  }
  const boot = bootRef.current;

  const [lang, setLang] = useState(boot.lang);
  const [theme] = useState("dark");
  const [languageMode, setLanguageMode] = useState(boot.languageMode || "auto");
  const languageModeRef = useRef(languageMode);
  const [settings, setSettings] = useState(boot.settings);
  const [activeSection, setActiveSectionState] = useState(boot.activeSection);
  const setActiveSection = useCallback((sectionId) => {
    if (!SECTION_IDS.includes(sectionId)) return;
    setActiveSectionState(sectionId);
    const path = sectionPath(sectionId);
    if (window.location.pathname !== path) window.history.pushState({ sectionId }, "", path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(boot.isSidebarCollapsed);
  const [rouletteMode, setRouletteMode] = useState(boot.rouletteMode || "vertical");
  const [characterLaneCount, setCharacterLaneCount] = useState(boot.characterLaneCount || 4);
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    mediaQueryMatches("(max-width: 900px)")
  );

  useEffect(() => {
    updateSectionMetadata(activeSection, lang);
  }, [activeSection, lang]);

  useEffect(() => {
    const handlePopState = () => {
      setActiveSectionState(sectionFromPath(window.location.pathname));
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const [data, setData] = useState(() => {
    const snapshot = readCatalogSnapshot();
    return snapshot ? { ...snapshot, characters: buildTravelerDuoCharacters(applyBundledCharacterImages(snapshot.characters)) } : null;
  });
  const dataRef = useRef(data);
  const hasCatalogRef = useRef(Boolean(data));
  const [loading, setLoading] = useState(() => !data);
  const [loadingPhase, setLoadingPhase] = useState("data");
  const [loadingProgress, setLoadingProgress] = useState({ completed: 0, total: 0, failed: 0 });
  const [error, setError] = useState("");

  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [selectedBoss, setSelectedBoss] = useState(null);
  const [splashResult, setSplashResult] = useState(null);
  const [characterRerollTrigger, setCharacterRerollTrigger] = useState(0);
  const [characterSingleRollTrigger, setCharacterSingleRollTrigger] = useState(0);
  const [bossRerollTrigger, setBossRerollTrigger] = useState(0);
  const [wheelResultResetTrigger, setWheelResultResetTrigger] = useState(0);
  const [rouletteResetTrigger, setRouletteResetTrigger] = useState(0);
  const [hoverTarget, setHoverTarget] = useState(null);
  const [hoverPoint, setHoverPoint] = useState({ x: 24, y: 24 });

  const [characterFilters, setCharacterFilters] = useState(boot.characterFilters);
  const [bossFilters, setBossFilters] = useState(boot.bossFilters);
  const [historyFilters, setHistoryFilters] = useState(boot.historyFilters);

  const [selectedCharacterIds, setSelectedCharacterIds] = useState(new Set(boot.selectedCharacters));
  const [selectedBossIds, setSelectedBossIds] = useState(new Set(boot.selectedBosses));
  const [rollHistory, setRollHistory] = useState(boot.history);
  const [savedSquads, setSavedSquads] = useState(boot.savedSquads || []);
  const [savedBosses, setSavedBosses] = useState(boot.savedBosses || []);

  const hasPersistedCharacterSelectionRef = useRef(boot.hasCharacterSelection);
  const hasPersistedBossSelectionRef = useRef(boot.hasBossSelection);
  const audioContextRef = useRef(null);
  const loadControllerRef = useRef(null);
  const hoverFrameRef = useRef(0);
  const pendingHoverPointRef = useRef({ x: 24, y: 24 });
  const pendingSquadAppendRef = useRef(null);

  const t = translations[lang] || translations.en;
  const handleHoverDetails = useCallback((item, kind, event) => {
    if (!item) {
      setHoverTarget(null);
      return;
    }
    setHoverTarget((previous) => previous?.kind === kind && previous.item.id === item.id ? previous : { item, kind });
    let x = Number(event?.clientX);
    let y = Number(event?.clientY);
    if ((!x && !y) && event?.currentTarget?.getBoundingClientRect) {
      const bounds = event.currentTarget.getBoundingClientRect();
      x = bounds.left + bounds.width / 2;
      y = bounds.top + Math.min(40, bounds.height / 2);
    }
    pendingHoverPointRef.current = { x: Number.isFinite(x) ? x : 24, y: Number.isFinite(y) ? y : 24 };
    if (!hoverFrameRef.current && typeof window !== "undefined") {
      hoverFrameRef.current = window.requestAnimationFrame(() => {
        hoverFrameRef.current = 0;
        setHoverPoint(pendingHoverPointRef.current);
      });
    }
  }, []);
  const changeLanguage = (nextLanguage) => {
    languageModeRef.current = "manual";
    setLanguageMode("manual");
    setLang(nextLanguage);
  };
  const setAutoLanguage = () => {
    languageModeRef.current = "auto";
    setLanguageMode("auto");
    setLang(getBrowserLanguage());
  };
  const sourceCharacters = data?.meta?.source?.characters || "genshin-db";
  const sourceLegends = data?.meta?.source?.localLegends || "Fandom API";
  const rollDurationMs = settings.rollDurationSeconds * 1000;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (languageMode !== "auto") return undefined;
    let cancelled = false;
    fetchVisitorCountry().then((countryCode) => {
      if (!cancelled && languageModeRef.current === "auto") {
        setLang(getLanguageForCountry(countryCode) || getBrowserLanguage());
      }
    });
    return () => { cancelled = true; };
  }, [languageMode]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 900px)");
    const applyMatch = (matches) => {
      setIsMobileLayout(matches);
    };

    applyMatch(mediaQuery.matches);

    const handler = (event) => applyMatch(event.matches);
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }, []);

  useEffect(() => {
    if (!isMobileLayout) {
      return;
    }
    setIsSidebarCollapsed(true);
  }, [isMobileLayout]);

  useEffect(
    () => () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    },
    []
  );

  const loadData = useCallback(async () => {
    const showBlockingLoader = !hasCatalogRef.current;
    loadControllerRef.current?.abort();
    const controller = new AbortController();
    loadControllerRef.current = controller;
    try {
      if (showBlockingLoader) {
        setLoading(true);
        setLoadingPhase("data");
        setLoadingProgress({ completed: 0, total: 0, failed: 0 });
      }
      setError("");
      const payload = await fetchGenshinData({ signal: controller.signal });
      const safeCharacters = Array.isArray(payload?.characters)
        ? buildTravelerDuoCharacters(applyBundledCharacterImages(payload.characters))
        : [];
      const safeBosses = {
        all: Array.isArray(payload?.bosses?.all) ? payload.bosses.all : [],
        weekly: Array.isArray(payload?.bosses?.weekly) ? payload.bosses.weekly : [],
        ascension: Array.isArray(payload?.bosses?.ascension) ? payload.bosses.ascension : [],
        localLegends: Array.isArray(payload?.bosses?.localLegends) ? payload.bosses.localLegends : [],
      };

      const safePayload = {
        ...payload,
        characters: safeCharacters,
        bosses: safeBosses,
        meta: payload?.meta || {},
      };

      if (showBlockingLoader) setLoadingPhase("images");
      const preloaded = await preloadCatalogImages(safePayload, {
        signal: controller.signal,
        onProgress: showBlockingLoader ? setLoadingProgress : undefined,
      });

      if (controller.signal.aborted) return;

      const readyPayload = {
        ...safePayload,
        characters: preloaded.characters,
        bosses: preloaded.bosses,
        meta: { ...safePayload.meta, failedImages: preloaded.failedImages },
      };

      dataRef.current = readyPayload;
      hasCatalogRef.current = true;
      saveCatalogSnapshot(readyPayload);
      setData(readyPayload);

      setSelectedCharacterIds((prev) => {
        const availableCharacters = readyPayload.characters.filter((item) => boot.characterFilters.includeSpecial || !isSpecialMagentaCharacter(item));
        const availableIds = new Set(availableCharacters.map((item) => item.id));
        if (!hasPersistedCharacterSelectionRef.current) {
          return availableIds;
        }
        return new Set([...prev].filter((id) => availableIds.has(id)));
      });

      setSelectedBossIds((prev) => {
        const availableIds = new Set(readyPayload.bosses.all.map((item) => item.id));
        if (!hasPersistedBossSelectionRef.current) {
          return availableIds;
        }
        const restoredIds = new Set([...prev].filter((id) => availableIds.has(id)));
        return restoredIds.size ? restoredIds : availableIds;
      });
    } catch (loadError) {
      if (controller.signal.aborted) return;
      if (!hasCatalogRef.current) setError(loadError?.message || "Failed to load API data");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    return () => loadControllerRef.current?.abort();
  }, [loadData]);

  useEffect(() => {
    setRollHistory((prev) => prev.slice(0, settings.historyLimit));
  }, [settings.historyLimit]);

  const filteredCharacters = useMemo(() => {
    if (!data?.characters?.length) {
      return [];
    }
    return sortCharactersNewestFirst(data.characters.filter((item) => matchesCharacterFilters(item, characterFilters, lang)));
  }, [data, characterFilters, lang]);

  const filteredBosses = useMemo(() => {
    if (!data?.bosses?.all?.length) {
      return [];
    }
    return data.bosses.all.filter((item) => matchesBossFilters(item, bossFilters, lang));
  }, [data, bossFilters, lang]);

  const characterPool = useMemo(
    () => filteredCharacters.filter((item) => selectedCharacterIds.has(item.id)),
    [filteredCharacters, selectedCharacterIds]
  );

  const bossPool = useMemo(
    () => filteredBosses.filter((item) => selectedBossIds.has(item.id)),
    [filteredBosses, selectedBossIds]
  );

  useEffect(() => {
    if (selectedCharacter && !characterPool.some((item) => item.id === selectedCharacter.id)) {
      setSelectedCharacter(null);
    }
  }, [characterPool, selectedCharacter]);

  useEffect(() => {
    if (selectedBoss && !bossPool.some((item) => item.id === selectedBoss.id)) {
      setSelectedBoss(null);
    }
  }, [bossPool, selectedBoss]);

  const itemLookup = useMemo(() => {
    const map = new Map();
    if (data?.characters?.length) {
      data.characters.forEach((item) => map.set(item.id, item));
    }
    if (data?.bosses?.all?.length) {
      data.bosses.all.forEach((item) => map.set(item.id, item));
    }
    return map;
  }, [data]);

  const filteredHistory = useMemo(() => {
    const fromTs = historyFilters.from ? new Date(`${historyFilters.from}T00:00:00`).getTime() : null;
    const toTs = historyFilters.to ? new Date(`${historyFilters.to}T23:59:59.999`).getTime() : null;

    return rollHistory.filter((entry) => {
      if (historyFilters.stage !== "all" && entry.stage !== historyFilters.stage) {
        return false;
      }

      const ts = Date.parse(entry.timestamp);
      if (Number.isNaN(ts)) {
        return false;
      }
      if (fromTs !== null && ts < fromTs) {
        return false;
      }
      if (toTs !== null && ts > toTs) {
        return false;
      }
      return true;
    });
  }, [rollHistory, historyFilters]);

  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }
    return audioContextRef.current;
  }, []);

  const ensureAudioReady = useCallback(() => {
    const context = getAudioContext();
    if (!context) {
      return null;
    }

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    return context;
  }, [getAudioContext]);

  const playClickSound = useCallback(() => {
    if (settings.uiVolume <= MIN_AUDIO_THRESHOLD) {
      return;
    }

    const context = ensureAudioReady();
    if (!context) {
      return;
    }

    try {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(640, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(820, context.currentTime + 0.04);

      gainNode.gain.setValueAtTime(0.0001, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, settings.uiVolume * 0.05),
        context.currentTime + 0.012
      );
      gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.075);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.09);
    } catch {
      // Ignore sound failures silently.
    }
  }, [ensureAudioReady, settings.uiVolume]);

  const playRollTickSound = useCallback(() => {
    if (settings.tickVolume <= MIN_AUDIO_THRESHOLD) {
      return;
    }

    const context = ensureAudioReady();
    if (!context) {
      return;
    }

    try {
      const noiseDuration = 0.024;
      const buffer = context.createBuffer(
        1,
        Math.max(1, Math.floor(context.sampleRate * noiseDuration)),
        context.sampleRate
      );
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < channel.length; index += 1) {
        channel[index] = (Math.random() * 2 - 1) * (1 - index / channel.length);
      }

      const noise = context.createBufferSource();
      noise.buffer = buffer;

      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(2650, context.currentTime);
      filter.Q.setValueAtTime(0.9, context.currentTime);

      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, settings.tickVolume * 0.065),
        context.currentTime + 0.004
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.032);

      const metallic = context.createOscillator();
      const metallicGain = context.createGain();
      metallic.type = "square";
      metallic.frequency.setValueAtTime(2450, context.currentTime);
      metallic.frequency.exponentialRampToValueAtTime(1180, context.currentTime + 0.018);
      metallicGain.gain.setValueAtTime(0.0001, context.currentTime);
      metallicGain.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, settings.tickVolume * 0.03),
        context.currentTime + 0.003
      );
      metallicGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.02);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);

      metallic.connect(metallicGain);
      metallicGain.connect(context.destination);

      noise.start(context.currentTime);
      noise.stop(context.currentTime + 0.033);
      metallic.start(context.currentTime);
      metallic.stop(context.currentTime + 0.021);
    } catch {
      // Ignore sound failures silently.
    }
  }, [ensureAudioReady, settings.tickVolume]);

  const playVictorySound = useCallback(() => {
    if (settings.uiVolume <= MIN_AUDIO_THRESHOLD) {
      return;
    }

    const context = ensureAudioReady();
    if (!context) {
      return;
    }

    try {
      const now = context.currentTime;
      const gain = context.createGain();
      gain.connect(context.destination);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, settings.uiVolume * 0.09), now + 0.024);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      [587.33, 698.46, 880].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, now + index * 0.06);
        oscillator.connect(gain);
        oscillator.start(now + index * 0.06);
        oscillator.stop(now + 0.26 + index * 0.06);
      });
    } catch {
      // Ignore sound failures silently.
    }
  }, [ensureAudioReady, settings.uiVolume]);

  const handleGlobalClickCapture = useCallback(
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const button = target.closest("button");
      if (!button || button.disabled) {
        return;
      }

      ensureAudioReady();
      playClickSound();
    },
    [ensureAudioReady, playClickSound]
  );

  const handleRollComplete = useCallback(
    (stage, winnerOrSquad) => {
      const results = Array.isArray(winnerOrSquad) ? winnerOrSquad : [winnerOrSquad];
      const newlyRolledCharacters = stage === "characters" ? results.filter(Boolean) : [];
      const previousSquad = stage === "characters" ? pendingSquadAppendRef.current : null;
      pendingSquadAppendRef.current = null;
      const squad = previousSquad ? [...previousSquad, ...newlyRolledCharacters].slice(0, 4) : newlyRolledCharacters;
      const timestamp = new Date().toISOString();
      const entries = createRollHistoryEntries(stage, results, timestamp);
      const winner = newlyRolledCharacters[0] || results[0];
      if (!entries.length || !winner) {
        return;
      }

      setRollHistory((prev) => [...entries, ...prev].slice(0, settings.historyLimit));

      if (settings.splashEnabled && ((stage === "characters" && squad.length) || stage === "bosses")) {
        setSplashResult({ stage, item: winner, squad, timestamp });
      }
    },
    [settings.historyLimit, settings.splashEnabled]
  );
  const handleCharacterRollComplete = useCallback(
    (winner) => handleRollComplete("characters", winner),
    [handleRollComplete]
  );
  const handleBossRollComplete = useCallback(
    (winner) => handleRollComplete("bosses", winner),
    [handleRollComplete]
  );

  const saveRollResult = useCallback((result) => {
    if (!result?.stage || !["characters", "bosses"].includes(result.stage)) return;
    const results = result.stage === "characters" && Array.isArray(result.squad) && result.squad.length
      ? result.squad
      : [result.item].filter(Boolean);
    const timestamp = result.timestamp || new Date().toISOString();
    const entries = createRollHistoryEntries(result.stage, results, timestamp);
    if (!entries.length) return;

    setRollHistory((previous) => {
      const missing = entries.filter((entry) => !previous.some((saved) => (
        saved.stage === entry.stage && saved.timestamp === entry.timestamp && saved.itemId === entry.itemId
      )));
      return missing.length ? [...missing, ...previous].slice(0, settings.historyLimit) : previous;
    });
  }, [settings.historyLimit]);

  const openRollHistory = useCallback(() => {
    setHoverTarget(null);
    pendingSquadAppendRef.current = null;
    setSplashResult(null);
    setWheelResultResetTrigger((previous) => previous + 1);
    setActiveSection("history");
  }, []);

  const saveCurrentSquad = useCallback((squad) => {
    if (!Array.isArray(squad) || !squad.length) {
      return;
    }

    const entry = {
      id: `squad-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      members: squad.map((member) => toSnapshotMember(member)),
    };

    setSavedSquads((prev) => [entry, ...prev].slice(0, 24));
  }, []);

  const deleteSavedSquad = useCallback((id) => {
    setSavedSquads((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const saveCurrentBoss = useCallback((boss) => {
    if (!boss?.id) return;
    setSavedBosses((previous) => {
      if (previous.some((entry) => entry.boss.id === boss.id)) return previous;
      const entry = {
        id: `boss-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        boss: toSnapshotBoss(boss),
      };
      return [entry, ...previous].slice(0, 30);
    });
  }, []);

  const deleteSavedBoss = useCallback((id) => {
    setSavedBosses((previous) => previous.filter((entry) => entry.id !== id));
  }, []);

  const rerollFromSplash = useCallback(() => {
    const stage = splashResult?.stage || "characters";
    pendingSquadAppendRef.current = null;
    setSplashResult(null);
    if (stage === "bosses") {
      setActiveSection("bosses");
      setSelectedBoss(null);
      setBossRerollTrigger((prev) => prev + 1);
      return;
    }
    setActiveSection("characters");
    setSelectedCharacter(null);
    setCharacterRerollTrigger((prev) => prev + 1);
  }, [splashResult?.stage]);

  const rollNextSquadMember = useCallback(() => {
    if (!splashResult || splashResult.stage !== "characters") return;
    const squad = Array.isArray(splashResult.squad) ? splashResult.squad : [];
    if (!squad.length || squad.length >= 4) return;
    pendingSquadAppendRef.current = squad;
    setActiveSection("characters");
    setSplashResult(null);
    setSelectedCharacter(null);
    setCharacterSingleRollTrigger((previous) => previous + 1);
  }, [setActiveSection, splashResult]);

  const closeSplash = useCallback(() => {
    pendingSquadAppendRef.current = null;
    setSplashResult(null);
    setWheelResultResetTrigger((previous) => previous + 1);
  }, []);

  useEffect(() => {
    if (!splashResult) return;
    playVictorySound();
  }, [playVictorySound, splashResult]);

  const deleteHistoryEntry = (id) => {
    setRollHistory((prev) => prev.filter((entry) => entry.id !== id));
  };

  const deleteFilteredHistory = () => {
    const filteredIds = new Set(filteredHistory.map((entry) => entry.id));
    setRollHistory((prev) => prev.filter((entry) => !filteredIds.has(entry.id)));
  };

  const clearAllHistory = () => {
    setRollHistory([]);
  };

  useEffect(() => {
    setCookieJson(COOKIE_KEYS.settings, {
      lang,
      theme: "dark",
      languageMode,
      ...settings,
    });
  }, [lang, languageMode, settings]);

  useEffect(() => {
    setCookieJson(COOKIE_KEYS.ui, {
      activeSection,
      isSidebarCollapsed,
      rouletteMode,
      characterLaneCount,
      characterPoolViewMode: characterFilters.viewMode,
      bossPoolViewMode: bossFilters.viewMode,
    });
  }, [activeSection, isSidebarCollapsed, rouletteMode, characterLaneCount, characterFilters.viewMode, bossFilters.viewMode]);

  useEffect(() => {
    setCookieJson(COOKIE_KEYS.characterFilters, characterFilters);
  }, [characterFilters]);

  useEffect(() => {
    setCookieJson(COOKIE_KEYS.bossFilters, bossFilters);
  }, [bossFilters]);

  useEffect(() => {
    setCookieJson(COOKIE_KEYS.historyFilters, historyFilters);
  }, [historyFilters]);

  useEffect(() => {
    setCookieJson(COOKIE_KEYS.selectedIds, {
      characters: [...selectedCharacterIds],
      bosses: [...selectedBossIds],
    });
  }, [selectedCharacterIds, selectedBossIds]);

  useEffect(() => {
    const compact = rollHistory.map((entry) => ({
      id: entry.id,
      rollId: entry.rollId,
      stage: entry.stage,
      itemId: entry.itemId,
      itemName: entry.itemName,
      itemNameRu: entry.itemNameRu,
      rarity: entry.rarity,
      group: entry.group,
      timestamp: entry.timestamp,
    }));

    try {
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(compact));
      setCookie(COOKIE_KEYS.history, "", -1);
    } catch {
      setCookieJson(COOKIE_KEYS.history, trimHistoryForCookie(compact));
    }
  }, [rollHistory]);

  useEffect(() => {
    const compact = savedSquads.map((entry) => ({
      id: entry.id,
      timestamp: entry.timestamp,
      members: entry.members.map((member) => toSnapshotMember(member)),
    }));

    setCookieJson(COOKIE_KEYS.savedSquads, trimSavedSquadsForCookie(compact));
  }, [savedSquads]);

  useEffect(() => {
    const compact = savedBosses.map((entry) => ({
      id: entry.id,
      timestamp: entry.timestamp,
      boss: toSnapshotBoss(entry.boss),
    }));
    setCookieJson(COOKIE_KEYS.savedBosses, trimSavedBossesForCookie(compact));
  }, [savedBosses]);

  const menuItems = [
    { id: "dashboard", label: getHomeMenuLabel(lang), icon: "dashboard" },
    { id: "characters", label: getExtraLabel("characterRoulette", lang), icon: "characters" },
    { id: "characterPool", label: t.characterPoolMenu, icon: "characterPool" },
    { id: "bosses", label: getExtraLabel("bossRoulette", lang), icon: "bosses" },
    { id: "bossPool", label: t.bossPoolMenu, icon: "bossPool" },
    { id: "history", label: t.historyMenu, icon: "history" },
    { id: "settings", label: t.settingsMenu, icon: "settings" },
  ];

  const handleMenuItemClick = useCallback(
    (sectionId) => {
      if (sectionId === "characters" || sectionId === "bosses") {
        pendingSquadAppendRef.current = null;
        setSplashResult(null);
        setRouletteResetTrigger((previous) => previous + 1);
      }
      setActiveSection(sectionId);
      if (isMobileLayout) {
        setIsSidebarCollapsed(true);
      }
    },
    [isMobileLayout, setActiveSection]
  );
  const openSupport = useCallback(() => {
    setIsSupportOpen(true);
    if (isMobileLayout) setIsSidebarCollapsed(true);
  }, [isMobileLayout]);

  const todayKey = new Date().toDateString();
  const userRollsToday = countRollSessions(rollHistory, (entry) => new Date(entry.timestamp).toDateString() === todayKey);
  const userCharacterRolls = countRollSessions(rollHistory, (entry) => entry.stage === "characters");
  const userBossRolls = countRollSessions(rollHistory, (entry) => entry.stage === "bosses");
  const totalRollSessions = countRollSessions(rollHistory);
  const catalogUpdatedAt = data?.meta?.fetchedAt
    ? new Intl.DateTimeFormat(getLocale(lang), { dateStyle: "medium" }).format(new Date(data.meta.fetchedAt))
    : "";

  const renderStage = (stage) => {
    const isCharacterStage = stage === "characters";
    const pool = isCharacterStage ? characterPool : bossPool;
    const selectedItem = isCharacterStage ? selectedCharacter : selectedBoss;
    const setSelectedItem = isCharacterStage ? setSelectedCharacter : setSelectedBoss;

    return (
      <section className="stage-panel roulette-stage-panel" id={stage}>
        <div className="panel-head">
          <h2>{isCharacterStage ? t.characters : t.bosses}</h2>
          <p>{isCharacterStage ? t.stageHintCharacters : t.stageHintBosses}</p>
        </div>

        <div className="pool-toolbar">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setActiveSection(isCharacterStage ? "characterPool" : "bossPool")}
          >
            {isCharacterStage ? t.openCharacterPool : t.openBossPool}
          </button>
          <p>
            {t.poolSize}: <strong>{pool.length}</strong> {t.fromTotal}{" "}
            {isCharacterStage ? data?.characters?.length || 0 : data?.bosses?.all?.length || 0}
          </p>
        </div>

        {!pool.length ? (
          <p className="empty-hint">{t.noPoolItems}</p>
        ) : (
          <RouletteEngine
            items={pool}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
            mode={rouletteMode}
            setMode={setRouletteMode}
            maxLanes={isCharacterStage ? 4 : 1}
            laneCount={isCharacterStage ? characterLaneCount : 1}
            setLaneCount={isCharacterStage ? setCharacterLaneCount : undefined}
            t={t}
            lang={lang}
            rollingLabel={t.rolling}
            rollDurationMs={rollDurationMs}
            rollSpeed={settings.rollSpeed}
            onRollComplete={isCharacterStage ? handleCharacterRollComplete : handleBossRollComplete}
            onTick={playRollTickSound}
            externalRollTrigger={isCharacterStage ? characterRerollTrigger : bossRerollTrigger}
            externalSingleRollTrigger={isCharacterStage ? characterSingleRollTrigger : 0}
            wheelResultResetTrigger={wheelResultResetTrigger}
            rouletteResetTrigger={rouletteResetTrigger}
            onHoverDetails={handleHoverDetails}
            detailType={stage}
          />
        )}

      </section>
    );
  };

  if (loading) {
    return <LoadingScreen lang={lang} phase={loadingPhase} progress={loadingProgress} />;
  }

  return (
    <div className={`app-shell ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`} style={{ "--teyvat-world": `url("${import.meta.env.BASE_URL}assets/teyvat-world.png")`, "--teyvat-ruins": `url("${import.meta.env.BASE_URL}assets/teyvat-ruins.jpg")` }} onClickCapture={handleGlobalClickCapture}>
      {isMobileLayout ? (
        <>
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            aria-label={isSidebarCollapsed ? getExtraLabel("openMenu", lang) : getExtraLabel("closeMenu", lang)}
            title={isSidebarCollapsed ? getExtraLabel("openMenu", lang) : getExtraLabel("closeMenu", lang)}
          >
            <span aria-hidden="true">{isSidebarCollapsed ? "☰" : "✕"}</span>
          </button>
          {!isSidebarCollapsed ? (
            <button
              type="button"
              className="mobile-menu-backdrop"
              onClick={() => setIsSidebarCollapsed(true)}
              aria-label={getExtraLabel("closeMenu", lang)}
            />
          ) : null}
        </>
      ) : null}

      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <h1>{t.appTitle}</h1>
            <p>{t.appSubtitle}</p>
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            aria-label={isSidebarCollapsed ? "Expand menu" : "Collapse menu"}
            title={isSidebarCollapsed ? "Expand menu" : "Collapse menu"}
          >
            <span aria-hidden="true">{isSidebarCollapsed ? "⟩" : "⟨"}</span>
          </button>
        </div>

        <div className="menu-list">
          {menuItems.map((item) => (
            <a
              key={item.id}
              className={`menu-item ${activeSection === item.id ? "active" : ""}`}
              href={sectionPath(item.id)}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                handleMenuItemClick(item.id);
              }}
              aria-label={item.label}
              title={item.label}
            >
              <span className="menu-item-icon" aria-hidden="true">
                <MenuIcon name={item.icon} />
              </span>
              <span className="menu-item-label">{item.label}</span>
            </a>
          ))}
        </div>

        <div className="sidebar-actions">
          <button type="button" className="menu-item sidebar-action" onClick={openSupport} aria-label={t.supportMenu} title={t.supportMenu}>
            <span className="menu-item-icon" aria-hidden="true"><MenuIcon name="support" /></span>
            <span className="menu-item-label">{t.supportMenu}</span>
          </button>
          <a className={`menu-item sidebar-action ${activeSection === "donate" ? "active" : ""}`} href={sectionPath("donate")} onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); handleMenuItemClick("donate"); }} aria-label={t.donateMenu} title={t.donateMenu}>
            <span className="menu-item-icon" aria-hidden="true"><MenuIcon name="donate" /></span>
            <span className="menu-item-label">{t.donateMenu}</span>
          </a>
        </div>

        <div className="sidebar-footer">
          <p>{t.useMenuHint}</p>
        </div>
      </aside>

      <main className="main-content">
        <div className="bg-layer bg-layer-1" />
        <div className="bg-layer bg-layer-2" />

        {loading ? (
          <section className="state-screen">
            <h2>{t.loadingData}</h2>
            <p>{t.loadingHint}</p>
          </section>
        ) : error ? (
          <section className="state-screen">
            <h2>{t.loadErrorTitle}</h2>
            <p>{t.loadErrorBody}</p>
            <p className="source-note">{error}</p>
            <button type="button" className="btn-primary" onClick={loadData}>
              {t.retry}
            </button>
          </section>
        ) : (
          <>
            {activeSection === "dashboard" && (
              <section className="dashboard dashboard-home" id="dashboard">
                <div className="dashboard-hero">
                  <div>
                    <h2>{getHomeMenuLabel(lang)}</h2>
                    <p>{getDashboardHint(lang)}</p>
                  </div>
                  <div className="dashboard-hero-actions">
                    <button type="button" className="btn-primary" onClick={() => setActiveSection("characters")}>
                      {getSpinCharactersLabel(lang)}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => setActiveSection("bosses")}>
                      {getSpinBossesLabel(lang)}
                    </button>
                  </div>
                </div>

                <div className="dashboard-kpi-grid">
                  <article className="stat-card">
                    <p>🧙 {t.characters}</p>
                    <strong>{data.characters.length}</strong>
                  </article>
                  <article className="stat-card">
                    <p>👾 {t.bosses}</p>
                    <strong>{data.bosses.all.length}</strong>
                  </article>
                  <article className="stat-card">
                    <p>✨ {t.localLegends}</p>
                    <strong>{data.bosses.localLegends.length}</strong>
                  </article>
                  <article className="stat-card">
                    <p>💾 {getSavedSquadsShortLabel(lang)}</p>
                    <strong>{savedSquads.length}</strong>
                  </article>
                  <article className="stat-card">
                    <p>🎲 {getTodayRollsLabel(lang)}</p>
                    <strong>{userRollsToday}</strong>
                  </article>
                </div>

                <div className="dashboard-stat-panels">
                  <article className="dashboard-stat-card">
                    <h3>{getUserStatsTitle(lang)}</h3>
                    <p>🎯 {getTotalRollsLabel(lang)}: {totalRollSessions}</p>
                    <p>🧙 {t.characters}: {userCharacterRolls}</p>
                    <p>👾 {t.bosses}: {userBossRolls}</p>
                    <p>💾 {getSavedSquadsShortLabel(lang)}: {savedSquads.length}</p>
                  </article>

                  <article className="dashboard-stat-card">
                    <h3>{t.dataStats}</h3>
                    <p>{t.characters}: <span>{sourceCharacters}</span></p>
                    <p>{t.bosses}: <span>{sourceLegends}</span></p>
                    {catalogUpdatedAt ? <small className="community-updated">{getExtraLabel("catalogUpdated", lang)}: {catalogUpdatedAt}</small> : null}
                  </article>
                </div>

                <div className="saved-squads-panel">
                  <h3>{getSavedSquadsTitle(lang)}</h3>
                  {savedSquads.length ? (
                    <div className="saved-squads-grid">
                      {savedSquads.map((entry) => (
                        <article key={entry.id} className="saved-squad-card">
                          <div className="saved-squad-head">
                            <p>
                              {new Date(entry.timestamp).toLocaleString(getLocale(lang))}
                            </p>
                            <button type="button" className="btn-secondary" onClick={() => deleteSavedSquad(entry.id)}>
                              {t.deleteOne}
                            </button>
                          </div>
                          <div className="saved-squad-members">
                            {entry.members.map((member, index) => (
                              <div
                                key={`${entry.id}-${member.id}-${index}`}
                                className="saved-squad-member"
                                onMouseEnter={(event) => handleHoverDetails(member, "characters", event)}
                                onMouseMove={(event) => handleHoverDetails(member, "characters", event)}
                                onMouseLeave={() => handleHoverDetails(null)}
                              >
                                <ItemImage item={member} alt={getItemName(member, lang)} loading="lazy" />
                                <div>
                                  <p>{getItemName(member, lang)}</p>
                                  <span className="type-chip">
                                    <ElementIcon element={member.element} /> {formatElement(member.element, lang)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-hint">{getNoSavedSquadsLabel(lang)}</p>
                  )}
                </div>

                <div className="saved-bosses-panel">
                  <h3>{getExtraLabel("savedBosses", lang)}</h3>
                  {savedBosses.length ? (
                    <div className="saved-bosses-grid">
                      {savedBosses.map((entry) => {
                        const boss = itemLookup.get(entry.boss.id) || entry.boss;
                        return (
                          <article key={entry.id} className="saved-boss-card">
                            <div className="saved-squad-head">
                              <p>{new Date(entry.timestamp).toLocaleString(getLocale(lang))}</p>
                              <button type="button" className="btn-secondary" onClick={() => deleteSavedBoss(entry.id)}>{t.deleteOne}</button>
                            </div>
                            <div className="saved-boss-members">
                              <div
                                className="saved-boss-main"
                                onMouseEnter={(event) => handleHoverDetails(boss, "bosses", event)}
                                onMouseMove={(event) => handleHoverDetails(boss, "bosses", event)}
                                onMouseLeave={() => handleHoverDetails(null)}
                              >
                                <ItemImage item={boss} alt={getItemName(boss, lang)} loading="lazy" />
                                <div>
                                  <p>{getItemName(boss, lang)}</p>
                                  {boss.group ? <span className="type-chip">{formatBossType(boss.group, lang)}</span> : null}
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : <p className="empty-hint">{getExtraLabel("noSavedBosses", lang)}</p>}
                </div>

                <p className="source-note">
                  {t.sourceLabel}: {sourceCharacters}, {sourceLegends} (Fandom API)
                </p>
              </section>
            )}

            {activeSection === "characters" && renderStage("characters")}
            {activeSection === "characterPool" && (
              <CharacterPoolPanel
                t={t}
                lang={lang}
                allItems={data?.characters || []}
                activeFilters={characterFilters}
                setActiveFilters={setCharacterFilters}
                selectedIds={selectedCharacterIds}
                setSelectedIds={setSelectedCharacterIds}
                onBack={() => setActiveSection("characters")}
                isMobileLayout={isMobileLayout}
                onHoverDetails={handleHoverDetails}
              />
            )}
            {activeSection === "bosses" && renderStage("bosses")}
            {activeSection === "bossPool" && (
              <BossPoolPanel
                t={t}
                lang={lang}
                allItems={data?.bosses?.all || []}
                activeFilters={bossFilters}
                setActiveFilters={setBossFilters}
                selectedIds={selectedBossIds}
                setSelectedIds={setSelectedBossIds}
                onBack={() => setActiveSection("bosses")}
                isMobileLayout={isMobileLayout}
                onHoverDetails={handleHoverDetails}
              />
            )}
            {activeSection === "history" && (
              <HistoryPanel
                t={t}
                lang={lang}
                filteredHistory={filteredHistory}
                historyTotal={rollHistory.length}
                historyFilters={historyFilters}
                setHistoryFilters={setHistoryFilters}
                onDeleteOne={deleteHistoryEntry}
                onDeleteFiltered={deleteFilteredHistory}
                onClearAll={clearAllHistory}
                itemLookup={itemLookup}
                onHoverDetails={handleHoverDetails}
              />
            )}
            {activeSection === "settings" && (
              <SettingsPanel
                t={t}
                lang={lang}
                setLang={changeLanguage}
                languageMode={languageMode}
                setAutoLanguage={setAutoLanguage}
                settings={settings}
                setSettings={setSettings}
              />
            )}
            {activeSection === "donate" && <DonationPage t={t} />}
          </>
        )}
      </main>

      <ResultSplashModal
        result={splashResult}
        t={t}
        lang={lang}
        onClose={closeSplash}
        onSaveSquad={saveCurrentSquad}
        onSaveBoss={saveCurrentBoss}
        isBossSaved={splashResult?.stage === "bosses" && savedBosses.some((entry) => entry.boss.id === splashResult.item?.id)}
        onSaveResult={saveRollResult}
        onGoToHistory={openRollHistory}
        onReroll={splashResult?.stage === "characters" && Array.isArray(splashResult.squad) && splashResult.squad.length ? rollNextSquadMember : rerollFromSplash}
        onHoverDetails={handleHoverDetails}
        effectsEnabled={settings.splashEffects}
      />
      {isSupportOpen ? <SupportModal t={t} onClose={() => setIsSupportOpen(false)} /> : null}
      <ItemHoverDetail target={hoverTarget} point={hoverPoint} lang={lang} />
    </div>
  );
}

export default App;
