// Newest first. Kept separately because the upstream public character index
// is alphabetized and does not expose the in-game release date.
export const CHARACTER_RELEASE_ORDER = [
  // Newest released versions first; add newly released characters here.
  "vesna", "vodyanitsa", "odette", "alyosha", "sandrone", "lohen", "nicole", "prune",
  "linnea", "varka", "zibai", "columbina", "illuga", "durin", "jahoda",
  "nefer", "flins", "lauma", "aino",
  "ineffa", "skirk", "dahlia",
  "escoffier", "ifa", "varesa", "iansan", "lanyan",
  "mavuika", "citlali", "ororon", "chasca", "xilonen", "kinich",
  "mualani", "kachina",
  "emilie", "sethos", "clorinde", "sigewinne", "arlecchino", "chiori", "gaming", "xianyun", "chevreuse",
  "navia", "furina", "charlotte", "wriothesley", "neuvillette", "freminet", "lynette", "lyney",
  "kirara", "kaveh", "baizhu", "mika", "dehya", "yaoyao", "alhaitham", "faruzan", "wanderer",
  "layla", "nahida", "candace", "cyno", "dori", "collei", "tighnari",
  "heizou", "kukishinobu", "yelan", "yunjin", "shenhe", "aratakiitto", "gorou", "thoma",
  "sangonomiyakokomi", "raidenshogun", "kujousara", "aloy", "sayu", "yoimiya", "kaedeharakazuha",
  "kamisatoayato", "kamisatoayaka", "yaemiko", "rosaria",
  "eula", "yanfei", "zhongli", "xiao", "hutao", "ganyu", "albedo", "tartaglia", "diona",
  "xinyan", "klee", "venti", "jean", "diluc", "mona", "qiqi", "keqing", "ningguang", "beidou",
  "chongyun", "sucrose", "fischl", "bennett", "xingqiu", "xiangling", "razor", "noelle", "barbara",
  "amber", "kaeya", "lisa", "traveler-duo",
];

const releaseRank = new Map(CHARACTER_RELEASE_ORDER.map((id, index) => [id.replace(/\s/g, ""), index]));

export const sortCharactersNewestFirst = (characters) => [...characters].sort((left, right) => {
  const leftDate = Date.parse(left.releaseDate || "");
  const rightDate = Date.parse(right.releaseDate || "");
  if (Number.isFinite(leftDate) && Number.isFinite(rightDate) && leftDate !== rightDate) return rightDate - leftDate;
  if (Number.isFinite(leftDate) !== Number.isFinite(rightDate)) return Number.isFinite(rightDate) - Number.isFinite(leftDate);

  const leftRank = releaseRank.get(String(left.id || "").toLowerCase().replace(/[^a-z0-9]/g, ""));
  const rightRank = releaseRank.get(String(right.id || "").toLowerCase().replace(/[^a-z0-9]/g, ""));
  if (leftRank === undefined && rightRank !== undefined) return 1;
  if (rightRank === undefined && leftRank !== undefined) return -1;
  if (leftRank !== rightRank) return leftRank - rightRank;
  return String(left.name || "").localeCompare(String(right.name || ""));
});
