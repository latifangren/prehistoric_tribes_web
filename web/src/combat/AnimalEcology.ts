import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import {
  ANIMAL_DEST_X,
  ANIMAL_DEST_Y,
  ANIMAL_HIT_BY,
  ANIMAL_HP,
  ANIMAL_KIND,
  ANIMAL_TARGET,
  ANIMAL_X,
  ANIMAL_Y,
  UNIT_X,
  UNIT_Y,
} from "../core/DenseLayout";

export class AnimalEcologyManager {
  private lastTickTime = 0;
  private previousHp = new Map<number, number>();

  tick(runtime: LegacyRuntimeState, now: number): void {
    if (now - this.lastTickTime < 1200) return;
    this.lastTickTime = now;

    const dense = runtime.denseState;
    const mapW = runtime.game.mapWidth || 50;
    const mapH = runtime.game.mapHeight || 50;
    const clampX = (val: number) => Math.max(1, Math.min(mapW - 2, Math.round(val)));
    const clampY = (val: number) => Math.max(1, Math.min(mapH - 2, Math.round(val)));

    // 1. Scan for Herd Stampede:
    // If a woolly mammoth (kind 0) is attacked, alert nearby mammoths to defend
    for (let a = 0; a < 22; a += 1) {
      const hp = dense[ANIMAL_HP + a] ?? 0;
      if (hp <= 0) continue;
      const kind = dense[ANIMAL_KIND + a] ?? 0;

      if (kind === 0) {
        const prevHp = this.previousHp.get(a) ?? hp;
        this.previousHp.set(a, hp);
        const hitBy = dense[ANIMAL_HIT_BY + a] ?? 0;
        const target = dense[ANIMAL_TARGET + a] ?? 0;

        if (hp < prevHp || hitBy > 19 || target > 0) {
          const attackerId = target > 0 ? target : hitBy > 19 ? hitBy - 19 : 0;
          if (attackerId > 0) {
            const mx = dense[ANIMAL_X + a] ?? 0;
            const my = dense[ANIMAL_Y + a] ?? 0;

            for (let other = 0; other < 22; other += 1) {
              if (other === a) continue;
              if ((dense[ANIMAL_HP + other] ?? 0) <= 0) continue;
              if ((dense[ANIMAL_KIND + other] ?? 0) !== 0) continue;

              const ox = dense[ANIMAL_X + other] ?? 0;
              const oy = dense[ANIMAL_Y + other] ?? 0;
              if (Math.hypot(ox - mx, oy - my) <= 8) {
                dense[ANIMAL_TARGET + other] = attackerId;
                dense[ANIMAL_DEST_X + other] = dense[UNIT_X + attackerId] ?? mx;
                dense[ANIMAL_DEST_Y + other] = dense[UNIT_Y + attackerId] ?? my;
              }
            }
          }
        }
      } else {
        this.previousHp.set(a, hp);
      }
    }

    // 2. Predator vs Prey (Food Chain):
    // Tigers (kind 1) stalk deer (kind 2); deer flee when tiger draws near
    for (let t = 0; t < 22; t += 1) {
      if ((dense[ANIMAL_HP + t] ?? 0) <= 0) continue;
      if ((dense[ANIMAL_KIND + t] ?? 0) !== 1) continue;

      const targetHuman = dense[ANIMAL_TARGET + t] ?? 0;
      if (targetHuman > 0) continue;

      const tx = dense[ANIMAL_X + t] ?? 0;
      const ty = dense[ANIMAL_Y + t] ?? 0;

      let closestDeer = -1;
      let minDeerDist = 9;
      for (let d = 0; d < 22; d += 1) {
        if ((dense[ANIMAL_HP + d] ?? 0) <= 0) continue;
        if ((dense[ANIMAL_KIND + d] ?? 0) !== 2) continue;
        const dx = dense[ANIMAL_X + d] ?? 0;
        const dy = dense[ANIMAL_Y + d] ?? 0;
        const dist = Math.hypot(dx - tx, dy - ty);
        if (dist < minDeerDist) {
          minDeerDist = dist;
          closestDeer = d;
        }
      }

      if (closestDeer >= 0) {
        const deerX = dense[ANIMAL_X + closestDeer] ?? 0;
        const deerY = dense[ANIMAL_Y + closestDeer] ?? 0;

        dense[ANIMAL_DEST_X + t] = deerX;
        dense[ANIMAL_DEST_Y + t] = deerY;

        // Deer detects predator in close range (<= 4 tiles) and darts away
        if (minDeerDist <= 4) {
          const fleeX = clampX(deerX + (deerX - tx) * 3);
          const fleeY = clampY(deerY + (deerY - ty) * 3);
          dense[ANIMAL_DEST_X + closestDeer] = fleeX;
          dense[ANIMAL_DEST_Y + closestDeer] = fleeY;
        }
      }
    }

    // 3. Fleeing Wounded Animals:
    // Critically wounded beasts/prey retreat to survive
    for (let a = 0; a < 22; a += 1) {
      const hp = dense[ANIMAL_HP + a] ?? 0;
      if (hp <= 0) continue;
      const kind = dense[ANIMAL_KIND + a] ?? 0;
      const isCritical = (kind === 2 && hp < 25) || (kind === 1 && hp < 20) || (kind === 0 && hp < 28);
      const target = dense[ANIMAL_TARGET + a] ?? 0;

      if (isCritical && target > 0) {
        const ax = dense[ANIMAL_X + a] ?? 0;
        const ay = dense[ANIMAL_Y + a] ?? 0;
        const hx = dense[UNIT_X + target] ?? ax;
        const hy = dense[UNIT_Y + target] ?? ay;

        const fleeDirX = ax - hx || (a % 2 === 0 ? 1 : -1);
        const fleeDirY = ay - hy || (a % 3 === 0 ? 1 : -1);
        const len = Math.hypot(fleeDirX, fleeDirY) || 1;

        dense[ANIMAL_DEST_X + a] = clampX(ax + (fleeDirX / len) * 5);
        dense[ANIMAL_DEST_Y + a] = clampY(ay + (fleeDirY / len) * 5);
        if (kind !== 0) {
          dense[ANIMAL_TARGET + a] = 0;
        }
      }
    }
  }
}

export const animalEcology = new AnimalEcologyManager();
