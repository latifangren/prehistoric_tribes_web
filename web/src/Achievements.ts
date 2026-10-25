import {
  ANIMAL_HIT_BY,
  ANIMAL_HP,
  ANIMAL_KIND,
  BLD_HP,
  BLD_KIND,
  BLD_LEVEL,
  BLD_WORKERS,
  UNIT_AGE,
  UNIT_FLAGS,
  UNIT_HAPPINESS,
  UNIT_HELD_ITEM,
  UNIT_HP,
  UNIT_SORCERY_SKILL,
  UNIT_TYPE,
} from "./core/DenseLayout";
import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { sfx } from "./platform/SoundEffects";
import { ZH_LANGUAGE } from "./text/LegacyZhText";

const ACHIEVEMENTS_STORAGE_KEY = "pt.achievements";
const STATS_STORAGE_KEY = "pt.achievement_stats";
const UI_ART = "hd/ui/";

export type AchievementId =
  | "master_hunter"
  | "booming_tribe"
  | "cave_masterchef"
  | "prehistoric_groove"
  | "shamans_blessing"
  | "long_live_chief"
  | "first_blood"
  | "grand_architect"
  | "next_generation"
  | "gatherer_supreme"
  | "totem_fortress"
  | "ancient_mystic"
  | "master_explorer"
  | "palaeolithic_conqueror";

export type LocalizedText = {
  en: string;
  zh: string;
  id: string;
};

export type AchievementDef = {
  id: AchievementId;
  glyph: string;
  assetIcon?: string;
  title: LocalizedText;
  desc: LocalizedText;
  hint: LocalizedText;
  category: "hunting" | "tribe" | "craft" | "spiritual" | "military";
  targetProgress?: number;
  getCurrentProgress?: (stats: AchievementStats, runtime?: LegacyRuntimeState) => number;
};

export type AchievementRecord = {
  unlockedAt: number;
};

export type SpellsCastRecord = {
  healing?: boolean;
  defence?: boolean;
  love?: boolean;
  disease?: boolean;
};

export type AchievementStats = {
  cookedMeals: number;
  spellsCast: SpellsCastRecord;
  mammothOrTigerKilled: boolean;
  peakPopulation: number;
  buildingsConstructed: number;
  babiesBorn: number;
  enemiesDefeated: number;
  resourcesGathered: number;
  hardWon: boolean;
  exploredPercent: number;
  highestHappiness: number;
  chiefFellThisGame: boolean;
};

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: "master_hunter",
    glyph: "🍖",
    assetIcon: "bone-mace",
    title: {
      en: "Master Hunter",
      zh: "大猎人",
      id: "Pemburu Perkasa",
    },
    desc: {
      en: "Defeat your first mammoth or saber-toothed tiger in the wild.",
      zh: "击败第一只猛犸象或剑齿虎。",
      id: "Mengalahkan mamut atau harimau taring pedang pertama.",
    },
    hint: {
      en: "Track down dangerous wild megafauna and dispatch your tribal hunters.",
      zh: "在野外寻找凶猛的史前巨兽并派遣猎人将其猎杀。",
      id: "Lacak megafauna berbahaya di alam liar dan kirim pemburu suku.",
    },
    category: "hunting",
  },
  {
    id: "booming_tribe",
    glyph: "⛺",
    assetIcon: "bld-hut",
    title: {
      en: "Booming Tribe",
      zh: "兴旺部落",
      id: "Suku Makmur",
    },
    desc: {
      en: "Grow and maintain a thriving settlement of 25 living tribe members.",
      zh: "部落人口达到 25 人。",
      id: "Mencapai populasi 25 orang.",
    },
    hint: {
      en: "Build enough huts and ensure healthy food supplies so children can grow.",
      zh: "建造充足的茅屋，提供充沛的食物让新生代繁衍生息。",
      id: "Bangun gubuk dan pastikan pasokan makanan aman agar warga bertambah.",
    },
    category: "tribe",
    targetProgress: 25,
    getCurrentProgress: (stats) => stats.peakPopulation,
  },
  {
    id: "cave_masterchef",
    glyph: "🍲",
    assetIcon: "bld-kitchen",
    title: {
      en: "Cave Masterchef",
      zh: "洞穴厨神",
      id: "Masterchef Gua",
    },
    desc: {
      en: "Cook 50 delicious meals in the tribal Kitchen.",
      zh: "在厨房累计烹饪 50 份热腾腾的美食佳肴。",
      id: "Memasak 50 hidangan di Kitchen.",
    },
    hint: {
      en: "Assign villagers to the Kitchen to process raw meat and berries into meals.",
      zh: "指派村民进驻厨房，将生肉和浆果烹制为恢复精力的佳肴。",
      id: "Tugaskan warga ke Kitchen untuk mengolah daging dan buah hutan.",
    },
    category: "craft",
    targetProgress: 50,
    getCurrentProgress: (stats) => stats.cookedMeals,
  },
  {
    id: "prehistoric_groove",
    glyph: "🪩",
    assetIcon: "bld-disco",
    title: {
      en: "Prehistoric Groove",
      zh: "史前狂欢",
      id: "Disko Prasejarah",
    },
    desc: {
      en: "Entertain villagers to maximum happiness (mood 5) at the Disco.",
      zh: "在迪厅（Disco）中狂欢，让村民心情达到最高顶点（笑脸 Mood 5）。",
      id: "Menghibur penduduk hingga kebahagiaan maksimal di Disco.",
    },
    hint: {
      en: "Build a Disco and host energetic music sessions to elevate tribal morale.",
      zh: "建造迪厅设施，派遣有娱乐天赋的村民上台打碟欢歌。",
      id: "Bangun fasilitas Disco dan ajak penduduk berpesta menari riang.",
    },
    category: "spiritual",
    targetProgress: 95,
    getCurrentProgress: (stats) => stats.highestHappiness,
  },
  {
    id: "shamans_blessing",
    glyph: "✨",
    assetIcon: "bld-sanctuary",
    title: {
      en: "Shaman's Blessing",
      zh: "萨满祝福",
      id: "Berkah Shaman",
    },
    desc: {
      en: "Successfully cast all 4 Sanctuary temple spells (Heal, Shield, Love, Plague).",
      zh: "在圣所中成功释放全部 4 种神圣法术（治愈、圣盾、求偶催化、衰竭瘟疫）。",
      id: "Berhasil menggunakan ke-4 mantra kuil Sanctuary.",
    },
    hint: {
      en: "Use Healing, Defence, Love Potion, and Disease spells from the Sanctuary.",
      zh: "通过圣所建造与施法菜单分别使用四种远古神秘法术。",
      id: "Gunakan mantra Penyembuhan, Perisai, Ramuan Cinta, dan Wabah di Sanctuary.",
    },
    category: "spiritual",
    targetProgress: 4,
    getCurrentProgress: (stats) => {
      let count = 0;
      if (stats.spellsCast.healing) count += 1;
      if (stats.spellsCast.defence) count += 1;
      if (stats.spellsCast.love) count += 1;
      if (stats.spellsCast.disease) count += 1;
      return count;
    },
  },
  {
    id: "long_live_chief",
    glyph: "👑",
    assetIcon: "pt-chief",
    title: {
      en: "Long Live the Chief",
      zh: "酋长万岁",
      id: "Hidup Kepala Suku",
    },
    desc: {
      en: "Win a match without ever losing your tribal Chief in battle.",
      zh: "在没有阵亡酋长的情况下赢得整场对局的胜利。",
      id: "Memenangkan permainan tanpa kehilangan Kepala Suku.",
    },
    hint: {
      en: "Protect your venerable tribal leader with guards, healing spells, and armor.",
      zh: "悉心保护头戴羽冠的酋长，避免其涉险或遭猛兽包围。",
      id: "Lindungi Kepala Suku dari serangan musuh dan bahaya mematikan.",
    },
    category: "military",
  },
  {
    id: "first_blood",
    glyph: "🏹",
    assetIcon: "spear",
    title: {
      en: "First Blood",
      zh: "首战告捷",
      id: "Pertumpahan Pertama",
    },
    desc: {
      en: "Win your first combat skirmish against rival raiders or aggressive predators.",
      zh: "在与敌对氏族袭击者或凶残猛兽的交锋中取得首次歼灭战果。",
      id: "Menangkan pertempuran pertama melawan penyerang musuh atau predator.",
    },
    hint: {
      en: "Arm your hunters with spears and defend the tribe from encroaching danger.",
      zh: "召集手持长矛的猎手，共同抵御来犯之敌。",
      id: "Persenjatai pemburu dengan tombak dan halau ancaman yang mendekat.",
    },
    category: "hunting",
  },
  {
    id: "grand_architect",
    glyph: "🏛️",
    assetIcon: "sk-hardhat",
    title: {
      en: "Grand Architect",
      zh: "史前筑城师",
      id: "Arsitek Megah",
    },
    desc: {
      en: "Construct and complete at least 8 finished tribal structures in one match.",
      zh: "在单局中建造并完工至少 8 座各类部落功能建筑。",
      id: "Membangun sedikitnya 8 bangunan suku yang berfungsi penuh.",
    },
    hint: {
      en: "Expand your village with huts, stores, armouries, training centers, and towers.",
      zh: "合理规划营地，建造包括储藏室、兵工厂、靶场等齐全设施。",
      id: "Perluas pemukiman dengan gubuk, gudang, senjata, dan fasilitas suku.",
    },
    category: "craft",
    targetProgress: 8,
    getCurrentProgress: (stats) => stats.buildingsConstructed,
  },
  {
    id: "next_generation",
    glyph: "👶",
    assetIcon: "pt-child",
    title: {
      en: "Next Generation",
      zh: "新火薪传",
      id: "Generasi Penerus",
    },
    desc: {
      en: "Welcome your tribe's first newborn infant into the world.",
      zh: "迎来部落中第一个呱呱坠地的新生婴儿。",
      id: "Sambut kelahiran bayi prasejarah pertama di suku Anda.",
    },
    hint: {
      en: "Ensure high happiness and food so adult men and women can form families.",
      zh: "保持族人饱食度与好心情，促成成年男女成家生育。",
      id: "Pastikan warga kenyang dan bahagia agar dapat membina keluarga.",
    },
    category: "tribe",
  },
  {
    id: "gatherer_supreme",
    glyph: "🪵",
    assetIcon: "sk-basket-wood",
    title: {
      en: "Gatherer Supreme",
      zh: "富饶丰产",
      id: "Pengumpul Sejati",
    },
    desc: {
      en: "Collect 500 cumulative resources across all harvesting activities.",
      zh: "累计开采与收获 500 点木材、石矿、鲜肉与骨骼资源。",
      id: "Kumpulkan total 500 sumber daya alam (kayu, batu, makanan, tulang).",
    },
    hint: {
      en: "Chop trees, mine rocks, and forage berries to stock up village stockpiles.",
      zh: "持续伐木、凿石和采摘浆果，充盈部落总储量。",
      id: "Tebang pohon, tambang batu, dan kumpulkan beri hutan.",
    },
    category: "craft",
    targetProgress: 500,
    getCurrentProgress: (stats) => stats.resourcesGathered,
  },
  {
    id: "totem_fortress",
    glyph: "🛡️",
    assetIcon: "bld-tower",
    title: {
      en: "Totem Fortress",
      zh: "图腾要塞",
      id: "Benteng Pertahanan",
    },
    desc: {
      en: "Upgrade watchtowers and equip at least 5 tribe members with heavy weapons.",
      zh: "升级坚固的岗哨箭塔，并为至少 5 名族人配发重型武器。",
      id: "Tingkatkan menara jaga dan persenjatai 5 pejuang suku dengan senjata berat.",
    },
    hint: {
      en: "Manufacture bone maces or tomahawks at the Armoury and station watchtowers.",
      zh: "在兵工厂制造石斧或战斧，并进阶防御设施。",
      id: "Buat kapak batu atau gada tulang di Armoury untuk pertahanan kokoh.",
    },
    category: "military",
  },
  {
    id: "ancient_mystic",
    glyph: "🔮",
    assetIcon: "sk-mask",
    title: {
      en: "Ancient Mystic",
      zh: "远古通灵",
      id: "Mistis Purba",
    },
    desc: {
      en: "Train a Shaman in the Sanctuary to reach high sorcery mastery.",
      zh: "在圣所中修行，培养一名拥有精湛萨满巫术技能的部族智者。",
      id: "Latih Shaman di Sanctuary hingga menguasai keahlian sihir suku.",
    },
    hint: {
      en: "Assign villagers to pray and study sacred totems inside the Sanctuary.",
      zh: "指派族人进驻圣所潜心研习神圣图腾与古法。",
      id: "Tugaskan warga beribadah dan bermeditasi di kuil Sanctuary.",
    },
    category: "spiritual",
  },
  {
    id: "master_explorer",
    glyph: "🗺️",
    assetIcon: "sk-eyes",
    title: {
      en: "Master Explorer",
      zh: "旷野足迹",
      id: "Penjelajah Purba",
    },
    desc: {
      en: "Uncover and survey 75% or more of the prehistoric territory fog.",
      zh: "探索并驱散整张远古地图 75% 以上的迷雾区域。",
      id: "Buka dan jelajahi sedikitnya 75% kabut wilayah peta.",
    },
    hint: {
      en: "Send swift scouts to roam into unmapped territory across rivers and groves.",
      zh: "派遣侦察技能出色的族人跨过河流林地勘测未知世界。",
      id: "Kirim pengintai menjelajahi sudut-sudut peta yang belum terpetakan.",
    },
    category: "hunting",
    targetProgress: 75,
    getCurrentProgress: (stats) => stats.exploredPercent,
  },
  {
    id: "palaeolithic_conqueror",
    glyph: "🏆",
    assetIcon: "glyph-menu",
    title: {
      en: "Palaeolithic Conqueror",
      zh: "旧石器征服者",
      id: "Penakluk Zaman Batu",
    },
    desc: {
      en: "Achieve complete tribal victory on Hard difficulty mode.",
      zh: "在【困难（Hard）】难度模式下夺得战役或自定义对抗的最终胜利。",
      id: "Raih kemenangan mutlak pada mode tingkat kesulitan Hard.",
    },
    hint: {
      en: "Select Hard difficulty from the start menu and conquer challenging rivals.",
      zh: "在主菜单选择困难难度，以严苛的生存智慧击溃强敌。",
      id: "Pilih kesulitan Hard di menu awal dan kalahkan suku lawan.",
    },
    category: "military",
  },
];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

class AchievementManager {
  private records: Record<string, AchievementRecord> = {};
  private stats: AchievementStats = this.defaultStats();
  private listeners = new Set<(id: AchievementId) => void>();
  private toastContainer: HTMLElement | null = null;
  private lastAnimalHp: number[] = new Array(23).fill(100);
  private lastResourceSum = 0;
  private initializedRuntime = false;
  private wasInGame = false;
  constructor() {
    this.reload();
  }

  private defaultStats(): AchievementStats {
    return {
      cookedMeals: 0,
      spellsCast: {},
      mammothOrTigerKilled: false,
      peakPopulation: 0,
      buildingsConstructed: 0,
      babiesBorn: 0,
      enemiesDefeated: 0,
      resourcesGathered: 0,
      hardWon: false,
      exploredPercent: 0,
      highestHappiness: 0,
      chiefFellThisGame: false,
    };
  }

  reload(): void {
    this.records = readJson<Record<string, AchievementRecord>>(ACHIEVEMENTS_STORAGE_KEY, {});
    const storedStats = readJson<Partial<AchievementStats>>(STATS_STORAGE_KEY, {});
    this.stats = { ...this.defaultStats(), ...storedStats, spellsCast: { ...storedStats.spellsCast } };
  }

  save(): void {
    writeJson(ACHIEVEMENTS_STORAGE_KEY, this.records);
    writeJson(STATS_STORAGE_KEY, this.stats);
  }

  getRecords(): Record<string, AchievementRecord> {
    return this.records;
  }

  getStats(): AchievementStats {
    return this.stats;
  }

  isUnlocked(id: AchievementId): boolean {
    return Boolean(this.records[id]);
  }

  getUnlockedCount(): number {
    return Object.keys(this.records).length;
  }

  getTotalCount(): number {
    return ACHIEVEMENTS.length;
  }

  onUnlock(cb: (id: AchievementId) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  recordMealCooked(count = 1): void {
    this.stats.cookedMeals += count;
    this.save();
    if (this.stats.cookedMeals >= 50) {
      this.unlock("cave_masterchef");
    }
  }

  recordSpellCast(spell: "healing" | "defence" | "love" | "disease"): void {
    this.stats.spellsCast[spell] = true;
    this.save();
    const spells = this.stats.spellsCast;
    if (spells.healing && spells.defence && spells.love && spells.disease) {
      this.unlock("shamans_blessing");
    }
    this.unlock("ancient_mystic");
  }

  recordGameDifficulty(isHard: boolean): void {
    if (isHard) {
      this.stats.hardWon = true;
      this.save();
    }
  }

  unlock(id: AchievementId, isZh = false): boolean {
    if (this.records[id]) return false;
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (!def) return false;

    this.records[id] = { unlockedAt: Date.now() };
    this.save();
    sfx.achievement();

    this.showToast(def, isZh);
    this.listeners.forEach((cb) => cb(id));
    return true;
  }

  private ensureToastContainer(): HTMLElement {
    if (this.toastContainer && document.body.contains(this.toastContainer)) {
      return this.toastContainer;
    }
    const container = document.createElement("div");
    container.id = "achievement-toast-container";
    container.className = "achievement-toast-container";
    document.body.append(container);
    this.toastContainer = container;
    return container;
  }

  private showToast(def: AchievementDef, isZh: boolean): void {
    const container = this.ensureToastContainer();
    const toast = document.createElement("div");
    toast.className = "achievement-toast";

    const title = isZh ? def.title.zh : def.title.en;
    const desc = isZh ? def.desc.zh : def.desc.en;
    const badgeText = isZh ? "🏆 达成史前成就！" : "🏆 ACHIEVEMENT UNLOCKED!";

    const iconHtml = def.assetIcon
      ? `<img src="${UI_ART}${def.assetIcon}.png" alt="" class="toast-asset-icon">`
      : `<span class="toast-glyph">${def.glyph}</span>`;

    toast.innerHTML = `
      <div class="toast-glow"></div>
      <div class="toast-icon-wrap">${iconHtml}</div>
      <div class="toast-content">
        <div class="toast-badge">${badgeText}</div>
        <div class="toast-title">${title}</div>
        <div class="toast-desc">${desc}</div>
      </div>
    `;

    toast.addEventListener("click", () => {
      toast.classList.add("fade-out");
      window.setTimeout(() => toast.remove(), 300);
    });

    container.append(toast);
    requestAnimationFrame(() => toast.classList.add("show"));

    window.setTimeout(() => {
      if (document.body.contains(toast)) {
        toast.classList.add("fade-out");
        window.setTimeout(() => toast.remove(), 400);
      }
    }, 4500);
  }

  /** Run during gameplay frame ticks to inspect state and trigger progressive unlocks. */
  tickGame(runtime: LegacyRuntimeState): void {
    const game = runtime.game;
    const isZh = runtime.language === ZH_LANGUAGE;
    const dense = runtime.denseState;

    if (game.loopMode !== 1) {
      if (this.wasInGame && (game.screen === 22 || game.screen === 24 || game.vInt === 57)) {
        // Victory screen after actual match!
        if (!this.stats.chiefFellThisGame) {
          this.unlock("long_live_chief", isZh);
        }
        if (game.difficulty === 2) {
          this.stats.hardWon = true;
          this.unlock("palaeolithic_conqueror", isZh);
        }
        this.wasInGame = false;
      }
      return;
    }

    this.wasInGame = true;

    // Reset chief fell flag on new round start
    if (!this.initializedRuntime) {
      this.stats.chiefFellThisGame = false;
      this.initializedRuntime = true;
    }

    // 1. Check if Chief was lost
    if (game.choosingChief) {
      this.stats.chiefFellThisGame = true;
    }

    // 2. Count living villagers & check peak population
    let livingVillagers = 0;
    let hasBaby = false;
    let maxHappiness = 0;
    let heavilyArmed = 0;
    let sorcererFound = false;

    for (let id = 1; id <= 50; id += 1) {
      const hp = dense[UNIT_HP + id] ?? 0;
      if (hp <= 0) continue;
      livingVillagers += 1;

      const age = dense[UNIT_AGE + id] ?? 20;
      const type = dense[UNIT_TYPE + id] ?? 69;
      if (type === 17 || age <= 1) {
        hasBaby = true;
      }

      const happiness = dense[UNIT_HAPPINESS + id] ?? 0;
      if (happiness > maxHappiness) maxHappiness = happiness;

      const held = dense[UNIT_HELD_ITEM + id] ?? 9;
      // Weapon types: 1 spear, 2 axe, 3 bone mace, 4 tomahawk
      if (held >= 1 && held <= 5) heavilyArmed += 1;

      const sorcery = dense[UNIT_SORCERY_SKILL + id] ?? 0;
      if (sorcery >= 3) sorcererFound = true;
    }

    if (livingVillagers > this.stats.peakPopulation) {
      this.stats.peakPopulation = livingVillagers;
      this.save();
    }
    if (livingVillagers >= 25) {
      this.unlock("booming_tribe", isZh);
    }
    if (hasBaby) {
      this.unlock("next_generation", isZh);
    }
    if (maxHappiness > this.stats.highestHappiness) {
      this.stats.highestHappiness = maxHappiness;
      this.save();
    }
    if (maxHappiness >= 95) {
      this.unlock("prehistoric_groove", isZh);
    }
    if (heavilyArmed >= 5) {
      this.unlock("totem_fortress", isZh);
    }
    if (sorcererFound) {
      this.unlock("ancient_mystic", isZh);
    }

    // 3. Animal hunt detection (Mammoth = 0, Tiger = 1, Deer = 2)
    for (let a = 1; a <= 22; a += 1) {
      const aHp = dense[ANIMAL_HP + a] ?? 0;
      const prevHp = this.lastAnimalHp[a] ?? 100;
      const aKind = dense[ANIMAL_KIND + a] ?? 0;
      const hitBy = dense[ANIMAL_HIT_BY + a] ?? 0;

      if (prevHp > 0 && aHp <= 0) {
        // Animal just died!
        if (hitBy > 0 || prevHp <= 40) {
          this.unlock("first_blood", isZh);
          if (aKind === 0 || aKind === 1) {
            this.stats.mammothOrTigerKilled = true;
            this.save();
            this.unlock("master_hunter", isZh);
          }
        }
      }
      this.lastAnimalHp[a] = aHp;
    }

    // 4. Enemy combat kills (team 1 units 51..100)
    for (let enemyId = 51; enemyId <= 100; enemyId += 1) {
      const eHp = dense[UNIT_HP + enemyId] ?? 0;
      const flags = dense[UNIT_FLAGS + enemyId] ?? 0;
      if (eHp <= 0 && (flags & 4) !== 0) {
        this.unlock("first_blood", isZh);
      }
    }

    // 5. Buildings built
    let completedBuildings = 0;
    let upgradedTower = false;
    for (let b = 1; b <= 30; b += 1) {
      const bHp = dense[BLD_HP + b] ?? 0;
      const bKind = dense[BLD_KIND + b] ?? 0;
      const bLvl = dense[BLD_LEVEL + b] ?? 0;
      const workers = dense[BLD_WORKERS + b] ?? 0;

      if (bHp > 0 && bKind < 12) {
        completedBuildings += 1;
        if (bKind === 11 && bLvl > 0) {
          upgradedTower = true;
        }
        if (bKind === 8 && workers > 0) {
          // Sanctuary has workers/shaman
          this.unlock("ancient_mystic", isZh);
        }
      }
    }
    if (completedBuildings > this.stats.buildingsConstructed) {
      this.stats.buildingsConstructed = completedBuildings;
      this.save();
    }
    if (completedBuildings >= 8) {
      this.unlock("grand_architect", isZh);
    }
    if (upgradedTower) {
      this.unlock("totem_fortress", isZh);
    }

    // 6. Resources accumulated
    const aShort0 = runtime.mainArrays.aShort[0];
    if (aShort0) {
      let currentStock = 0;
      for (let i = 0; i < 5; i += 1) currentStock += aShort0[i] ?? 0;
      if (currentStock > this.lastResourceSum) {
        const delta = currentStock - this.lastResourceSum;
        this.stats.resourcesGathered += delta;
        this.save();
      }
      this.lastResourceSum = currentStock;
      if (this.stats.resourcesGathered >= 500) {
        this.unlock("gatherer_supreme", isZh);
      }
    }

    // 7. Exploration fog percentage
    const fog = runtime.gridB;
    if (fog && fog.length > 0) {
      let explored = 0;
      let total = 0;
      for (let r = 0; r < fog.length; r += 1) {
        const row = fog[r];
        if (!row) continue;
        for (let c = 0; c < row.length; c += 1) {
          total += 1;
          if ((row[c] ?? 0) === 0) explored += 1; // 0 = revealed
        }
      }
      if (total > 0) {
        const pct = Math.round((explored / total) * 100);
        if (pct > this.stats.exploredPercent) {
          this.stats.exploredPercent = pct;
          this.save();
        }
        if (pct >= 75) {
          this.unlock("master_explorer", isZh);
        }
      }
    }
  }
}

export const achievementManager = new AchievementManager();

/** Creates and mounts the Trophy Cabinet modal dialog onto `app`. Returns the opener callback. */
export function attachAchievements(app: HTMLElement, runtime: LegacyRuntimeState): () => void {
  const dialog = document.createElement("dialog");
  dialog.className = "settings trophy-dialog";
  app.append(dialog);

  let activeFilter: "all" | "unlocked" | "locked" = "all";

  const render = () => {
    const isZh = runtime.language === ZH_LANGUAGE;
    const records = achievementManager.getRecords();
    const stats = achievementManager.getStats();
    const total = ACHIEVEMENTS.length;
    const unlocked = Object.keys(records).length;
    const pct = Math.round((unlocked / total) * 100);

    const filtered = ACHIEVEMENTS.filter((def) => {
      const isDone = Boolean(records[def.id]);
      if (activeFilter === "unlocked") return isDone;
      if (activeFilter === "locked") return !isDone;
      return true;
    });

    const cardsHtml = filtered
      .map((def) => {
        const rec = records[def.id];
        const isDone = Boolean(rec);
        const title = isZh ? def.title.zh : def.title.en;
        const desc = isZh ? def.desc.zh : def.desc.en;
        const hint = isZh ? def.hint.zh : def.hint.en;

        const dateStr = rec
          ? new Date(rec.unlockedAt).toLocaleDateString(isZh ? "zh-CN" : "en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "";

        let progressHtml = "";
        if (def.targetProgress && def.getCurrentProgress) {
          const current = Math.min(def.targetProgress, def.getCurrentProgress(stats, runtime));
          const progPct = Math.min(100, Math.round((current / def.targetProgress) * 100));
          progressHtml = `
            <div class="trophy-prog-wrap">
              <div class="trophy-prog-bar">
                <div class="trophy-prog-fill" style="width: ${progPct}%"></div>
              </div>
              <span class="trophy-prog-text">${current} / ${def.targetProgress}</span>
            </div>
          `;
        }

        const iconHtml = def.assetIcon
          ? `<img src="${UI_ART}${def.assetIcon}.png" alt="" class="trophy-card-asset">`
          : `<span class="trophy-card-glyph">${def.glyph}</span>`;

        return `
          <div class="trophy-card ${isDone ? "unlocked" : "locked"}">
            <div class="trophy-card-left">
              <div class="trophy-card-icon-frame">
                ${iconHtml}
                ${isDone ? '<span class="trophy-card-stamp">✓</span>' : '<span class="trophy-card-lock">🔒</span>'}
              </div>
            </div>
            <div class="trophy-card-body">
              <div class="trophy-card-header">
                <h3 class="trophy-card-title">${title}</h3>
                <span class="trophy-card-tag ${isDone ? "tag-done" : "tag-pending"}">
                  ${isDone ? (isZh ? `已达成 · ${dateStr}` : `UNLOCKED · ${dateStr}`) : (isZh ? "未达成" : "LOCKED")}
                </span>
              </div>
              <p class="trophy-card-desc">${isDone ? desc : hint}</p>
              ${progressHtml}
            </div>
          </div>
        `;
      })
      .join("");

    dialog.innerHTML = `
      <form method="dialog">
        <div class="trophy-head">
          <div class="trophy-head-title">
            <span class="trophy-head-icon">🏆</span>
            <h2>${isZh ? "部落荣誉与成就勋章" : "Tribe Achievements & Trophies"}</h2>
          </div>
          <div class="trophy-summary">
            <div class="trophy-progress-label">
              <span>${isZh ? "成就收集进度" : "Trophy Completion"}</span>
              <b>${unlocked} / ${total} (${pct}%)</b>
            </div>
            <div class="trophy-overall-bar">
              <div class="trophy-overall-fill" style="width: ${pct}%"></div>
            </div>
          </div>
          <div class="trophy-tabs">
            <button type="button" class="trophy-tab ${activeFilter === "all" ? "active" : ""}" data-filter="all">
              ${isZh ? `全部 (${total})` : `All (${total})`}
            </button>
            <button type="button" class="trophy-tab ${activeFilter === "unlocked" ? "active" : ""}" data-filter="unlocked">
              ${isZh ? `已达成 (${unlocked})` : `Unlocked (${unlocked})`}
            </button>
            <button type="button" class="trophy-tab ${activeFilter === "locked" ? "active" : ""}" data-filter="locked">
              ${isZh ? `未达成 (${total - unlocked})` : `Locked (${total - unlocked})`}
            </button>
          </div>
        </div>

        <div class="trophy-grid">
          ${cardsHtml.length > 0 ? cardsHtml : `<div class="trophy-empty">${isZh ? "没有匹配的成就项目" : "No achievements in this category"}</div>`}
        </div>

        <div class="confirm-buttons trophy-actions">
          <button type="submit" class="trophy-close-btn">${isZh ? "关闭陈列室" : "Close Cabinet"}</button>
        </div>
      </form>
    `;

    for (const tabBtn of Array.from(dialog.querySelectorAll<HTMLButtonElement>(".trophy-tab"))) {
      tabBtn.addEventListener("click", () => {
        sfx.click();
        activeFilter = (tabBtn.dataset.filter as typeof activeFilter) || "all";
        render();
      });
    }
  };

  const open = () => {
    sfx.select();
    achievementManager.reload();
    render();
    dialog.showModal();
  };

  return open;
}
