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

## Platform roadmap

- The agreed order is PWA/TWA first, then Tauri 2 for Android and Windows after the PWA/TWA acceptance gate is met.
- The platform roadmap is planning material. Do not add native dependencies, TWA/Tauri configuration, signing files, or wrapper code until the relevant decisions and prerequisites in `docs/plan/pwa_twa_tauri_roadmap.md` have been reviewed.
- Open decisions include the production HTTPS origin, Android application ID and signing owner, orientation, offline policy, initial TWA distribution channel, and Windows package format.
- Do not mark roadmap checklist items complete based only on configuration being present; require the documented behavior or target-device verification.

## Editing and verification

- Read the relevant source, documentation, and existing decisions before changing them. Keep changes scoped to the user's request and update affected callers and documentation when behavior changes.
- Do not use the reference project as the destination for fixes.
- Report what changed and what was verified. Do not claim a check or device result that was not actually observed.
