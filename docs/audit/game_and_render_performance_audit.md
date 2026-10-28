# Audit Teknis Komprehensif: Arsitektur Game Loop, Paritas Oracle J2ME, dan Performa Rendering Kanvas

Kind: descriptive and normative | Audience: software engineers, frontend developers, and game engine maintainers | Purpose: mendokumentasikan analisis performa render game loop, batasan determinisme J2ME oracle, dan panduan optimasi terukur | Non-goals: mengubah berkas logika game atau mematikan fungsi deterministik tanpa verifikasi oracle

| Metadata | Keterangan |
| :--- | :--- |
| **Dokumen** | Audit Teknis dan Laporan Rekayasa Kinerja Rendering |
| **Target Berkas** | `docs/audit/game_and_render_performance_audit.md` |
| **Status** | Draft audit — dalam peninjauan / belum diimplementasi |
| **Repositori** | `prehistoric_tribes_web` |
| **Modul Terkait** | `web/src/platform/FixedLoop.ts`, `web/src/mainRuntime.ts`, `web/src/WideScreen.ts`, `web/src/render/WeatherSystem.ts`, `web/src/render/WorldParticles.ts`, `web/src/render/EmotionBubbles.ts`, `web/src/platform/PerfOverlay.ts` |
| **Klasifikasi** | Analisis Kritis, Verifikasi Oracle, & Pedoman Profiling |

---

## 1. Ringkasan Eksekutif & Struktur Loop Engine Saat Ini

Mesin web *Prehistoric Tribes* merupakan hasil rekonstruksi (*port*) modern dari game strategi/simulasi tribal real-time J2ME asli. Untuk mempertahankan keaslian simulasi sembari menghadirkan visual layar penuh yang responsif pada perangkat modern (layar ponsel 60/120 Hz, desktop beresolusi tinggi), mesin ini menerapkan arsitektur *dual-loop* terpisah (*decoupled architecture*):

1. **Deterministic Fixed Simulation Loop (`web/src/platform/FixedLoop.ts`)**:
   - Beroperasi pada basis waktu tetap beranggaran $120\text{ ms}$ per tick pada kecepatan normal ($1\times$), atau sekitar $\sim 8{,}33\text{ tick/detik}$.
   - Mengendalikan kemajuan logika permainan (`tick()`), pembaruan AI suku, pergerakan unit, produksi sumber daya, dan *state rendering* internal game J2ME dasar.
   - Dilengkapi proteksi *spiral-of-death* untuk mencegah pembekuan tab browser saat terjadi pelambatan frame berat.

2. **Decoupled Visual Presentation Loop (`web/src/mainRuntime.ts`)**:
   - Beroperasi pada kecepatan refresh tampilan asli monitor/layar ponsel ($60\text{ Hz}$ hingga $120\text{ Hz}$) via `requestAnimationFrame` melalui pemanggilan fungsi `composeEveryFrame()`.
   - Mengontrol proses komposisi grafis `WideScreen.compose()`, penjejakan HUD interaktif, serta indikator bahaya (*danger indicators*) di atas kanvas.

3. **Wide Viewport Compositor (`web/src/WideScreen.ts`)**:
   - Menjembatani resolusi kanvas game J2ME asli ($240 \times 320\text{ px}$) ke kanvas layar penuh dengan kamera fleksibel.
   - Panning kamera saat peta digeser (*drag*) terjadi secara independen dari tick logika, di mana pergeseran piksel halus diinterpolasikan langsung pada setiap frame display.

### Diagram Arsitektur Dual-Loop

```
+-----------------------------------------------------------------------------------+
|                        TAMPILAN BROWSER / PERANGKAT (DOM)                         |
+-----------------------------------------------------------------------------------+
       ^                                      ^
       | (60 / 120 FPS via rAF)               | (~8.33 FPS pada speed 1x / 120ms)
       |                                      |
+------------------------------+       +--------------------------------------------+
|      composeEveryFrame()     |       |          FixedLoop (Fixed Timestep)        |
|  (Presentation / Compositor) |       |            (Simulation & Logic)            |
+------------------------------+       +--------------------------------------------+
| - screen.compose()           |       | while (accumulator >= stepMs) {            |
|   * Smooth sub-pixel camera  |       |   1. update(tick) -> tick() [Logika 120ms] |
|   * Map panning transform    |       |   2. render(0)    -> render()              |
| - hud.track()                |       |      * paint() [Game J2ME & PRNG]          |
| - dangerIndicators.track()   |       |      * screen.renderWide()                 |
|                              |       |      * [Saat Ini] weather/particles/emotes |
+------------------------------+       | }                                          |
                                       +--------------------------------------------+
```

Meskipun pemisahan loop ini berhasil menghasilkan panning peta yang halus pada 60/120 FPS, audit mendalam terhadap implementasi sistem visual modern (cuaca, partikel dunia, dan gelembung emosi) mengungkap adanya ketidaksinkronan arsitektural yang menyebabkan cacat visual fatal (*glitch*) dan perlambatan simulasi animasi.

### Keterhubungan dengan Laporan Audit Terdahulu

Audit ini terhubung langsung dan melanjutkan investigasi teknis dari [`docs/audit/2026-10-deep-audit-and-architecture-report.md`](2026-10-deep-audit-and-architecture-report.md). Laporan sebelumnya telah mendokumentasikan karakteristik performa inti dan batasan stabilitas engine, antara lain:
- **Batas 5-tick catch-up cap pada `FixedLoop`** (`web/src/platform/FixedLoop.ts`): Penerapan batas proteksi *spiral-of-death* (`Math.min(now - previous, stepMs * 5)`) agar tab browser tidak membeku saat terjadi degradasi performa atau proses *backgrounding*.
- **Kloning state di `WideView.snapshot()`** (`web/src/render/WideView.ts`): Temuan lonjakan *garbage collection churn* signifikan akibat kloning graf state penuh dan TypedArray dense pada setiap frame render tampilan lebar.

Dokumen audit ini melengkapi temuan terdahulu dengan menyoroti titik temu antara determinisme simulasi dengan performa rendering visual modern, memastikan interpolasi dan efek partikel berjalan mulus tanpa mengorbankan integritas J2ME oracle.

---

## 2. Temuan Terverifikasi (Kritis)

### 2.1 Bug Delta Cuaca & Framerate Animasi Lambat (~8.33 FPS)

#### Lokasi Kode
- `web/src/mainRuntime.ts:242-261`
- `web/src/render/WeatherSystem.ts:337-376`

#### Analisis Masalah
Pada berkas `web/src/mainRuntime.ts:253`, sistem cuaca diperbarui melalui pemanggilan:
```typescript
weatherSystem.tick(now, 16);
```
Pemanggilan ini ditempatkan di dalam fungsi `render()`, yang **hanya dieksekusi di dalam siklus loop tick $120\text{ ms}$** (`FixedLoop.ts:70`).

Namun, nilai parameter `deltaMs` yang diteruskan di-hardcode ke angka `16` (merepresentasikan asumsi frame 60 FPS biasa berdurasi $\sim 16{,}6\text{ ms}$). Di dalam `web/src/render/WeatherSystem.ts:350`, delta waktu dikalkulasikan sebagai berikut:
```typescript
const dt = Math.min(0.1, deltaMs / 1000);
```
Dengan parameter bernilai `16`, variabel `dt` bernilai tetap $0{,}016\text{ detik}$.

#### Dampak Kuantitatif: Perlambatan Visual 7,5x Lipat
Dalam 1 detik waktu nyata ($1000\text{ ms}$):
- `FixedLoop` dengan kecepatan $1\times$ ($120\text{ ms}$ per tick) mengeksekusi `render()` sebanyak:
  $$\text{Frekuensi Eksekusi} = \frac{1000\text{ ms}}{120\text{ ms}} \approx 8{,}333\text{ kali per detik}$$
- Total waktu fisika cuaca yang dimajukan (`accumulated dt`):
  $$\text{Total Waktu Simulasi} = 8{,}333 \times 0{,}016\text{ detik} \approx 0{,}1333\text{ detik per detik riil}$$
- Rasio perlambatan:
  $$\text{Rasio Perlambatan} = \frac{1{,}0000\text{ s}}{0{,}1333\text{ s}} = 7{,}5\times$$

**Konsekuensi**:
1. Fisika tetesan air hujan (`rainDrops`), kepingan salju (`snowFlakes`), dan pudarnya riak air (`ripples`) berjalan **7,5 kali lebih lambat** daripada waktu dunia nyata.
2. Karena pembersihan dan penggambaran kanvas cuaca (`ctx.clearRect` dan render partikel) berada di dalam `render()` yang hanya berdetak setiap $120\text{ ms}$, animasi partikel hujan dan salju hanya diperbarui pada kecepatan **$\sim 8{,}33\text{ FPS}$**, tampak sangat patah-patah (*choppy slideshow*) di layar pemain alih-alih mengalir mulus pada 60 FPS.

---

### 2.2 Masalah Visual Trail/Lag Partikel saat Drag Peta

#### Lokasi Kode
- `web/src/mainRuntime.ts:252-261` (update di dalam `render()`)
- `web/src/mainRuntime.ts:323-331` (panning di dalam `composeEveryFrame()`)
- `web/src/render/WorldParticles.ts:180-248`
- `web/src/render/EmotionBubbles.ts:174-267`

#### Analisis Masalah
Kanvas peta utama digeser (*panned*) dengan sangat mulus pada $60\text{ FPS}$ atau $120\text{ FPS}$ melalui fungsi `composeEveryFrame`:
```typescript
const composeEveryFrame = () => {
  const endFrameCompose = perf?.start("frameCompose");
  screen.compose();
  endFrameCompose?.();
  hud.track();
  dangerIndicators.track();
  requestAnimationFrame(composeEveryFrame);
};
```
Fungsi `screen.compose()` memperbarui matriks pergeseran kamera dan mentransformasi gambar peta secara real-time setiap frame tampilan monitor.

Sebaliknya, tiga sistem overlay visual:
1. `worldParticles` (`.world-particles-canvas`, z-index 2)
2. `weatherSystem` (`.weather-canvas`, z-index 4)
3. `emotionBubbles` (`.emotion-canvas`, z-index 5)

hanya dipanggil di dalam fungsi `render()` pada `mainRuntime.ts:252-261`. Kanvas-kanvas independen ini hanya dihapus (`clearRect`) dan digambar ulang pada tick $120\text{ ms}$ ($\sim 8{,}33\text{ Hz}$).

#### Dampak Visual: Detasemen dan Panning Lag
Ketika pemain menggeser peta (*touch drag* atau *mouse drag*):
- Peta tanah, bangunan, dan unit di kanvas utama bergeser seketika mengikuti koordinat sentuhan pada 60/120 FPS.
- Namun jejak kaki unit (`footprints`), kepulan asap rumah/dapur (`smokePuffs`), dan balon emosi penduduk (`emotionBubbles`) **tetap membeku pada posisi lama di layar** hingga $120\text{ ms}$ berikutnya ketika tick logika selesai dieksekusi.
- Begitu tick berikutnya tiba, seluruh partikel tiba-tiba "melompat" (*teleport snap*) ke koordinat baru. Fenomena ini menciptakan efek *ghosting*, *visual stutter*, dan ketertinggalan (*visual trail lag*) yang merusak kualitas presentasi visual game.

---

### 2.3 Evaluasi Determinisme Sistem Visual

Sebuah kekhawatiran arsitektur adalah apakah memindahkan pembaruan sistem-sistem di atas ke loop `composeEveryFrame` (yang berjalan pada frame-rate tampilan variabel) akan merusak determinisme game atau membatalkan hasil replay/oracle J2ME.

Berikut adalah bukti audit kode sumber terhadap PRNG dan manipulasi *state* ketiga sistem:

#### A. Sumber Bilangan Acak (PRNG)
Pemeriksaan menyeluruh pada berkas:
- `web/src/render/WeatherSystem.ts`:
  - Baris 192-197: `Math.random()` untuk posisi, kecepatan, panjang, dan transparansi tetesan hujan.
  - Baris 204-210: `Math.random()` untuk radius, kecepatan, dan sudut hembusan salju.
  - Baris 344: `this.setMode(Math.random() > 0.4 ? "rain" : "snow");`
  - Baris 357: `if (now - this.lastLightningTime > 18000 + Math.random() * 22000)`
- `web/src/render/WorldParticles.ts`:
  - Baris 118-123: `Math.random()` untuk hamburan burung (`triggerBirdScatter`).
  - Baris 157-158: `Math.random()` untuk offset acak jejak kaki.
  - Baris 215-221: `Math.random()` untuk posisi dan kecepatan kepulan asap.
- `web/src/render/EmotionBubbles.ts`:
  - Baris 212: `Math.sin(p * Math.PI)` untuk animasi skala balon.
  - Baris 223: `Math.sin(elapsed * 0.007)` untuk efek melayang vertikal.

**Fakta Terverifikasi**: Ketiga sistem visual tersebut **100% menggunakan `Math.random` murni bawaan JavaScript engine**, dan **SAMA SEKALI TIDAK** menyentuh modul PRNG deterministik game (`web/src/platform/LegacyRandom.ts` atau `runtime.random`).

#### B. Isolasi Efek Gameplay Cuaca vs Efek Visual
Satu-satunya kode yang memodifikasi *dense state* simulasi adalah method `weatherSystem.applyGameplayEffects(runtime, now)` (`WeatherSystem.ts:113-172`), yang mengatur:
- Efek lumpur hujan memperlambat gerak unit (baris 119-132).
- Efek salju membekukan yang menguras energi unit jika berada di luar jangkauan api hangat (baris 138-164).
- Efek hujan menyuburkan tanaman berry (baris 165-171).

Method `applyGameplayEffects` ini **terpisah penuh** dari method `weatherSystem.tick(now, deltaMs)` yang mengurus render grafis kanvas hujan dan partikel salju!

#### Tabel Ringkasan Determinisme

| Komponen | PRNG yang Digunakan | Memodifikasi State Game? | Aman Dipindah ke `composeEveryFrame`? |
| :--- | :--- | :--- | :--- |
| `weatherSystem.tick()` | `Math.random()` | Tidak (hanya fisika & render kanvas cuaca) | **Ya (Sangat Aman)** |
| `weatherSystem.applyGameplayEffects()` | N/A | Ya (`denseState` & `mainArrays`) | **Tidak (Tetap di Tick Simulasi)** |
| `worldParticles.tick()` | `Math.random()` | Tidak (hanya partikel visual) | **Ya (Sangat Aman)** |
| `emotionBubbles.tick()` | Tidak ada PRNG (hanya `Math.sin`) | Tidak (baca data `denseState` secara *read-only*) | **Ya (Sangat Aman)** |

**Kesimpulan Evaluasi**: Memindahkan eksekusi visual `weatherSystem.tick()`, `worldParticles.tick()`, dan `emotionBubbles.tick()` ke dalam `composeEveryFrame` dengan delta waktu aktual **sepenuhnya aman**, tidak akan mengubah determinisme simulasi game, serta menjamin partikel terinterpolasi secara mulus di setiap frame layar.

---

## 3. Analisis Batasan Paritas Oracle J2ME (PENTING - Jangan Diubah Sembarangan)

Saat merekayasa kinerja render, batas-batas kompatibilitas dengan oracle J2ME asli harus dijaga secara ketat. Dua bagian kode di bawah ini tampak seperti inefisiensi sekilas, namun dirancang secara sengaja demi menjaga paritas biner dengan game aslinya:

### 3.1 Desain Intensional Pemanggilan `render(0)` di `FixedLoop.ts:62-71`

Pada `web/src/platform/FixedLoop.ts:58-71`:
```typescript
const stepMs = this.tickMs / this.speed;
const elapsed = Math.min(now - this.previous, stepMs * 5);
this.previous = now;
this.accumulator += elapsed;
// f.run paints once per loop iteration (l() after m()), and paint() draws
// from Random, so render exactly once after each update -- never on a
// display frame without one (the canvas keeps the last picture). It used
// to render every animation frame, ~7 paints per tick (2026-10-08).
while (this.accumulator >= stepMs) {
  this.update(this.tick);
  this.tick += 1;
  this.accumulator -= stepMs;
  this.render(0);
}
```

#### Alasan Arsitektural:
1. **Konsumsi Bilangan Acak di `paint()`**: Pada bytecode dekompilasi Java asli (`f.run`), fungsi penggambaran `l()` (dipetakan ke `paint()`) dipanggil tepat satu kali segera setelah pembaruan logika `m()` (dipetakan ke `update()`). Di dalam proses penggambaran asli, ada instruksi yang menarik nilai dari PRNG deterministik `Random`. Jika `render()` dipanggil pada setiap frame animasi display tanpa adanya `update()`, urutan penarikan bilangan acak akan bergeser drastis, menyebabkan desinkronisasi fatal pada simulasi dan rekaman permainan (*oracle desynchronization*).
2. **Spiral of Death Clamp (Baris 59)**:
   ```typescript
   const elapsed = Math.min(now - this.previous, stepMs * 5);
   ```
   Nilai waktu yang terlewat sengaja dibatasi maksimal 5 tick ($5 \times 120\text{ ms} = 600\text{ ms}$). Jika sebuah frame browser tertahan (misalnya karena GC besar atau tab tidak aktif sesaat), loop hanya akan mengejar maksimal 5 tick, mencegah tab terkunci dalam siklus tanpa henti (*infinite catch-up spiral*).

---

### 3.2 Desain Intensional `paint()` Ganda di `mainRuntime.ts:221-228`

Pada `web/src/mainRuntime.ts:221-228`:
```typescript
paint();
// f.run offsets 161..215: if ad:I or ae:I is set after the first paint, both
// are cleared and the frame is painted a second time (oracle 2026-10-08).
if (runtime.game.ad !== 0 || runtime.game.ae !== 0) {
  runtime.game.ad = 0;
  runtime.game.ae = 0;
  paint();
}
```

#### Alasan Arsitektural:
- Pada mesin J2ME aslinya (`f.run` pada offset bytecode `161..215`), variabel integer `ad` dan `ae` berfungsi sebagai penanda perubahan seleksi entitas atau status panel grafis yang terpicu saat evaluasi display pertama (`stepGameplayPaintComposite`).
- Jika salah satu dari flag tersebut bernilai bukan nol setelah eksekusi pertama, kedua flag tersebut di-reset menjadi nol dan seluruh layar digambar ulang untuk kedua kalinya dalam frame yang sama agar state grafis akhir sesuai dengan state logika terbaru.
- **Peringatan Keras**: Penghapusan atau penggabungan blok `paint()` ganda ini dengan alasan "menghemat draw call" **DILARANG KERAS** tanpa pengujian komparatif berbasis oracle otomatis, karena akan merusak akurasi visual seleksi unit dan panel HUD warisan J2ME.

---

## 4. Evaluasi Alokasi Memori & Profiling

### 4.1 `[Unverified]` Estimasi Draw Call & Fill-rate Multi-Canvas

DOM aplikasi saat ini menumpuk 5 kanvas bertumpuk transparan secara absolut di atas viewport game:

| Urutan Z-Index | Elemen / Berkas | Dimensi Piksel Kanvas | Tujuan Rendering |
| :---: | :--- | :--- | :--- |
| **0 / Base** | `WideScreen.element` (`WideScreen.ts:59`) | Resolusi Layar Penuh (misal $1080 \times 2400$) | Peta game utama, tanah, gedung, unit, margin |
| **Z=2** | `worldParticles.canvas` (`WorldParticles.ts:81`) | Resolusi Layar Penuh | Jejak kaki, asap cerobong, burung liar, serpihan |
| **Z=3** | `dayNightCycle.canvas` (`DayNightCycle.ts:109`) | Resolusi Layar Penuh | Masking pencahayaan gelap/malam, lubang obor |
| **Z=4** | `weatherSystem.canvas` (`WeatherSystem.ts:75`) | Resolusi Layar Penuh | Efek hujan, kilatan petir, salju, riak air |
| **Z=5** | `emotionBubbles.canvas` (`EmotionBubbles.ts:54`) | Resolusi Layar Penuh | Balon emosi villager (lapar, kantuk, cinta, bahaya) |

#### Analisis Overdraw GPU & Fill-Rate
- Setiap kanvas berukuran sama dengan resolusi viewport CSS dikalikan rasio piksel perangkat (`devicePixelRatio`, sering kali $2\times$ atau $3\times$ pada smartphone modern).
- Pada perangkat mobile dengan layar $1080 \times 2400$ ($2{,}59\text{ Megapiksel}$):
  - 5 kanvas bertumpuk berarti GPU harus melakukan *compositing* hingga $5 \times 2{,}59\text{ MP} \approx 12{,}95\text{ Megapiksel}$ per frame tampilan.
  - Setiap kali kanvas di-`clearRect()`, GPU rasterizer menulis ulang seluruh permukaan buffer transparansi alpha (`rgba(0,0,0,0)`).
- **Status Evaluasi**: `[Unverified]`. Beban GPU fill-rate ini adalah hipotesis teoretis. Pada perangkat desktop modern, 5 kanvas 2D bukanlah beban berarti. Namun pada chipset mobile berdaya rendah (Mali/Adreno kelas menengah ke bawah) dengan resolusi tinggi, overdraw 5 layer transparan berpotensi meningkatkan panas baterai dan memicu *thermal throttling*. Pembuktian kuantitatif memerlukan profiling GPU nyata melalui browser remote inspection.

---

### 4.2 `[Inference]` Alokasi Array `splice` dan Template String pada Partikel

Di dalam loop partikel `WorldParticles.ts` dan `WeatherSystem.ts`, ditemukan beberapa pola kode alokasi:

1. **Pemanggilan `Array.prototype.splice()`**:
   - `WorldParticles.ts:177`: `this.footprints.splice(0, this.footprints.length - 100)`
   - `WorldParticles.ts:186`: `this.footprints.splice(i, 1)`
   - `WorldParticles.ts:225`: `this.smokePuffs.splice(0, this.smokePuffs.length - 60)`
   - `WorldParticles.ts:233`: `this.smokePuffs.splice(i, 1)`
   - `WeatherSystem.ts:374`: `this.ripples.splice(i, 1)`

2. **Interpolasi Template String**:
   - `WorldParticles.ts:193`: `ctx.fillStyle = `${fpColor}${alpha.toFixed(3)})`;`
   - `WeatherSystem.ts:400`: pembuatan string warna gradien transparan.

#### Evaluasi Dampak Garbage Collector (GC):
- **Status Evaluasi**: `[Inference]`.
- Berdasarkan batas kapasitas partikel yang diterapkan dalam kode:
  - Jumlah jejak kaki dibatasi maksimal $\le 100$ entri.
  - Jumlah kepulan asap dibatasi maksimal $\le 60$ entri.
  - Jumlah tetesan hujan dibatasi maksimal $90$ entri, dan salju $80$ entri.
  - Jumlah gelembung emosi dibatasi maksimal $8$ entri.
- Operasi `splice` pada array dengan panjang $\le 100$ elemen memindahkan kurang dari $1\text{ KB}$ memori flat di heap V8/SpiderMonkey.
- String template berukuran $\sim 25\text{ byte}$ yang dialokasikan beberapa puluh kali per detik berada jauh di bawah ambang batas pemicu *Major GC Scavenge*. Mesin JavaScript modern mengumpulkan objek *young generation* mikro ini dalam hitungan fraksi sub-milidetik saat minor cycle tanpa menghentikan rendering loop.
- **Prinsip Engineering (AGENTS.md §5)**: **DILARANG KERAS** melakukan optimasi prematur (*preemptive over-engineering*), seperti merombak array menjadi circular buffer terindeks kompleks atau pooling string buatan sendiri, tanpa adanya rekaman profil CPU flamegraph konkret yang membuktikan bahwa alokasi partikel tersebut menimbulkan GC *jank* nyata.

---

## 5. Panduan Pengukuran Profiling Riil

Codebase telah menyediakan infrastruktur profiling internal non-invasif pada `web/src/platform/PerfOverlay.ts`. Modul ini tidak mengalokasikan memori dan menjadi no-op otomatis ketika tidak diaktifkan.

### 5.1 Cara Mengaktifkan `PerfOverlay`

Tambahkan parameter `?perf=1` pada URL browser saat membuka game, baik di lingkungan lokal maupun preview Tauri/Web:
```
http://localhost:5173/?perf=1
```

Overlay diagnostik semi-transparan akan muncul di sudut kanan bawah layar, menyajikan data performa real-time yang diperbarui setiap 120 ms (sehingga overlay itu sendiri tidak mendistorsi pengukuran frame).

```
+-------------------------------------------------------------+
| perf (budget 120 ms/tick)  composeFps ~60                   |
| Q=0 v=1 map=32x32 css=390x844                               |
| tick: last 1.2 avg 1.4 max 3.8 ms                           |
| paint: last 3.1 avg 3.5 max 7.2 ms                          |
| renderWide: last 0.8 avg 0.9 max 2.1 ms                     |
| compose: last 0.1 avg 0.1 max 0.4 ms                        |
| systems: last 1.6 avg 1.8 max 4.1 ms                        |
| hud: last 0.4 avg 0.5 max 1.2 ms                            |
| tick+render: last 7.2 avg 8.2 max 18.4 ms                   |
| overruns(>120ms): 0                                         |
| frameCompose: last 0.3 avg 0.4 max 1.1 ms                   |
| copy: __prehistoricPerf()                                   |
+-------------------------------------------------------------+
```

#### Makna Metrik Diagnostik:

| Metrik Overlay | Penjelasan | Anggaran / Nilai Sehat |
| :--- | :--- | :--- |
| `composeFps` | Laju render aktual fungsi komposisi layar display | $60\text{ FPS}$ (atau $120\text{ FPS}$ pada layar high-refresh) |
| `tick` | Waktu komputasi satu siklus logika simulasi game (`tick()`) | $< 5\text{ ms}$ (dari anggaran $120\text{ ms}$) |
| `paint` | Waktu menggambar frame 240x320 kanvas J2ME dasar (`paint()`) | $< 8\text{ ms}$ |
| `renderWide` | Waktu penggambaran peta penuh resolusi lebar | $< 3\text{ ms}$ |
| `compose` | Waktu eksekusi `screen.compose()` saat siklus tick | $< 1\text{ ms}$ |
| `systems` | Waktu eksekusi DayNight, Weather, Particles, Emotion | $< 4\text{ ms}$ |
| `hud` | Waktu pembaruan elemen HUD, tombol aksi, menu | $< 2\text{ ms}$ |
| `tick+render` | Total durasi gabungan satu siklus update logika + render | Harus selalu $\le 120\text{ ms}$ |
| `overruns` | Jumlah insiden di mana `tick+render` melebihi anggaran $120\text{ ms}$ | **Harus 0** |
| `frameCompose` | Waktu yang dibutuhkan untuk render komposisi per-frame layar | $< 2\text{ ms}$ (dari anggaran frame $16{,}6\text{ ms}$) |

---

### 5.2 Cara Membaca Snapshot `window.__prehistoricPerf()`

Untuk keperluan pelaporan bug, audit otomatis, atau perbandingan kinerja antar-perangkat, snapshot data metrik dapat diekstraksi langsung melalui Browser Developer Console (F12).

Ketikkan di console:
```javascript
window.__prehistoricPerf();
```

Hasil keluaran berupa objek JSON terstruktur:
```json
{
  "tick": { "last": 1.2, "avg": 1.4, "max": 3.8, "count": 1420 },
  "paint": { "last": 3.1, "avg": 3.5, "max": 7.2, "count": 1420 },
  "renderWide": { "last": 0.8, "avg": 0.9, "max": 2.1, "count": 1420 },
  "compose": { "last": 0.1, "avg": 0.1, "max": 0.4, "count": 1420 },
  "systems": { "last": 1.6, "avg": 1.8, "max": 4.1, "count": 1420 },
  "hud": { "last": 0.4, "avg": 0.5, "max": 1.2, "count": 1420 },
  "tick+render": { "last": 7.2, "avg": 8.2, "max": 18.4, "count": 1420 },
  "overruns": { "last": 0, "avg": 0, "max": 0, "count": 0 },
  "frameCompose": { "last": 0.3, "avg": 0.4, "max": 1.1, "count": 10220 }
}
```
Metrik ini menyajikan ringkasan akurat tanpa beban overhead observasi (*observer effect*).

---

## 6. Rekomendasi Solusi & Rencana Tindakan Terstruktur

### 6.1 Langkah 1: Memindahkan Pembaruan & Render Visual ke `composeEveryFrame`

#### Tindakan Arsitektural:
1. **Pemisahan di `mainRuntime.ts`**:
   - Di dalam `render()` (siklus 120ms): Pertahankan pemanggilan efek gameplay murni:
     ```typescript
     weatherSystem.applyGameplayEffects(runtime, now);
     ```
   - Pindahkan pembaruan visual dan penggambaran kanvas ke dalam fungsi `composeEveryFrame()`:
     ```typescript
     let lastFrameTime = performance.now();
     const composeEveryFrame = () => {
       const endFrameCompose = perf?.start("frameCompose");
       const now = performance.now();
       const deltaMs = Math.min(100, now - lastFrameTime);
       lastFrameTime = now;

       screen.compose();

       if (runtime.game.loopMode === 1 && !screen.frozen) {
         const sw = screen.element.clientWidth || window.innerWidth;
         const sh = screen.element.clientHeight || window.innerHeight;

         weatherSystem.resize(sw, sh);
         weatherSystem.tick(now, deltaMs); // Menggunakan delta frame display nyata!

         emotionBubbles.resize(sw, sh);
         emotionBubbles.tick(now, runtime, screen);

         worldParticles.resize(sw, sh);
         worldParticles.tick(now, runtime, screen);
       }

       endFrameCompose?.();
       hud.track();
       dangerIndicators.track();
       requestAnimationFrame(composeEveryFrame);
     };
     ```
2. **Koreksi Parameter Delta Cuaca**:
   Dengan meneruskan `deltaMs` frame riil (sekitar $\sim 16\text{ ms}$ pada 60Hz atau $\sim 8{,}3\text{ ms}$ pada 120Hz), sistem cuaca akan:
   - Berjalan pada kecepatan waktu dunia nyata (menghilangkan bug pelambatan 7,5x).
   - Menghasilkan animasi hujan, salju, riak, jejak kaki, dan asap yang sangat halus pada 60/120 FPS tanpa lag saat peta di-drag.

---

### 6.2 Langkah 2: Matriks Pengujian Profiling Terukur Sebelum Refactoring Multi-Canvas

Sebelum memutuskan untuk menggabungkan ke-5 kanvas (*single canvas pass refactoring*), jalankan profiling `?perf=1` dan ambil data `window.__prehistoricPerf()` pada 3 skenario perangkat fisik berikut:

| Skenario Pengujian | Konfigurasi Layar / Rasio | Perangkat Representatif | Metrik Kritis yang Dipantau |
| :--- | :--- | :--- | :--- |
| **1. Mobile Smartphone (Portrait)** | $390 \times 844\text{ px}$ (CSS), DPR: 3.0 | iPhone 13/14 atau Samsung Galaxy S Series | `frameCompose` durasi (harus $< 16\text{ ms}$), kestabilan `composeFps` pada 60 FPS saat hujan badai lebat aktif. |
| **2. Mobile Smartphone (Landscape)** | $844 \times 390\text{ px}$ (CSS), DPR: 2.5–3.0 | Android Mid-range (MediaTek Helio / Snapdragon 600-700) | Pengaruh overdraw horizontal layar lebar, konsumsi daya, dan responsivitas touch drag. |
| **3. Desktop PC / Tablet Monitor** | $1920 \times 1080\text{ px}$ (CSS), DPR: 1.0–1.25 | Windows Desktop / Chrome / Edge | Verifikasi overhead baseline canvas composite, `overruns` harus tetap 0. |

#### Kriteria Keputusan Refactoring Kanvas:
- Jika rata-rata durasi `frameCompose` pada pengujian Mobile HP tetap **di bawah $3{,}0\text{ ms}$** dan `composeFps` stabil di $60\text{ FPS}$, maka arsitektur 5 kanvas bertumpuk **TIDAK PERLU DIUBAH**. Pemisahan kanvas terbukti lebih modular, mudah dipelihara, dan bersih secara kode.
- Jika durasi `frameCompose` melonjak melebihi **$10\text{ ms}$** pada perangkat mobile Android resolusi tinggi akibat *composite fill-rate*, barulah pertimbangkan rencana refactoring penyatuan layer (misal: menggabungkan partikel, cuaca, dan emosi ke dalam 1 kanvas overlay bersama).

---

## 7. Rangkuman Tindakan Rekayasa

```
[AUDIT VERIFIKASI SELESAI]
+----------------------------------------------------------------------------------------------------+
| 1. Perbaiki Delta Waktu Cuaca & Trail Panning (PRIORITAS 1):                                       |
|    - Pindahkan visual tick (Weather, Particles, Emotes) ke composeEveryFrame().                    |
|    - Pasang deltaMs nyata (now - lastFrameTime) pada WeatherSystem.tick.                          |
|    - Pertahankan weatherSystem.applyGameplayEffects() di dalam FixedLoop (simulasi 120ms).         |
+----------------------------------------------------------------------------------------------------+
| 2. Hormati Batasan Paritas Oracle J2ME (INVIOLABLE):                                               |
|    - JANGAN pindahkan render(0) keluar dari FixedLoop.ts:62-71 (menjaga urutan Random J2ME).       |
|    - JANGAN hilangkan paint() ganda di mainRuntime.ts:221-228 (paritas f.run offsets 161..215).   |
+----------------------------------------------------------------------------------------------------+
| 3. Profiling Sebelum Rekayasa Kanvas (ANTI-PREMATURE OPTIMIZATION):                               |
|    - Jangan ubah splice/template string partikel (alokasi mikro <= 100 elemen tidak memicu GC).   |
|    - Ukur ?perf=1 pada 3 target layar sebelum memutuskan penggabungan kanvas overlay.             |
+----------------------------------------------------------------------------------------------------+
```
