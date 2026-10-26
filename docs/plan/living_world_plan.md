# 📜 Living World Architecture & Implementation Plan (Opsi 1)
> **Prehistoric Tribes Web — Peningkatan Realisme Gameplay & Simulasi Kehidupan Prasejarah**  
> *Dokumen Perancangan Arsitektur, Audit Eksisting, dan Checklist Implementasi*

---

## 🧭 1. Visi & Filosofi Perancangan

Tujuan utama dari paket **"Living World"** adalah menghidupkan suasana dunia prasejarah di *Prehistoric Tribes Web* agar terasa seperti game simulasi RTS modern yang bernapas (*breathing RTS ecosystem*), setara dengan game seperti *The Settlers*, *RimWorld*, atau *Age of Empires*, tanpa merusak determinisme dan integritas simulasi J2ME aslinya.

### Prinsip Arsitektur:
1. **Non-Invasive Core Simulation:** Logika inti J2ME (`core/`, `sim/`) tetap murni dan stabil. Seluruh efek visual atmosferik berjalan di lapisan atas (*presentation layer*) yang terhubung melalui *reactive state observers*.
2. **Zero Performance Regression:** Menggunakan *hardware-accelerated 2D Canvas* dan *Web Audio API* singleton, menjaga 60 FPS stabil di ponsel maupun laptop tanpa lonjakan beban memori.
3. **Accessibility & Toggleable:** Seluruh fitur visual ini dapat diaktifkan/dinonaktifkan sewaktu-waktu di menu Pengaturan (*Settings Dialog*).

---

## 🔍 2. Audit Kode Eksisting: Apa yang Sudah Ada vs. Apa yang Perlu Dibangun

Berdasarkan audit mendalam pada basis kode saat ini, **mesin game sebenarnya telah memiliki sebagian fondasi simulasi kehidupan**, namun belum diekspresikan secara maksimal ke antarmuka visual pemain:

| Komponen Fitur | Status di Kode Saat Ini | Detail Analisis Temuan | Apa yang Perlu Dibangun / Ditingkatkan |
| :--- | :--- | :--- | :--- |
| **Sistem Cuaca (*Weather System*)** | 🟢 **Sudah Ada** (`render/WeatherSystem.ts`) | Sudah memiliki partikel Hujan (*Rain*), Salju (*Snow*), Riak Air (*Ripples*), Kilatan Petir (*Lightning*), dan sintesis audio prosedural (deru hujan & petir). | Perlu menambahkan transisi waktu dan efek cuaca yang memengaruhi kecepatan kerja warga. |
| **Siklus Siang-Malam (*Day/Night*)** | 🔴 **Belum Ada** | Tidak ada siklus pergantian waktu hari (pagi, siang, senja, malam). Layar selalu berada pada kecerahan statis 100%. | Perlu membangun *DayNightCycle Engine* dengan ambient tint bertahap (Fajar ➔ Siang ➔ Senja ➔ Malam Gulita). |
| **Pencahayaan Api Unggun (*Campfire Glow*)** | 🔴 **Belum Ada** | Api unggun di Tenda Kepala Suku dan obor menara hanya berupa animasi sprite biasa tanpa memancarkan cahaya di sekitarnya. | Perlu *Dynamic Lighting Mask* yang memotong kegelapan malam dengan lingkaran cahaya hangat berkedip (*sinusoidal flicker*). |
| **Sistem Balon Pikiran (*Thought Bubbles*)** | 🟡 **Sebagian Ada di Logika, Tampilan Kuno** (`sim/units/LegacyEntityMoodPick.ts`, `core/DenseLayout.ts`) | Mesin bytecode **sudah menghitung balon pikiran** (`UNIT_THOUGHT = 3333`) setiap 15 frame: kelaparan (`UNIT_FOOD === 0`), kelelahan (`UNIT_ENERGY === 0`), jatuh cinta, dan tunawisma. Namun, hanya digambar sebagai sprite retro kecil 240x320 yang kabur. | Mengganti tampilan balon pikiran retro menjadi **Balon Animasi HD Mengapung (*Floating HD Emote Bubbles*)** di atas kepala warga (🍖 lapar, 💤 lelah, ❤️ cinta, ❗ panik, 😃 puas). |
| **Rutinitas Istirahat & Rumah Gubuk** | 🟢 **Sudah Ada di Logika** | Tiap warga memiliki status energi (`UNIT_ENERGY` 0..99). Saat energi habis, mereka kelelahan dan mencari Gubuk untuk memulihkan tenaga. | Menyinkronkan rutinitas tidur massal pada malam hari secara alamiah. |

---

## 🏗️ 3. Rincian Desain Teknis (Deep Technical Specification)

### A. Komponen 1: Siklus Siang, Senja, dan Malam Hari (*Day/Night Engine*)

#### 1. Pembagian Waktu Siklus (Durasi Standar: 6 Menit per 1 Hari Penuh):
* **Fajar / Pagi Hari (05:00 - 08:00 | Durasi: 45 detik):**  
  *Warna Ambient:* Emas lembut kehangatan (`rgba(255, 200, 100, 0.08)`).  
  *Atmosfer:* Kicau burung prasejarah mulai berbunyi, warga bangun dari gubuk.
* **Siang Hari (08:00 - 16:30 | Durasi: 120 detik):**  
  *Warna Ambient:* Netral / Cerah alami (`rgba(255, 255, 255, 0.00)`).  
  *Atmosfer:* Efisiensi kerja maksimal, pencahayaan penuh.
* **Senja Hari (16:30 - 19:30 | Durasi: 45 detik):**  
  *Warna Ambient:* Oranye kemerahan temaram (`rgba(230, 90, 30, 0.22)`).  
  *Atmosfer:* Bayangan memanjang, warga mulai mengarahkan langkah ke perkemahan.
* **Malam Hari (19:30 - 05:00 | Durasi: 150 detik):**  
  *Warna Ambient:* Biru dongker gelap prasejarah (`rgba(8, 14, 32, 0.65)`).  
  *Atmosfer:* Kegelapan menyelimuti peta, suara jangkrik & serigala melolong, api unggun menyala terang.

#### 2. Mekanisme Skala Kecepatan:
Siklus waktu otomatis sinkron dengan tombol kecepatan game (`1x`, `2x`, `4x`), sehingga saat pemain mempercepat game, pergerakan matahari dan bulan ikut melaju seirama.

---

### B. Komponen 2: Pencahayaan Dinamis Api Unggun & Obor (*Dynamic Lighting*)

Pada fase senja dan malam hari, lapisan kanvas cuaca (`weather-canvas`) akan mengeksekusi teknik **Radial Gradient Light Punch**:
1. Mengisi kanvas dengan warna gelap malam (`rgba(8, 14, 32, 0.65)`).
2. Menggunakan `ctx.globalCompositeOperation = "destination-out"` untuk melubangi kegelapan pada titik-titik sumber cahaya:
   - **Tenda Kepala Suku (Chief's Hut):** Api unggun batu memancarkan lingkaran cahaya radius $140\text{px}$ dengan kedipan halus sinusoidal ($f = 3.5\text{Hz}$) menyerupai jilatan lidah api nyata.
   - **Menara Pengawas (Tower):** Obor pertahanan memancarkan cahaya radius $90\text{px}$.
   - **Pentas Disko (Disco Center):** Cahaya ritmik warna-warni hangat ($100\text{px}$).
   - **Warga Pembawa Obor:** Unit patroli malam memancarkan lingkaran kecil $50\text{px}$ saat menjelajah di kegelapan.
3. Memberikan sentuhan akhir `ctx.globalCompositeOperation = "source-over"` dengan gradient kuning/oranye transparan untuk memberikan rona hangat (*warm golden edge*) di sekeliling area terang.

---

### C. Komponen 3: Balon Pikiran Emosi HD (*HD Emotion Floating Bubbles*)

Daripada menggunakan sprite buram era 2000-an, sistem baru membaca status `runtime.denseState` secara langsung lalu merender balon pikiran modern mengapung di kanvas atau DOM layer:

#### Pemetaan State Warga ke Ikon Emote:
1. **🍖 Kelaparan Kritis:** Terpicu saat `dense[UNIT_FOOD + id] < 15` (warga memikirkan paha daging/makanan dan segera mencari semak berry atau dapur).
2. **💤 Kelelahan / Mengantuk:** Terpicu saat `dense[UNIT_ENERGY + id] < 20` (balon berhuruf *Zzz* biru mengapung pelan ke atas).
3. **❤️ Asmara / Bibit Unggul:** Terpicu saat warga dewasa pria dan wanita berpasangan di dekat Kuil Shaman atau Gubuk (balon hati merah muda).
4. **❗ Bahaya / Terancam:** Terpicu saat ada serigala, harimau taring pedang, atau serbuan musuh dalam radius 5 petak (tanda seru merah berkedip cepat).
5. **😃 Puas & Gembira:** Terpicu setelah warga menikmati hidangan koki di Dapur atau berjoget di Pentas Disko (`UNIT_MOOD === 5`).
6. **🔨 Sedang Berkreasi:** Terpicu saat pandai besi sedang menempa senjata tajam di Bengkel Senjata.

Setiap balon memiliki animasi pegas mengapung (*gentle bobbing bob*), muncul selama 2.5 detik lalu memudar anggun (*fade-out*), sehingga layar tidak pernah terasa semak atau mengganggu pertempuran.

---

### D. Komponen 4: Pengaruh Cuaca Terhadap Gameplay (*Weather Gameplay Modifiers*)

Menghubungkan `weatherSystem.getMode()` ke kalkulasi kecepatan dan ekonomi suku:
* **Hujan Lebat (*Rain Phase*):**
  - Efek Tanah Lembap: Kecepatan jalan warga sedikit berkurang (-10% kecepatan gerak).
  - Kesuburan Flora: Semak buah liar (*berry bushes*) memulihkan cadangan buahnya +25% lebih cepat.
  - Bahaya Api: Jangkauan cahaya api unggun sedikit menyusut karena hujan gerimis.
* **Musim Salju Dingin (*Snow Phase*):**
  - Dingin Menusuk: Energi warga (`UNIT_ENERGY`) terkuras 15% lebih cepat saat berada di luar gubuk.
  - Semak Beku: Panen buah berry berkurang drastis, mendorong sukumu berburu mamut besar untuk cadangan daging beku.
* **Cuaca Cerah Hangat (*Clear Sun*):**
  - Kondisi optimal: Kecepatan panen dan konstruksi berjalan pada kapasitas 100%.

---

## 📋 4. Checklist Rencana Kerja Bertahap (Actionable Implementation Checklist)

Berikut adalah tahapan pengerjaan yang terstruktur agar kode tetap bersih, stabil, dan selalu terverifikasi sebelum masuk ke master:

### Fase 1: Fondasi Waktu & Siklus Siang-Malam (*Day/Night Engine*)
- [X] Buat modul `web/src/render/DayNightCycle.ts` untuk mengelola jam dunia (00:00 - 24:00) dan interpolasi warna ambient.
- [X] Tambahkan konfigurasi `pt.dayNight` di `web/src/Settings.ts` agar pemain bisa mematikan/menghidupkan siklus ini sesuka hati.
- [X] Hubungkan `DayNightCycle` ke `loop.getSpeed()` agar siklus waktu selaras dengan kecepatan game (1x, 2x, 4x).
- [X] Uji rendering warna transisi (Pagi ➔ Siang ➔ Senja ➔ Malam) agar kontras unit dan pohon di kanvas tetap terbaca jelas.

### Fase 2: Pencahayaan Api Unggun Dinamis (*Dynamic Campfire Light*)
- [X] Deteksi posisi koordinat bangunan bercahaya di peta (Tenda Kepala Suku, Menara Pengawas, Pentas Disko).
- [X] Implementasikan mask pencahayaan `destination-out` pada kanvas malam dengan algoritma kedipan api (*flicker* alami).
- [X] Berikan semburat cahaya hangat oranye-emas di sekeliling api unggun.
- [X] Optimalkan agar perhitungan lingkaran cahaya hanya berjalan pada malam hari (hemat CPU/baterai).

### Fase 3: Balon Pikiran Emosi HD (*HD Emotion Floating Bubbles*)
- [X] Buat modul `web/src/render/EmotionBubbles.ts` yang memantau nilai `UNIT_FOOD`, `UNIT_ENERGY`, `UNIT_HAPPINESS`, dan status bahaya warga.
- [X] Siapkan kanvas vector ikon emote bersih (Daging 🍖, Tidur 💤, Hati ❤️, Tanda Bahaya ❗, Senyum 😃, Kerja 🔨).
- [X] Terapkan animasi mengapung lembut (*spring bobbing*) dan sistem antrean agar balon tidak saling bertumpukan di satu warga.
- [X] Tambahkan opsi sakelar *"Balon Emosi & Pikiran Warga"* di menu Pengaturan.

### Fase 4: Integrasi Modifikasi Cuaca ke Gameplay (*Weather Gameplay Modifiers*)
- [X] Sambungkan status cuaca dari `WeatherSystem` ke efek gameplay (tanaman berry & konsumsi energi dingin).
- [X] Tampilkan notifikasi mikro saat musim berganti dalam Bahasa Indonesia & Inggris.

### Fase 5: Pengujian Kualitas, Verifikasi Runtime & Dokumentasi
- [X] Jalankan typecheck penuh `tsc -p web/tsconfig.json --noEmit` (0 error).
- [X] Jalankan uji bundler produksi `npm run build` (sukses).
- [X] Uji runtime browser di resolusi 1568x827 (screenshot verifikasi berhasil).
- [X] Perbarui dokumentasi rencana implementasi permanen.

---

Dokumen ini disimpan secara permanen di:  
📁 **`docs/plan/living_world_plan.md`**
