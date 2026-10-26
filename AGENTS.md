# Project Instructions

## Communication

- Communicate with the user in Indonesian.
- Write source code, identifiers, and code comments in English unless the user requests otherwise.
- Before editing, explain the intended change briefly in Indonesian. For material design choices, recommend one option and summarize the tradeoffs.

## Repository safety

- Work only in this repository: `F:\GITHUB\GAME\prehistoric_tribes_web`.
- The upstream reference project is `F:\GITHUB\GAME\Prehistoric-Tribes-Ext\refrence\Prehistoric_Tribes_Web`. Never edit that reference project; use it only for read-only comparison when needed.
- Inspect the working tree before actions that could affect existing edits. Treat uncommitted changes as the user's work unless they explicitly ask to change them.
- Never commit, push, merge, rebase, delete branches, or rewrite history without an explicit user request.

## Project conventions

- This is the TypeScript/Vite web port of Prehistoric Tribes. The browser game and its simulation are the primary product; preserve existing gameplay behavior unless the task asks to change it.
- Keep the web frontend in `web/`. Follow its existing structure and patterns instead of creating parallel implementations.
- Keep platform-specific browser/native access behind the existing platform adapters. Game and simulation modules must not depend directly on Tauri or other wrapper APIs.
- Preserve the existing save format and JSON export/import as the transfer path between web and native targets. Do not add a second save migration system without an explicit requirement.
- Keep the modularization decisions in `docs/plan/codebase_modularization_plan.md`. The detailed PWA/TWA and Tauri 2 checklist belongs in `docs/plan/pwa_twa_tauri_roadmap.md`; do not expand the old modularization plan with another detailed platform checklist.

## Platform status & runtime targets

- **Tauri 2 Standalone (Active & Verified):**
  - Standalone offline packaging via Tauri 2 is implemented, tested, and complete for Windows Desktop (`.exe`) and Android Mobile (`.apk`).
  - PWA/TWA was intentionally bypassed to eliminate public root domain and `assetlinks.json` verification requirements.
  - Shell native configuration resides in `web/src-tauri/` and Android wrapper in `web/src-tauri/gen/android/`.
  - Windows release executable: `web/src-tauri/target/release/prehistoric-tribes.exe`.
  - Android APK: `web/src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk`.
  - NPM build scripts: `npm run tauri:build`, `npm run tauri:dev`, `npm run tauri:android:build`, `npm run tauri:android:dev`.
- **Single Source of Truth:** The web frontend in `web/src` remains the single source of truth for both browser and Tauri native apps.
- **Platform Seams Invariant:** Gameplay and simulation modules MUST NOT import Tauri or native APIs directly. All platform capabilities remain strictly behind `web/src/platform/` adapters (`Storage`, `BackButton`, `PageLifecycle`, `Haptic`).
- **Development Focus:** The platform setup phase is complete. Ongoing and future work focuses on in-game bug fixes, gameplay balance, simulation polish, and new features built upon the established Tauri 2 base.
## Editing and verification

- Read the relevant source, documentation, and existing decisions before changing them. Keep changes scoped to the user's request and update affected callers and documentation when behavior changes.
- Do not use the reference project as the destination for fixes.
- Report what changed and what was verified. Do not claim a check or device result that was not actually observed.
