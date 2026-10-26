import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "src", "data", "bossDetails.json");

// Short, editable route and encounter notes. Every field is maintained in the
// same five locales as the rest of the boss hover card.
const additions = {
  childe: {
    location: {
      en: ["Liyue", "Liyue Harbor", "Enter the Golden House"], ru: ["Ли Юэ", "Гавань Ли Юэ", "Золотая палата"],
      zh: ["璃月", "璃月港", "黄金屋"], ja: ["璃月", "璃月港", "黄金屋"], ko: ["리월", "리월항", "황금옥"],
    },
    details: { en: "A weekly challenge in the Golden House. The encounter has three phases and unlocks through the Liyue Archon Quest.", ru: "Еженедельное испытание в Золотой палате. Бой состоит из трёх фаз; доступ открывается по заданию Архонтов в Ли Юэ.", zh: "黄金屋中的每周挑战。战斗分为三个阶段，完成璃月魔神任务后解锁。", ja: "黄金屋で挑戦できる週ボス。戦闘は3段階あり、璃月の魔神任務を進めると解放されます。", ko: "황금옥에서 도전하는 주간 보스입니다. 전투는 3단계로 진행되며 리월 마신 임무를 통해 해금됩니다。" },
  },
  goldenwolflord: {
    details: { en: "Found in the southern part of Tsurumi Island. Geo attacks are useful for destroying the Rifthound Skulls and breaking its shield.", ru: "Находится в южной части острова Цуруми. Гео-атаки помогают уничтожать черепа гончих разлома и пробивать щит босса.", zh: "位于鹤观岛南部。使用岩元素攻击可以快速击破兽境之狼的兽境犬首与护盾。", ja: "鶴観島の南部にいます。侵蝕の牙を破壊してシールドを削るには、岩元素攻撃が有効です。", ko: "츠루미섬 남쪽에 있습니다. 균열의 늑대 머리와 보호막을 파괴할 때 바위 원소 공격이 유용합니다。" },
  },
  jadeplumeterrorshroom: {
    details: { en: "The arena is in an underground clearing in northwestern Sumeru. Enter the nearby portal to reach it; no Archon Quest prerequisite is required.", ru: "Арена расположена на подземной поляне на северо-западе Сумеру. Войдите в ближайший портал; проходить задания Архонтов для доступа не нужно.", zh: "战场位于须弥西北部的地下空地。进入附近的传送门即可抵达，无需先完成魔神任务。", ja: "スメール北西部の地下にある広場が闘技場です。近くの入口から入れます。魔神任務の進行は必要ありません。", ko: "수메르 북서쪽 지하 공터에 투기장이 있습니다. 근처 포털로 들어가면 되며 마신 임무를 먼저 진행할 필요는 없습니다。" },
  },
  chimericwingedlion: {
    location: {
      en: ["Snezhnaya", "Volkodlak Tundra", "West of Sretomorozsk, near Hunter's Cabin"], ru: ["Снежная", "Тундра Волкодлак", "К западу от Сретоморозска, рядом с Охотничьей хижиной"],
      zh: ["至冬", "沃尔科达克苔原", "斯列托莫罗兹克以西，猎人小屋附近"], ja: ["スネージナヤ", "ヴォルコダク・ツンドラ", "スレトモロズスク西側、狩人の小屋付近"], ko: ["스네즈나야", "볼코닥 툰드라", "스레토모로즈스크 서쪽, 사냥꾼의 오두막 근처"],
    },
    details: { en: "Its arena lies northwest of Sretomorozsk near Hunter's Cabin. The regional Archon Quest opens convenient travel routes to the area.", ru: "Арена находится к северо-западу от Сретоморозска, рядом с Охотничьей хижиной. Задание Архонтов региона открывает удобные пути к этой области.", zh: "战场位于斯列托莫罗兹克西北侧、猎人小屋附近。推进当地魔神任务可解锁前往该区域的便捷路线。", ja: "スレトモロズスク北西、狩人の小屋付近にいます。地域の魔神任務を進めると、ここへ向かう移動手段が利用しやすくなります。", ko: "스레토모로즈스크 북서쪽 사냥꾼의 오두막 근처에 있습니다. 지역 마신 임무를 진행하면 이곳으로 이동하기 편해집니다。" },
  },
  guardianbladeofdriftingsnow: {
    location: {
      en: ["Snezhnaya", "Fellfrost Peak", "Tidesong Cavern, south of the House of Hesperides"], ru: ["Снежная", "Пик Леденящего инея", "Пещера Приливной песни, к югу от Дома Гесперид"],
      zh: ["至冬", "霜落之巅", "潮歌洞窟，赫斯珀里得斯之家以南"], ja: ["スネージナヤ", "フェルフロスト・ピーク", "ヘスペリデスの館の南、タイドソング洞窟"], ko: ["스네즈나야", "펠프로스트 봉우리", "헤스페리데스의 집 남쪽, 타이드송 동굴"],
    },
    details: { en: "The arena is beside a frozen pool in eastern Snezhnaya. Teleport to the waypoint south of Tidesong Cavern Meeting Point, then head east across the ice.", ru: "Арена находится у замёрзшего озера на востоке Снежной. Переместитесь к точке к югу от места встречи в Пещере Приливной песни и идите на восток по льду.", zh: "战场位于至冬东部的冰湖旁。传送至潮歌洞窟会合点南侧的锚点，再沿冰面向东前进。", ja: "スネージナヤ東部の凍った池のそばにいます。タイドソング洞窟の集合地点より南のワープポイントから、氷上を東へ進みます。", ko: "스네즈나야 동부의 얼어붙은 연못 옆에 있습니다. 타이드송 동굴 만남 지점 남쪽 워프 포인트로 이동한 뒤 얼음 위를 동쪽으로 가세요。" },
  },
  immortalconstruct: {
    location: {
      en: ["Snezhnaya", "Everfrozen Earth", "Cavern southwest of Snezhnograd, between the capital and Morepesok"], ru: ["Снежная", "Вечная мерзлота", "Пещера к юго-западу от Снежнограда, между столицей и Морепеском"],
      zh: ["至冬", "永冻之地", "斯涅日诺格勒西南方、首都与莫列佩索克之间的洞窟"], ja: ["スネージナヤ", "エヴァーフローズン・アース", "首都とモレペソクの間、スネージノグラード南西の洞窟"], ko: ["스네즈나야", "영구 동토", "수도와 모레페소크 사이, 스네즈노그라드 남서쪽 동굴"],
    },
    details: { en: "It waits inside a cavern southwest of Snezhnograd. Exit the train near the ravine, glide down, and follow the northern path to the cave waypoint.", ru: "Босс находится в пещере к юго-западу от Снежнограда. Выйдите из поезда у ущелья, спланируйте вниз и следуйте по северной тропе к точке у пещеры.", zh: "首领位于斯涅日诺格勒西南方的洞窟内。在峡谷附近下车后滑翔向下，沿北侧道路前往洞窟旁的锚点。", ja: "スネージノグラード南西の洞窟内にいます。峡谷付近で列車を降りて滑空し、北へ続く道を洞窟前のワープポイントまで進みます。", ko: "스네즈노그라드 남서쪽 동굴 안에 있습니다. 협곡 근처에서 열차를 내린 뒤 활공하고, 북쪽 길을 따라 동굴 앞 워프 포인트로 가세요。" },
  },
  ildottore: {
    names: { en: "Il Dottore", ru: "Иль Дотторе", zh: "「博士」", ja: "「博士」", ko: "「박사」" },
    location: {
      en: ["Nod-Krai", "False Moon Institute", "Binding Field of Universal Nirvana"], ru: ["Нод-Край", "Институт Ложной Луны", "«Узы всеобщей нирваны»"],
      zh: ["挪德卡莱", "虚月研究院", "「普世涅槃之缚」"], ja: ["ノド・クライ", "偽月研究院", "「普遍涅槃の結縛」"], ko: ["노드크라이", "거짓 달 연구소", "보편적 열반의 속박"],
    },
    details: { en: "The weekly encounter takes place in the Binding Field of Universal Nirvana at the False Moon Institute. Progress through the Song of the Welkin Moon Archon Quest to unlock it.", ru: "Еженедельный бой проходит в подземелье «Узы всеобщей нирваны» при Институте Ложной Луны. Для доступа пройдите задание Архонтов «Песнь полой луны».", zh: "周常挑战位于虚月研究院的「普世涅槃之缚」。推进「空月之歌」魔神任务即可解锁。", ja: "週ボスは偽月研究院の征討領域「普遍涅槃の結縛」に出現します。魔神任務「空月の歌」を進めると解放されます。", ko: "주간 보스는 거짓 달 연구소의 ‘보편적 열반의 속박’ 비경에서 만날 수 있습니다. 마신 임무 ‘공월의 노래’를 진행하면 해금됩니다。" },
  },
  thedoctor: {
    location: {
      en: ["Nod-Krai", "False Moon Institute", "Binding Field of Universal Nirvana"], ru: ["Нод-Край", "Институт Ложной Луны", "«Узы всеобщей нирваны»"],
      zh: ["挪德卡莱", "虚月研究院", "「普世涅槃之缚」"], ja: ["ノド・クライ", "偽月研究院", "「普遍涅槃の結縛」"], ko: ["노드크라이", "거짓 달 연구소", "보편적 열반의 속박"],
    },
    details: { en: "The weekly encounter takes place in the Binding Field of Universal Nirvana at the False Moon Institute. Progress through the Song of the Welkin Moon Archon Quest to unlock it.", ru: "Еженедельный бой проходит в подземелье «Узы всеобщей нирваны» при Институте Ложной Луны. Для доступа пройдите задание Архонтов «Песнь полой луны».", zh: "周常挑战位于虚月研究院的「普世涅槃之缚」。推进「空月之歌」魔神任务即可解锁。", ja: "週ボスは偽月研究院の征討領域「普遍涅槃の結縛」に出現します。魔神任務「空月の歌」を進めると解放されます。", ko: "주간 보스는 거짓 달 연구소의 ‘보편적 열반의 속박’ 비경에서 만날 수 있습니다. 마신 임무 ‘공월의 노래’를 진행하면 해금됩니다。" },
  },
  lasignora: {
    location: {
      en: ["Inazuma", "Inazuma City", "Tenshukaku"], ru: ["Инадзума", "Город Инадзума", "Тэнсюкаку"], zh: ["稻妻", "稻妻城", "天守阁"], ja: ["稲妻", "稲妻城", "天守閣"], ko: ["이나즈마", "이나즈마성", "텐료 봉행 본부"],
    },
    details: { en: "Challenge La Signora inside Tenshukaku in Inazuma City. The weekly domain becomes available after the related Inazuma Archon Quest.", ru: "Сразитесь с Синьорой в Тэнсюкаку, в городе Инадзума. Еженедельное подземелье открывается после соответствующего задания Архонтов Инадзумы.", zh: "在稻妻城天守阁挑战女士。完成对应的稻妻魔神任务后即可开启周常征讨领域。", ja: "稲妻城の天守閣で淑女に挑戦できます。稲妻の該当する魔神任務を終えると週ボス領域が解放されます。", ko: "이나즈마성 텐료 봉행 본부에서 시뇨라에게 도전할 수 있습니다. 관련 이나즈마 마신 임무를 완료하면 주간 비경이 열립니다。" },
  },
  magatsumitakenarukaminomikoto: {
    location: {
      en: ["Inazuma", "Grand Narukami Shrine", "End of the Oneiric Euthymia"], ru: ["Инадзума", "Великий храм Наруками", "Конец Царства онейроса"],
      zh: ["稻妻", "鸣神大社", "梦想乐土之殁"], ja: ["稲妻", "鳴神大社", "夢想楽土の結末"], ko: ["이나즈마", "나루카미 다이샤", "몽상 낙토의 죽음"],
    },
    details: { en: "The weekly challenge is beneath the Grand Narukami Shrine. Complete Raiden Shogun's second Story Quest to unlock the End of the Oneiric Euthymia.", ru: "Еженедельное испытание находится под Великим храмом Наруками. Пройдите второе задание легенд Райдэн, чтобы открыть «Конец Царства онейроса».", zh: "周常挑战位于鸣神大社下方。完成雷电将军的第二章传说任务即可解锁「梦想乐土之殁」。", ja: "週ボスは鳴神大社の地下にいます。雷電将軍の伝説任務第二幕をクリアすると「夢想楽土の結末」が解放されます。", ko: "주간 도전은 나루카미 다이샤 지하에 있습니다. 라이덴 쇼군 전설 임무 제2막을 완료하면 ‘몽상 낙토의 죽음’이 해금됩니다。" },
  },
  perpetualmechanicalarray: {
    location: {
      en: ["Inazuma", "Narukami Island", "Underground arena; portal on Jinren Island"], ru: ["Инадзума", "Остров Наруками", "Подземная арена; портал на острове Дзинрэн"],
      zh: ["稻妻", "鸣神岛", "地下战场；入口位于刃连岛"], ja: ["稲妻", "鳴神島", "地下闘技場。刃連島に入口あり"], ko: ["이나즈마", "나루카미섬", "지하 투기장; 진렌섬에 입구가 있음"],
    },
    details: { en: "The arena is underground north of Narukami Island. Reach Jinren Island and use the portal near the northern coast to enter.", ru: "Арена находится под землёй к северу от острова Наруками. Доберитесь до острова Дзинрэн и воспользуйтесь порталом у его северного побережья.", zh: "战场位于鸣神岛以北的地下。前往刃连岛，使用北部海岸附近的传送门进入。", ja: "闘技場は鳴神島の北側の地下にあります。刃連島へ向かい、北岸近くのワープゲートから入りましょう。", ko: "투기장은 나루카미섬 북쪽 지하에 있습니다. 진렌섬으로 이동해 북쪽 해안 근처의 포털을 이용하세요。" },
  },
  radiantmoongecko: {
    details: { en: "The arena is deep underground in Afterglow Cavern, Wavechaser Plain. Follow the cavern route from a nearby Nod-Krai waypoint; claiming rewards costs 40 Resin.", ru: "Арена находится глубоко под землёй в Пещере послесвечения, на Равнине волн. Идите по пещерному пути от ближайшей точки Нод-Края; получение наград стоит 40 единиц Первородной смолы.", zh: "战场位于逐光洞窟深处的地下区域，地处逐浪原。从挪德卡莱附近的锚点沿洞窟路线前往；领取奖励需要消耗40点原粹树脂。", ja: "戦場は波追いの平原にある残光の洞窟の奥深く、地下にあります。ノド・クライの近くのワープポイントから洞窟を進みます。報酬受取には天然樹脂40個が必要です。", ko: "투기장은 파도 사냥 평원에 있는 여광 동굴 깊은 지하에 있습니다. 노드크라이의 가까운 워프 포인트에서 동굴 길을 따라가세요. 보상 수령에는 레진 40개가 필요합니다。" },
  },
  "local-legend-geovishap": {
    location: {
      en: ["Liyue", "Chenyu Vale", "East of Chizhang Wall"], ru: ["Ли Юэ", "Долина Чэньюй", "К востоку от Стены Чичжан"],
      zh: ["璃月", "沉玉谷", "赤璋城垣以东"], ja: ["璃月", "沈玉の谷", "赤璋の城垣の東"], ko: ["리월", "침옥 협곡", "적장 성벽 동쪽"],
    },
    details: { en: "Yiji and Tianyu patrol an open field east of Chizhang Wall. They can revive one another, so lower both to low HP and defeat them almost simultaneously.", ru: "Ицзи и Тяньюй патрулируют открытую местность к востоку от Стены Чичжан. Они могут воскресить друг друга, поэтому ослабьте обоих и победите почти одновременно.", zh: "异迹与天宇在赤璋城垣以东的旷地巡逻。它们能够互相复苏，建议先同时削弱，再几乎同时击败。", ja: "異跡と天宇は赤璋の城垣の東にある平地を巡回しています。互いに復活させるため、両方のHPを削ってからほぼ同時に倒しましょう。", ko: "이적과 천우는 적장 성벽 동쪽의 들판을 순찰합니다. 서로를 부활시킬 수 있으므로 두 보스의 체력을 함께 낮춘 뒤 거의 동시에 처치하세요。" },
  },
  watcherfallenvigil: {
    location: {
      en: ["Mondstadt", "Windrest Peak", "North of the Old Sanatorium Site"], ru: ["Мондштадт", "Пик Ветрового Покоя", "К северу от руин Старого санатория"],
      zh: ["蒙德", "风憩之峰", "旧疗养院遗址以北"], ja: ["モンド", "ウィンドレスト峰", "旧サナトリウム跡地の北"], ko: ["몬드", "윈드레스트 봉우리", "옛 요양원 터 북쪽"],
    },
    details: { en: "This world boss stands on the surface at Windrest Peak, north of the Old Sanatorium Site. No quest prerequisite is needed; activate the nearby waypoint for quick returns.", ru: "Мировой босс находится на поверхности Пика Ветрового Покоя, к северу от руин Старого санатория. Задание для доступа не требуется; активируйте ближайшую точку телепортации.", zh: "该世界首领位于风憩之峰地表、旧疗养院遗址以北。无需完成前置任务；建议先开启附近的传送锚点。", ja: "ワールドボスはウィンドレスト峰の地上、旧サナトリウム跡地の北にいます。前提任務は不要です。近くのワープポイントを解放すると便利です。", ko: "필드 보스는 윈드레스트 봉우리 지상, 옛 요양원 터 북쪽에 있습니다. 선행 임무는 필요 없으며 가까운 워프 포인트를 활성화해 두면 편리합니다。" },
  },
  "local-legend-fatuiskirmisherpyroslingerbracer": {
    location: {
      en: ["Natlan", "Basin of Unnumbered Flames", "Huitztli Hill"], ru: ["Натлан", "Бассейн бесчисленных огней", "Холм Уицтли"],
      zh: ["纳塔", "无数火之盆地", "维茨特兰山"], ja: ["ナタ", "無数の炎の盆地", "ウィツトラン山"], ko: ["나타", "무수한 불꽃의 분지", "위츠틀란 언덕"],
    },
    details: { en: "One of the three Polychrome Tri-Stars local legends. The group is found at Huitztli Hill in the Basin of Unnumbered Flames, Natlan.", ru: "Одна из трёх местных легенд «Полихромные три звезды». Группа находится на холме Уицтли в Бассейне бесчисленных огней, Натлан.", zh: "「彩绘三重星」三位地方传奇之一。它们位于纳塔无数火之盆地的维茨特兰山。", ja: "地方伝説「彩色の三連星」の一体です。ナタの無数の炎の盆地、ウィツトラン山に3体で出現します。", ko: "지역 전설 ‘폴리크롬 트라이스타’ 세 명 중 하나입니다. 나타의 무수한 불꽃의 분지, 위츠틀란 언덕에서 세 명이 함께 나타납니다。" },
  },
  "local-legend-fatuiskirmishercryogunnerlegionnaire": {
    location: {
      en: ["Natlan", "Basin of Unnumbered Flames", "Huitztli Hill"], ru: ["Натлан", "Бассейн бесчисленных огней", "Холм Уицтли"],
      zh: ["纳塔", "无数火之盆地", "维茨特兰山"], ja: ["ナタ", "無数の炎の盆地", "ウィツトラン山"], ko: ["나타", "무수한 불꽃의 분지", "위츠틀란 언덕"],
    },
    details: { en: "One of the three Polychrome Tri-Stars local legends. The group is found at Huitztli Hill in the Basin of Unnumbered Flames, Natlan.", ru: "Одна из трёх местных легенд «Полихромные три звезды». Группа находится на холме Уицтли в Бассейне бесчисленных огней, Натлан.", zh: "「彩绘三重星」三位地方传奇之一。它们位于纳塔无数火之盆地的维茨特兰山。", ja: "地方伝説「彩色の三連星」の一体です。ナタの無数の炎の盆地、ウィツトラン山に3体で出現します。", ko: "지역 전설 ‘폴리크롬 트라이스타’ 세 명 중 하나입니다. 나타의 무수한 불꽃의 분지, 위츠틀란 언덕에서 세 명이 함께 나타납니다。" },
  },
  "local-legend-fatuiskirmisherelectrohammervanguard": {
    location: {
      en: ["Natlan", "Basin of Unnumbered Flames", "Huitztli Hill"], ru: ["Натлан", "Бассейн бесчисленных огней", "Холм Уицтли"],
      zh: ["纳塔", "无数火之盆地", "维茨特兰山"], ja: ["ナタ", "無数の炎の盆地", "ウィツトラン山"], ko: ["나타", "무수한 불꽃의 분지", "위츠틀란 언덕"],
    },
    details: { en: "One of the three Polychrome Tri-Stars local legends. The group is found at Huitztli Hill in the Basin of Unnumbered Flames, Natlan.", ru: "Одна из трёх местных легенд «Полихромные три звезды». Группа находится на холме Уицтли в Бассейне бесчисленных огней, Натлан.", zh: "「彩绘三重星」三位地方传奇之一。它们位于纳塔无数火之盆地的维茨特兰山。", ja: "地方伝説「彩色の三連星」の一体です。ナタの無数の炎の盆地、ウィツトラン山に3体で出現します。", ko: "지역 전설 ‘폴리크롬 트라이스타’ 세 명 중 하나입니다. 나타의 무수한 불꽃의 분지, 위츠틀란 언덕에서 세 명이 함께 나타납니다。" },
  },
};

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
for (const [id, addition] of Object.entries(additions)) {
  const record = catalog[id];
  if (!record) throw new Error(`Missing boss record: ${id}`);
  for (const locale of ["en", "ru", "zh", "ja", "ko"]) {
    if (addition.names?.[locale]) record.names[locale] = addition.names[locale];
    if (addition.details?.[locale]) record.details[locale] = addition.details[locale];
    if (addition.location?.[locale]) {
      const [region, area, subarea] = addition.location[locale];
      record.location[locale] = { region, area, subarea };
    }
  }
}
const transliterations = {
  "local-legend-churldric": { ru: "Чурлдрик", zh: "丘尔德里克", ja: "チュルドリック", ko: "처들드릭" },
  "local-legend-prism-slime": { ru: "Призматический слайм", zh: "棱镜史莱姆", ja: "プリズムスライム", ko: "프리즘 슬라임" },
  "local-legend-mushteshir": { ru: "Муштешир", zh: "穆什特希尔", ja: "ムシュテシール", ko: "무슈테시르" },
};
for (const [id, names] of Object.entries(transliterations)) {
  Object.assign(catalog[id].names, names);
}
await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Added localized route and encounter notes for ${Object.keys(additions).length} bosses.`);
