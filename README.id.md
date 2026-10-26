<p align="center">
  <img src="web/public/hd/menu/logo.png" alt="Logo Prehistoric Tribes Web" width="360">
</p>

<h1 align="center">Prehistoric Tribes · Web</h1>

<p align="center">
  <strong>Port web modern dari game RTS klasik era ponsel Java J2ME tahun 2000-an: <em>Prehistoric Tribes</em> (Suku Prasejarah).</strong><br>
  Bisa dimainkan langsung di browser PC dan HP dengan grafis HD, kontrol layar sentuh, dan dukungan penuh Bahasa Indonesia.
</p>

<p align="center">
  <a href="README.md">English</a> •
  <a href="README.id.md">Bahasa Indonesia</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Bahasa-TypeScript_5-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/Bundler-Vite_6-646CFF.svg" alt="Vite">
  <a href="https://github.com/latifangren/prehistoric_tribes_web/actions/workflows/ci.yml"><img src="https://github.com/latifangren/prehistoric_tribes_web/actions/workflows/ci.yml/badge.svg" alt="Status CI"></a>
  <a href="https://latifangren.github.io/prehistoric_tribes_web/"><img src="https://img.shields.io/badge/Mainkan_Online-GitHub_Pages-2ea44f.svg" alt="Mainkan Online"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/Lisensi-MIT_(Khusus_Kode)-green.svg" alt="Lisensi"></a>
</p>

---

## 🌟 Kredit & Asal-Usul Proyek Utama

> ### 📢 Atribusi Penting & Kepemilikan Lisensi Aset
> **1. Hak Cipta Game Asli & Kepemilikan Aset:**
> * Game *Prehistoric Tribes* (史前部落) aslinya dikembangkan oleh **Gear Games, Ltd.** dan diterbitkan oleh **THQ Wireless Inc. / THQ Inc.** (© 2008 THQ Wireless Inc. Seluruh hak cipta dilindungi).
> * **Seluruh aset game orisinal—termasuk gambar, animasi, sprite karakter, efek suara, musik latar (MIDI), alur cerita, teks narasi dialog, merek dagang, dan konsep permainan—tetap 100% merupakan hak milik intelektual dan hak cipta dari pengembang dan penerbit aslinya (Gear Games, Ltd. dan THQ Inc.).**
>
> **2. Porting Web & Rekayasa Balik Logika Game:**
> * Proyek dasar porting web, pembongkaran bytecode J2ME, replikasi logika permainan 1:1, siklus frame simulasi, dan integrasi gambar seni HD **100% diteliti dan dibangun oleh [BOMBWCC](https://github.com/BOMBWCC)** pada repositori hulu (*upstream*):
> * 👉 **Repositori Asli BOMBWCC:** [https://github.com/BOMBWCC/Prehistoric_Tribes_Web](https://github.com/BOMBWCC/Prehistoric_Tribes_Web)
> * Seluruh apresiasi dan kredit utama atas terwujudnya porting web ini sepenuhnya adalah milik **BOMBWCC**.
>
> **3. Repositori Fork / Mod Komunitas Ini:**
> * Repositori ini hadir murni sebagai modifikasi komunitas untuk menambahkan lokalisasi Bahasa Indonesia penuh, peningkatan kenyamanan sentuh HP (1-ketukan), haptic feedback, penghematan baterai lewat audio singleton, serta perbaikan sejumlah *bug*.
---

## 🎮 Tentang Game

*Prehistoric Tribes* (史前部落) adalah salah satu game strategi waktu-nyata (*Real-Time Strategy* / RTS) paling canggih yang pernah dirilis untuk ponsel Java (J2ME) pada pertengahan era 2000-an. Pemain bertindak sebagai pemimpin suku Zaman Batu yang bertugas:
* Mengumpulkan buah liar dan berburu mamut serta harimau taring pedang untuk makanan.
* Menebang pohon dan menambang batu untuk bahan konstruksi.
* Membangun fasilitas khusus (Kuil Shaman, Dapur, Tempat Latihan, Bengkel Senjata, dll.).
* Merawat anak-anak hingga tumbuh dewasa menjadi tenaga kerja suku.
* Mempersenjatai pasukan dan mempertahankan desa dari serangan suku musuh.

Port web ini mereplikasi logika game aslinya secara presisi menggunakan **TypeScript** dan **HTML5 Canvas API**, berjalan murni di peramban web modern tanpa memerlukan emulator Java tambahan.

---

## ✨ Fitur & Peningkatan pada Fork Ini

Di atas fondasi luar biasa karya BOMBWCC, kami menambahkan serangkaian fitur baru:

### 🇮🇩 1. Lokalisasi Bahasa Indonesia Penuh (100%)
* **Antarmuka Lengkap**: Menu Utama, Pemilihan Bab Kampanye, Pilihan Tingkat Kesulitan, Pengaturan Multi-Tab, Lemari Trofi, HUD In-Game, Lembar Penduduk, Menu Bangunan, dan Menu Pause.
* **Ensiklopedia Prasejarah Terjemahan Penuh**:
  - Penjelasan lengkap untuk **12 tipe bangunan** (Kuil Shaman, Bengkel, Menara Pengawas, dll.).
  - Penjelasan fungsi **12 keahlian penduduk** (Kesehatan, Satpam/Pengintaian, Bertani, Menempa, Memasak, Musik Disko, dll.).
  - Penjelasan **13 senjata, perangkap, dan sihir Shaman** (Pentungan kayu, Tombak, Kapak lempar, Jebakan jaring, Jebakan lubang, Mantra penyembuhan, Ramuan cinta, Wabah, dll.).
* **Rapor Evaluasi Akhir Laga (Match Recap)**: Layar evaluasi kemenangan/kekalahan lengkap dengan grafik pertumbuhan populasi, rincian ekonomi, pembasmian musuh, dan gelar suku (*Panglima Mitos Prasejarah*, *Kepala Suku Agung*, *Tetua Tangguh*, *Suku yang Tumbang*).
* **Suksesi Kepala Suku**: Tampilan suksesi dinamis dalam Bahasa Indonesia ketika Kepala Suku gugur di medan perang.
* **Ikon Bendera HD**: Bendera Merah Putih beresolusi tinggi di pemilih bahasa menu utama.

### 📱 2. Kenyamanan Layar Sentuh & Pengalaman Ponsel
* **Pengerahan Cepat 1-Ketukan (*Smart 1-Tap Dispatch*)**: Ketuk warga lalu ketuk target di peta untuk langsung memberi perintah kerja atau serang tanpa jeda.
* **Area Sentuh Ramah Jari (*Fat-Finger Hitboxes*)**: Ukuran tombol panel dan kartu warga diperlebar agar tidak mudah salah tekan di layar kecil.
* **Penguncian Gerakan Cubit (*Gesture Prevention*)**: Menghindari *zoom* atau gulir tidak sengaja pada iOS Safari dan Android Chrome saat bermain intensif.
* **Getaran Taktil (*Haptic Feedback*)**: Ponsel bergetar saat desa diserang musuh (*war siren*), saat bangunan selesai didirikan, serta getaran mikro saat menekan tombol menu.

### ⚡ 3. Optimasi Audio Singleton
* Menyatukan seluruh subsistem audio (efek suara, musik latar, atmosfer alam) ke dalam satu *instance* `AudioContext` *lazy singleton*.
* Mengurangi konsumsi memori, mencegah suara putus-putus (*crackling*), serta mematuhi kebijakan *autoplay* peramban seluler.

### 🛠️ 4. Perbaikan Bug (*Bugfixes*)
* Memperbaiki teks dialog konfirmasi bongkar bangunan yang sebelumnya masih *hardcoded* dalam Bahasa Mandarin mentah.
* Dialog konfirmasi aksi kini menggunakan tombol *[Batal]* dan *[Konfirmasi]*.
* Menstabilkan tampilan HUD pada layar *ultra-wide* maupun layar ponsel vertikal.

---

## 🕹️ Panduan Kontrol & Cara Bermain

### Layar Sentuh / Mouse
Antarmuka dirancang agar nyaman dimainkan dengan satu tangan di layar ponsel:
* **Geser Layar**: Menggeser sudut pandang kamera di peta.
* **Ketuk Warga**: Memilih warga. Ketuk objek sasaran (pohon, batu, hewan liar, musuh, atau bangunan) untuk menugaskan pekerjaan.
* **Tahan & Tarik (Drag Box)**: Menyeleksi banyak warga sekaligus dalam kotak seleksi.
* **Ketuk Bangunan**: Membuka panel bangunan (Bongkar, Perbaiki, Tingkatkan level, produksi peralatan/sihir, atau lihat warga penghuninya).
* **Tombol Bangun (Kanan Bawah)**: Membuka daftar cetak biru bangunan beserta biayanya (✓ Pasang di tanah, ✗ Batal).
* **Tombol Perintah (Di Atas Tombol Bangun)**: Perintah cepat — Siaga Tempur, Kumpul di Tenda Kepala Suku, dan Buka Peta Mini.
* **Formasi Pasukan (Sisi Kanan Layar)**: Ketuk tanda `+` untuk menyimpan warga terpilih ke dalam nomor regu; ketuk nomor regu untuk memanggil mereka kembali.
* **Menu Kanan Atas**: Menu *Pause* (Simpan permainan, Muat simpanan, Statistik, Trofi, Pengaturan, Panduan Bantuan, Keluar).

### Tombol Keyboard (Komputer / Laptop)
| Fungsi | Tombol |
| :--- | :--- |
| Gerakkan Kursor / Navigasi Menu | `W`, `A`, `S`, `D` atau Tombol Panah |
| Konfirmasi / Pilih Target | `Enter` atau `Spasi` |
| Buka Menu Bangun (Left Softkey) | `Q` |
| Kembali / Batal / Menu Pause (Right Softkey) | `Esc` atau `Backspace` |
| Buka / Tutup Peta Mini (*Minimap*) | `M` |
| Lompat ke Posisi Serangan / Peringatan Terkini | `1` |
| Bantuan Kilat | `0` |
| Regu Pasukan | Tahan `7` atau `9` untuk menyimpan regu; tekan untuk memilih |

*Tips:* Tekan tombol konfirmasi dua kali pada satu warga kawan untuk menyeleksi seluruh pasukan kawan yang terlihat di layar!

---

## 🚀 Menjalankan Proyek Secara Lokal

### Kebutuhan Sistem
* [Node.js](https://nodejs.org/) (disarankan versi 20.0 ke atas)
* `npm` (otomatis terpasang bersama Node.js)

### Langkah Pemasangan & Menjalankan Game
```bash
# 1. Klon repositori dan masuk ke direktori
git clone https://github.com/latifangren/prehistoric_tribes_web.git
cd prehistoric_tribes_web

# 2. Pasang dependensi paket
npm install

# 3. Jalankan server lokal (Vite)
npm run dev
```

Buka peramban internet dan akses alamat `http://localhost:3000` (atau `http://localhost:5173`).

### Mengompilasi untuk Rilis Produksi
```bash
npm run build
```
File web hasil kompilasi siap publikasi akan tersimpan di dalam folder `web/dist/`, siap diunggah ke GitHub Pages, Vercel, Netlify, atau web hosting pilihan Anda.

---

## 📁 Struktur Folder Proyek

```text
├── docs/                   # Dokumen dan kamus terjemahan JSON
├── web/
│   ├── public/             # Aset statis game
│   │   ├── assets/         # Sprites, peta, teks, dan musik asli hasil ekstraksi J2ME
│   │   └── hd/             # Aset gambar HD (karakter, bangunan, efek, ikon bendera)
│   ├── scripts/            # Skrip uji verifikasi perilaku game
│   └── src/
│       ├── audio/          # Sistem tata suara lingkungan dan musik latar
│       ├── combat/         # Taktik tempur, formasi, dan formula serangan
│       ├── core/           # Loop utama, status runtime, dan struktur data memori
│       ├── platform/       # Lapisan kompatibilitas J2ME (Canvas, Audio, Input, Haptic)
│       ├── render/         # Renderer grafis HD, kamera pandang, dan laporan match recap
│       ├── sim/            # Kecerdasan buatan (AI warga, ekonomi suku, pathfinding)
│       ├── ui/             # Pengelola alur permainan dan tampilan dialog
│       ├── Alerts.ts       # Umpan peringatan bahaya di atas layar & getaran taktil
│       ├── Bestiary.ts     # Ensiklopedia satwa prasejarah & musuh
│       ├── Achievements.ts # Definisi, progres, dan penyimpanan pencapaian
│       ├── AchievementCabinet.ts # Dialog lemari trofi dan filternya
│       ├── Hud.ts          # HUD layar sentuh, panel aksi warga & bangunan
│       ├── Settings.ts     # Kotak dialog pengaturan multi-tab yang responsif
│       ├── StartMenu.ts    # Menu awal, penjelajah bab kampanye, dan pemilih bahasa
│       └── main.ts         # Titik masuk utama aplikasi (entry point)
```

## 🧰 Pemeriksaan Pemeliharaan

Jalankan pemeriksaan proyek dari root:

```bash
npm run lint
npm run build
npm test
npm run test:browser --workspace=web
npm run check:size
```

Size gate meratchet batas tiap file di `web/scripts/size-baseline.json`. Target akhir maksimal 800 baris efektif dan kurang dari 1.000 baris fisik per file sumber yang dipelihara. `LegacyGameState.ts` memiliki pengecualian baris fisik terdokumentasi untuk katalog field bytecode. `LegacyRuntimeState.ts` memiliki pengecualian facade yang disetujui; batas saat ini ditetapkan pada ukuran terukur dan tidak boleh bertambah.


---

## 📜 Lisensi & Kepemilikan Aset Intelektual

* **Pemberitahuan Kepemilikan Aset:** Seluruh aset asli di dalam game—termasuk namun tidak terbatas pada tekstur, sprite grafis, efek suara, aransemen musik, teks cerita, dan desain gameplay—adalah hak milik intelektual eksklusif dari developer game aslinya, **Gear Games, Ltd.**, dan publisher, **THQ Wireless Inc. / THQ Inc.** (© 2008 THQ Wireless Inc.). Baik BOMBWCC maupun pengembang fork ini tidak mengklaim kepemilikan apa pun atas aset-aset orisinal tersebut.
* **Lisensi Split MIT:** Kode sumber dan peralatan khusus yang dibangun untuk porting web ini dilisensikan di bawah [Lisensi MIT](LICENSE). Aset game orisinal secara eksplisit dikecualikan dari lisensi ini.
* **Pelestarian Non-Komersial Penggemar:** Proyek ini merupakan karya nirlaba tidak resmi dari penggemar (*fan recreation*) yang dibuat murni untuk tujuan pelestarian sejarah game klasik, riset teknologi peramban web, dan sarana belajar (*educational & archiving purposes*). Tidak ada monetisasi komersial dalam bentuk apa pun.
* **Kredit Porting Web:** Seluruh penghargaan atas pembuatan dasar porting web J2ME diserahkan kepada **[BOMBWCC](https://github.com/BOMBWCC/Prehistoric_Tribes_Web)**.
