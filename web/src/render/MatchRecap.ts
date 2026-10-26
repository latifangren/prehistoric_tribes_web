import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import { sfx } from "../platform/SoundEffects";
import { ZH_LANGUAGE } from "../text/LegacyZhText";
import { escapeHtml } from "../platform/Html";
import {
  ANIMAL_HIT_BY,
  ANIMAL_HP,
  ANIMAL_KIND,
  BLD_HP,
  BLD_KIND,
  BLD_LEVEL,
  UNIT_HP,
} from "../core/DenseLayout";

export type TimelinePoint = {
  timeSec: number;
  pop: number;
};

export type MatchStats = {
  startTime: number;
  endTime: number;
  durationSec: number;
  won: boolean;
  difficulty: number;
  peakPop: number;
  finalPop: number;
  villagersLost: number;
  enemiesKilled: number;
  mammothsKilled: number;
  tigersKilled: number;
  deerKilled: number;
  buildingsBuilt: number;
  chiefFell: boolean;
  foodGathered: number;
  woodGathered: number;
  stoneGathered: number;
  bonesGathered: number;
  timeline: TimelinePoint[];
};

class MatchStatsTracker {
  private stats: MatchStats = this.emptyStats();
  private inMatch = false;
  private hasEnded = false;
  private lastPopCount = 0;
  private lastAnimalHp: number[] = new Array(23).fill(100);
  private lastEnemyHp: number[] = new Array(101).fill(100);
  private lastSampleTime = 0;
  private initialVillagerIds = new Set<number>();
  private prevA0: number[] = [0, 0, 0, 0, 0];

  private emptyStats(): MatchStats {
    return {
      startTime: Date.now(),
      endTime: 0,
      durationSec: 0,
      won: false,
      difficulty: 1,
      peakPop: 0,
      finalPop: 0,
      villagersLost: 0,
      enemiesKilled: 0,
      mammothsKilled: 0,
      tigersKilled: 0,
      deerKilled: 0,
      buildingsBuilt: 0,
      chiefFell: false,
      foodGathered: 0,
      woodGathered: 0,
      stoneGathered: 0,
      bonesGathered: 0,
      timeline: [],
    };
  }

  startMatch(difficulty = 1): void {
    this.stats = this.emptyStats();
    this.stats.difficulty = difficulty;
    this.stats.startTime = Date.now();
    this.inMatch = true;
    this.hasEnded = false;
    this.lastSampleTime = performance.now();
    this.lastPopCount = 0;
    this.initialVillagerIds.clear();
  }

  getStats(): MatchStats {
    return this.stats;
  }
  hasCompletedMatch(): boolean {
    return this.hasEnded;
  }

  isMatchActive(): boolean {
    return this.inMatch;
  }


  calculateGrade(stats: MatchStats, lang: "zh" | "id" | "en" = "en"): { grade: "S" | "A" | "B" | "C"; title: string; color: string } {
    if (!stats.won) {
      const title = lang === "zh" ? "陨落氏族" : lang === "id" ? "Suku yang Tumbang" : "Fallen Tribe";
      return { grade: "C", title, color: "#9e9e9e" };
    }
    let score = 50;
    if (!stats.chiefFell) score += 25;
    if (stats.villagersLost === 0) score += 20;
    else if (stats.villagersLost <= 3) score += 10;

    if (stats.peakPop >= 20) score += 15;
    else if (stats.peakPop >= 15) score += 10;

    if (stats.mammothsKilled > 0) score += 10;
    if (stats.tigersKilled > 0) score += 10;
    if (stats.difficulty === 2) score += 15; // Hard bonus

    if (score >= 95) {
      const title = lang === "zh" ? "远古战神" : lang === "id" ? "Panglima Mitos Prasejarah" : "Mythic Warlord";
      return { grade: "S", title, color: "#ffd54f" };
    }
    if (score >= 75) {
      const title = lang === "zh" ? "部落明君" : lang === "id" ? "Kepala Suku Agung" : "Master Chieftain";
      return { grade: "A", title, color: "#81c784" };
    }
    const title = lang === "zh" ? "坚毅长老" : lang === "id" ? "Tetua Tangguh" : "Resilient Elder";
    return { grade: "B", title, color: "#64b5f6" };
  }

  tick(runtime: LegacyRuntimeState): void {
    const game = runtime.game;
    const dense = runtime.denseState;

    if (game.loopMode !== 1) {
      if (this.inMatch && (game.screen === 22 || game.screen === 23 || game.screen === 24)) {
        this.stats.endTime = Date.now();
        this.stats.durationSec = Math.max(1, Math.round((this.stats.endTime - this.stats.startTime) / 1000));
        this.stats.won = game.screen === 22 || game.vInt === 57;
        this.stats.finalPop = this.lastPopCount;
        this.inMatch = false;
        this.hasEnded = true;
      }
      return;
    }

    if (!this.inMatch) {
      this.startMatch(game.difficulty);
    }

    if (game.choosingChief) {
      this.stats.chiefFell = true;
    }

    // Count team 0 population
    let living = 0;
    for (let id = 1; id <= 50; id += 1) {
      const hp = dense[UNIT_HP + id] ?? 0;
      if (hp > 0) {
        living += 1;
        this.initialVillagerIds.add(id);
      } else if (this.initialVillagerIds.has(id)) {
        // Was alive and recorded, now died
        this.stats.villagersLost += 1;
        this.initialVillagerIds.delete(id);
      }
    }
    this.lastPopCount = living;
    if (living > this.stats.peakPop) this.stats.peakPop = living;

    // Sample timeline every 10 seconds
    const now = performance.now();
    if (now - this.lastSampleTime > 10000) {
      this.lastSampleTime = now;
      const elapsed = Math.round((Date.now() - this.stats.startTime) / 1000);
      this.stats.timeline.push({ timeSec: elapsed, pop: living });
    }

    // Track resources
    const a0 = runtime.mainArrays.aShort[0];
    if (a0) {
      const f = a0[0] ?? 0;
      const w = a0[2] ?? 0;
      const s = a0[3] ?? 0;
      const b = a0[4] ?? 0;
      if (f > this.prevA0[0]!) this.stats.foodGathered += f - this.prevA0[0]!;
      if (w > this.prevA0[2]!) this.stats.woodGathered += w - this.prevA0[2]!;
      if (s > this.prevA0[3]!) this.stats.stoneGathered += s - this.prevA0[3]!;
      if (b > this.prevA0[4]!) this.stats.bonesGathered += b - this.prevA0[4]!;
      this.prevA0 = [f, 0, w, s, b];
    }

    // Animal tracking
    for (let a = 1; a <= 22; a += 1) {
      const aHp = dense[ANIMAL_HP + a] ?? 0;
      const prev = this.lastAnimalHp[a] ?? 100;
      const kind = dense[ANIMAL_KIND + a] ?? 0;
      const hit = dense[ANIMAL_HIT_BY + a] ?? 0;

      if (prev > 0 && aHp <= 0 && (hit > 0 || prev < 50)) {
        if (kind === 0) this.stats.mammothsKilled += 1;
        else if (kind === 1) this.stats.tigersKilled += 1;
        else this.stats.deerKilled += 1;
      }
      this.lastAnimalHp[a] = aHp;
    }

    // Enemy team 1 tracking
    for (let e = 51; e <= 100; e += 1) {
      const eHp = dense[UNIT_HP + e] ?? 0;
      const prev = this.lastEnemyHp[e] ?? 100;
      if (prev > 0 && eHp <= 0) {
        this.stats.enemiesKilled += 1;
      }
      this.lastEnemyHp[e] = eHp;
    }

    // Count finished buildings
    let buildings = 0;
    for (let b = 1; b <= 30; b += 1) {
      if ((dense[BLD_HP + b] ?? 0) > 0 && (dense[BLD_KIND + b] ?? 0) < 12) {
        buildings += 1;
      }
    }
    if (buildings > this.stats.buildingsBuilt) {
      this.stats.buildingsBuilt = buildings;
    }
  }
}

export const matchStatsTracker = new MatchStatsTracker();

/** Attaches the Match Recap modal dialog; returns opener function */
export function attachMatchRecap(
  app: HTMLElement,
  runtime: LegacyRuntimeState,
  openAchievements?: () => void,
): (autoShow?: boolean) => void {
  const dialog = document.createElement("dialog");
  dialog.className = "settings recap-dialog";
  app.append(dialog);

  let hasShownForCurrentVictory = false;

  const renderTimelineSvg = (timeline: TimelinePoint[], maxPop: number): string => {
    if (timeline.length < 2) {
      return `<div class="recap-no-timeline">Timeline data recorded as match progresses</div>`;
    }
    const width = 380;
    const height = 90;
    const pad = 12;
    const maxP = Math.max(10, maxPop + 2);
    const maxT = Math.max(1, timeline[timeline.length - 1]!.timeSec);

    const points = timeline
      .map((p) => {
        const x = pad + (p.timeSec / maxT) * (width - pad * 2);
        const y = height - pad - (p.pop / maxP) * (height - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    const firstX = pad;
    const lastX = pad + (width - pad * 2);
    const bottomY = height - pad;
    const areaPoints = `${firstX},${bottomY} ${points} ${lastX},${bottomY}`;

    return `
      <svg class="recap-svg" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="recapPopGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ffd54f" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="#ff8f00" stop-opacity="0.05"/>
          </linearGradient>
        </defs>
        <line x1="${pad}" y1="${bottomY}" x2="${lastX}" y2="${bottomY}" stroke="#5d4037" stroke-width="1.5" />
        <polygon points="${areaPoints}" fill="url(#recapPopGrad)" />
        <polyline points="${points}" fill="none" stroke="#ffd54f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        ${timeline
          .filter((_, idx) => idx === 0 || idx === timeline.length - 1 || idx % 3 === 0)
          .map((p) => {
            const x = pad + (p.timeSec / maxT) * (width - pad * 2);
            const y = height - pad - (p.pop / maxP) * (height - pad * 2);
            return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#fff" stroke="#ff8f00" stroke-width="1.5" />`;
          })
          .join("")}
      </svg>
    `;
  };

  const render = () => {
    const lang: "zh" | "id" | "en" = runtime.language === ZH_LANGUAGE ? "zh" : (typeof localStorage !== "undefined" && localStorage.getItem("pt.language") === "id" ? "id" : "en");
    const stats = matchStatsTracker.getStats();
    const evaluation = matchStatsTracker.calculateGrade(stats, lang);

    const minutes = Math.floor(stats.durationSec / 60);
    const seconds = stats.durationSec % 60;
    const timeFormatted = `${minutes}m ${seconds}s`;
    const diffLabel = lang === "zh" ? (stats.difficulty === 2 ? "困难模式" : "普通模式") : lang === "id" ? (stats.difficulty === 2 ? "Mode Sulit" : "Mode Normal") : (stats.difficulty === 2 ? "Hard Mode" : "Normal Mode");
    const durationLabel = lang === "zh" ? "作战时长" : lang === "id" ? "Durasi Pertandingan" : "Match Duration";
    const outcomeTitle = stats.won
      ? (lang === "zh" ? "部落征服与胜利！" : lang === "id" ? "KEMENANGAN SUKU!" : "TRIBE VICTORY!")
      : (lang === "zh" ? "部族覆灭与溃败" : lang === "id" ? "SUKU TELAH TUMBANG" : "TRIBE DEFEATED");

    dialog.innerHTML = `
      <form method="dialog">
        <div class="recap-head ${stats.won ? "won" : "lost"}">
          <div class="recap-outcome">
            <span class="recap-badge-icon">${stats.won ? "👑" : "💀"}</span>
            <div class="recap-outcome-text">
              <h2>${escapeHtml(outcomeTitle)}</h2>
              <span class="recap-time">${durationLabel}: ${timeFormatted} · ${diffLabel}</span>
            </div>
          </div>
          <div class="recap-grade" style="border-color: ${evaluation.color}; color: ${evaluation.color};">
            <span class="grade-letter">${evaluation.grade}</span>
            <span class="grade-title">${escapeHtml(evaluation.title)}</span>
          </div>
        </div>

        <div class="recap-section">
          <span class="recap-section-title">📈 ${lang === "zh" ? "人口演进趋势曲线" : lang === "id" ? "Grafik Pertumbuhan Populasi" : "Population Growth Timeline"}</span>
          <div class="recap-timeline-box">
            ${renderTimelineSvg(stats.timeline, stats.peakPop)}
          </div>
        </div>

        <div class="recap-grid">
          <div class="recap-card">
            <h4>👥 ${lang === "zh" ? "部落人口" : lang === "id" ? "Populasi & Suku" : "Tribe & People"}</h4>
            <div class="recap-row"><span>${lang === "zh" ? "巅峰人口" : lang === "id" ? "Puncak Populasi" : "Peak Population"}</span><b>${stats.peakPop}</b></div>
            <div class="recap-row"><span>${lang === "zh" ? "战损阵亡" : lang === "id" ? "Korban Gugur" : "Casualties"}</span><b style="color: ${stats.villagersLost > 0 ? "#ef5350" : "#a5d6a7"}">${stats.villagersLost}</b></div>
            <div class="recap-row"><span>${lang === "zh" ? "酋长健在" : lang === "id" ? "Kepala Suku" : "Chief Survived"}</span><b>${stats.chiefFell ? (lang === "zh" ? "❌ 阵亡推选" : lang === "id" ? "❌ Gugur" : "❌ Fallen") : (lang === "zh" ? "✓ 完好无损" : lang === "id" ? "✓ Selamat" : "✓ Safe")}</b></div>
          </div>

          <div class="recap-card">
            <h4>⚔️ ${lang === "zh" ? "狩猎与战役" : lang === "id" ? "Perburuan & Tempur" : "Hunt & Combat"}</h4>
            <div class="recap-row"><span>${lang === "zh" ? "击退敌军" : lang === "id" ? "Musuh Dikalahkan" : "Raiders Defeated"}</span><b>${stats.enemiesKilled}</b></div>
            <div class="recap-row"><span>${lang === "zh" ? "猎杀猛犸" : lang === "id" ? "Mamut Diburu" : "Mammoths Hunted"}</span><b>${stats.mammothsKilled}</b></div>
            <div class="recap-row"><span>${lang === "zh" ? "猎杀剑齿虎" : lang === "id" ? "Harimau Taring Pedang" : "Saber-tooth Tigers"}</span><b>${stats.tigersKilled}</b></div>
          </div>

          <div class="recap-card">
            <h4>🪵 ${lang === "zh" ? "采集与建筑" : lang === "id" ? "Ekonomi & Bangunan" : "Economy & Build"}</h4>
            <div class="recap-row"><span>${lang === "zh" ? "完工建筑" : lang === "id" ? "Bangunan Berdiri" : "Buildings Built"}</span><b>${stats.buildingsBuilt}</b></div>
            <div class="recap-row"><span>${lang === "zh" ? "粮食采集" : lang === "id" ? "Makanan Dipanen" : "Food Harvested"}</span><b>${stats.foodGathered}</b></div>
            <div class="recap-row"><span>${lang === "zh" ? "木石骨料" : lang === "id" ? "Kayu/Batu/Tulang" : "Wood/Stone/Bones"}</span><b>${stats.woodGathered + stats.stoneGathered + stats.bonesGathered}</b></div>
          </div>
        </div>

        <div class="recap-actions">
          ${openAchievements ? `<button type="button" class="recap-btn recap-trophy-btn">🏆 ${lang === "zh" ? "查看成就勋章" : lang === "id" ? "Lihat Lemari Trofi" : "View Trophies"}</button>` : ""}
          <button type="submit" class="recap-btn recap-close-btn">${lang === "zh" ? "返回战场 / 确认" : lang === "id" ? "Tutup Laporan" : "Close Recap"}</button>
        </div>
      </form>
    `;

    const trophyBtn = dialog.querySelector<HTMLButtonElement>(".recap-trophy-btn");
    if (trophyBtn && openAchievements) {
      trophyBtn.addEventListener("click", () => {
        dialog.close();
        openAchievements();
      });
    }
  };

  const open = (autoShow = false) => {
    sfx.select();
    render();
    dialog.showModal();
    if (autoShow) hasShownForCurrentVictory = true;
  };

  return open;
}
