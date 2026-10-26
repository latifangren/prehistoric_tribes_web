import { readStorage } from "../platform/Storage";
import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { T_BUILDING } from "../core/DataTables";
import { sfx } from "../platform/SoundEffects";
import { escapeHtml } from "../platform/Html";
import { capitalise, originalText } from "../OriginalText";
import { renderBestiaryHtml } from "../Bestiary";
import { ZH_LANGUAGE } from "../text/LegacyZhText";
import { BUILDING_DESCRIPTIONS, BUILDING_ICONS, BUILDING_NAMES_ID } from "./BuildingCatalog";

const UI = "hd/ui/";

export function createHelpDialog(app: HTMLElement, runtime: LegacyRuntimeState): () => void {
  // Comprehensive 6-tab HD Tribe Guide & Encyclopedia dialog replacing the legacy 240x320 keypad help screen.
  const helpDialog = document.createElement("dialog");
  helpDialog.className = "settings help-dialog";
  helpDialog.addEventListener("keydown", (event) => event.stopPropagation());
  helpDialog.addEventListener("keyup", (event) => event.stopPropagation());
  app.append(helpDialog);
  let activeHelpTab: "controls" | "buildings" | "arsenal" | "bestiary" | "tribe" | "skills" | "keys" = "controls";
  const renderHelpDialog = () => {
    const lang = runtime.language === ZH_LANGUAGE ? "zh" : (readStorage("pt.language") === "id" ? "id" : "en");
    const zh = lang === "zh";
    const tabs: { id: typeof activeHelpTab; label: string }[] = [
      { id: "controls", label: lang === "zh" ? "操作缩放" : lang === "id" ? "Kontrol & Zoom" : "Controls" },
      { id: "buildings", label: lang === "zh" ? "建筑图鉴" : lang === "id" ? "Bangunan" : "Buildings" },
      { id: "arsenal", label: lang === "zh" ? "武器巫术" : lang === "id" ? "Senjata & Sihir" : "Arsenal" },
      { id: "bestiary", label: lang === "zh" ? "远古图鉴" : lang === "id" ? "Fauna Purba" : "Bestiary" },
      { id: "tribe", label: lang === "zh" ? "资源生存" : lang === "id" ? "Kelangsungan" : "Survival" },
      { id: "skills", label: lang === "zh" ? "属性技能" : lang === "id" ? "Keahlian" : "Skills" },
      { id: "keys", label: lang === "zh" ? "快捷键" : lang === "id" ? "Pintas Keyboard" : "Keys" },
    ];
    let bodyHtml = "";
    if (activeHelpTab === "controls") {
      bodyHtml = zh ? `
        <div class="help-list">
          <div class="help-item"><img src="${UI}pt-man.png" alt=""><div><b>选中与下令</b><p>点村民选中；再点地图目标（树木、石头、猎物、工地、建筑或敌人）直接下达命令。长按空地并拖动可框选多名村民。</p></div></div>
          <div class="help-item"><img src="${UI}build-a.png" alt=""><div><b>建造与建筑面板</b><p>点右下角锤子打开建造列表，选建筑后在地图移动位置，点 ✓ 放置。点已有建筑可升级、修理、制造武器或施展法术。</p></div></div>
          <div class="help-item"><img src="${UI}cmd-horn.png" alt=""><div><b>号角、名册、倍速与缩放</b><p>右下角号角可打开全员备战、集结、高清小地图与村民名册。顶部资源栏支持点击人口查看名册、点击 1x/2x/4x 切换倍速；地图支持双指捏合或鼠标滚轮直接缩放。</p></div></div>
        </div>
      ` : `
        <div class="help-list">
          <div class="help-item"><img src="${UI}pt-man.png" alt=""><div><b>Select & Order</b><p>Tap a villager to select, then tap any map target (trees, stone, prey, sites, buildings, or enemies) to issue orders. Long-press and drag to box-select.</p></div></div>
          <div class="help-item"><img src="${UI}build-a.png" alt=""><div><b>Build & Manage</b><p>Tap the bottom-right hammer to pick a building, drag to position on the map, and tap ✓ to place. Tap any built structure to upgrade, repair, craft weapons, or cast spells.</p></div></div>
          <div class="help-item"><img src="${UI}cmd-horn.png" alt=""><div><b>Horn, Roster, Speed & Zoom</b><p>Tap the horn for Call to Arms, Form Up, HD Minimap, and Villager Roster. Tap Population on the top bar for the Roster, tap 1x/2x/4x to fast-forward, and pinch or scroll-wheel directly on the map to zoom.</p></div></div>
        </div>
      `;
    } else if (activeHelpTab === "buildings") {
      const table = runtime.packedOffsets[T_BUILDING] ?? 0;
      const cards = BUILDING_ICONS.map((icon, kind) => {
        const name = lang === "id" ? (BUILDING_NAMES_ID[kind] ?? capitalise(originalText(runtime, "s", kind))) : capitalise(originalText(runtime, "s", kind));
        const wCost = runtime.packedBytes[table + 10 * 26 + kind] ?? 0;
        const sCost = runtime.packedBytes[table + 11 * 26 + kind] ?? 0;
        const bCost = runtime.packedBytes[table + 12 * 26 + kind] ?? 0;
        const costParts: string[] = [];
        if (wCost > 0) costParts.push(`🪵 ${wCost}`);
        if (sCost > 0) costParts.push(`🪨 ${sCost}`);
        if (bCost > 0) costParts.push(`🦴 ${bCost}`);
        const costStr = costParts.length > 0 ? costParts.join(" · ") : (zh ? "初始核心" : "Core");
        const desc = BUILDING_DESCRIPTIONS[lang][kind];
        return `
          <div class="help-item">
            <img src="${UI}ub-${icon}.png" alt="">
            <div>
              <b>${name} <small style="color:#ffd984;font-weight:600;margin-left:6px">${costStr}</small></b>
              <p>${desc}</p>
            </div>
          </div>
        `;
      }).join("");
      bodyHtml = `<div class="help-list">${cards}</div>`;
    } else if (activeHelpTab === "arsenal") {
      const weapons: [string, number, string, string, string][] = [
        ["club", 12, "Basic wooden melee club.", "Pentungan kayu dasar untuk pertahanan jarak dekat.", "基础木棒，近战防身武器。"],
        ["stone", 13, "Thrown rock for basic ranged attacks.", "Batu lempar untuk serangan jarak jauh dasar.", "投掷石块，基础远程攻击武器。"],
        ["spear", 14, "Balanced hunting & combat spear.", "Tombak seimbang untuk berburu dan bertempur.", "长矛，兼顾狩猎与战斗的利器。"],
        ["stone-axe", 15, "Heavy stone axe for strong melee strikes.", "Kapak batu berat dengan tebasan jarak dekat kuat.", "石斧，强力近战劈砍武器。"],
        ["bone-mace", 16, "Crushing bone mace crafted from beast bones.", "Gada penghancur dari tulang belulang hewan buas.", "骨锤，用猛兽骨骼打造的重型武器。"],
        ["tomahawk", 17, "High-damage ranged throwing axe.", "Kapak lempar dengan daya hancur jarak jauh tinggi.", "飞斧，高伤害远程投掷武器。"],
        ["net-trap", 18, "Entangles approaching beasts or enemies.", "Jebakan jaring untuk menjerat hewan atau penyusup.", "捕网陷阱，困住靠近的野兽或敌人。"],
        ["spring-trap", 19, "Launches a sudden spring-loaded strike.", "Jebakan pegas dengan serangan kejutan mematikan.", "弹射陷阱，对踏入目标造成伤害。"],
        ["pit-trap", 20, "Deep concealed pit that traps intruders.", "Jebakan lubang tersembunyi yang melumpuhkan musuh.", "深坑陷阱，重创落入其中的敌人。"],
        ["healing", 30, "Sanctuary spell: restores target villager's HP.", "Mantra suci: memulihkan HP penduduk yang terluka.", "萨满巫术：恢复目标村民的生命值。"],
        ["defence", 31, "Sanctuary spell: boosts target villager's armor.", "Mantra suci: meningkatkan pertahanan penduduk.", "萨满巫术：提升目标村民的防御力。"],
        ["love-potion", 32, "Sanctuary spell: inspires villagers to start a family.", "Mantra suci: mendorong penduduk dewasa berkeluarga.", "萨满巫术：促成成年男女繁衍后代。"],
        ["disease", 33, "Sanctuary spell: weakens nearby enemy forces.", "Mantra suci: melemahkan kekuatan pasukan musuh sekitar.", "萨满巫术：削弱敌方单位战斗力。"],
      ];
      bodyHtml = `
        <div class="help-list">
          ${weapons.map(([ic, sIdx, enDesc, idDesc, zhDesc]) => `
            <div class="help-item">
              <img src="${UI}${ic}.png" alt="">
              <div>
                <b>${capitalise(originalText(runtime, "s", sIdx))}</b>
                <p>${lang === "zh" ? zhDesc : lang === "id" ? idDesc : enDesc}</p>
              </div>
            </div>
          `).join("")}
        </div>
      `;
    } else if (activeHelpTab === "tribe") {
      const intro = capitalise(originalText(runtime, "t", 71 + 230));
      bodyHtml = `
        <p class="help-lead">${intro}</p>
        <div class="help-grid">
          <div class="help-chip"><img src="${UI}icon-people.png" alt=""><span>${lang === "zh" ? "人口 / 居住上限（建小屋增加，成人可繁衍后代）" : lang === "id" ? "Batas Populasi (Bangun Gubuk; dewasa dapat berkeluarga)" : "Population / Housing cap (build Huts; adults can raise children)"}</span></div>
          <div class="help-chip"><img src="${UI}icon-food.png" alt=""><span>${lang === "zh" ? "食物（采集浆果、打猎、厨房加工防止饥饿）" : lang === "id" ? "Makanan (Kumpulkan buah, berburu, olah di Dapur)" : "Food (forage, hunt, and cook in Kitchen to prevent starvation)"}</span></div>
          <div class="help-chip"><img src="${UI}icon-wood.png" alt=""><span>${lang === "zh" ? "木材（砍伐树木，用于建造、升级与制造武器）" : lang === "id" ? "Kayu (Tebang pohon untuk konstruksi & senjata)" : "Wood (chop trees for construction, upgrades & weapons)"}</span></div>
          <div class="help-chip"><img src="${UI}icon-stone.png" alt=""><span>${lang === "zh" ? "石头（开采石矿，加固建筑与打造石器）" : lang === "id" ? "Batu (Tambang batu untuk upgrade & peralatan batu)" : "Stone (mine rocks for advanced upgrades & stone tools)"}</span></div>
          <div class="help-chip"><img src="${UI}icon-bones.png" alt=""><span>${lang === "zh" ? "骨头（狩猎野兽获取，高级建筑与骨器材料）" : lang === "id" ? "Tulang (Diperoleh dari berburu satwa untuk senjata & bangunan)" : "Bones (harvested from hunted beasts for high-tier builds)"}</span></div>
          <div class="help-chip"><img src="${UI}pt-chief.png" alt=""><span>${lang === "zh" ? "族长传承（若族长阵亡，须立即在成年村民中推选新族长）" : lang === "id" ? "Suksesi Kepala Suku (Jika Kepala Suku gugur, pilih segera penggantinya)" : "Chief Succession (if your Chief falls, crown an adult villager immediately)"}</span></div>
        </div>
      `;
    } else if (activeHelpTab === "skills") {
      const skillsList = [
        ["heart", lang === "zh" ? "生命值" : lang === "id" ? "Kesehatan (HP)" : "Hit Points"],
        ["hunger", lang === "zh" ? "饱食度" : lang === "id" ? "Kekenyangan" : "Fullness"],
        ["sleep", lang === "zh" ? "精力值" : lang === "id" ? "Energi & Istirahat" : "Energy"],
        ["sk-spear", lang === "zh" ? "近战攻击" : lang === "id" ? "Serangan Jarak Dekat" : "Melee Attack"],
        ["sk-eyes", lang === "zh" ? "远程攻击" : lang === "id" ? "Serangan Jarak Jauh" : "Ranged Attack"],
        ["sk-bush", lang === "zh" ? "侦察隐蔽" : lang === "id" ? "Pengintaian & Kamuflase" : "Scouting"],
        ["sk-basket", lang === "zh" ? "资源采集" : lang === "id" ? "Pengumpulan Sumber Daya" : "Harvesting"],
        ["sk-hardhat", lang === "zh" ? "建造修理" : lang === "id" ? "Konstruksi & Perbaikan" : "Building"],
        ["sk-hammer", lang === "zh" ? "武器锻造" : lang === "id" ? "Penempaan Senjata" : "Weaponsmith"],
        ["sk-chef", lang === "zh" ? "烹饪料理" : lang === "id" ? "Memasak & Mengolah Makanan" : "Cooking"],
        ["sk-mask", lang === "zh" ? "萨满巫术" : lang === "id" ? "Sihir Shaman" : "Witchcraft"],
        ["sk-horseshoe", lang === "zh" ? "迪厅打碟" : lang === "id" ? "Hiburan & Tari Disko" : "DJ / Entertainment"],
      ];
      bodyHtml = `
        <p class="help-lead">${lang === "zh" ? "村民每执行一次对应工作，该项技能就会提升：" : lang === "id" ? "Keahlian penduduk meningkat setiap kali melakukan pekerjaan terkait:" : "Villagers improve their skills as they perform corresponding tasks:"}</p>
        <div class="help-skill-grid">
          ${skillsList.map(([ic, name]) => `<div class="help-skill"><img src="${UI}${ic}.png" alt=""><span>${name}</span></div>`).join("")}
        </div>
      `;
    } else if (activeHelpTab === "bestiary") {
      bodyHtml = renderBestiaryHtml(lang);
    } else {
      bodyHtml = `
        <div class="help-keys">
          <div><kbd>W A S D / ↑↓←→</kbd><span>${zh ? "移动光标 / 菜单选择" : "Move cursor / Navigate menus"}</span></div>
          <div><kbd>Enter / Space</kbd><span>${zh ? "确认 / 选择（连按两次全选屏幕单位）" : "Confirm / Select (double-press selects screen units)"}</span></div>
          <div><kbd>F / Tab</kbd><span>${zh ? "切换游戏速度（1x / 2x / 4x）" : "Cycle Game Speed (1x / 2x / 4x)"}</span></div>
          <div><kbd>. / I</kbd><span>${zh ? "轮流定位空闲族人（💤）" : "Cycle next idle villager (💤)"}</span></div>
          <div><kbd>Scroll / Pinch</kbd><span>${zh ? "鼠标滚轮或双指捏合缩放地图" : "Mouse wheel or two-finger pinch to zoom map"}</span></div>
          <div><kbd>Q</kbd><span>${zh ? "左软键（打开命令与建造栏）" : "Left Soft Key (Command & Build bar)"}</span></div>
          <div><kbd>Esc / Backspace</kbd><span>${zh ? "右软键（取消选择 / 暂停菜单）" : "Right Soft Key (Cancel / Pause menu)"}</span></div>
          <div><kbd>M / 3</kbd><span>${zh ? "打开小地图" : "Open Minimap"}</span></div>
          <div><kbd>1</kbd><span>${zh ? "跳转到最近警告位置" : "Jump to latest alert location"}</span></div>
          <div><kbd>7 / 9</kbd><span>${zh ? "长按编队，短按选中队伍" : "Hold to assign squad, tap to recall"}</span></div>
        </div>
      `;
    }
    helpDialog.innerHTML = `
      <form method="dialog">
        <div class="help-head">
          <h2>${lang === "zh" ? "部落百科与帮助" : lang === "id" ? "Ensiklopedia & Panduan Suku" : "Tribe Guide & Encyclopedia"}</h2>
          <div class="help-tabs">
            ${tabs.map((t) => `<button type="button" data-tab="${escapeHtml(t.id)}" class="help-tab${t.id === activeHelpTab ? " active" : ""}">${escapeHtml(t.label)}</button>`).join("")}
          </div>
        </div>
        <div class="help-body">${bodyHtml}</div>
        <div class="confirm-buttons"><button type="submit">${lang === "zh" ? "关闭" : lang === "id" ? "Tutup" : "Close"}</button></div>
      </form>
    `;
    for (const tabBtn of Array.from(helpDialog.querySelectorAll<HTMLButtonElement>(".help-tab"))) {
      tabBtn.addEventListener("click", () => {
        sfx.click();
        activeHelpTab = tabBtn.dataset.tab as typeof activeHelpTab;
        renderHelpDialog();
      });
    }
  };
  const openHelp = () => {
    renderHelpDialog();
    helpDialog.showModal();
  };
  return openHelp;
}
