import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { translations } from "./i18n/translations";
import { fetchGenshinData } from "./services/genshinApi";

const LANGS = ["ru", "en", "zh", "ja", "ko"];
const THEMES = ["light", "dark"];
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
];
const ROLL_SPEEDS = ["normal", "long", "epic"];
const HISTORY_LIMIT_OPTIONS = [30, 60, 90];

const DEFAULT_CHARACTER_FILTERS = {
  search: "",
  viewMode: "cards",
  rarities: [],
  weapons: [],
  elements: [],
};

const DEFAULT_BOSS_FILTERS = {
  search: "",
  viewMode: "cards",
  groups: [],
  nameShapes: [],
  nameLengths: [],
};

const DEFAULT_HISTORY_FILTERS = {
  from: "",
  to: "",
  stage: "all",
};

const DEFAULT_SETTINGS = {
  musicVolume: 0.42,
  uiVolume: 0.45,
  tickVolume: 0.5,
  splashEnabled: true,
  splashEffects: true,
  rollSpeed: "long",
  historyLimit: 60,
};

const ROLL_DURATION_BY_SPEED = {
  normal: 7400,
  long: 9200,
  epic: 11200,
};

const COOKIE_DAYS = 365;
const COOKIE_HISTORY_SIZE_LIMIT = 3300;
const MIN_AUDIO_THRESHOLD = 0.001;

const GENSHIN_BACKGROUND_TRACK =
  "https://raw.githubusercontent.com/Escartem/GenshinAudio/master/GeneratedSoundBanks/Game/Streamed/Streamed2/Streamed2_52.mp3";

const COOKIE_KEYS = {
  settings: "gi_rl_settings",
  ui: "gi_rl_ui",
  characterFilters: "gi_rl_character_filters",
  bossFilters: "gi_rl_boss_filters",
  selectedIds: "gi_rl_selected_ids",
  history: "gi_rl_history",
  historyFilters: "gi_rl_history_filters",
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

const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

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

const makeRepeatedItems = (pool) => {
  if (!pool.length) {
    return [];
  }

  const repeats = Math.max(6, Math.ceil(48 / pool.length));
  const sequence = [];

  for (let i = 0; i < repeats; i += 1) {
    sequence.push(...pool);
  }

  return sequence;
};

const pickRandom = (pool) => pool[Math.floor(Math.random() * pool.length)];

const buildRollItems = (pool, finalIndex, winner) =>
  Array.from({ length: Math.max(52, finalIndex + 10) }, (_, index) =>
    index === finalIndex ? winner : pickRandom(pool)
  );

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
    viewMode: source.viewMode === "list" ? "list" : "cards",
    rarities,
    weapons: uniqueStringArray(source.weapons),
    elements: uniqueStringArray(source.elements),
  };
};

const normalizeBossFilters = (value) => {
  const source = value && typeof value === "object" ? value : {};
  const nameShapes = uniqueStringArray(source.nameShapes).filter(
    (entry) => entry === "single" || entry === "multi"
  );
  const nameLengths = uniqueStringArray(source.nameLengths).filter(
    (entry) => entry === "short" || entry === "medium" || entry === "long"
  );

  return {
    search: typeof source.search === "string" ? source.search : DEFAULT_BOSS_FILTERS.search,
    viewMode: source.viewMode === "list" ? "list" : "cards",
    groups: uniqueStringArray(source.groups),
    nameShapes,
    nameLengths,
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

const normalizeSettings = (value) => {
  const source = value && typeof value === "object" ? value : {};
  const legacySoundEnabled = typeof source.soundEnabled === "boolean" ? source.soundEnabled : null;
  const legacyMusicEnabled =
    typeof source.backgroundMusicEnabled === "boolean" ? source.backgroundMusicEnabled : null;

  const defaultUiVolume = legacySoundEnabled === false ? 0 : DEFAULT_SETTINGS.uiVolume;
  const defaultTickVolume = legacySoundEnabled === false ? 0 : DEFAULT_SETTINGS.tickVolume;
  const defaultMusicVolume = legacyMusicEnabled === false ? 0 : DEFAULT_SETTINGS.musicVolume;

  return {
    musicVolume: clampVolume(source.musicVolume, defaultMusicVolume),
    uiVolume: clampVolume(source.uiVolume, defaultUiVolume),
    tickVolume: clampVolume(source.tickVolume, defaultTickVolume),
    splashEnabled:
      typeof source.splashEnabled === "boolean" ? source.splashEnabled : DEFAULT_SETTINGS.splashEnabled,
    splashEffects:
      typeof source.splashEffects === "boolean" ? source.splashEffects : DEFAULT_SETTINGS.splashEffects,
    rollSpeed: ROLL_SPEEDS.includes(source.rollSpeed) ? source.rollSpeed : DEFAULT_SETTINGS.rollSpeed,
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

const getBossNameShape = (value) => {
  const words = value.trim().split(/\s+/).filter(Boolean).length;
  return words > 1 ? "multi" : "single";
};

const getBossNameLength = (value) => {
  const length = value.trim().length;
  if (length <= 10) {
    return "short";
  }
  if (length <= 18) {
    return "medium";
  }
  return "long";
};

const matchesCharacterFilters = (item, filters, lang) => {
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
  const nameShape = getBossNameShape(name);
  const nameLength = getBossNameLength(name);

  if (filters.nameShapes.length && !filters.nameShapes.includes(nameShape)) {
    return false;
  }
  if (filters.nameLengths.length && !filters.nameLengths.includes(nameLength)) {
    return false;
  }

  const search = filters.search.trim().toLowerCase();
  if (!search) {
    return true;
  }
  return name.toLowerCase().includes(search);
};

const loadInitialState = () => {
  const settingsCookie = readCookieJson(COOKIE_KEYS.settings, {});
  const uiCookie = readCookieJson(COOKIE_KEYS.ui, {});
  const characterFilters = normalizeCharacterFilters(
    readCookieJson(COOKIE_KEYS.characterFilters, DEFAULT_CHARACTER_FILTERS)
  );
  const bossFilters = normalizeBossFilters(readCookieJson(COOKIE_KEYS.bossFilters, DEFAULT_BOSS_FILTERS));
  const selectedCookie = readCookieJson(COOKIE_KEYS.selectedIds, {});
  const historyFilters = normalizeHistoryFilters(
    readCookieJson(COOKIE_KEYS.historyFilters, DEFAULT_HISTORY_FILTERS)
  );

  const settings = normalizeSettings(settingsCookie);
  const history = normalizeHistoryEntries(readCookieJson(COOKIE_KEYS.history, [])).slice(
    0,
    settings.historyLimit
  );

  const lang = LANGS.includes(settingsCookie.lang) ? settingsCookie.lang : "ru";
  const theme = THEMES.includes(settingsCookie.theme) ? settingsCookie.theme : "dark";

  return {
    lang,
    theme,
    settings,
    activeSection: SECTION_IDS.includes(uiCookie.activeSection) ? uiCookie.activeSection : "dashboard",
    rollOrder: uiCookie.rollOrder === "characters" || uiCookie.rollOrder === "bosses" ? uiCookie.rollOrder : null,
    characterFilters,
    bossFilters,
    selectedCharacters: uniqueStringArray(selectedCookie.characters),
    selectedBosses: uniqueStringArray(selectedCookie.bosses),
    hasCharacterSelection: Array.isArray(selectedCookie.characters),
    hasBossSelection: Array.isArray(selectedCookie.bosses),
    history,
    historyFilters,
  };
};

const FilterChip = ({ label, active, onClick }) => (
  <button type="button" className={`filter-chip ${active ? "is-active" : ""}`} onClick={onClick}>
    {label}
  </button>
);

const ItemBadge = ({ text }) => <span className="item-badge">{text}</span>;

const ImageWithFallback = ({
  src,
  fallbackSrcs = [],
  alt,
  className,
  loading = "lazy",
  onError,
  onLoad,
}) => {
  const sources = useMemo(() => {
    const list = [src, ...fallbackSrcs].filter(Boolean);
    return Array.from(new Set(list));
  }, [src, fallbackSrcs]);

  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [sources]);

  const currentSource = sources[sourceIndex] || "";

  if (!currentSource) {
    return <div className={`image-fallback ${className || ""}`} aria-hidden="true" />;
  }

  return (
    <img
      src={currentSource}
      alt={alt}
      className={className}
      loading={loading}
      onLoad={onLoad}
      onError={(event) => {
        if (sourceIndex < sources.length - 1) {
          setSourceIndex((prev) => prev + 1);
          return;
        }
        if (onError) {
          onError(event);
        }
      }}
    />
  );
};

const CharacterOption = ({ item, lang, selected, onToggle, viewMode }) => {
  const rarityClass = item.rarity === 5 ? "rarity-5" : "rarity-4";
  const wrapperClass = viewMode === "cards" ? "option-card" : "option-list";

  return (
    <button
      type="button"
      className={`option-item ${wrapperClass} ${rarityClass} ${selected ? "is-selected" : ""}`}
      onClick={() => onToggle(item.id)}
    >
      <ImageWithFallback
        src={item.image}
        fallbackSrcs={item.imageFallbacks}
        alt={getItemName(item, lang)}
        loading="lazy"
      />
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

const BossOption = ({ item, lang, selected, onToggle, viewMode, t }) => {
  const wrapperClass = viewMode === "cards" ? "option-card boss-option" : "option-list";

  return (
    <button
      type="button"
      className={`option-item ${wrapperClass} ${selected ? "is-selected" : ""}`}
      onClick={() => onToggle(item.id)}
    >
      <ImageWithFallback
        src={item.image}
        fallbackSrcs={item.imageFallbacks}
        alt={getItemName(item, lang)}
        loading="lazy"
      />
      <div className="option-content">
        <p>{getItemName(item, lang)}</p>
        <div className="option-badges">
          <ItemBadge text={formatBossType(item.group, lang)} />
          <ItemBadge text={getBossNameShape(getItemName(item, lang)) === "single" ? t.oneWord : t.multiWord} />
        </div>
      </div>
      <span className="option-check">{selected ? "✓" : "○"}</span>
    </button>
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
}) => {
  const optionsScrollRef = useRef(null);
  const savedScrollTopRef = useRef(null);

  const visibleItems = useMemo(
    () => allItems.filter((item) => matchesCharacterFilters(item, activeFilters, lang)),
    [allItems, activeFilters, lang]
  );

  const rememberScrollTop = () => {
    if (optionsScrollRef.current) {
      savedScrollTopRef.current = optionsScrollRef.current.scrollTop;
    }
  };

  useLayoutEffect(() => {
    if (savedScrollTopRef.current === null || !optionsScrollRef.current) {
      return;
    }

    optionsScrollRef.current.scrollTop = savedScrollTopRef.current;
    savedScrollTopRef.current = null;
  }, [selectedIds, activeFilters.viewMode, visibleItems.length]);

  const toggleSelection = (id) => {
    rememberScrollTop();
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
    rememberScrollTop();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleItems.forEach((item) => next.add(item.id));
      return next;
    });
  };

  const deselectVisible = () => {
    rememberScrollTop();
    const visibleIds = new Set(visibleItems.map((item) => item.id));
    setSelectedIds((prev) => new Set([...prev].filter((id) => !visibleIds.has(id))));
  };

  const resetFilters = () => {
    setActiveFilters(DEFAULT_CHARACTER_FILTERS);
  };

  const weaponKeys = Object.keys(WEAPON_LABELS);
  const elementKeys = Object.keys(ELEMENT_LABELS).filter((key) => key !== "NONE");

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
          <h3>{t.poolSettings}</h3>
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

          <div className="view-toggle">
            <span>{t.view}</span>
            <div className="toggle-row">
              <button
                type="button"
                className={activeFilters.viewMode === "cards" ? "is-active" : ""}
                onClick={() => setActiveFilters((prev) => ({ ...prev, viewMode: "cards" }))}
              >
                {t.viewCards}
              </button>
              <button
                type="button"
                className={activeFilters.viewMode === "list" ? "is-active" : ""}
                onClick={() => setActiveFilters((prev) => ({ ...prev, viewMode: "list" }))}
              >
                {t.viewList}
              </button>
            </div>
          </div>
        </div>

        <div className="filter-groups">
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
          <button type="button" className="btn-secondary" onClick={selectVisible}>
            {t.selectVisible}
          </button>
          <button type="button" className="btn-secondary" onClick={deselectVisible}>
            {t.deselectVisible}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setSelectedIds(new Set(allItems.map((item) => item.id)))}
          >
            {t.selectAll}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setSelectedIds(new Set())}>
            {t.deselectAll}
          </button>
          <button type="button" className="btn-secondary" onClick={resetFilters}>
            {t.resetFilters}
          </button>
        </div>

        <p className="filter-counter">
          {t.poolSize}: {visibleItems.filter((item) => selectedIds.has(item.id)).length} {t.fromTotal}{" "}
          {allItems.length}
        </p>

        {visibleItems.length ? (
          <div className="options-scroll" ref={optionsScrollRef}>
            <div className={`options-grid ${activeFilters.viewMode === "list" ? "is-list" : ""}`}>
              {visibleItems.map((item) => (
                <CharacterOption
                  key={item.id}
                  item={item}
                  lang={lang}
                  selected={selectedIds.has(item.id)}
                  onToggle={toggleSelection}
                  viewMode={activeFilters.viewMode}
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
}) => {
  const optionsScrollRef = useRef(null);
  const savedScrollTopRef = useRef(null);

  const visibleItems = useMemo(
    () => allItems.filter((item) => matchesBossFilters(item, activeFilters, lang)),
    [allItems, activeFilters, lang]
  );

  const rememberScrollTop = () => {
    if (optionsScrollRef.current) {
      savedScrollTopRef.current = optionsScrollRef.current.scrollTop;
    }
  };

  useLayoutEffect(() => {
    if (savedScrollTopRef.current === null || !optionsScrollRef.current) {
      return;
    }

    optionsScrollRef.current.scrollTop = savedScrollTopRef.current;
    savedScrollTopRef.current = null;
  }, [selectedIds, activeFilters.viewMode, visibleItems.length]);

  const toggleSelection = (id) => {
    rememberScrollTop();
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
    rememberScrollTop();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleItems.forEach((item) => next.add(item.id));
      return next;
    });
  };

  const deselectVisible = () => {
    rememberScrollTop();
    const visibleIds = new Set(visibleItems.map((item) => item.id));
    setSelectedIds((prev) => new Set([...prev].filter((id) => !visibleIds.has(id))));
  };

  const resetFilters = () => {
    setActiveFilters(DEFAULT_BOSS_FILTERS);
  };

  const groupKeys = Object.keys(BOSS_TYPE_LABELS);

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
          <h3>{t.poolSettings}</h3>
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

          <div className="view-toggle">
            <span>{t.view}</span>
            <div className="toggle-row">
              <button
                type="button"
                className={activeFilters.viewMode === "cards" ? "is-active" : ""}
                onClick={() => setActiveFilters((prev) => ({ ...prev, viewMode: "cards" }))}
              >
                {t.viewCards}
              </button>
              <button
                type="button"
                className={activeFilters.viewMode === "list" ? "is-active" : ""}
                onClick={() => setActiveFilters((prev) => ({ ...prev, viewMode: "list" }))}
              >
                {t.viewList}
              </button>
            </div>
          </div>
        </div>

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

          <div className="filter-group">
            <p>{t.nameShape}</p>
            <div className="chip-row">
              <FilterChip
                label={t.oneWord}
                active={activeFilters.nameShapes.includes("single")}
                onClick={() => toggleFilterArray("nameShapes", "single")}
              />
              <FilterChip
                label={t.multiWord}
                active={activeFilters.nameShapes.includes("multi")}
                onClick={() => toggleFilterArray("nameShapes", "multi")}
              />
            </div>
          </div>

          <div className="filter-group">
            <p>{t.nameLength}</p>
            <div className="chip-row">
              <FilterChip
                label={t.shortName}
                active={activeFilters.nameLengths.includes("short")}
                onClick={() => toggleFilterArray("nameLengths", "short")}
              />
              <FilterChip
                label={t.mediumName}
                active={activeFilters.nameLengths.includes("medium")}
                onClick={() => toggleFilterArray("nameLengths", "medium")}
              />
              <FilterChip
                label={t.longName}
                active={activeFilters.nameLengths.includes("long")}
                onClick={() => toggleFilterArray("nameLengths", "long")}
              />
            </div>
          </div>
        </div>

        <div className="filter-actions">
          <button type="button" className="btn-secondary" onClick={selectVisible}>
            {t.selectVisible}
          </button>
          <button type="button" className="btn-secondary" onClick={deselectVisible}>
            {t.deselectVisible}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setSelectedIds(new Set(allItems.map((item) => item.id)))}
          >
            {t.selectAll}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setSelectedIds(new Set())}>
            {t.deselectAll}
          </button>
          <button type="button" className="btn-secondary" onClick={resetFilters}>
            {t.resetFilters}
          </button>
        </div>

        <p className="filter-counter">
          {t.poolSize}: {visibleItems.filter((item) => selectedIds.has(item.id)).length} {t.fromTotal}{" "}
          {allItems.length}
        </p>

        {visibleItems.length ? (
          <div className="options-scroll" ref={optionsScrollRef}>
            <div className={`options-grid ${activeFilters.viewMode === "list" ? "is-list" : ""}`}>
              {visibleItems.map((item) => (
                <BossOption
                  key={item.id}
                  item={item}
                  lang={lang}
                  selected={selectedIds.has(item.id)}
                  onToggle={toggleSelection}
                  viewMode={activeFilters.viewMode}
                  t={t}
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

const SettingsPanel = ({ t, lang, setLang, theme, setTheme, settings, setSettings }) => (
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
            <select className="select-field" value={lang} onChange={(event) => setLang(event.target.value)}>
              {LANG_OPTIONS.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="settings-block">
          <p>{t.theme}</p>
          <div className="toggle-row">
            {THEMES.map((entry) => (
              <button
                key={entry}
                type="button"
                className={theme === entry ? "is-active" : ""}
                onClick={() => setTheme(entry)}
              >
                {entry === "light" ? t.light : t.dark}
              </button>
            ))}
          </div>
        </div>
      </article>

      <article className="settings-card">
        <h3>{t.audioAndEffects}</h3>

        <div className="settings-block">
          <p>{t.musicVolume}</p>
          <label className="range-wrap">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={Math.round(settings.musicVolume * 100)}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  musicVolume: Number(event.target.value) / 100,
                }))
              }
            />
            <strong>{Math.round(settings.musicVolume * 100)}%</strong>
          </label>
        </div>

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
          <p>{t.splashPopup}</p>
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
          <p>{t.splashEffects}</p>
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
          <p>{t.rollDuration}</p>
          <div className="toggle-row">
            {ROLL_SPEEDS.map((speed) => (
              <button
                key={speed}
                type="button"
                className={settings.rollSpeed === speed ? "is-active" : ""}
                onClick={() => setSettings((prev) => ({ ...prev, rollSpeed: speed }))}
              >
                {speed === "normal" ? t.rollSpeedNormal : speed === "long" ? t.rollSpeedLong : t.rollSpeedEpic}
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
    </div>

    <div className="filter-actions">
      <button type="button" className="btn-secondary" onClick={() => setHistoryFilters(DEFAULT_HISTORY_FILTERS)}>
        {t.resetFilters}
      </button>
      <button
        type="button"
        className="btn-secondary"
        onClick={onDeleteFiltered}
        disabled={!filteredHistory.length}
      >
        {t.deleteFiltered}
      </button>
      <button type="button" className="btn-danger" onClick={onClearAll} disabled={!historyTotal}>
        {t.deleteAllHistory}
      </button>
    </div>

    <p className="filter-counter">
      {t.historyVisible}: {filteredHistory.length} {t.fromTotal} {historyTotal}
    </p>

    {filteredHistory.length ? (
      <div className="history-list">
        {filteredHistory.map((entry) => {
          const knownItem = itemLookup.get(entry.itemId);
          const preview = knownItem?.image || "";
          const displayName =
            lang === "ru" ? entry.itemNameRu || entry.itemName || entry.itemId : entry.itemName || entry.itemId;

          return (
            <article key={entry.id} className="history-item">
              {preview ? (
                <ImageWithFallback
                  src={preview}
                  fallbackSrcs={knownItem?.imageFallbacks}
                  alt={displayName}
                  loading="lazy"
                />
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
                <p className="history-time">
                  {new Date(entry.timestamp).toLocaleString(lang === "ru" ? "ru-RU" : "en-US")}
                </p>
              </div>

              <button type="button" className="btn-secondary" onClick={() => onDeleteOne(entry.id)}>
                {t.deleteOne}
              </button>
            </article>
          );
        })}
      </div>
    ) : (
      <p className="empty-hint">{t.noHistoryItems}</p>
    )}
  </section>
);

const ResultSplashModal = ({ result, t, lang, onClose, effectsEnabled }) => {
  if (!result) {
    return null;
  }

  const item = result.item;
  return (
    <div
      className={`modal-backdrop splash-backdrop ${effectsEnabled ? "with-effects" : ""}`}
      role="dialog"
      aria-modal="true"
    >
      <div className={`splash-modal ${effectsEnabled ? "with-effects" : ""}`}>
        <div className="splash-image-wrap">
          <ImageWithFallback
            src={item.splash || item.image}
            fallbackSrcs={item.splashFallbacks || item.imageFallbacks}
            alt={getItemName(item, lang)}
            loading="lazy"
          />
        </div>
        <div className="splash-content">
          <p className="splash-stage">{result.stage === "characters" ? t.characters : t.bosses}</p>
          <h3>{getItemName(item, lang)}</h3>
          <div className="option-badges">
            {item.rarity ? <ItemBadge text={`${item.rarity}★`} /> : null}
            {item.group ? <ItemBadge text={formatBossType(item.group, lang)} /> : null}
          </div>
        </div>
        <button type="button" className="btn-primary splash-close" onClick={onClose}>
          {t.close}
        </button>
      </div>
    </div>
  );
};

const Roulette = ({
  items,
  selectedItem,
  setSelectedItem,
  t,
  lang,
  rollingLabel,
  rollDurationMs,
  onRollComplete,
  onTick,
}) => {
  const viewportRef = useRef(null);
  const [cardWidth, setCardWidth] = useState(150);
  const [gap] = useState(12);
  const [isRolling, setIsRolling] = useState(false);
  const [displayItems, setDisplayItems] = useState([]);
  const [translateX, setTranslateX] = useState(0);
  const lastTickIndexRef = useRef(null);

  const unit = cardWidth + gap;

  useEffect(() => {
    const resize = () => {
      if (!viewportRef.current) {
        return;
      }

      const viewportWidth = viewportRef.current.clientWidth;
      const nextWidth = Math.max(88, Math.min(172, (viewportWidth - gap * 4) / 5));
      setCardWidth(nextWidth);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [gap]);

  useEffect(() => {
    setDisplayItems(makeRepeatedItems(items));
    setTranslateX(0);
  }, [items]);

  useEffect(() => {
    if (!items.length || isRolling || selectedItem) {
      return undefined;
    }

    const repeatedItems = makeRepeatedItems(items);
    setDisplayItems(repeatedItems);

    if (!repeatedItems.length) {
      return undefined;
    }

    const cycleWidth = items.length * unit;
    let rafId = 0;
    let lastTime = 0;
    let localOffset = 0;

    const tick = (timestamp) => {
      if (!lastTime) {
        lastTime = timestamp;
      }

      const delta = timestamp - lastTime;
      lastTime = timestamp;
      localOffset -= (delta / 1000) * 26;

      if (localOffset <= -cycleWidth) {
        localOffset += cycleWidth;
      }

      setTranslateX(localOffset);
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [items, isRolling, selectedItem, unit]);

  useEffect(() => {
    if (!isRolling || !viewportRef.current) {
      lastTickIndexRef.current = null;
      return;
    }

    const viewportWidth = viewportRef.current.clientWidth;
    const pointerTrackPosition = viewportWidth / 2 - translateX - cardWidth / 2;
    const tickIndex = Math.floor(pointerTrackPosition / unit);

    if (lastTickIndexRef.current === null) {
      lastTickIndexRef.current = tickIndex;
      return;
    }

    if (tickIndex !== lastTickIndexRef.current) {
      lastTickIndexRef.current = tickIndex;
      if (onTick) {
        onTick();
      }
    }
  }, [isRolling, translateX, cardWidth, unit, onTick]);

  const roll = useCallback(() => {
    if (!items.length || isRolling) {
      return;
    }

    const winner = pickRandom(items);
    const finalIndex = 44 + Math.floor(Math.random() * 8);
    const rollItems = buildRollItems(items, finalIndex, winner);

    setDisplayItems(rollItems);

    const viewportWidth = viewportRef.current?.clientWidth || unit * 5 - gap;
    const centerX = viewportWidth / 2;
    const centerOnIndex = (index) => centerX - (index * unit + cardWidth / 2);

    const startValue = centerOnIndex(2);
    const targetValue = centerOnIndex(finalIndex);

    setTranslateX(startValue);
    setSelectedItem(null);
    setIsRolling(true);
    lastTickIndexRef.current = null;

    const startedAt = performance.now();

    const animate = (now) => {
      const elapsed = now - startedAt;
      const progress = Math.min(1, elapsed / rollDurationMs);
      const eased = easeOutCubic(progress);

      setTranslateX(startValue + (targetValue - startValue) * eased);

      if (progress < 1) {
        window.requestAnimationFrame(animate);
      } else {
        setIsRolling(false);
        lastTickIndexRef.current = null;
        setSelectedItem(winner);
        if (onRollComplete) {
          onRollComplete(winner);
        }
      }
    };

    window.requestAnimationFrame(animate);
  }, [items, isRolling, unit, gap, cardWidth, setSelectedItem, rollDurationMs, onRollComplete]);

  return (
    <div className="roulette-block">
      <div className="roulette-shell">
        <div className="roulette-window" ref={viewportRef}>
          <div className="roulette-arrow roulette-arrow-top" />
          <div className="roulette-arrow roulette-arrow-bottom" />

          <div
            className="roulette-track"
            style={{
              transform: `translate3d(${translateX}px, 0, 0)`,
              gap: `${gap}px`,
            }}
          >
            {displayItems.map((item, index) => (
              <article
                key={`${item.id}-${index}`}
                className={`roulette-card ${item.rarity === 5 ? "rarity-5" : item.rarity === 4 ? "rarity-4" : ""}`}
                style={{ width: `${cardWidth}px` }}
              >
                <ImageWithFallback
                  src={item.image}
                  fallbackSrcs={item.imageFallbacks}
                  alt={getItemName(item, lang)}
                  loading="lazy"
                />
                <div className="roulette-card-overlay" />
                <div className="roulette-card-meta">
                  <p>{getItemName(item, lang)}</p>
                  {item.group ? <span className="type-chip">{formatBossType(item.group, lang)}</span> : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="roulette-actions">
        <button type="button" className="btn-primary" onClick={roll} disabled={!items.length || isRolling}>
          {isRolling ? rollingLabel : t.letsGo}
        </button>
      </div>
    </div>
  );
};

function App() {
  const bootRef = useRef(null);
  if (!bootRef.current) {
    bootRef.current = loadInitialState();
  }
  const boot = bootRef.current;

  const [lang, setLang] = useState(boot.lang);
  const [theme, setTheme] = useState(boot.theme);
  const [settings, setSettings] = useState(boot.settings);
  const [activeSection, setActiveSection] = useState(boot.activeSection);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const [rollOrder, setRollOrder] = useState(boot.rollOrder);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [selectedBoss, setSelectedBoss] = useState(null);
  const [splashResult, setSplashResult] = useState(null);

  const [characterFilters, setCharacterFilters] = useState(boot.characterFilters);
  const [bossFilters, setBossFilters] = useState(boot.bossFilters);
  const [historyFilters, setHistoryFilters] = useState(boot.historyFilters);

  const [selectedCharacterIds, setSelectedCharacterIds] = useState(new Set(boot.selectedCharacters));
  const [selectedBossIds, setSelectedBossIds] = useState(new Set(boot.selectedBosses));
  const [rollHistory, setRollHistory] = useState(boot.history);

  const hasPersistedCharacterSelectionRef = useRef(boot.hasCharacterSelection);
  const hasPersistedBossSelectionRef = useRef(boot.hasBossSelection);
  const audioContextRef = useRef(null);
  const musicAudioRef = useRef(null);
  const hasInteractedRef = useRef(false);

  const t = translations[lang] || translations.en;
  const sourceCharacters = data?.meta?.source?.characters || "genshin-db";
  const sourceLegends = data?.meta?.source?.localLegends || "Fandom API";
  const rollDurationMs = ROLL_DURATION_BY_SPEED[settings.rollSpeed] || ROLL_DURATION_BY_SPEED.long;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(
    () => () => {
      if (musicAudioRef.current) {
        try {
          musicAudioRef.current.pause();
        } catch {
          // Ignore media API unavailability in test environments.
        }
        musicAudioRef.current.src = "";
        musicAudioRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    },
    []
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const payload = await fetchGenshinData();
      const safeCharacters = Array.isArray(payload?.characters) ? payload.characters : [];
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

      setData(safePayload);

      setSelectedCharacterIds((prev) => {
        const availableIds = new Set(safeCharacters.map((item) => item.id));
        if (!hasPersistedCharacterSelectionRef.current) {
          return availableIds;
        }
        return new Set([...prev].filter((id) => availableIds.has(id)));
      });

      setSelectedBossIds((prev) => {
        const availableIds = new Set(safeBosses.all.map((item) => item.id));
        if (!hasPersistedBossSelectionRef.current) {
          return availableIds;
        }
        return new Set([...prev].filter((id) => availableIds.has(id)));
      });
    } catch (loadError) {
      setError(loadError?.message || "Failed to load API data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setRollHistory((prev) => prev.slice(0, settings.historyLimit));
  }, [settings.historyLimit]);

  const filteredCharacters = useMemo(() => {
    if (!data?.characters?.length) {
      return [];
    }
    return data.characters.filter((item) => matchesCharacterFilters(item, characterFilters, lang));
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

  const startBackgroundMusic = useCallback(() => {
    if (settings.musicVolume <= MIN_AUDIO_THRESHOLD) {
      return;
    }
    if (process.env.NODE_ENV === "test") {
      return;
    }

    let audio = musicAudioRef.current;
    if (!audio) {
      audio = new Audio(GENSHIN_BACKGROUND_TRACK);
      audio.loop = true;
      audio.preload = "auto";
      audio.crossOrigin = "anonymous";
      musicAudioRef.current = audio;
    }

    audio.volume = settings.musicVolume;
    try {
      const playResult = audio.play();
      if (playResult && typeof playResult.catch === "function") {
        playResult.catch(() => {});
      }
    } catch {
      // Ignore media API unavailability in test environments.
    }
  }, [settings.musicVolume]);

  const stopBackgroundMusic = useCallback(() => {
    if (!musicAudioRef.current) {
      return;
    }
    try {
      musicAudioRef.current.pause();
    } catch {
      // Ignore media API unavailability in test environments.
    }
  }, []);

  useEffect(() => {
    if (!hasInteractedRef.current) {
      return;
    }

    if (settings.musicVolume > MIN_AUDIO_THRESHOLD) {
      startBackgroundMusic();
    } else {
      stopBackgroundMusic();
    }
  }, [settings.musicVolume, startBackgroundMusic, stopBackgroundMusic]);

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

      hasInteractedRef.current = true;
      ensureAudioReady();

      if (settings.musicVolume > MIN_AUDIO_THRESHOLD) {
        startBackgroundMusic();
      }

      playClickSound();
    },
    [ensureAudioReady, playClickSound, settings.musicVolume, startBackgroundMusic]
  );

  const handleRollComplete = useCallback(
    (stage, winner) => {
      const timestamp = new Date().toISOString();
      const entry = {
        id: `${stage}-${winner.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        stage,
        itemId: winner.id,
        itemName: winner.name || winner.id,
        itemNameRu: winner.nameRu || winner.name || winner.id,
        rarity: winner.rarity || null,
        group: winner.group || "",
        timestamp,
      };

      setRollHistory((prev) => [entry, ...prev].slice(0, settings.historyLimit));

      if (settings.splashEnabled) {
        setSplashResult({ stage, item: winner, timestamp });
      }
    },
    [settings.historyLimit, settings.splashEnabled]
  );

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
      theme,
      ...settings,
    });
  }, [lang, theme, settings]);

  useEffect(() => {
    setCookieJson(COOKIE_KEYS.ui, {
      activeSection,
      rollOrder,
    });
  }, [activeSection, rollOrder]);

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
      stage: entry.stage,
      itemId: entry.itemId,
      itemName: entry.itemName,
      itemNameRu: entry.itemNameRu,
      rarity: entry.rarity,
      group: entry.group,
      timestamp: entry.timestamp,
    }));

    setCookieJson(COOKIE_KEYS.history, trimHistoryForCookie(compact));
  }, [rollHistory]);

  const menuItems = [
    { id: "dashboard", label: t.dashboard },
    { id: "characters", label: t.characters },
    { id: "characterPool", label: t.characterPoolMenu },
    { id: "bosses", label: t.bosses },
    { id: "bossPool", label: t.bossPoolMenu },
    { id: "history", label: t.historyMenu },
    { id: "settings", label: t.settingsMenu },
  ];

  const firstStage = rollOrder === "characters" ? "characters" : "bosses";

  const renderRollSummary = (title, item) => (
    <div className="result-card">
      <h4>{title}</h4>
      {!item ? (
        <div className="result-empty">
          <p>{t.notSelected}</p>
        </div>
      ) : (
        <div className="result-content">
          <ImageWithFallback
            src={item.image}
            fallbackSrcs={item.imageFallbacks}
            alt={getItemName(item, lang)}
            loading="lazy"
          />
          <div>
            <p className="result-name">{getItemName(item, lang)}</p>
            {item.rarity ? <span className="type-chip">{item.rarity}★</span> : null}
            {item.group ? <span className="type-chip">{formatBossType(item.group, lang)}</span> : null}
          </div>
        </div>
      )}
    </div>
  );

  const renderStage = (stage) => {
    const isCharacterStage = stage === "characters";
    const pool = isCharacterStage ? characterPool : bossPool;
    const selectedItem = isCharacterStage ? selectedCharacter : selectedBoss;
    const setSelectedItem = isCharacterStage ? setSelectedCharacter : setSelectedBoss;

    return (
      <section className="stage-panel" id={stage}>
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
          <Roulette
            items={pool}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
            t={t}
            lang={lang}
            rollingLabel={t.rolling}
            rollDurationMs={rollDurationMs}
            onRollComplete={(winner) => handleRollComplete(stage, winner)}
            onTick={playRollTickSound}
          />
        )}

        <div className="stage-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setSelectedItem(null)}
            disabled={!selectedItem}
          >
            {isCharacterStage ? t.rerollCharacter : t.rerollBoss}
          </button>

          {rollOrder && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setActiveSection(isCharacterStage ? "bosses" : "characters")}
            >
              {isCharacterStage ? t.goToBosses : t.goToCharacters}
            </button>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="app-shell" onClickCapture={handleGlobalClickCapture}>
      <aside className="sidebar">
        <div className="brand">
          <h1>{t.appTitle}</h1>
          <p>{t.appSubtitle}</p>
        </div>

        <div className="menu-list">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`menu-item ${activeSection === item.id ? "active" : ""}`}
              onClick={() => setActiveSection(item.id)}
            >
              {item.label}
            </button>
          ))}
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
              <section className="dashboard" id="dashboard">
                <div className="panel-head">
                  <h2>{t.dashboard}</h2>
                  <p>{t.chooseFirstSubtitle}</p>
                </div>

                <div className="first-choice-grid">
                  <div className="first-choice-head">
                    <h3>{t.chooseFirstTitle}</h3>
                  </div>

                  <article className="choice-card">
                    <h3>{t.characters}</h3>
                    <p>{t.stageHintCharacters}</p>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        setRollOrder("characters");
                        setActiveSection("characters");
                      }}
                    >
                      {t.pickCharactersFirst}
                    </button>
                  </article>

                  <article className="choice-card">
                    <h3>{t.bosses}</h3>
                    <p>{t.stageHintBosses}</p>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        setRollOrder("bosses");
                        setActiveSection("bosses");
                      }}
                    >
                      {t.pickBossesFirst}
                    </button>
                  </article>
                </div>

                {rollOrder ? (
                  <div className="order-locked">
                    <div>
                      <h3>{t.orderLocked}</h3>
                      <p>
                        {t.characters}: {firstStage === "characters" ? "1" : "2"} | {t.bosses}:{" "}
                        {firstStage === "bosses" ? "1" : "2"}
                      </p>
                    </div>
                    <button type="button" className="btn-secondary" onClick={() => setRollOrder(null)}>
                      {t.resetOrder}
                    </button>
                  </div>
                ) : null}

                <div className="stats-grid">
                  <article className="stat-card">
                    <p>{t.characters}</p>
                    <strong>{data.characters.length}</strong>
                  </article>
                  <article className="stat-card">
                    <p>{t.weekly}</p>
                    <strong>{data.bosses.weekly.length}</strong>
                  </article>
                  <article className="stat-card">
                    <p>{t.ascension}</p>
                    <strong>{data.bosses.ascension.length}</strong>
                  </article>
                  <article className="stat-card">
                    <p>{t.localLegends}</p>
                    <strong>{data.bosses.localLegends.length}</strong>
                  </article>
                  <article className="stat-card">
                    <p>{t.total}</p>
                    <strong>{data.bosses.all.length}</strong>
                  </article>
                </div>

                <div className="result-grid">
                  {renderRollSummary(t.pickedCharacter, selectedCharacter)}
                  {renderRollSummary(t.pickedBoss, selectedBoss)}
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
              />
            )}
            {activeSection === "settings" && (
              <SettingsPanel
                t={t}
                lang={lang}
                setLang={setLang}
                theme={theme}
                setTheme={setTheme}
                settings={settings}
                setSettings={setSettings}
              />
            )}
          </>
        )}
      </main>

      <ResultSplashModal
        result={splashResult}
        t={t}
        lang={lang}
        onClose={() => setSplashResult(null)}
        effectsEnabled={settings.splashEffects}
      />
    </div>
  );
}

export default App;

