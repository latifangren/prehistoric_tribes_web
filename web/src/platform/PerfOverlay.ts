/**
 * Diagnostic-only frame timing overlay for the crowded-map stutter.
 *
 * Enabled only with `?perf=1` in the page URL (any host, including the
 * built preview). With no flag this module creates nothing and every
 * call site below is a no-op through optional chaining, so normal play
 * and the verify scripts are untouched.
 *
 * What it measures, per FixedLoop iteration (budget 120 ms):
 *   tick      -- the game-logic update (main.ts tick())
 *   paint     -- the original 240x320 frame paint (main.ts paint())
 *   renderWide-- the full wide-map redraw (WideScreen.renderWide)
 *   compose   -- WideScreen.compose inside render()
 *   systems   -- day/night + weather + emotion bubbles + rally markers
 *   hud       -- hud + menuHud + startMenu + storyHud updates
 *   frameCompose -- the per-display-frame compose in composeEveryFrame
 *   tick+render -- tick + the render() that follows it; overruns count
 *     the iterations where that sum passed the 120 ms budget.
 *
 * The overlay text refreshes once per render() (about 8x/second), never
 * per display frame, so the overlay itself does not distort the numbers.
 * A snapshot is also exposed as window.__prehistoricPerf() for copy-paste
 * into a bug report.
 */

type Stat = { sum: number; count: number; max: number; last: number };

const BUDGET_MS = 120;

export type PerfOverlay = {
  /** Start timing a section; call the returned function when it ends. */
  start: (name: string) => () => void;
  /** Record a finished section duration directly. */
  mark: (name: string, ms: number) => void;
  /** Refresh the overlay text from the accumulated stats. */
  refresh: (context: string) => void;
};

function newStat(): Stat {
  return { sum: 0, count: 0, max: 0, last: 0 };
}

export function createPerfOverlay(): PerfOverlay | null {
  let search = "";
  try {
    search = window.location.search;
  } catch {
    return null;
  }
  if (!new URLSearchParams(search).has("perf")) return null;

  const element = document.createElement("pre");
  element.setAttribute("aria-label", "Frame timing overlay (diagnostic, ?perf=1)");
  element.style.cssText =
    "position:fixed;right:8px;bottom:8px;margin:0;padding:6px 8px;color:#fff;background:rgba(0,0,0,.72);font:11px/1.45 monospace;z-index:11;pointer-events:none;white-space:pre;text-align:right";
  document.body.append(element);

  const stats = new Map<string, Stat>();
  const get = (name: string): Stat => {
    let stat = stats.get(name);
    if (!stat) {
      stat = newStat();
      stats.set(name, stat);
    }
    return stat;
  };
  let lastTickMs = 0;
  let composeFrames = 0;
  let composeWindowStart = performance.now();
  let composeFps = 0;

  const mark = (name: string, ms: number): void => {
    const stat = get(name);
    stat.sum += ms;
    stat.count += 1;
    stat.max = Math.max(stat.max, ms);
    stat.last = ms;
    if (name === "tick") {
      lastTickMs = ms;
    } else if (name === "render") {
      const total = lastTickMs + ms;
      const totalStat = get("tick+render");
      totalStat.sum += total;
      totalStat.count += 1;
      totalStat.max = Math.max(totalStat.max, total);
      totalStat.last = total;
      if (total > BUDGET_MS) get("overruns").count += 1;
    } else if (name === "frameCompose") {
      composeFrames += 1;
      const now = performance.now();
      if (now - composeWindowStart >= 1000) {
        composeFps = Math.round((composeFrames * 1000) / (now - composeWindowStart));
        composeFrames = 0;
        composeWindowStart = now;
      }
    }
  };

  const line = (name: string): string => {
    const stat = stats.get(name);
    if (!stat || stat.count === 0) return `${name}: -`;
    const avg = stat.sum / stat.count;
    if (name === "overruns") return `overruns(>120ms): ${stat.count}`;
    return `${name}: last ${stat.last.toFixed(1)} avg ${avg.toFixed(1)} max ${stat.max.toFixed(1)} ms`;
  };

  const snapshot = (): Record<string, { last: number; avg: number; max: number; count: number }> => {
    const out: Record<string, { last: number; avg: number; max: number; count: number }> = {};
    for (const [name, stat] of stats) {
      out[name] = {
        last: Math.round(stat.last * 10) / 10,
        avg: Math.round((stat.sum / Math.max(1, stat.count)) * 10) / 10,
        max: Math.round(stat.max * 10) / 10,
        count: stat.count,
      };
    }
    return out;
  };
  (window as Window & { __prehistoricPerf?: () => unknown }).__prehistoricPerf = snapshot;

  return {
    start: (name: string) => {
      const begin = performance.now();
      return () => mark(name, performance.now() - begin);
    },
    mark,
    refresh: (context: string) => {
      element.textContent = [
        `perf (budget 120 ms/tick)  composeFps ~${composeFps}`,
        context,
        line("tick"),
        line("paint"),
        line("renderWide"),
        line("compose"),
        line("systems"),
        line("hud"),
        line("tick+render"),
        line("overruns"),
        line("frameCompose"),
        "copy: __prehistoricPerf()",
      ].join("\n");
    },
  };
}
