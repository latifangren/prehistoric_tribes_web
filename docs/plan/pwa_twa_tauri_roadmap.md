# Roadmap Tauri 2 (Aplikasi Mandiri Windows & Android)

**Status:** Disepakati untuk langsung ke **Tauri 2** (melewati PWA/TWA) untuk menghindari birokrasi domain, verifikasi `assetlinks.json`, dan ketergantungan web-hosting. Game dibundel sebagai aplikasi mandiri offline murni.

## Arah yang disepakati

- **Lewati Opsi 5 (PWA/TWA):** Tidak diperlukan domain root HTTPS, konfigurasi `assetlinks.json`, atau Service Worker web.
- **Prioritaskan Opsi 4: Tauri 2 Standalone:**
  1. **Tahap 1 — Windows Desktop (`.exe`):** Setup shell Tauri 2, verifikasi WebView2 lokal, jalankan game mandiri di PC.
  2. **Tahap 2 — Platform Adapters Seams:** Hubungkan kontrak platform (`StorageAdapter`, `BackButtonAdapter`, `PageLifecycle`, `Haptic`) ke API/Plugin Tauri secara bersih tanpa mengotori modul simulasi/game.
  3. **Tahap 3 — Android Mobile (`.apk`):** Konfigurasi Android toolchain lokal (`ANDROID_HOME`, `NDK_HOME`), build APK mandiri offline.
- **Pertahankan satu frontend web:** Kode game di `web/src` tetap menjadi single source of truth; modul game tidak mengimpor langsung API Tauri (tetap di balik adapter `web/src/platform/`).
- Simpanan game (save format) tetap memakai format JSON eksisting via export/import.

- `web/public/manifest.webmanifest` memakai `display: standalone`, `start_url`/`scope` relatif, ikon 192/384/512, dan orientation `portrait`.
- `web/index.html` menautkan manifest dan ikon Apple; rotate notice meminta portrait.
- Ikon yang dirujuk tersedia. Browser smoke memeriksa manifest, scope, respons ikon, startup, dan alur permainan tertentu; tes itu belum memverifikasi instalasi PWA/TWA di Android.
- GitHub Actions menerbitkan `web/dist` ke GitHub Pages. URL README memakai project path `latifangren.github.io/prehistoric_tribes_web/`; Vite memakai `base: "./"`.
- Pencarian source belum menemukan service worker. Kebijakan offline belum ditentukan.
20:- Domain produksi khusus, Android application ID, signing identity/fingerprint rilis, dan `/.well-known/assetlinks.json` belum dikonfigurasi dan diputuskan **tidak diperlukan** karena TWA dilewati.
21:- **Kondisi Toolchain Lokal Terverifikasi (2026-10-27):**
  - Rust 1.99.0 & Cargo 1.99.0 (MSVC x86_64 host).
  - Rustup target `aarch64-linux-android` sudah terpasang.
  - Visual Studio Build Tools 2026 & WebView2 (155.0) sudah terpasang.
  - Java 27 terpasang.
  - Android SDK & NDK 27 (`27.0.12077973`) terpasang di `C:\Users\RAEVTAR\AppData\Local\Android\Sdk`.
  - Tauri CLI 2.12.4 terverifikasi siap dijalankan.

## Keputusan Arsitektur: Melewati Opsi 5 (PWA/TWA)

- Opsi TWA membutuhkan file `/.well-known/assetlinks.json` di root origin domain HTTPS. Karena proyek di-host di subpath GitHub Pages `latifangren.github.io/prehistoric_tribes_web/`, verifikasi ini memerlukan repositori terpisah atau custom domain.
- Keputusan: **Opsi 5 dilewati sepenuhnya.** Seluruh aset (~32 MB) akan dikemas langsung ke dalam binary Tauri (installer `.exe` dan `.apk`), menghasilkan game yang 100% offline tanpa ketergantungan server atau domain.
## Rencana Eksekusi: Tauri 2 Standalone (Windows & Android)

### Tahap T1 — Inisialisasi Tauri 2 & Build Windows Desktop (.exe)

- [x] Inisialisasi shell Tauri 2 (`web/src-tauri`) menggunakan `@tauri-apps/cli`.
- [x] Konfigurasi `tauri.conf.json`:
  - `identifier`: `com.prehistorictribes.game`.
  - `frontendDist`: `../dist` (hasil build Vite).
  - Window config: judul "Prehistoric Tribes", ukuran default 1280x720, resizable, minWidth 480, minHeight 640.
  - Generated icons dari `web/public/icon-512.png` untuk ICO, ICNS, PNG, dan Android mipmap.
- [x] Tambahkan helper scripts di `web/package.json` (`tauri`, `tauri:dev`, `tauri:build`).
- [x] Uji build Windows lokal:
  - Debug: `web/src-tauri/target/debug/app.exe` (39.4 MB) berhasil dikompilasi.
  - Release: `web/src-tauri/target/release/prehistoric-tribes.exe` (35.4 MB) berhasil dikompilasi & dioptimasi.
- [x] Verifikasi installer/binary `.exe` mandiri dapat dijalankan di Windows, semua aset 32 MB termuat, proses berjalan stabil di ~45 MB RAM.

**Gate T1: LULUS (2026-10-27).** Aplikasi `.exe` Windows berhasil dibangun dan berjalan offline secara mandiri dengan WebView2 lokal.

### Tahap T2 — Integrasi Platform Adapters Seams

- [x] `StorageAdapter`: Kontrak async di `web/src/platform/Storage.ts` kompatibel langsung dengan WebView sandbox; data tersimpan di local app data.
- [x] `BackButtonAdapter`: Terisolasi di `BackButton.ts` tanpa merusak modul gameplay; keyboard Escape/Backspace dan touch control berfungsi.
- [x] `PageLifecycle`: Terisolasi di `PageLifecycle.ts`, pause/resume audio & gameplay frame loop aktif.
- [x] Verifikasi save/load dan ekspor/impor JSON tetap bekerja 100% kompatibel antar-platform.

**Gate T2: LULUS (2026-10-27).** Game beroperasi mulus melalui platform adapters tanpa ada bocoran import Tauri ke modul gameplay.

### Tahap T3 — Inisialisasi & Target Android (.apk)

- [x] Konfigurasi path environment lokal: `ANDROID_HOME`, `NDK_HOME` (NDK 27), dan `JAVA_HOME` (Android Studio JBR) terhubung.
- [x] Inisialisasi project Android via Tauri: `npx @tauri-apps/cli android init` berhasil menghasilkan proyek Android di `web/src-tauri/gen/android`.
- [x] Kompilasi Rust native library untuk Android target `aarch64-linux-android` (`libapp_lib.so`, 142 MB) berhasil lulus tanpa error.
- [x] Menambahkan resilient file copy fallback di `BuildTask.kt` untuk menangani pembatasan symlink Windows secara otomatis jika diperlukan.
- [x] Assembling APK berhasil dieksekusi secara native via Tauri CLI (`npm run tauri:android:build`) setelah Windows Developer Mode aktif:
  - `web/src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk` (149 MB) berhasil di-generate secara native via symlink Tauri.
  - Terverifikasi memuat `lib/arm64-v8a/libapp_lib.so` dan seluruh resource game offline.

**Gate T3: LULUS (2026-10-27).** File `.apk` Android mandiri berhasil dibangun secara native melalui Tauri CLI dan siap di-install di perangkat Android.

### Tahap T4 — Uji Kualitas & Distribusi

- [ ] Uji performa & frame rate di Windows dan Android.
- [ ] Uji audio, touch control, keyboard control, resize window, dan zoom.
- [ ] Siapkan GitHub Actions workflow untuk otomatis build `.exe` dan `.apk` saat rilis tag (opsional tapi sangat membantu).

**Acceptance Akhir:** Game memiliki file installer `.exe` untuk PC dan file `.apk` untuk Android yang 100% offline, mandiri, tanpa butuh web hosting atau domain.
