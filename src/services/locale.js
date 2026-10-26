const COUNTRY_CACHE_KEY = "genshin-random-lab-country-v1";
const COUNTRY_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

const RUSSIAN_SPEAKING_COUNTRIES = new Set([
  "RU", "BY", "KZ", "KG", "TJ", "UZ", "MD", "AM", "AZ", "UA",
]);

export const getLanguageForCountry = (countryCode) => {
  const country = String(countryCode || "").trim().toUpperCase();
  if (["CN", "HK", "MO", "TW"].includes(country)) return "zh";
  if (country === "JP") return "ja";
  if (country === "KR") return "ko";
  if (RUSSIAN_SPEAKING_COUNTRIES.has(country)) return "ru";
  return country ? "en" : null;
};

export const getBrowserLanguage = (languages = typeof navigator !== "undefined" ? navigator.languages : [], timeZone = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; }
})()) => {
  if (/^Asia\/(Shanghai|Urumqi|Hong_Kong|Macau|Taipei)$/.test(timeZone)) return "zh";
  if (timeZone === "Asia/Tokyo") return "ja";
  if (timeZone === "Asia/Seoul") return "ko";
  if (/^(Europe\/(Moscow|Kaliningrad|Samara|Volgograd|Saratov|Ulyanovsk|Astrakhan|Minsk|Kyiv|Simferopol|Chisinau)|Asia\/(Almaty|Aqtau|Aqtobe|Atyrau|Oral|Qostanay|Qyzylorda|Bishkek|Tashkent|Samarkand|Dushanbe|Yerevan|Baku|Yekaterinburg|Omsk|Novosibirsk|Barnaul|Tomsk|Krasnoyarsk|Novokuznetsk|Irkutsk|Chita|Yakutsk|Khandyga|Vladivostok|Ust-Nera|Magadan|Sakhalin|Srednekolymsk|Anadyr|Kamchatka))/.test(timeZone)) return "ru";
  for (const locale of languages || []) {
    const base = String(locale).toLowerCase().split(/[-_]/)[0];
    if (["ru", "en", "zh", "ja", "ko"].includes(base)) return base;
  }
  return "en";
};

export const fetchVisitorCountry = async () => {
  if (typeof window === "undefined") return null;
  try {
    const cached = JSON.parse(window.localStorage.getItem(COUNTRY_CACHE_KEY) || "null");
    if (cached && Date.now() - cached.savedAt < COUNTRY_CACHE_TTL && /^[A-Z]{2}$/.test(cached.country)) {
      return cached.country;
    }
  } catch { /* Ignore unavailable or malformed browser storage. */ }

  try {
    const response = await fetch("https://ipapi.co/country/", { headers: { Accept: "text/plain" } });
    if (!response.ok) return null;
    const country = (await response.text()).trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) return null;
    try { window.localStorage.setItem(COUNTRY_CACHE_KEY, JSON.stringify({ country, savedAt: Date.now() })); } catch { /* Storage is optional. */ }
    return country;
  } catch {
    return null;
  }
};
