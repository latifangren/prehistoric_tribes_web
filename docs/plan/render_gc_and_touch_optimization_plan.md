# Optimization plan for rendering garbage collection and mobile touch ergonomics

**Eliminate render loop GC stutter, resolve multi-touch gesture lockout, and complete Android native vibration wiring.**

| Field | Detail |
| :--- | :--- |
| **Status** | Proposed / Ready for implementation |
| **Owner** | Core engineering |
| **Scope** | `web/src/render/WideView.ts`, `web/src/TouchControls.ts`, `web/src-tauri/gen/android/app/src/main/AndroidManifest.xml`, `web/package.json` |
| **Related** | `docs/audit/2026-10-deep-audit-and-architecture-report.md`, `ARCHITECTURE.md` |
| **Audience** | Core developers and AI engineering agents |

---

## 1. Summary

This design document outlines surgical fixes for four concrete runtime bottlenecks discovered during the October 2026 technical audit:
1. Replace graph traversal snapshot in `WideView.ts` with a 7-field scalar capture struct, stopping repeated TypedArray allocations during rendering.
2. Fix pointer lockout in `TouchControls.ts` when releasing one finger during pinch zoom, ensuring the remaining finger immediately regains panning and tap control.
3. Restrict touch hit-testing in `TouchControls.ts:tapScreen` to the central active viewport, preventing taps on black letterbox bars from triggering menu items.
4. Add `android.permission.VIBRATE` to `AndroidManifest.xml` and purge non-existent script entries from `web/package.json`.

---

## 2. Context and problem analysis

### 2.1 Render loop state snapshot churn
In `web/src/render/WideView.ts:44-68`, `renderWideView()` calls `snapshot(rt)` before rendering and `restore(saved)` upon completion. The snapshot function traverses the entire runtime state graph and clones all arrays and typed arrays using `(target as unknown as Int8Array).slice()`.

Because `renderWideView` only mutates 7 scalar fields (`cursorColumn`, `cursorRow`, `cameraColumn`, `cameraRow`, `viewColumns`, `viewRows`, `targetSlot`), copying 9,983 bytes of dense state and hundreds of array descriptors every render frame creates garbage collection churn, causing micro-stutters on lower-end Android hardware.

### 2.2 Multi-touch pointer lockout
In `web/src/TouchControls.ts:449-456`:
- Placing 2 fingers down triggers pinch zoom and sets `gesture = null`.
- When 1 finger lifts, `finish()` runs. Because `gesture` is null, `finish()` returns immediately without converting the remaining touch into an active single-pointer gesture.
- The user must lift the second finger completely before touch interaction responds again.

### 2.3 Letterbox hit-test bleed
In `web/src/TouchControls.ts:390-405`, `tapScreen` matches touch coordinate $Y$ against menu rows, but performs no boundary check on $X$. On ultrawide displays or landscape mobile screens with 20:9 aspect ratios, tapping inside the letterbox padding accidentally selects menu buttons or skips cutscene dialogues.

### 2.4 Missing Android vibration permission
`web/src/platform/Haptic.ts` delegates to `navigator.vibrate()`. However, `web/src-tauri/gen/android/app/src/main/AndroidManifest.xml` only requests `android.permission.INTERNET`. Android WebView drops vibration calls unless `android.permission.VIBRATE` is declared in the application manifest.

---

## 3. Detailed technical design

### 3.1 Lightweight viewport snapshot in WideView.ts

#### Why and what decision box
| Choice | Tradeoff | Verdict |
| :--- | :--- | :--- |
| Retain full runtime deep clone | High GC allocation per frame; simple but wasteful | Reject |
| Clone only denseState | Still clones 9,983 bytes per frame needlessly | Reject |
| Capture only mutated viewport scalars | Zero heap allocations (small stack object), microsecond execution | **Selected** |

#### Implementation specification
Replace `snapshot()` and `restore()` with:
```typescript
interface ViewportSnapshot {
  cursorColumn: number;
  cursorRow: number;
  cameraColumn: number;
  cameraRow: number;
  viewColumns: number;
  viewRows: number;
  targetSlot: number;
}

function captureViewport(g: LegacyGameState): ViewportSnapshot {
  return {
    cursorColumn: g.cursorColumn,
    cursorRow: g.cursorRow,
    cameraColumn: g.cameraColumn,
    cameraRow: g.cameraRow,
    viewColumns: g.viewColumns,
    viewRows: g.viewRows,
    targetSlot: g.targetSlot,
  };
}

function restoreViewport(g: LegacyGameState, s: ViewportSnapshot): void {
  g.cursorColumn = s.cursorColumn;
  g.cursorRow = s.cursorRow;
  g.cameraColumn = s.cameraColumn;
  g.cameraRow = s.cameraRow;
  g.viewColumns = s.viewColumns;
  g.viewRows = s.viewRows;
  g.targetSlot = s.targetSlot;
}
```

---

### 3.2 Seamless single-touch recovery in TouchControls.ts

#### Implementation specification
In `web/src/TouchControls.ts:529-548` (`finish` handler):
When one pointer lifts while `activePointers.size === 1`:
```typescript
const finish = (event: PointerEvent) => {
  activePointers.delete(event.pointerId);
  if (activePointers.size < 2) pinchDistance = 0;
  
  if (activePointers.size === 1 && !gesture) {
    // Transition remaining pointer into a active drag gesture
    const [remainingId, pos] = activePointers.entries().next().value as [number, { x: number; y: number }];
    const point = toGame({ clientX: pos.x, clientY: pos.y } as PointerEvent);
    const on = point.on === "bottom" ? "panel" : point.on;
    gesture = {
      id: remainingId,
      sx: pos.x, sy: pos.y, cx: pos.x, cy: pos.y,
      x0: point.x, y0: point.y, gx: point.x, gy: point.y,
      drag: false, on, at: performance.now(), grip: null,
    };
    return;
  }
  
  if (!gesture || event.pointerId !== gesture.id) return;
  // Existing single-tap and gesture completion logic...
};
```

---

### 3.3 Active canvas containment in TouchControls.ts

#### Implementation specification
In `web/src/TouchControls.ts:390-405` (`tapScreen`):
Check horizontal boundary before executing menu actions:
```typescript
const tapScreen = (x: number, y: number) => {
  // Center frame is 240 pixels wide on original viewport (x: 0 to 240)
  if (x < 0 || x > 240) return;
  
  const rows = game.screen === 0 ? runtime.touchMenuRows.slice(0, 2) : runtime.touchMenuRows;
  if (runtime.touchMenuQ === game.screen && rows.length > 0) {
    const half = rows.length > 1 ? Math.abs(rows[1]! - rows[0]!) / 2 : 10;
    let best = -1;
    rows.forEach((rowY, index) => { if (Math.abs(y - (rowY + 6)) <= half && best < 0) best = index; });
    if (best >= 0) run(pickRow(best));
    return;
  }
  run(tapKey(OriginalKey.FIRE));
};
```

---

### 3.4 Android manifest permission and script cleanup

1. In `web/src-tauri/gen/android/app/src/main/AndroidManifest.xml`:
   Add `<uses-permission android:name="android.permission.VIBRATE" />` below `INTERNET`.
2. In `web/package.json`:
   Remove dead scripts `"test:codec"` and `"test:runtime-persistence"`.

---

## 4. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| Viewport restore omission | Low | Medium | Verify that all visual regressions tests pass in `scripts/verify-*.mjs` and Playwright smoke. |
| Pointer transition jitter | Low | Low | Set `drag: false` when recovering the second pointer so it requires movement past threshold before panning. |
| Size ratchet gate failure | Low | High | Run `node web/scripts/check-file-size.mjs` immediately after code changes and adjust baseline if lines decrease. |

---

## 5. Verification scenarios and acceptance criteria

1. **Zero render GC test:**
   - Execute map rendering across 1,000 frames in throwaway harness. Measure heap delta before and after `renderWideView`. Verify zero persistent heap expansion.
2. **Multi-touch transition test:**
   - Place two pointers, verify zoom. Lift one pointer, immediately drag second pointer, verify camera pans without lifting.
3. **Letterbox containment test:**
   - In 16:9 or 20:9 viewport, tap $(x < 0)$ and $(x > 240)$ during title screen. Verify no menu item opens.
4. **CI and gate validation:**
   - `npm test` passes 106/106 tests.
   - `npm run check:size` passes with zero violations.
   - `npm run build && node web/scripts/browser-smoke.mjs` passes headless browser smoke.
