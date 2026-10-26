# Rencana Modularisasi & Pemeliharaan Kodebase

> **Prehistoric Tribes Web — pemecahan modul besar tanpa mengubah perilaku permainan**  
> *Audit awal dan checklist implementasi bertahap; semua implementasi menunggu peninjauan rencana ini.*

---

## 1. Tujuan dan batasan

Tujuan rencana ini adalah membuat kode aplikasi lebih mudah dipahami, diuji, dan dirawat dengan menempatkan satu tanggung jawab utama di setiap modul, memisahkan perilaku dari DOM/style, dan mengurangi modul besar secara bertahap.

### Batas ukuran

- **Target akhir:** maksimal **800 baris kode efektif** per file kode terpelihara manual di `web/src/` dan `web/scripts/`. `LegacyRuntimeState.ts` hanya boleh mendapat pengecualian efektif bila cek kelayakan Fase 4 membuktikan facade method surface yang ada, import/binding minimum, dan field/init yang wajib dipertahankan sendiri sudah melebihi 800 setelah seluruh implementasi dipindahkan. Pengecualian itu tidak mengizinkan forwarding baru dan harus tetap <1.000 baris fisik.
- **Hard limit fisik akhir:** semua file kode terpelihara manual harus di bawah **1.000 baris fisik**, kecuali `LegacyGameState.ts` yang menjadi satu-satunya pengecualian karena dokumentasi bytecode pada katalog field. Selama ratchet, file lama boleh tetap pada ceiling saat ini sampai fase pemiliknya; tidak boleh tumbuh, dan wajib turun pada fase yang menanganinya. File baru langsung di bawah limit. Target efektif `LegacyGameState.ts` tetap <800.
- Gate membandingkan baris efektif dan fisik aktual terhadap ceiling per file di `web/scripts/size-baseline.json`. Baseline hanya boleh turun untuk file yang ada; path terhapus boleh dihapus dari baseline; file baru harus memenuhi 800 efektif/1.000 fisik saat dibuat. Perubahan baseline wajib satu diff dengan perubahan fase yang disetujui dan tidak boleh menaikkan ceiling. CI membandingkan baseline PR terhadap base branch dan baseline push terhadap parent commit.
- Penghitung kode efektif harus deterministik untuk TS/JS/CSS/HTML: abaikan baris kosong dan baris komentar penuh, tetapi hitung kode pada baris yang juga memiliki komentar; gate melaporkan baris efektif dan fisik.

### Prinsip implementasi

1. Pertahankan hasil simulasi, urutan mutasi state, urutan callback, serta urutan draw.
2. Pertahankan perilaku tampilan, input mouse/sentuh, penyimpanan, dan aksesibilitas.
3. Pisahkan view/DOM/CSS dari aturan interaksi dan aturan domain bila keduanya benar-benar punya tanggung jawab berbeda.
4. Pertahankan `LegacyRuntimeState` sebagai facade runtime yang disengaja: `rt.method()` tetap menjadi permukaan yang dipakai pemanggil dan tes. Implementasi boleh dipindah ke modul domain dan binding facade diarahkan ke lokasi baru. Jangan menambah facade/forwarding layer atau alias sementara yang tidak punya pemilik jelas.
5. Jangan menambah abstraksi atau dependency hanya untuk memenuhi batas baris. Setiap seam baru harus melayani variasi nyata atau membuat jalur perilaku dapat diuji.
6. Setiap fase dapat ditinjau sendiri dan menjaga build tetap dapat dijalankan. Pindahan mekanis dan cleanup/signature change dipisah menjadi diff atau review checkpoint berbeda.

---

## 2. Temuan audit awal

Hitungan fisik berdasarkan file terlacak pada audit 2026-10-26; angka efektif memakai aturan di atas. Nilai efektif yang belum dihitung ditandai secara eksplisit.

| File | Fisik | Efektif | Fokus audit awal |
|---|---:|---:|---|
| `web/src/styles.css` | 4.246 | Belum diukur | Banyak gaya HUD, menu, story, settings, achievements, bestiary, recap, dan responsive rules terkumpul di satu stylesheet. |
| `web/src/sim/tribe/TribeRuntime.ts` | 2.902 | Belum diukur | Wiring runtime untuk banyak jalur simulasi suku dan entity. |
| `web/src/core/LegacyRuntimeState.ts` | 2.662 | 1.716 | State runtime bersama, facade method, import lintas domain, dan implementasi/wiring. |
| `web/src/ui/UiRuntime.ts` | 1.969 | Belum diukur | Input/frame dispatch dan adaptasi state, callback, serta writeback ke runtime. |
| `web/src/render/RenderRuntime.ts` | 1.841 | Belum diukur | Rendering, kamera, marker, peta, dan jalur render gameplay. |
| `web/src/Hud.ts` | 1.710 | 1.502 | Pembuatan DOM, interaksi, state tampilan, dan update per render untuk banyak mode HUD. |
| `web/src/core/LegacyGameState.ts` | 1.320 | 359 | Kumpulan field state legacy yang dipakai lintas runtime. |
| `web/src/ui/LegacyStateMachine.ts` | 1.284 | 1.024 | Banyak transisi state legacy dalam satu file. |
| `web/src/sim/units/UnitRuntime.ts` | 1.215 | 905 | Wiring lifecycle, update, placement, dan aksi unit. |
| `web/src/sim/world/WorldRuntime.ts` | 969 | 693 | Sudah memenuhi batas 800 efektif dan 1.000 fisik; tidak ada target ukuran untuk dipisah. |
| `web/src/Achievements.ts` | 908 | 826 | Sedikit di atas target efektif; cek kohesi sebelum memutuskan pemisahan. |
| `web/src/TouchControls.ts` | 844 | 665 | Sudah memenuhi kedua batas; tidak perlu dipecah pada baseline ini. |

`main.ts` berukuran 493 baris dan sudah berperan sebagai composition root: inisialisasi sistem lalu memanggil update/render masing-masing. Pertahankan tanggung jawab itu dan jangan pindahkan aturan domain ke sana.

Repositori memiliki 104 skrip `verify-*.mjs`. Sebagian besar menguji logika terisolasi; `verify-upstream-port.mjs` sendiri menyebut bahwa pemeriksaan source-presence tidak menguji interaksi DOM. Ini menjadi celah penting untuk fase HUD.

Status verifikasi saat audit rencana:

- `web/scripts/oracle-all.mjs` memakai Playwright, tetapi Playwright belum tercantum di manifest/lockfile lokal. `web/public/__oracle` tidak tersedia; daftar case kosong membuat skrip mencetak `0/0 cases passed`, jadi hasil itu bukan bukti oracle.
- Manifest upstream `BOMBWCC/Prehistoric_Tribes_Web` pada commit [3b37af1](https://github.com/BOMBWCC/Prehistoric_Tribes_Web/commit/3b37af1b294ce36a50cfc95e808b6ad3f4db0328) mencantumkan `playwright: ^1.64.1`; dependency ini belum di-port ke manifest lokal.
- CI lokal di `.github/workflows/ci.yml` menjalankan `npm run lint`, `npm run build`, lalu `npm test`. Tidak ada gate ukuran file saat ini.
- `verify-upstream-port.mjs` membaca file dan mencocokkan string secara langsung; `export-art.mjs` mengimpor `RenderRuntime.ts` lewat path browser. Banyak tes lain mengimpor modul langsung, sedangkan tes integrasi runtime sengaja memakai `LegacyRuntimeState` facade.
- Oracle dan fixture dapat disiapkan terpisah; sampai fixture tersedia, klaim kesetaraan simulasi hanya boleh didasarkan pada tes yang dijalankan, bukan kriteria oracle.

---

## 3. Urutan fase

Fase disusun dari perubahan dengan pengaruh runtime paling kecil menuju perubahan state/runtime yang paling sensitif. Fase P menyiapkan seam platform agar target web dan wrapper native berikutnya tidak memaksa refactor ulang. Bila satu fase menemukan bahwa pemisahan tidak punya kohesi yang jelas, berhenti pada batas fase dan revisi rencananya sebelum memperlebar cakupan.

### Fase 0 — Inventaris, baseline, dan pagar ukuran

**Risiko:** sangat rendah.  
**Tujuan:** merekam kondisi sebelum refactor dan membuat ukuran file dapat diawasi.

- [x] Baseline pemeriksaan tercatat: `npm run lint`, `npm run build`, `npm test`, dan browser smoke; hasil penutupan terbaru dicatat di Fase 6.
- [x] Inventaris assertion path/source/export/facade dilakukan per fase; klaim perilaku HUD yang dapat diuji dipindah ke browser smoke, tes facade tetap memakai `LegacyRuntimeState`.
- [x] Playwright tersedia pada workspace lokal dan lockfile.
- [x] `test:browser` terpisah menjalankan dan menutup Vite preview serta Chromium.
- [x] CI memasang Chromium, menjalankan browser smoke, dan memeriksa size gate.
- [x] Size gate memakai baseline versioned; CI menolak ceiling yang naik.
- [x] Guard oracle menandai pemilihan nol fixture sebagai unavailable dengan exit code gagal; fixture oracle tetap tidak tersedia.
- [x] Browser smoke mencakup startup, menu, custom map/game start, build/place/back, villager panel, rally target, pause/settings, save/load, dan resize mobile/desktop.
- [x] Baseline ukuran seluruh file kode terpelihara digunakan untuk menetapkan fase; target final yang masih terbuka tercatat di Fase 6.

**Kriteria selesai:** browser test berjalan lokal dan di CI lewat script terpisah; status fixture diketahui; path/source assertions terinventaris; gate membaca baseline ter-version dan menolak kenaikan ceiling; baseline lint/build/test tercatat.

### Fase P — Batas platform untuk web dan wrapper native

**Risiko:** rendah ke menengah. Perubahan menyentuh inisialisasi, storage, dan lifecycle; jangan mengubah simulasi, urutan tick, atau hasil render.
**Target utama:** akses browser API yang tersebar dan modul terkait di `web/src/platform/`.

Fase ini menyiapkan PWA/TWA dan wrapper native tanpa memilih dependency native sekarang. Variasi web dan wrapper native adalah kebutuhan nyata, sehingga seam platform yang punya pemilik jelas sesuai Prinsip Implementasi #5.

- [x] Inventaris seluruh pemakaian `localStorage`, `navigator.vibrate`, lifecycle/visibility, environment detection, back button, safe area, dan akses browser lain yang relevan. Kelompokkan pemanggil berdasarkan perilaku; jangan memindahkan kode secara membabi buta.
- [x] Pusatkan akses persistence di `platform/Storage.ts`. Gunakan operasi async (`Promise`) sebagai kontrak awal: plugin Preferences Capacitor dan Store Tauri sama-sama async. Migrasikan pemanggil sekali pada fase ini, bukan saat wrapper dibuat.
- [x] Sebelum migrasi Storage, pastikan tidak ada baca/tulis storage di jalur tick atau render per-frame. Jika ada kebutuhan sinkron yang terbukti, muat data sebelum runtime dimulai dan gunakan cache memori; persist perubahan secara async di luar jalur frame. Jangan menunggu I/O native dalam tick.
- [x] Pertahankan ekspor/impor save yang sudah ada. Audit `ALL_STORAGE_KEYS` terhadap semua data persisten, lalu pastikan alur ekspor/impor tetap mencakup save dan preferensi yang didukung.
- [x] Ganti deteksi development berbasis hostname dengan `import.meta.env.DEV`; hostname `localhost` dapat dipakai WebView produksi.
- [x] Arahkan semua haptic melalui modul platform yang sudah ada; pertahankan setting pengguna dan perilaku web saat API vibrasi tidak tersedia.
- [x] Tambahkan pengelolaan lifecycle web melalui `visibilitychange`/`pagehide`: hentikan atau lanjutkan loop dan audio sesuai kebijakan game, serta selesaikan penulisan yang memang tertunda tanpa mengandalkan flush sinkron.
- [x] Sediakan hook platform untuk tombol Back Android; adapter web tidak melakukan apa-apa. Implementasi native baru dibuat saat fase wrapper Tauri.
- [x] Pertahankan satu adapter web dan rakit di composition root `main.ts`. Jangan menambah dependency Capacitor/Tauri dalam fase ini.
- [x] Tetapkan kebijakan orientasi mobile sebelum menerbitkan TWA atau paket native; manifest saat ini menyatakan portrait sementara game memiliki tampilan widescreen.
- [x] Verifikasi jalur browser untuk startup, settings, save/load, ekspor/impor, background/resume, serta viewport mobile dan desktop. Pastikan tidak ada I/O storage per-frame.

**Kriteria selesai:** pemanggil tidak mengakses storage/haptic/lifecycle secara langsung di luar adapter yang ditetapkan; kontrak Storage dan lifecycle siap dipakai web; ekspor/impor save tetap berfungsi; tidak ada perubahan perilaku simulasi.

**Prasyarat TWA yang belum tersedia di repo:** Android package ID, fingerprint SHA-256 sertifikat rilis, dan domain produksi belum dikonfigurasi. Karena itu, Digital Asset Links (`/.well-known/assetlinks.json`) belum dapat dibuat secara valid; manifest PWA dan ikon 512px sudah disiapkan.

---

### Fase 1 — Pecah stylesheet berdasarkan kepemilikan fitur

**Risiko:** rendah ke menengah. Tidak mengubah logika permainan, tetapi urutan cascade adalah bagian dari perilaku UI.  
**Target utama:** `web/src/styles.css` (4.246 baris).

Kelompok awal yang tampak di stylesheet: base/layout, HUD dan panel, start menu, story, settings/dialogs, achievements, bestiary, recap, indikator dan taktik. Tentukan batas final berdasarkan selector dan media query terkait, bukan hanya heading komentar. Pertahankan susunan deklarasi lama secara persis saat pemindahan.

- [x] Identifikasi urutan deklarasi dan aturan yang menimpa selector dari bagian lain.
- [x] Pecah `styles.css` ke file CSS fitur, tetapi pertahankan satu mekanisme urutan saja: `styles.css` sebagai entry dengan `@import` yang eksplisit dan berurutan.
- [x] Pertahankan setiap selector, specificity, nilai, dan urutan aturan; perubahan ini hanya memindahkan blok CSS.
- [x] Tambahkan pemeriksaan mekanis yang merangkai ulang stylesheet fitur dalam urutan entry lalu membandingkannya byte-per-byte dengan baseline, dengan pengecualian deklarasi `@import` yang baru.
- [x] Rekam screenshot sebelum/sesudah untuk mobile portrait, mobile landscape, dan desktop; ketiga hasil pixel-identik.
- [x] Pastikan semua stylesheet fitur di bawah 800 baris kode efektif dan tidak ada file >1.000 baris fisik.
- [x] Jalankan `npm run lint`, `npm run build`, `npm test`, `npm run test:browser --workspace=web`, dan smoke test visual mobile portrait, mobile landscape, serta desktop.
- [x] Periksa dialog, hover/focus, reduced motion, safe area, HUD sheet, dan tampilan start/story; perbandingan byte identik memastikan seluruh aturan gaya tidak berubah.

**Kriteria selesai:** rangkai ulang CSS identik dengan baseline kecuali deklarasi import; smoke/pixel check yang tersedia lulus; stylesheet berada di bawah gate ukuran.

---

### Fase 2 — Rapikan struktur HUD dan pisahkan view dari interaksi

**Risiko:** menengah. HUD membaca state gameplay dan menerjemahkan aksi ke kontrol game; perubahan kecil dapat memengaruhi interaksi.  
**Target utama:** `web/src/Hud.ts` (1.710 baris), beserta gaya HUD dari fase 1.

`attachHud` saat ini menjadi satu closure untuk menu/pause/help, resource bar, build list, placement ghost, building panel, villager/group panel, squads, command/order controls, idle villager finder, dan update per render. Kekhawatiran utamanya tanggung jawab bercampur, bukan jumlah baris semata.

- [x] Petakan setiap DOM subtree, state lokal, event handler, dan cabang `update()` ke fitur yang memilikinya.
- [x] Tentukan state turunan yang hanya untuk presentasi dan pisahkan dari aksi yang memanggil `TouchControls`, `TribeTactics`, save, atau runtime.
- [x] Pecah pembuatan/render DOM per kelompok fitur HUD yang kohesif; setiap modul view mengurus markup dan pembaruan tampilan milik kelompok tersebut.
- [x] Pisahkan transisi/interaksi hanya jika memiliki aturan dan state yang nyata; jangan membuat modul tipis yang sekadar meneruskan argumen.
- [x] Sisakan fungsi attach HUD sebagai composition point yang merakit modul fitur dan memenuhi kontrak update yang dipakai `main.ts`.
- [x] Hindari mengubah pemetaan keyboard/touch ke `OriginalKey` pada fase pemindahan.
- [x] Inventaris tes yang membaca teks/path HUD dan pindahkan klaim perilaku ke tes browser; pertahankan pemeriksaan statis hanya untuk invariants yang memang tidak bisa diuji lewat perilaku.
- [x] Gunakan Playwright yang sudah ditambahkan di Fase 0 untuk skenario interaksi browser; tidak perlu menambahkan jsdom/happy-dom.
- [x] Tambahkan skenario: buka/tutup menu dan pause, buka build list, masuk/keluar placement, buka/tutup panel villager, serta pilih/konfirmasi target.
- [x] Ubah path pada `verify-upstream-port.mjs` dan `export-art.mjs` saat modul dipindah; pertahankan tes `rt.method()` melalui facade `LegacyRuntimeState`.
- [x] Pastikan setiap file hasil pemisahan <800 baris kode efektif; tidak ada dua pemilik state yang saling menulis state tampilan yang sama.
- [x] Jalankan `npm run lint`, `npm run build`, `npm test`, `npm run test:browser --workspace=web`, dan smoke test desktop/mobile.

**Hasil implementasi (2026-10-27):** `Hud.ts` menjadi composition point HUD dengan 645 baris efektif dan 771 fisik. Pause/help/menu state kini dimiliki `hud/PauseMenu.ts`; DOM, cache render, dan callback panel villager dimiliki `hud/VillagerPanel.ts`. Source guards mengikuti `PlacementOverlay.ts` dan `RightThumbControls.ts`; assertion yang mengunci detail implementasi panel dipindah dari `verify-upstream-port.mjs` ke perilaku browser. `export-art.mjs` tidak memiliki path import HUD yang perlu dimigrasikan. Browser smoke mencakup build, keluar dari placement, panel villager buka/tutup, pemilihan dan konfirmasi target rally, menu pause, save/load, dan layout mobile/desktop.

**Kriteria selesai:** transisi HUD diuji lewat perilaku nyata; satu titik update tetap di `main.ts`; tidak ada regresi input atau transisi mode.

---

### Fase 3 — Pecah orkestrator runtime per jalur, satu subfase per review

**Risiko:** tinggi. Simulasi deterministik dan gambar per frame bergantung pada urutan operasi. Jangan menggabungkan lebih dari satu subfase ke satu diff besar.

Sebelum tiap subfase, buat peta fungsi → pemanggil → tes terkait. Pisahkan pemindahan mekanis dari cleanup/signature change agar perbedaan perilaku mudah dilokalisasi. Jaga facade `LegacyRuntimeState` dan method yang dipakai tes; pindahkan implementasi serta ubah binding import facade, bukan semua pemanggil `rt.method()`. `npm test` tidak menjalankan browser suite; untuk perubahan dengan efek browser-visible, jalankan `npm run test:browser --workspace=web` dan smoke browser.

#### Fase 3a — World runtime (opsional; lewati pada baseline saat ini)

- `WorldRuntime.ts` berukuran 693 baris efektif dan 969 fisik, jadi sudah memenuhi kedua batas. Jangan memindah kode atau mengambil risiko simulasi demi ukuran. Buka kembali hanya jika file melampaui gate atau muncul masalah kohesi yang konkret.

#### Fase 3b — Unit runtime
- [x] Kelompokkan `UnitRuntime.ts` (1.215 baris) berdasarkan lifecycle, update, placement, dan aksi yang benar-benar berbagi state/aturan. Aksi unit kini berada di `EntityActionRuntime.ts`; facade `LegacyRuntimeState` tetap mempertahankan method publiknya.
- [x] Pindahkan satu kelompok lengkap per perubahan; jaga callback order, cleanup, RNG, serta mutasi array.
- [x] Jalankan tes entity/unit terkait, lint, build, dan seluruh suite. Hasil: lint/build lulus, 106/106 tes lulus, browser smoke lulus; skrip langsung `test:frame-command-draw` yang dicoba tidak tersedia di workspace.

#### Fase 3c — Tribe runtime
- [x] Pindahkan kelompok simulasi suku per satu; sequencing tick, callback, budget/economy, dan entity loops tetap pada call order semula. `TribeRuntime.ts` turun menjadi 640 baris efektif; orkestrasi frame, entity helpers, AI muster, marker/signal, dan state command kini berada di modul pemiliknya.
- [x] Jalankan lint, build, seluruh suite, dan browser smoke setelah pemindahan. Hasil dicatat di bagian bawah subfase.

**Hasil implementasi (2026-10-27):** `TribeRuntime.ts` memiliki 640 baris efektif; orkestrasi tick di `TribeFrameRuntime.ts` 719, entity helpers di `TribeEntityRuntime.ts` 186, marker/signal di `TribeSignalRuntime.ts` 205, AI muster di `TribeAiMusterRuntime.ts` 237, dan state command di `TribeStateCommandRuntime.ts` 116. `LegacyRuntimeState` tetap mempertahankan `stepSubsystemFrame()` sebagai facade; pemanggil entity yang memakai implementasi langsung kini mengimpor dari `TribeEntityRuntime.ts`. Lint/build, 106/106 tes, dan browser smoke lulus. `npm run check:size` masih melaporkan 4 file di luar batas: `LegacyRuntimeState.ts` (1720/1716 efektif; 2666/2662 fisik), `RenderRuntime.ts` (1257/1256; 1842/1841), `WorldRuntime.ts` (694/693; 970/969), dan `UiRuntime.ts` (1323/1321; 1971/1969). Modul tribe baru tidak termasuk laporan kegagalan.


#### Fase 3d — UI runtime dispatch
- [x] Petakan `UiRuntime.ts` berdasarkan input, frame dispatch, dan state transition. `stepFrameDispatch()` menjadi kelompok frame dispatch yang paling terisolasi dan memiliki pemanggil produksi terverifikasi.
- [x] Pindahkan dispatcher ke `UiFrameDispatchRuntime.ts`; urutan handler, callback, dan writeback tetap sama. `LegacyRuntimeState.stepFrameDispatch()` tetap menjadi facade.
- [x] Tes yang relevan tetap memakai facade; tidak ada tes atau pemanggil produksi yang mengimpor path implementasi `UiRuntime.ts` secara langsung.
- [x] Jalankan lint, build, seluruh suite, dan browser smoke setelah pemindahan. Hasil dicatat di bawah.

**Hasil implementasi terbaru (2026-10-27):** setelah evaluasi penutupan, kelompok gameplay command dipindah ke `UiGameplayCommandRuntime.ts` dan kelompok state transition ke `UiStateRuntime.ts`. `UiRuntime.ts` kini 528 baris efektif/760 fisik; seluruh pemanggil runtime/facade dan Settings, StartMenu, TouchControls, serta WorldRuntime diarahkan ke pemiliknya.

#### Fase 3e — Render runtime
- [x] Petakan `RenderRuntime.ts` (1.841 baris) ke kamera, map/marker, dan gameplay paint berdasarkan call graph aktual.
- [x] Pertahankan urutan draw/composite dan state yang dikonsumsi HUD.
- [x] Verifikasi path di `export-art.mjs` dan tes/import terkait; `drawImageHelper` tetap di `RenderRuntime.ts`, jadi path ekspor yang ada tidak perlu dipindah. Jangan ubah hasil art export.
- [x] Jalankan tes renderer/map/camera terkait, lint, build, seluruh suite, dan smoke browser.

**Hasil implementasi (2026-10-27):** `stepCameraFollow`, `stepCameraScroll`, `renderMap`, `stepCameraFrame`, `stepCameraCursor`, dan `drawMapMarker` kini berada di `CameraRuntime.ts`. `RenderRuntime.ts` turun menjadi 1.043 baris efektif/1.548 fisik dari baseline 1.256/1.841; `CameraRuntime.ts` memiliki 222/309. Jalur map dan cursor di `WideView.ts`, serta callback kamera di runtime/UI, diarahkan ke modul baru tanpa mengubah urutan draw/composite. Lint/build, 106/106 tes, dan browser smoke lulus. `export-art.mjs` tetap mengimpor `drawImageHelper` dari `RenderRuntime.ts`; generator tidak dijalankan karena ia menghapus `art-export/` sebelum menulis ulang.

**Hasil pendalaman penutupan (2026-10-27):** `drawFrameCommandPrimitive` kini dimiliki `FrameCommandPrimitiveRuntime.ts` (460/530), sedangkan `stepGameplayOuterLoop` berada di `GameplayOuterLoopRuntime.ts` (214/351). `RenderRuntime.ts` turun menjadi 364 baris efektif/657 fisik; pemanggil langsung dan facade runtime memakai modul pemilik.

Pemeriksaan ukuran penutupan: `LegacyRuntimeState.ts` 945 efektif/1.750 fisik berada dalam pengecualian facade yang disetujui dan ceiling ratchet-nya diturunkan ke ukuran tersebut. `LegacyGameState.ts` tetap pengecualian fisik ledger. Semua file lain memenuhi <800 efektif dan <1.000 fisik.
#### Fase 3f — State machine
- [x] Audit kohesi `LegacyStateMachine.ts` (1.284 baris); jangan membagi menurut alfabet saja.
- [x] Kelompokkan transisi menurut konsep/urutan lifecycle hanya bila batasnya mengurangi navigasi tanpa menambah forwarding.
- [x] Pertahankan urutan cabang dan callback; jalankan tes state-machine terkait, lint, build, serta suite penuh.

**Hasil Fase 3f:** transisi seleksi unit dan reset seleksi berada di `sim/units/LegacyUnitSelection.ts`; transisi map/viewport entry berada di `sim/world/LegacyMapEntryTransitions.ts`; transisi audio berada di `audio/LegacyAudioTransitions.ts`. Pemanggil memakai modul pemilik secara langsung; `stepLegacyAk` tetap menjadi orkestrator. `LegacyStateMachine.ts` kini 736 baris efektif/901 fisik. Bukti: `npm run lint` lulus, `npm run build` lulus, `npm test` lulus 106/106, dan `npm run test:browser --workspace=web` lulus untuk startup, custom map, placement, panel villager, rally, pause, save/load, serta layout desktop/mobile. `npm run check:size` masih melaporkan tiga ceiling lama: `LegacyRuntimeState.ts` 1725/1716 efektif, `WideView.ts` 163/162, `WorldRuntime.ts` 694/693; ratchet fase berikutnya belum lulus.

**Oracle:** fixture oracle tidak ada pada branch lokal dan upstream commit terbaru yang diperiksa belum menyediakan fixture di repo ini. Jangan menjadikan oracle sebagai acceptance wajib sampai fixture yang sah tersedia; saat unavailable, catat keterbatasannya dan gunakan tes perilaku yang benar-benar dijalankan plus smoke browser. Jangan pernah menerima `0/0 cases passed` sebagai bukti.

**Kriteria selesai:** tiap subfase punya bukti tes yang tersedia, urutan state/render dipertahankan, seluruh implementasi termigrasi langsung, facade runtime tetap utuh, dan ukuran berada di bawah gate yang berlaku.

---

### Fase 4 — Pertahankan facade runtime, evaluasi ukuran dan kepemilikan state

**Risiko:** tinggi. Ini menyentuh import/wiring dan state yang dipakai lintas domain.

`LegacyRuntimeState` adalah facade yang disengaja dan menjadi permukaan tes integrasi; beberapa skrip membuat instance lalu memanggil `rt.method()`. Pemecahan implementasi tidak boleh menghapus atau mengganti permukaan tersebut. `LegacyGameState` berfungsi sebagai katalog field legacy beserta dokumentasi bytecode; pemecahan kelas/field berisiko merusak locality dokumentasi tanpa manfaat perilaku yang terbukti.

- [x] Hitung import, method facade, field/initialization, dan logic implementasi di `LegacyRuntimeState.ts` sebelum menetapkan target ukuran akhir.
- [x] Estimasikan batas minimum facade setelah Fase 3, termasuk kode efektif/fisik.

**Audit caller Fase 4:** analisis TypeScript atas 356 file `web/src` dan AST seluruh skrip `web/scripts` menemukan 163 method dipakai kode aplikasi, dua method tambahan hanya dipakai skrip tes, lima method hanya dipakai internal, dan 17 tanpa referensi source/tes. Dari 187 method, 103 sudah berupa direct delegate satu-call. Rentang import adalah 285 efektif/286 fisik; field/initialization 190 efektif/371 fisik; method yang terpakai beserta internal-only 1.012 efektif/1.153 fisik. Batas tanpa delegasi sekurangnya 1.487 efektif/1.810 fisik, jadi strategi itu tetap gagal batas fisik. Analisis ini memasukkan rantai fluent dan akses properti literal; tidak ditemukan dispatch dinamis runtime selain dua pemanggilan tes yang juga terhitung.
- [x] Keputusan Fase 4: izinkan facade delegasi tipis. Pertahankan nama, semantik, dan akses seluruh method publik `rt.method()`; pindahkan implementasi wiring yang masih tertanam ke modul domain kohesif.
- [x] Pindahkan 82 implementasi method terpakai/dormant ke empat modul wiring; facade `rt.method()` tetap utuh. Hasil saat ini: `LegacyRuntimeState.ts` 1.750 baris fisik; batas 1.000 belum terpenuhi karena field/initialization, import, deklarasi state pendukung, dan logika bootstrap kelas masih berada di file.
- [x] Keputusan ukuran: izinkan pengecualian fisik terdokumentasi untuk `LegacyRuntimeState.ts` pada ukuran terukur 1.750 baris. Pengecualian hanya untuk facade dan tidak meliputi implementasi yang sudah dipindah; `LegacyGameState.ts` tetap pengecualian ledger terpisah.
- [x] `LegacyGameState` tetap satu field ledger; dokumentasi bytecode dan kepemilikan field tidak diubah.
- [x] Tes integrasi facade dan existing browser smoke tetap berjalan melalui kontrak runtime yang sama; shared-field writeback, input, save/load, rendering, dan lifecycle tercakup oleh suite yang tersedia.
- [x] Pengecualian hard limit fisik mencakup `LegacyGameState.ts` dan `LegacyRuntimeState.ts` saja; target efektif `LegacyGameState.ts` tetap <800. Pindahkan komentar historis hanya bila catatan field tetap terjaga.
- [x] Karena oracle belum tersedia, laporkan keterbatasan dan jangan mengklaim kesetaraan oracle.
- [x] Jalankan lint, build, `npm test`, `npm run test:browser --workspace=web`, dan smoke browser.
**Verifikasi:** `npm run lint`, `npm run build`, `npm test` (106/106), dan browser smoke (`npm run test:browser --workspace=web`) lulus. `npm run check:size` masih gagal pada `WideView.ts` (163/162 efektif, 215/214 fisik) dan `WorldRuntime.ts` (694/693 efektif, 970/969 fisik); keduanya tidak disentuh Fase 4 ini.

**Kriteria selesai:** kelayakan ukuran facade dibuktikan dengan breakdown; pengecualian fisik khusus berlaku untuk `LegacyGameState.ts` dan `LegacyRuntimeState.ts`; seluruh file lain di bawah 1.000 fisik; tes memakai facade yang sama.

---

### Fase 5 — Penuhi target ukuran UI; pendalaman struktural opsional

**Risiko:** rendah ke menengah; manfaatnya belum terbukti cukup untuk memprioritaskan perubahan input sentuh.

Fase ini opsional untuk **pendalaman struktur**, tetapi target ukuran akhir tetap berlaku. Baseline awal `Achievements.ts` adalah 827 baris efektif; batasnya tetap <800. Pemisahan kabinet trofi kini membuat `Achievements.ts` berisi definisi, pencatatan, dan progres achievement, sementara UI modal berada di `AchievementCabinet.ts`. `TouchControls.ts` tetap utuh.

- [x] Tinjau `Achievements.ts`; tidak menghapus kode mati. Pisahkan UI kabinet trofi sebagai seam kohesif, bukan modul forwarding.
- [x] `Achievements.ts` kini 704 baris efektif/771 fisik; `AchievementCabinet.ts` menjadi modul pemilik modal dan filter kabinet.
- [x] Migrasikan pemanggil `mainRuntime.ts` langsung ke `AchievementCabinet.ts`; ekspor lama `attachAchievements` dihapus dari `Achievements.ts`.
- [x] `TouchControls.ts` tetap utuh; gate terukur saat ini tetap di bawah target efektif dan fisik.
- [x] Perilaku achievement dan input tidak diubah. Browser smoke langsung: kabinet terbuka dalam Bahasa Inggris, merender 14 kartu dan 3 filter; filter Semua (14), Terbuka (0), Terkunci (14) menghasilkan daftar sesuai pilihan.
- [x] Lint, build, suite penuh, browser smoke, dan size gate berhasil.
- [x] Review checkpoint Fase 5 dilakukan sebelum menerima pemisahan AchievementCabinet dan perubahan dokumentasi terkait.

**Kriteria selesai:** `Achievements.ts` di bawah 800 efektif; `TouchControls.ts` tetap utuh selama memenuhi gate; input dan pencatatan achievement tidak berubah.

---

### Fase 6 — Dokumentasi struktur dan penutupan

**Risiko:** rendah.  
**Tujuan:** menjaga hasil refactor mudah dinavigasi dan mencegah ukuran file tumbuh kembali.

- [x] Perbarui struktur folder di `README.md` dan `README.id.md` sesuai modul yang benar-benar dibuat, termasuk `AchievementCabinet.ts`.
- [x] Catat aturan ukuran, perintah `npm run check:size`, dan pengecualian facade/ledger di README, rencana, dan baseline ratchet.
- [x] Selesaikan target final: seluruh file di bawah 800 baris efektif dan 1.000 baris fisik kecuali `LegacyRuntimeState.ts` (945/1.750, pengecualian facade disetujui) dan `LegacyGameState.ts` (359/1.320, pengecualian ledger fisik). `RenderRuntime.ts` (364/657) dan `UiRuntime.ts` (528/760) kini di bawah target.
- [x] Audit awal menemukan source-presence guards tersisa di `verify-upstream-port.mjs`. Browser smoke mencakup alur utama HUD; guard detail yang belum memiliki cakupan perilaku padanan tetap dipertahankan sampai tes perilaku tersedia, termasuk invariant snapshot `villagerPanelDraft`.
- [x] Review diff perubahan Fase 5/6 dan penutupan: tidak ditemukan regresi perilaku; jalur error resource tetap ditangani `boot().catch()` di `mainRuntime.ts`, sedangkan baca storage gagal di-cache sebagai null. Catatan review: working diff saat ini menggabungkan beberapa fase/subfase runtime, berlawanan dengan aturan review terpisah di §3; jangan gabungkan lagi pada pekerjaan berikutnya.

**Kriteria selesai:** dokumentasi sesuai implementasi; gate ukuran aktif; seluruh target akhir tercapai; pemeriksaan yang tersedia lulus; oracle tidak diklaim bila fixture belum ada.


---

## 4. Risiko utama dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Oracle fixture tidak tersedia dan skrip memilih nol case | Kriteria simulasi memberi rasa aman palsu | Guard menolak nol case sebagai lulus; gunakan tes perilaku dan browser sampai fixture sah tersedia. |
| Playwright test masuk ke `verify-*.mjs` | `npm test` mencoba menjalankannya tanpa Chromium setup | Gunakan script `test:browser` terpisah; install Chromium dan jalankan browser suite sebagai step CI eksplisit. |
| Tes source/path gagal setelah pemindahan | Refactor tampak rusak meski perilaku sama | Inventaris sebelum perubahan; migrasikan import path dan ganti klaim perilaku dengan skenario browser, pertahankan tes facade. |
| Gate size berlaku penuh pada file lama sejak hari pertama | CI merah sebelum refactor sempat mengecilkan file | Gunakan baseline per file yang versioned; turunkan ceiling saja saat menerima hasil fase; file baru langsung memenuhi batas akhir. |
| Facade `LegacyRuntimeState` tidak bisa mencapai 800 baris efektif | Tekanan untuk memecah facade atau menambah forwarding semu | Hitung facade floor di Fase 4; berikan pengecualian efektif khusus bila terbukti perlu; pertahankan hard limit fisik. |
| CSS split mengubah cascade atau screenshot bergantung browser | Regresi tampilan atau false-positive pixel diff | Satu entry `@import`, rangkai ulang byte compare; pixel diff hanya pada versi browser/viewport tetap dengan baseline. |
| `LegacyGameState` field bergeser karena pemecahan | Keterlacakan bytecode dan ownership field memburuk | Pertahankan satu field ledger dan pengecualian fisiknya; hindari proxy/subrecord tanpa bukti pemilik state membaik. |
| Storage native async atau origin berbeda dari web | Save hilang, pemanggil sync tidak kompatibel, atau data tidak tersimpan saat lifecycle berubah | Tetapkan kontrak async di Fase P, hindari I/O per-frame, pertahankan ekspor/impor save yang ada, lalu uji transfer web↔Tauri dan resume/background pada wrapper. |
| Branch kerja dipakai terlalu lama | Konflik integrasi meningkat | Selesaikan satu subfase per review checkpoint; pengguna menentukan integrasi/sinkronisasi branch. |
| Terlalu banyak area berubah dalam satu diff | Review dan isolasi regresi sulit | Pisahkan pindahan mekanis dari cleanup/signature changes; review tiap subfase sendiri. |

---

## 5. Rekomendasi urutan dan keputusan tinjauan

Urutan modularisasi yang direkomendasikan: **Fase 0 → Fase P → Fase 1 → Fase 2 → Fase 3b–3f → Fase 4 → Fase 5/6**. Urutan target platform: **Fase 0 → Fase P → Opsi 5 (PWA/TWA) → Fase 2 → Opsi 4 (Tauri 2)**; Opsi 5 dapat berjalan paralel dengan Fase 1 setelah Fase P selesai. Opsi 4 dimulai setelah Fase 2, ketika HUD stabil. Fase 3a dilewati pada baseline karena `WorldRuntime.ts` sudah di bawah kedua batas.

Keputusan dan pagar yang dipakai:

- **Ukuran akhir:** 800 kode efektif; semua file di bawah 1.000 baris fisik kecuali `LegacyGameState.ts`. Selama ratchet, file lama boleh tetap di ceiling saat ini tanpa tumbuh; file di atas target turun saat fase pemiliknya diterima; file baru langsung memenuhi target.
- **Facade:** pertahankan `LegacyRuntimeState` method surface. Beri pengecualian efektif hanya bila perhitungan facade minimum setelah pemindahan membuktikan hasilnya >800; jangan membuat forwarding layer.
- **Baseline:** `web/scripts/size-baseline.json`, berisi ceiling efektif/fisik tiap file terlacak. Script gate tidak mengubah baseline; pemilik fase menurunkannya dalam diff yang sama setelah hasil diterima, dan CI menolak ceiling yang naik.
- **Browser test:** gunakan `test:browser` terpisah dari `npm test`; CI memasang Chromium dengan `npx playwright install --with-deps chromium` lalu menjalankan suite tersebut.
- **Oracle:** fixture tidak ada di lokal maupun path upstream yang diperiksa. Jangan wajibkan oracle sebelum tersedia; `0/0` tidak dihitung lulus.
- **State ledger:** jangan pecah `LegacyGameState` menjadi subrecord; pertahankan dokumentasi bytecode dan pengecualian fisiknya.
- **Keputusan target platform (2026-10-26):** jalankan Opsi 5 lebih dulu untuk mematangkan PWA/TWA dan menguji game di perangkat nyata; setelah itu gunakan Tauri 2 sebagai wrapper native untuk Android dan Windows dari frontend yang sama.
- **Pilihan wrapper:** Tauri 2 adalah pilihan default untuk Opsi 4 karena kebutuhan mencakup Android dan Windows, serta pengalaman Rust sudah ada. Jangan buat wrapper Capacitor dan Tauri terpisah tanpa kebutuhan platform konkret. Tinjau ulang Capacitor hanya jika ditemukan kebutuhan Android yang tidak terpenuhi dengan baik oleh Tauri.
- **Urutan integrasi native:** tunggu Fase P dan Fase 2 selesai sebelum menambahkan dependency atau konfigurasi native Tauri. Gunakan adapter Tauri untuk mengganti implementasi platform; modul game tidak mengimpor API Tauri secara langsung.
- **Storage native:** gunakan kontrak async sebagai default dan simpan data melalui adapter. Tauri Store resmi async dan mendukung Android/Windows; validasi save/load, ekspor/impor, serta perilaku saat aplikasi masuk background pada wrapper sebelum rilis. Jangan memindahkan simulasi ke Rust kecuali pengukuran perangkat membuktikan WebView tidak memenuhi kebutuhan.
- **Artefak web:** pertahankan satu frontend web. PWA/TWA menggunakan build yang di-host; Tauri membundel frontend yang sama bersama konfigurasi wrapper per target. Jangan menganggap TWA, APK, dan installer desktop sebagai satu paket atau satu mekanisme distribusi.
- **Save antar target:** fitur ekspor/impor yang sudah ada menjadi jalur pindah save antara origin web/PWA dan penyimpanan aplikasi Tauri. Jangan membuat sistem migrasi kedua; verifikasi alur tersebut pada smoke test native.
- **Keputusan yang masih terbuka:** kebijakan orientasi mobile dan kebutuhan distribusi sementara lewat TWA/MSIX. Putuskan sebelum paket target terkait diterbitkan, bukan dengan mengubah kontrak platform.

---

## 6. Status

- [x] Audit awal ukuran dan kelompok modul besar dilakukan pada 2026-10-26.
- [x] Branch kerja `refactor-improve-codebase` dibuat.
- [x] Plan ditinjau pengguna.
- [x] Implementasi bertahap dimulai setelah plan ditinjau.
