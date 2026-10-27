# In-depth technical audit and codebase architecture report

Kind: descriptive and historical | Audience: developers and engineering agents | Purpose: record runtime invariants, performance bottlenecks, and verified system behavior across all modules | Non-goals: modifying application source code

---

## 1. Executive summary

This report records the findings of an automated multi-agent code audit of Prehistoric Tribes Web. The project is an offline standalone RTS and tribal simulation built with TypeScript, HTML5 Canvas 2D, Vite, and Tauri 2 for Windows desktop (.exe) and Android mobile (.apk).

Key verified parameters:
- Core game logic executes on a deterministic fixed loop at 120 ms per tick (~8.33 ticks per second) with a spiral-of-death catch-up cap of 5 ticks.
- Simulation memory uses a flat data-oriented Int8Array of 9,983 bytes (`DenseLayout.ts`). Inner loops across 100 units, 60 buildings, 22 animal slots, and 50 natural resources achieve zero garbage collection overhead.
- All 106 deterministic unit tests pass, the file size ratchet gate passes across 505 tracked files, and the end-to-end headless Playwright smoke suite passes.
- A significant rendering memory churn was identified in `web/src/render/WideView.ts`: the `snapshot()` function performs a deep traversal clone of runtime state and TypedArrays every render frame, triggering unnecessary minor GC scavenge pauses on mobile devices.
- A multi-touch gesture lockout bug exists in `web/src/TouchControls.ts`: lifting one finger after pinch zoom leaves remaining touch input inactive.
- Android APK haptic feedback is disabled at the OS level due to missing `<uses-permission android:name="android.permission.VIBRATE" />` in `AndroidManifest.xml`.
- The youth initiation and apprentice system was rolled back in commit `4ee7c96` because direct array mutation bypassed J2ME waypoint pathfinding and building worker capacities.

---

## 2. Core engine and flat memory layout

### 2.1 Fixed simulation loop
The simulation loop is defined in `web/src/platform/FixedLoop.ts:44-73`. Game logic executes at:
- 1x speed: 120 ms per tick (~8.33 ticks per second), identical to original J2ME bytecode.
- 2x speed: 60 ms per tick (~16.67 ticks per second).
- 4x speed: 30 ms per tick (~33.33 ticks per second).

To prevent freezing when backgrounded or stalled, catch-up is clamped to `Math.min(now - previous, stepMs * 5)`.

Display presentation is decoupled in `web/src/mainRuntime.ts:321-331`:
- Logic ticks execute within `FixedLoop.update(tick)`.
- Compositing runs independently on `requestAnimationFrame` (60 Hz or 120 Hz) via `screen.compose()`, translating offscreen buffers on the GPU for smooth camera panning.

### 2.2 DenseLayout memory bank
The primary state container is `denseState` (`Int8Array(9983)`), indexed via byte offsets in `web/src/core/DenseLayout.ts`:

| Entity category | Slot ID range | Array stride | Key byte offsets | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Player units (Team 0) | 1 to 50 | 101 bytes per field | `UNIT_HP = 1919`, `UNIT_ORDER = 6161`, `UNIT_TARGET_X = 3131`, `UNIT_TARGET_Y = 3232` | Controlled by player |
| Enemy units (Team 1) | 51 to 100 | 101 bytes per field | Same stride offsets as Team 0 | Controlled by AI |
| Player buildings (Team 0) | 1 to 30 | 61 bytes per field | `BLD_HP = 8505`, `BLD_KIND = 8749`, `BLD_WORKERS = 8932` | Huts, storage, range, gym |
| Enemy buildings (Team 1) | 31 to 60 | 61 bytes per field | Same stride offsets as Team 0 | Enemy tribal village |
| Wild fauna | 0 to 21 (22 slots) | 22 bytes per field | `ANIMAL_X = 9359`, `ANIMAL_Y = 9381`, `ANIMAL_HP = 9513`, `ANIMAL_KIND = 9535` | Mammoth, tiger, deer |
| Natural resources | 0 to 49 (50 slots) | 50 bytes per field | `RES_X = 9733`, `RES_Y = 9783`, `RES_KIND = 9833`, `RES_AMOUNT = 9883` | Trees, stone deposits, berries |

Auxiliary multidimensional arrays support the dense state:
- `mainArrays.aShort`: `Int16Array[2][26]` holding team weapon armory stocks, resource stockpiles, and chieftain status.
- `subsystemArrays.a`: `Int8Array[2][101][80]` holding active pathfinding waypoint coordinates (`a[0]` for X, `a[1]` for Y) referenced by `dense[707]` and `dense[808]`.

---

## 3. Combat tactics and wildlife ecology

### 3.1 TribeTactics
Implemented in `web/src/combat/TribeTactics.ts`:
- **Attack-move command:** `executeAttackMove` filters alive units (`UNIT_HP > 0`) in the current selection, dispatches them toward the target tile, and runs `applySmartBattleFormation()`.
- **Target scanning:** Each tick, `tick()` checks for hostile entities within a 5-tile radius:
  - Enemy units (slots 51 to 100).
  - Aggressive animals (kind 0 mammoth or kind 1 tiger).
  - If enemies are found, units transition to attack orders (`UNIT_ORDER = 2`).
- **Battle formation:** Units holding ranged weapons (`UNIT_HELD_ITEM` with values 1, 2, or 5 for stones, spears, or tomahawks) are placed 2 tiles behind frontline melee fighters using orthogonal direction vectors $\vec{P} = (-D_y, D_x)$.
- **Rally point:** Stored in `this.rallyPoints = new Map<number, { x: number; y: number }>()`. Newborn units exiting nursery are immediately routed to the designated rally coordinate.

### 3.2 AnimalEcology
Implemented in `web/src/combat/AnimalEcology.ts`:
- **Woolly mammoth (Kind 0):** Herd behavior triggers when any mammoth takes damage (`hp < prevHp`) or has `ANIMAL_HIT_BY > 19`. All other mammoths within 8 tiles are directed to attack the same target.
- **Tiger (Kind 1) vs deer (Kind 2):** Idle tigers scan for deer within 9 tiles and stalk them. Deer within 4 tiles detect danger and flee in the opposite direction at 3 times the displacement delta.
- **Wounded flight:** Animals below critical health (deer < 25 HP, tiger < 20 HP, mammoth < 28 HP) disengage and retreat 5 tiles away from attackers.

---

## 4. Graphics pipeline and rendering performance

### 4.1 Hybrid 4x and 2x asset architecture
As documented in `docs/asset-enchant-guide.md` and integrated in commits `e2e3e5d` and `26bd095`:
- Terrain tiles and animation skeletal parts (`parts/`, `effects/`) use 2x scale to maintain pixel-perfect joint offsets.
- High-detail assets (`buildings/`, `animals/`, `objects/`, `story/faces/`) use 4x Ultra HD generated via Real-ESRGAN.
- Kanvas offscreen scale is determined by reference terrain sheet 8 (`hdArt.scale(rt) = 2`). Drawing 4x assets into a 2x buffer produces sharp automatic supersampling.
- Exterior map margin scenery (`web/src/render/MapMargin.ts`) adaptively adjusts decorative tree and cliff placement to align with scaled viewports.

### 4.2 Critical GC churn in WideView.ts
In `web/src/render/WideView.ts:44-68`, `renderWideView()` invokes:
```typescript
const saved = snapshot(rt);
try {
  // render operations mutating camera and cursor
} finally {
  restore(saved);
}
```
`snapshot()` traverses the entire runtime state graph, cloning every `Int8Array` and `Int16Array` slice and instantiating Sets and object records on every wide render frame. Because `renderWideView` only mutates transient viewport coordinates (`cursorColumn`, `cursorRow`, `cameraColumn`, `cameraRow`, `viewColumns`, `viewRows`, `targetSlot`), copying the entire 9,983-byte dense state causes garbage collection spikes.

Mitigation: Replace graph traversal with an explicit lightweight struct capturing only the 7 mutated scalar fields.

---

## 5. Touch controls and user interface

### 5.1 Multi-touch pinch lockout bug
Located in `web/src/TouchControls.ts:449-456` and `529-535`:
- When 2 pointers touch down, `gesture` is set to `null` to disable single-finger dragging while pinch zoom executes.
- When 1 finger lifts, `pointerup` runs `finish()`. Because `if (!gesture) return;` exits early, the remaining active pointer is never converted back into a valid single-finger gesture.
- The remaining finger cannot pan or tap until completely lifted and pressed down again.

Mitigation: When `activePointers.size === 1` inside `finish()`, re-initialize `gesture` using the surviving pointer ID.

### 5.2 Letterbox menu hit-test bug
Located in `web/src/TouchControls.ts:390-405` (`tapScreen`):
- When displaying main menus, cutscenes, or dialogue, `tapScreen` only compares touch coordinate $Y$ against `rowY + 6`.
- Touch coordinate $X$ is unchecked. Tapping the black margins (letterbox bars) on wide screens or landscape mobile devices triggers menu items or advances dialogue unintentionally.

Mitigation: Restrict hit-testing to the central 240-pixel active canvas area.

---

## 6. Postmortem: rollback of youth initiation system

Commit `4ee7c96` reverted the youth initiation and apprentice system (`YouthInitiation.ts`). Analysis of the commit chain (`4a272aa` to `5674422`) confirms why the feature caused regressions:

1. **Direct internal state mutation:** The module assigned unit coordinates and order flags directly:
   ```typescript
   dense[UNIT_TARGET_X + id] = target.x;
   dense[UNIT_TARGET_Y + id] = target.y;
   dense[UNIT_WORK_TARGET + id] = target.workTarget;
   dense[UNIT_ORDER + id] = 2;
   dense[UNIT_MODE + id] = 1;
   ```
   This bypassed the native J2ME waypoint tables in `subsystemArrays.a` (`dense[707]`, `dense[808]`). Units became frozen at doorways because the pathfinding step routine had no navigation steps.
2. **Capacity violation:** Units entered gym and range buildings without reserving worker capacity (`BLD_WORKERS`, `UNIT_SLOT`), exceeding building limits.
3. **Broken fallback flow:** In commit `5674422`, an omitted `return` statement caused apprentice assignments to fall through into wood/stone harvesting orders, clobbering the apprentice assignment.
4. **Unarmed combat engagement:** Youths lacking weapons followed senior hunters into combat against wild predators (`workTarget <= -123`).

Rule for future reimplementation: Never write raw internal pathfinding offsets directly. Trigger valid dispatch commands or simulated user actions (`touch.fireAt`, official worker registration routines) that allow the native state machine to build waypoint paths and verify slot limits.

---

## 7. Platform abstraction and native Tauri packaging

### 7.1 Platform seams adherence
The architecture strictly enforces platform seams:
- `web/src/sim/`: 100% pure TypeScript without DOM or native imports.
- `web/src/core/`: 100% clean, with headless DOM guards for Node.js test runners (`LegacyRuntimeState.ts:479`).
- `web/src/platform/`: Houses all platform adapters (`Storage.ts`, `BackButton.ts`, `Haptic.ts`, `PageLifecycle.ts`).

### 7.2 Native Android gaps
1. **Missing haptic permission:** `web/src-tauri/gen/android/app/src/main/AndroidManifest.xml` lacks:
   ```xml
   <uses-permission android:name="android.permission.VIBRATE" />
   ```
   Without this permission, Android WebView ignores calls to `navigator.vibrate()`.
2. **Unconnected back button adapter:** `webBackButtonAdapter` in `web/src/platform/BackButton.ts` is an empty stub. Hardware or gesture back on Android risks closing the application activity rather than opening the in-game pause menu.

### 7.3 Dead package scripts
In `web/package.json`:
- `"test:codec": "node scripts/verify-rms-codec.mjs"` points to a non-existent file.
- `"test:runtime-persistence": "node scripts/verify-runtime-gameplay-persistence.mjs"` points to a non-existent file.
These entries should be removed to keep package scripts clean.
