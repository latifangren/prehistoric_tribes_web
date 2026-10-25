import { ZH_LANGUAGE } from "./text/LegacyZhText";

export type BestiaryEntry = {
  id: string;
  name: { en: string; zh: string; id: string };
  category: { en: string; zh: string; id: string };
  danger: string; // e.g. "⭐⭐⭐⭐⭐"
  icon: string; // emoji or art
  assetIcon?: string;
  hp: number;
  speed: { en: string; zh: string; id: string };
  drops: { en: string; zh: string; id: string };
  traits: { en: string; zh: string; id: string };
  tactics: { en: string; zh: string; id: string };
};

export const BESTIARY_ENTRIES: readonly BestiaryEntry[] = [
  {
    id: "mammoth",
    name: {
      en: "Woolly Mammoth",
      zh: "猛犸巨象",
      id: "Mamut Berbulu",
    },
    category: {
      en: "Megafauna (Wild Beast)",
      zh: "史前巨兽（凶猛）",
      id: "Megafauna (Predator)",
    },
    danger: "⭐⭐⭐⭐⭐",
    icon: "🦣",
    assetIcon: "bone-mace",
    hp: 120,
    speed: {
      en: "Slow / Heavy charge",
      zh: "缓慢 / 狂怒冲锋",
      id: "Lambat / Tabrakan Berat",
    },
    drops: {
      en: "18 Meat, 8 Bones",
      zh: "18 鲜肉, 8 骨骼材料",
      id: "18 Daging, 8 Tulang",
    },
    traits: {
      en: "Massive prehistoric elephant with thick fur and sweeping tusks. Aggressive when approached.",
      zh: "拥有厚重长毛与巨型獠牙的冰河霸主，领地意识极强，遭受攻击时会展开强力反扑。",
      id: "Gajah purba raksasa berbulu tebal dengan gading melengkung. Menyerang balik dengan keras.",
    },
    tactics: {
      en: "Do not hunt alone. Form up a squad of 4+ spear hunters, or lure it into pit traps near your base.",
      zh: "切勿单挑！召集至少 4 名手持长矛的猎人编队合围，或将其引诱至预设陷阱陷坑中。",
      id: "Jangan berburu sendirian. Bentuk regu 4+ pemburu bertombak atau giring ke jebakan lubang.",
    },
  },
  {
    id: "saber_tiger",
    name: {
      en: "Saber-toothed Tiger",
      zh: "剑齿凶虎",
      id: "Harimau Taring Pedang",
    },
    category: {
      en: "Apex Carnivore",
      zh: "顶级肉食猛兽",
      id: "Karnivora Puncak",
    },
    danger: "⭐⭐⭐⭐",
    icon: "🐅",
    assetIcon: "tomahawk",
    hp: 70,
    speed: {
      en: "Extremely Swift",
      zh: "极其迅疾",
      id: "Sangat Gesit",
    },
    drops: {
      en: "12 Meat, 4 Bones",
      zh: "12 鲜肉, 4 骨骼材料",
      id: "12 Daging, 4 Tulang",
    },
    traits: {
      en: "Fierce predator with serrated canine teeth. Hunts down solitary villagers gathering resources in deep forests.",
      zh: "拥有尖利如刀匕首巨齿的凶猛掠食者，擅长伏击林中落单砍树或采石的孤立村民。",
      id: "Predator ganas bergigi taring belati. Mengintai warga yang sendirian mengumpulkan kayu di hutan.",
    },
    tactics: {
      en: "Build watchtowers along outer borders and sound Call to Arms as soon as one approaches the village.",
      zh: "在村落外围建造岗哨箭塔，发现目标靠近立即敲响集结号角（Call to Arms）全员迎击。",
      id: "Bangun menara pengawas di batas desa dan bunyikan Call to Arms begitu predator mendekat.",
    },
  },
  {
    id: "giant_deer",
    name: {
      en: "Prehistoric Megaloceros",
      zh: "远古大角鹿",
      id: "Rusa Purba Megaloceros",
    },
    category: {
      en: "Docile Herbivore",
      zh: "温顺食草动物",
      id: "Herbivora Jinak",
    },
    danger: "⭐",
    icon: "🦌",
    assetIcon: "sk-basket-meat",
    hp: 40,
    speed: {
      en: "Agile Runner",
      zh: "轻灵奔跃",
      id: "Pelari Cepat",
    },
    drops: {
      en: "10 Fresh Meat",
      zh: "10 优质鲜肉",
      id: "10 Daging Segar",
    },
    traits: {
      en: "Peaceful herbivore with sprawling antlers. Does not fight back, but darts away swiftly when threatened.",
      zh: "头顶巨型扁角的美丽生灵，性格温顺毫无攻击性，遇袭后会拼命四散奔逃脱离战场。",
      id: "Herbivora bertanduk megah yang damai. Tidak menyerang balik tetapi gesit melarikan diri.",
    },
    tactics: {
      en: "Lay net traps or position hunters on multiple sides to cut off escape paths toward map edges.",
      zh: "布置藤蔓捕兽网，或者指派多名猎人从两侧包抄拦截，防止其逃脱出地图边缘。",
      id: "Pasang perangkap jaring atau kepung dari beberapa sisi agar tidak kabur ke batas peta.",
    },
  },
  {
    id: "rival_raiders",
    name: {
      en: "Rival Clan Raiders",
      zh: "敌对氏族掠夺者",
      id: "Penyerang Suku Lawan",
    },
    category: {
      en: "Hostile Tribe (Team 1)",
      zh: "敌对氏族战团",
      id: "Suku Lawan (Tim 1)",
    },
    danger: "⭐⭐⭐⭐",
    icon: "🪓",
    assetIcon: "club",
    hp: 60,
    speed: {
      en: "Strategic Infantry",
      zh: "战术步兵",
      id: "Pasukan Taktis",
    },
    drops: {
      en: "Looted Weapons & Resources",
      zh: "缴获武器与资源",
      id: "Senjata & Jarahan",
    },
    traits: {
      en: "Aggressive neighboring tribe seeking to burn your huts, raid food stores, and overthrow your Chief.",
      zh: "来自敌对阵营的入侵者，企图纵火焚烧我方茅屋、劫掠厨房粮仓并斩杀部族酋长。",
      id: "Suku tetangga agresif yang berusaha merusak gubuk, menjarah lumbung, dan menyerang Kepala Suku.",
    },
    tactics: {
      en: "Keep the Chief safe, train heavy warriors with bone maces, and cast Sanctuary Shield spells during defense.",
      zh: "保护好族长，在兵工厂制作高级骨槌与战斧，交锋时施展圣所圣盾（Shield）法术降低战损。",
      id: "Lindungi Kepala Suku, persenjatai pejuang dengan gada tulang, dan gunakan mantra Perisai.",
    },
  },
];

export function renderBestiaryHtml(isZh: boolean): string {
  const cards = BESTIARY_ENTRIES.map((entry) => {
    const name = isZh ? entry.name.zh : entry.name.en;
    const cat = isZh ? entry.category.zh : entry.category.en;
    const speed = isZh ? entry.speed.zh : entry.speed.en;
    const drops = isZh ? entry.drops.zh : entry.drops.en;
    const traits = isZh ? entry.traits.zh : entry.traits.en;
    const tactics = isZh ? entry.tactics.zh : entry.tactics.en;

    return `
      <div class="bestiary-card">
        <div class="bestiary-card-top">
          <div class="bestiary-icon-wrap">
            <span class="bestiary-emoji">${entry.icon}</span>
          </div>
          <div class="bestiary-header-text">
            <div class="bestiary-title-row">
              <h3 class="bestiary-name">${name}</h3>
              <span class="bestiary-danger">${entry.danger}</span>
            </div>
            <span class="bestiary-cat">${cat}</span>
          </div>
        </div>

        <div class="bestiary-stats-row">
          <div class="bestiary-stat"><span>HP</span><b>${entry.hp}</b></div>
          <div class="bestiary-stat"><span>${isZh ? "机动" : "Speed"}</span><b>${speed}</b></div>
          <div class="bestiary-stat"><span>${isZh ? "掉落" : "Loot"}</span><b>${drops}</b></div>
        </div>

        <p class="bestiary-traits">${traits}</p>
        <div class="bestiary-tactics">
          <b>🎯 ${isZh ? "捕猎与对抗策略" : "Tactics & Strategy"}:</b> ${tactics}
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="bestiary-lead">
      ${isZh ? "远古蛮荒大地的珍禽猛兽与敌对氏族全景记录：" : "Complete field records of prehistoric megafauna and rival clans roaming the wilderness:"}
    </div>
    <div class="bestiary-grid">
      ${cards}
    </div>
  `;
}
