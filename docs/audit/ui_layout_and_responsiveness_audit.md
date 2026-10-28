# Audit teknis UI, tata letak, dan responsivitas layar

Kind: descriptive and normative | Audience: software engineers, frontend developers, and UI/UX maintainers | Purpose: mendokumentasikan cacat tata letak UI, degradasi responsivitas multi-perangkat, dan panduan perbaikan terstruktur | Non-goals: mengubah berkas kode aplikasi secara langsung

---

## 1. Ringkasan eksekutif dan arsitektur hierarki UI

Laporan audit teknis ini menyajikan evaluasi komprehensif terhadap subsistem antarmuka pengguna (UI), tata letak (layout), dan responsivitas layar pada Prehistoric Tribes Web. Evaluasi mencakup verifikasi kode sumber pada lapisan kanvas (`canvas`), antarmuka sentuh DOM (`.hud`), serta dialog modal native HTML5 (`<dialog>`).

Game ini mengimplementasikan sistem rendering hibrida: logika simulasi deterministik dan kanvas game berjalan pada resolusi internal dinamis berbasis rasio aspek layar melalui modul `WideScreen.ts`, sementara elemen kendali interaktif dibangun menggunakan elemen DOM HTML/CSS yang ditumpangkan di atas kanvas.

### 1.1 Hierarki tumpukan visual (stacking context)

Arsitektur visual aplikasi tersusun atas empat lapisan utama dengan urutan rendering dari bawah ke atas:

```
+-------------------------------------------------------------------------+
| Lapisan 4: Dialog Modal Native HTML5 (<dialog>)                        |
| - Settings, Minimap, Roster, Help/Encyclopedia, Match Recap             |
| - Menggunakan browser top layer, ::backdrop rgba(0,0,0,0.65)           |
+-------------------------------------------------------------------------+
                                    ^
+-------------------------------------------------------------------------+
| Lapisan 3: DOM Touch HUD & Overlays (#app > .hud, .story-hud, .alerts)  |
| - TopBar (.hud-bar): sumber daya, tombol menu, speed toggle, idle units |
| - Bottom Sheets (.hud-sheet): kartu bangunan, panel info villager       |
| - Right Thumb Controls: tombol ordo (.hud-cmd), menu ordo, squads      |
| - Pointer reticles: marker ordo (.hud-order), burst animasi             |
| - pointer-events: none pada kontainer; pointer-events: auto pada tombol |
+-------------------------------------------------------------------------+
                                    ^
+-------------------------------------------------------------------------+
| Lapisan 2: Canvas Overlays & Atmospheric FX                             |
| - DayNightCycle, WeatherSystem (hujan, salju), EmotionBubbles           |
| - WorldParticles, DangerIndicators (indikator serangan predator/musuh)  |
+-------------------------------------------------------------------------+
                                    ^
+-------------------------------------------------------------------------+
| Lapisan 1: Base Screen Canvas (#app > canvas.screen)                    |
| - Canvas game dinamis via WideScreen.ts                                 |
| - Menggambar peta ubin (tilemap), sprite unit, bangunan, dan kabut perang|
| - LogicalCanvas (240x320) tersembunyi sebagai baseline komputasi legacy |
+-------------------------------------------------------------------------+
```

### 1.2 Ringkasan status audit

Hasil investigasi menemukan beberapa bug struktural kritis pada penanganan safe area (notch ponsel) dan pembatasan geser kamera (`clampView`), serta masalah layout analitis pada orientasi mobile landscape dan monitor ultrawide desktop.

---

## 2. Temuan terverifikasi (kritis)

Bagian ini memaparkan cacat kode yang telah diverifikasi secara langsung terhadap kode sumber di repositori.

### 2.1 Bug double-inset safe area pada Top Bar

- **Lokasi berkas**: `web/src/styles/global.css:64`, `web/src/Hud.ts:713`, dan `web/src/WideScreen.ts:235`.
- **Tingkat keparahan**: Kritis (Visual & Layout Bug).

#### Analisis akar masalah
Pada ponsel modern dengan notch atau Dynamic Island (seperti iPhone atau Android dengan punch-hole kamera), padding notch dihitung dua kali secara beruntun.

1. Di `web/src/styles/global.css:62-66`, kontainer `.hud` diposisikan secara absolut dengan inset safe area penuh:
```css
.hud {
  position: absolute;
  inset: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  pointer-events: none;
}
```
Aturan ini menyebabkan batas atas (top edge) kontainer `.hud` sudah berjarak sebesar `env(safe-area-inset-top)` dari batas fisik layar perangkat.

2. Di `web/src/WideScreen.ts:235` dan `528-538`, safe area atas dibaca melalui elemen probe dan dikonversi ke variabel layout:
```ts
// WideScreen.ts:235
const k = this.ratio / this.scale;
const barTop = Math.round(this.safe.top * k);

// WideScreen.ts:533
hudLayout(): { ... } {
  const { barTop, upper, areaTop, lowerRows } = this.layout();
  const k = this.scale / this.ratio;
  return {
    barTop: barTop * k, // Nilai ini ekuivalen kembali ke this.safe.top
    ...
  };
}
```

3. Di `web/src/Hud.ts:713`, nilai tersebut disuntikkan ke variabel CSS kontainer HUD:
```ts
hud.style.setProperty("--hud-bar-top", `${layout.barTop}px`);
```

4. Di `web/src/styles/hud-bar-sheet.css:5` dan `88`, elemen top bar dan tombol menu menggunakan variabel tersebut:
```css
.hud-bar {
  top: var(--hud-bar-top, 0px);
}
.hud .hud-menu-btn {
  top: calc(2px + var(--hud-bar-top, 0px));
}
```

#### Dampak visual
Jarak efektif Top Bar dari bagian paling atas layar ponsel adalah:
$$\text{Offset Total} = \text{env}(\text{safe-area-inset-top}) + \text{var}(--\text{hud-bar-top}) = 2 \times \text{env}(\text{safe-area-inset-top})$$

Pada perangkat dengan notch berukuran 47px sampai 59px, Top Bar terdorong ke bawah sejauh 94px hingga 118px. Hal ini menghasilkan ruang kosong gelap yang sangat lebar di bawah notch dan memotong ruang visual kanvas permainan secara signifikan.

---

### 2.2 Safe area horizontal (kiri dan kanan) terabaikan

- **Lokasi berkas**: `web/src/WideScreen.ts:112-118` dan `web/src/styles/global.css:236`.
- **Tingkat keparahan**: Tinggi (Responsivitas Mobile Landscape).

#### Analisis akar masalah
Pada `web/src/WideScreen.ts:112-118`, objek `safe` hanya mendeteksi sumbu vertikal:
```ts
const probe = document.createElement("div");
probe.className = "safe-probe";
document.body.append(probe);
const readSafe = () => {
  const style = getComputedStyle(probe);
  this.safe = { top: parseFloat(style.paddingTop) || 0, bottom: parseFloat(style.paddingBottom) || 0 };
};
```
Definisi elemen `.safe-probe` di `web/src/styles/global.css:231-239` juga secara eksplisit mengosongkan padding horizontal:
```css
.safe-probe {
  position: fixed;
  top: 0;
  left: 0;
  width: 0;
  padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom);
  visibility: hidden;
  pointer-events: none;
}
```

#### Dampak visual
Ketika game dimainkan dalam mode landscape pada ponsel pintar modern, sisi kiri atau kanan layar memiliki lekukan kamera (notch/camera island) atau rounded corner fisik dengan inset 44px sampai 59px. Karena `WideScreen.ts` tidak membaca `safe.left` dan `safe.right`, perhitungan kanvas, frame intro cerita (`frameRect` di `WideScreen.ts:547-557`), dan sistem kamera game memperlakukan kanvas seolah-olah memiliki permukaan datar penuh. Elemen kanvas di tepi layar terpotong oleh fisik kamera.

---

### 2.3 Bug `clampView` bottom padding hilang

- **Lokasi berkas**: `web/src/WideScreen.ts:307-309` dan `web/src/Hud.ts:733`.
- **Tingkat keparahan**: Kritis (Gameplay & Interaksi Map).

#### Analisis akar masalah
Pada saat panel bawah (bottom sheet) terbuka, kamera harus diberikan ruang geser vertikal ekstra (`bottomPad`) agar ubin peta (tiles) paling selatan dapat digeser ke atas lembaran sheet dan tetap dapat diakses oleh pemain.

Di `web/src/WideScreen.ts:307-309`:
```ts
const bottomPad = (this.villagerSheet || this.buildCardsOpen)
  ? Math.round((112 * this.ratio) / this.scale)
  : 0;
```
Ada dua kegagalan logika kritis di sini:
1. **Menu bangunan diabaikan**: Properti `this.buildingMenuOpen` (didefinisikan di `WideScreen.ts:271-275`) sama sekali tidak dimasukkan ke dalam evaluasi kondisi `bottomPad`. Ketika pemain membuka menu tindakan bangunan (misalnya merekrut pekerja, meneliti teknologi, atau mengatur produksi), sheet bawah muncul tetapi `bottomPad` tetap bernilai `0`.
2. **Seleksi multi-villager mematikan `villagerSheet`**: Pada `web/src/Hud.ts:733`:
```ts
const single = plain && w === 1 && game.selectedId > 0 && !!game.selectionFlags[4] && group.length < 2;
...
screen.villagerSheet = single || choosing;
```
Ketika 2 villager atau lebih diseleksi bersamaan (`group.length >= 2`), variabel `single` bernilai `false`. Akibatnya, `screen.villagerSheet` disetel ke `false`, meskipun panel daftar villager (`groupRow`) sedang aktif ditampilkan di layar bagian bawah (`Hud.ts:735`).

Mengubah `screen.villagerSheet` secara langsung untuk meng-cover kelompok penduduk (`single || choosing || showGroupRow`) memiliki efek samping (*side effects*) yang tidak diinginkan karena `this.villagerSheet` juga mengatur `upperRows` menjadi 0 (`WideScreen.ts:246`) dan menyembunyikan `CANDIDATE_PANEL_SLOT` (`WideScreen.ts:392`).

#### Dampak visual dan fungsional
Pada kedua kondisi di atas, fungsi pembatasan kamera di `WideScreen.ts:313`:
```ts
this.viewY = Math.max(-upper - my, Math.min(mapH + my - this.height + bottomPad, this.viewY));
```
menghitung `bottomPad = 0`. Pemain tidak dapat menggeser kamera ke bawah melewati ketinggian sheet. Semua ubin peta, sumber daya, atau musuh yang berada di baris terbawah peta terhalang permanen di balik sheet UI bawah dan tidak bisa diketuk.

---

### 2.4 Marker ordo desinkronisasi terhadap ubin target

- **Lokasi berkas**: `web/src/Hud.ts:202, 792-798` dan `web/src/WideScreen.ts:620-623`.
- **Tingkat keparahan**: Tinggi (Akurasi Kontrol Sentuh).

#### Analisis akar masalah
Ketika pemain memilih ordo (seperti Call to Arms, Form Up, atau Attack-Move) dan membidik target ubin di peta:
1. Elemen penanda reticle (`orderMark`), animasi konfirmasi (`orderBurst`), dan tombol centang (`orderTick`) dimasukkan sebagai anak DOM dari kontainer `hud`:
```ts
// Hud.ts:202
hud.append(orderMark, orderBurst, orderTick);
```
2. Titik koordinat CSS dihitung oleh kanvas melalui `screen.tileToCss()`:
```ts
// Hud.ts:792-798
if (aiming) {
  const pos = screen.tileToCss(game.cameraColumn + game.cursorColumn, game.cameraRow + game.cursorRow);
  orderMark.style.left = `${pos.x}px`;
  orderMark.style.top = `${pos.y}px`;
  orderTick.style.left = `${pos.x + 36}px`;
  orderTick.style.top = `${pos.y - 28}px`;
}
```
3. Implementasi `screen.tileToCss` di `web/src/WideScreen.ts:620-623`:
```ts
tileToCss(column: number, row: number): { x: number; y: number } {
  const k = this.scale / this.ratio;
  return { x: (column * TILE_W - this.viewX) * k, y: (row * TILE_H - this.viewY) * k };
}
```
Fungsi `tileToCss` menghitung posisi relatif terhadap **ujung kiri-atas kanvas** `(0, 0)`.

Namun, kontainer `.hud` memiliki aturan CSS:
```css
inset: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
```
Titik koordinat `(0, 0)` dari `.hud` bergeser sejauh `(env(safe-area-inset-left), env(safe-area-inset-top))` dari sudut kanvas!

#### Dampak visual
Pemberian gaya `left: ${pos.x}px; top: ${pos.y}px` pada anak elemen `.hud` menambahkan pergeseran inset safe area untuk kedua kalinya. Reticle ordo dan tombol centang melayang melenceng sejauh puluhan piksel dari ubin yang ditargetkan di layar sentuh ponsel ber-notch.

---

## 3. Temuan layout dan responsivitas layar

Bagian ini memuat evaluasi analitis terhadap aturan CSS dan dinamika responsivitas layar pada berbagai form factor (mobile landscape, tablet, desktop lebar, dan ultrawide). Semua temuan analitis diberi penanda `[Inference]`.

### 3.1 `[Inference]` Tombol komando meluap pada HP landscape

- **Lokasi berkas**: `web/src/styles/hud-bar-sheet.css:287-293` dan `web/src/hud/RightThumbControls.ts:48-81`.
- **Tingkat keparahan**: Tinggi.

#### Bukti analitis
Daftar menu komando (`hud-cmd-item`) memuat 5 item aksi (Call to Arms, Form Up, Attack-Move, Minimap, Roster) dengan penempatan vertikal berbasis variabel `--i` (0 hingga 4):
```css
.hud .hud-cmd-item {
  right: 29px;
  bottom: calc(var(--hud-bottom, 0px) + 154px + var(--i) * 52px);
  width: 46px;
  height: 46px;
  border-radius: 50%;
}
```
Untuk item ke-5 (`--i = 4`):
$$\text{Posisi Bottom} = 154\text{px} + (4 \times 52\text{px}) = 362\text{px}$$
Dengan diameter tombol sebesar $46\text{px}$, puncak tombol berada pada:
$$\text{Batas Atas} = 362\text{px} + 46\text{px} + \text{var}(--\text{hud-bottom}) \ge 408\text{px}$$

Pada perangkat mobile dalam orientasi landscape, tinggi viewport standar umumnya berada pada rentang:
- iPhone SE / 8: $375\text{px}$
- Ponsel Android standar: $360\text{px} - 392\text{px}$
- iPhone 12 / 13 / 14 / 15: $390\text{px} - 393\text{px}$

Karena $408\text{px} > 360\text{px} - 393\text{px}$, tombol komando teratas (Minimap dan Roster) meluap melewati tepi atas layar atau tertutup sepenuhnya di balik Top Bar.

---

### 3.2 `[Inference]` Tabrakan fisik squads dan Command Horn pada layar landscape rendah

- **Lokasi berkas**: `web/src/styles/hud-bar-sheet.css:246, 314-322`.
- **Tingkat keparahan**: Tinggi.

#### Bukti analitis
1. Tombol trompet komando utama (`.hud-cmd`) diposisikan dari bawah:
```css
.hud .hud-cmd {
  right: 25px;
  bottom: calc(var(--hud-bottom, 0px) + 88px);
  width: 54px;
  height: 54px;
}
```
2. Kontainer regu (`.hud-squads`) yang menampung hingga 3 regu prajurit diposisikan dari atas menggunakan persentase:
```css
.hud-squads {
  position: absolute;
  right: 8px;
  top: 41%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.hud .hud-squad {
  width: 50px;
  height: 50px;
}
```
Tinggi total 3 unit regu adalah $(3 \times 50\text{px}) + (2 \times 12\text{px}) = 174\text{px}$.

Pada layar mobile landscape dengan tinggi viewport $360\text{px}$:
- Puncak `.hud-squads` berada pada $0.41 \times 360\text{px} = 147.6\text{px}$.
- Dasar `.hud-squads` mencapai $147.6\text{px} + 174\text{px} = 321.6\text{px}$.
- Puncak `.hud-cmd` berada pada $360\text{px} - (88\text{px} + 54\text{px}) = 218\text{px}$, dan dasarnya di $272\text{px}$.

Rentang vertikal kedua komponen bertabrakan langsung pada koordinat $Y = 218\text{px}$ hingga $272\text{px}$ di tepi kanan layar yang sama (`right: 8px` vs `right: 25px`). Hal ini memicu saltap (salah tap) antara regu tempur dan trompet komando.

---

### 3.3 `[Inference]` Ketiadaan CSS media query mobile landscape

- **Lokasi berkas**: Semua berkas di `web/src/styles/*.css`.
- **Tingkat keparahan**: Sedang.

#### Bukti analitis
Pemeriksaan menyeluruh terhadap seluruh pustaka CSS membuktikan tidak terdapat satu pun deklarasi `@media (orientation: landscape)`.
Media query yang ada saat ini hanya berupa pengecekan lebar minimum:
- `@media (min-width: 768px)` pada `hud-extra-controls.css:260` dan `hud-responsive.css:2`.
- `@media (min-width: 960px)` pada `hud-extra-controls.css:274`.

Pada ponsel yang diputar ke orientasi landscape, lebar layar dapat mencapai $667\text{px} - 932\text{px}$ namun tinggi vertikalnya sangat sempit ($< 430\text{px}$). Ketiadaan query `(orientation: landscape)` atau `(max-height: 480px)` memaksa antarmuka menggunakan asumsi ruang vertikal portrait yang longgar, menghasilkan tumpang tindih elemen di berbagai sektor HUD.

---

### 3.4 `[Inference]` Disorientasi HUD pada layar desktop PC lebar $\ge 960\text{px}$

- **Lokasi berkas**: `web/src/styles/hud-extra-controls.css:274-285` dan `web/src/styles/hud-bar-sheet.css:88`.
- **Tingkat keparahan**: Sedang.

#### Bukti analitis
Di `hud-extra-controls.css:274-285`, pada lebar layar $\ge 960\text{px}$, bar sumber daya dipusatkan di tengah atas monitor:
```css
@media (min-width: 960px) {
  .hud-bar {
    max-width: 680px;
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    justify-content: center;
    ...
  }
}
```
Namun tombol pendukung (`.hud-menu-btn`, `.hud-speed-btn`, `.hud-idle-btn`) tetap berlabuh pada batas terluar layar (`right: 6px`, `right: 120px`, `right: 50px`).

Pada layar monitor Full HD ($1920\text{px}$):
- `.hud-bar` berada di tengah: dari $X = 620\text{px}$ sampai $X = 1300\text{px}$.
- Tombol kendali berada di ujung kanan monitor: $X = 1800\text{px}$ hingga $X = 1914\text{px}$.

Jarak pisah horizontal melebihi $500\text{px}$. Hal ini bertentangan dengan intensi desain (yang tertulis pada komentar kode baris 259: *"integrate Speed and Idle buttons directly into top bar beside Menu"*), menyebabkan disorientasi visual bagi pemain PC.

---

### 3.5 `[Inference]` Pelanggaran standar touch target minimum $44 \times 44\text{px}$

- **Lokasi berkas**: Berbagai berkas CSS terkait kontrol sentuh.
- **Tingkat keparahan**: Sedang (Aksesibilitas & Ergonomi).

#### Bukti analitis
Berdasarkan pedoman aksesibilitas WCAG 2.5.5 (Target Size) serta pedoman Apple Human Interface Guidelines dan Google Material Design, target sentuh interaktif pada perangkat layar sentuh wajib berukuran minimal $44 \times 44\text{px}$ (atau $48 \times 48\text{px}$).

Ditemukan beberapa tombol interaktif yang jauh di bawah ambang batas minimum:
1. **Tombol Craft Stepper** (`web/src/styles/hud-responsive.css:278-279`):
   Ukuran: $17\text{px} \times 17\text{px}$ (hanya 38% dari standar minimum).
2. **Tombol Batal Attack-Move** (`web/src/styles/combat-orders.css:33-34`):
   Ukuran: $22\text{px} \times 22\text{px}$ (hanya 50% dari standar minimum).
3. **Tombol Speed Toggle** (`web/src/styles/hud-extra-controls.css:8`):
   Tinggi: $30\text{px}$ (lebar $44\text{px}$).
4. **Tombol Tutup Dialog Pengaturan** (`web/src/styles/settings.css:56-57`):
   Ukuran: $26\text{px} \times 26\text{px}$ (hanya 59% dari standar minimum).

Target sentuh sekecil ini sering gagal merespons sentuhan jempol pengguna atau memicu saltap pada elemen di sekitarnya.

---

### 3.6 `[Inference]` Dialog cerita melar di layar PC ultrawide

- **Lokasi berkas**: `web/src/styles/story.css:19-33`.
- **Tingkat keparahan**: Sedang.

#### Bukti analitis
Pada modul cerita naratif:
```css
.story-box {
  position: absolute;
  left: calc(env(safe-area-inset-left) + 14px);
  right: calc(env(safe-area-inset-right) + 14px);
  bottom: calc(env(safe-area-inset-bottom) + 34px);
  min-height: 176px;
  ...
}
.story-picture {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```
Tidak ada deklarasi `max-width` pada `.story-box`.
Pada monitor Ultrawide (21:9 atau 32:9, resolusi $2560\text{px}$, $3440\text{px}$, atau $5120\text{px}$):
1. Kotak teks `.story-box` meregang selebar ribuan piksel, menghasilkan baris teks narasi yang sangat panjang dan sulit dibaca secara ergonomis.
2. Gambar ilustrasi seni 240x320 (`.story-picture`) yang diatur dengan `object-fit: cover` mengalami pemotongan (crop) vertikal ekstrem, menghilangkan proporsi visual karakter dan latar belakang adegan.

---

## 4. Matriks prioritas masalah UI

Tabel berikut merangkum seluruh temuan audit, tingkat risiko, dan dampak operasionalnya:

| No | Masalah | Lokasi Berkas | Dampak | Tingkat Risiko |
|:---|:---|:---|:---|:---|
| 1 | Double-Inset Safe Area pada Top Bar | `web/src/styles/global.css:64`<br>`web/src/Hud.ts:713`<br>`web/src/WideScreen.ts:235` | Top Bar turun 2x safe area, meninggalkan celah kosong besar di bawah notch ponsel | **Kritis** |
| 2 | Safe Area Kiri dan Kanan Terabaikan | `web/src/WideScreen.ts:112-118`<br>`web/src/styles/global.css:236` | Kanvas dan dialog terpotong notch fisik saat ponsel dimainkan secara landscape | **Tinggi** |
| 3 | Bug `clampView` Bottom Padding Hilang | `web/src/WideScreen.ts:307-309`<br>`web/src/Hud.ts:733` | Ubin bawah peta terhalang sheet menu bangunan dan multi-villager, tidak bisa dipan | **Kritis** |
| 4 | Marker Ordo Desinkronisasi | `web/src/Hud.ts:202, 792-798`<br>`web/src/WideScreen.ts:620-623` | Penanda bidikan melayang melenceng puluhan piksel dari ubin target akibat offset `.hud` | **Tinggi** |
| 5 | Tombol Komando Meluap pada HP Landscape | `web/src/styles/hud-bar-sheet.css:287-293`<br>`web/src/hud/RightThumbControls.ts:74` | Tombol Roster dan Minimap berada di luar layar pada tinggi viewport $\le 390\text{px}$ | **Tinggi** |
| 6 | Tabrakan Fisik Squads dan Command Horn | `web/src/styles/hud-bar-sheet.css:246, 317` | Tombol regu prajurit dan trompet komando bertumpuk pada landscape pendek | **Tinggi** |
| 7 | Ketiadaan CSS Media Query Mobile Landscape | Seluruh berkas `web/src/styles/*.css` | Tata letak UI mobile portrait dipaksakan pada orientasi landscape berlayar sempit | **Sedang** |
| 8 | Disorientasi HUD pada PC $\ge 960\text{px}$ | `web/src/styles/hud-extra-controls.css:274` | Bar sumber daya berada di tengah, tombol menu/speed terlempar 500px ke kanan | **Sedang** |
| 9 | Pelanggaran Standar Touch Target ($< 44\text{px}$) | `hud-responsive.css:278`<br>`combat-orders.css:33`<br>`settings.css:56` | Tombol craft (17px), a-move cancel (22px), dan close (26px) sulit ditekan | **Sedang** |
| 10 | Dialog Cerita Melar di PC Ultrawide | `web/src/styles/story.css:24, 32` | Teks cerita melebar tak terbatas dan ilustrasi narasi terpotong ekstrem | **Sedang** |

---

## 5. Rekomendasi solusi dan rencana tindakan terstruktur

Berikut adalah rencana tindakan bertahap yang presisi dan minim alokasi untuk menyelesaikan seluruh temuan di atas.

### Langkah 1: Tambahkan `groupSheet` dan perbaiki `bottomPad` di `WideScreen.ts`

Mengubah `screen.villagerSheet` secara langsung untuk meng-cover kelompok penduduk (`single || choosing || showGroupRow`) memiliki efek samping (*side effects*) yang tidak diinginkan karena `this.villagerSheet` juga mengatur `upperRows` menjadi 0 (`WideScreen.ts:246`) dan menyembunyikan `CANDIDATE_PANEL_SLOT` (`WideScreen.ts:392`).

Rekomendasi solusi yang benar dan bebas efek samping:

1. **Tambahkan properti terpisah di `WideScreen.ts`**:
   ```typescript
   groupSheet = false;
   ```

2. **Set flag tersebut secara terpisah di `Hud.ts`**:
   Di `web/src/Hud.ts:733`, set flag tersebut secara terpisah (tanpa menyentuh `screen.villagerSheet`):
   ```typescript
   screen.groupSheet = showGroupRow;
   ```

3. **Perbaiki evaluasi kondisi `bottomPad` di `WideScreen.ts`**:
   Di `web/src/WideScreen.ts:307-309`, evaluasi:
   ```typescript
   const bottomPad = (this.villagerSheet || this.groupSheet || this.buildCardsOpen || this.buildingMenuOpen)
     ? Math.round((112 * this.ratio) / this.scale)
     : 0;
   ```
   Hal ini menjamin kanvas selalu memberikan ruang gulir cadangan (112px skala game) setiap kali lembaran bawah menutupi area permainan tanpa menimbulkan efek samping pada `upperRows` maupun `CANDIDATE_PANEL_SLOT`.

---

### Langkah 2: Perbaiki safe-area double inset dan probe horizontal

1. **Eliminasi perhitungan ganda padding notch**:
   Karena kontainer `.hud` sudah memiliki aturan `inset: env(safe-area-inset-top) ...`, variabel `--hud-bar-top` di `web/src/Hud.ts:713` tidak boleh lagi menambahkan `layout.barTop` secara penuh jika `layout.barTop` bersumber dari safe area inset yang sama.
   Solusi terbersih:
   - Di `web/src/styles/global.css:64`, pertahankan inset `.hud` pada batas fisik layar penuh (`inset: 0`), dan biarkan masing-masing sub-komponen mengonsumsi `env(safe-area-inset-*)` secara eksplisit, ATAU
   - Di `web/src/styles/hud-bar-sheet.css:5`, hilangkan penambahan ganda jika `.hud` tetap menggunakan `inset: env(...)`.
2. **Perluas pembacaan probe ke 4 arah mata angin**:
   Perbarui `web/src/styles/global.css:236`:
   ```css
   .safe-probe {
     position: fixed;
     top: 0;
     left: 0;
     width: 0;
     padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
     visibility: hidden;
     pointer-events: none;
   }
   ```
   Perbarui `web/src/WideScreen.ts:117`:
   ```ts
   this.safe = {
     top: parseFloat(style.paddingTop) || 0,
     right: parseFloat(style.paddingRight) || 0,
     bottom: parseFloat(style.paddingBottom) || 0,
     left: parseFloat(style.paddingLeft) || 0,
   };
   ```
3. **Perbaiki penempatan reticle ordo (`orderMark`)**:
   Pasang penanda reticle ordo (`orderMark`, `orderTick`, `orderBurst`) langsung pada kontainer kanvas `#app` (yang tidak terpengaruh inset `.hud`), atau kurangkan offset `pos.x - safe.left` dan `pos.y - safe.top` saat menyetel gaya CSS di `web/src/Hud.ts:794-797`.

---

### Langkah 3: Tambahkan media query mobile landscape untuk susunan tombol aksi

Tambahkan aturan responsif khusus orientasi landscape dengan batasan tinggi di `web/src/styles/hud-bar-sheet.css`:

```css
@media (orientation: landscape) and (max-height: 500px) {
  /* Susun tombol aksi komando secara horizontal atau 2 kolom menyamping */
  .hud .hud-cmd-item {
    right: calc(85px + (var(--i) % 3) * 52px);
    bottom: calc(var(--hud-bottom, 0px) + 20px + floor(var(--i) / 3) * 52px);
  }

  /* Reposisi wadah regu prajurit agar tidak bertabrakan dengan tombol trompet */
  .hud-squads {
    top: 15%;
    gap: 6px;
  }
  .hud .hud-squad {
    width: 42px;
    height: 42px;
  }
}
```

Modifikasi ini memecah rantai vertikal 5 tombol komando menjadi susunan horizontal yang kompak di samping tombol trompet, sehingga tidak meluap keluar dari batas atas layar landscape.

---

### Langkah 4: Perbesar hitbox tombol kecil ke $44 \times 44\text{px}$ via pseudo-element `::after`

Pertahankan estetika piksel dan visual retro tombol yang mungil, namun perluas area interaksi sentuhan transparan hingga mencapai standar ergonomis $44 \times 44\text{px}$ menggunakan pseudo-element `::after`.

1. **Untuk tombol craft stepper** (`web/src/styles/hud-responsive.css`):
```css
.hud-item .craft-btn {
  position: relative;
  width: 17px;
  height: 17px;
  /* Visual tetap 17px */
}
.hud-item .craft-btn::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 44px;
  min-height: 44px;
  pointer-events: auto;
}
```

2. **Untuk tombol pembatalan Attack-Move** (`web/src/styles/combat-orders.css`):
```css
.a-move-cancel-btn {
  position: relative;
  /* Visual tetap 22px */
}
.a-move-cancel-btn::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 44px;
  min-height: 44px;
}
```

3. **Untuk tombol penutup modal dialog** (`web/src/styles/settings.css`):
```css
.settings-close-x {
  position: relative;
  /* Visual tetap 26px */
}
.settings-close-x::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 44px;
  min-height: 44px;
}
```

4. **Untuk kotak cerita dan ilustrasi di layar lebar** (`web/src/styles/story.css`):
```css
.story-box {
  max-width: 760px;
  left: 50%;
  right: auto;
  transform: translateX(-50%);
  width: calc(100% - 32px);
}
.story-picture {
  max-width: 640px;
  margin: 0 auto;
}
```

---

## 6. Verifikasi dan kriteria penerimaan teknis

Setelah seluruh perbaikan di atas diimplementasikan pada tiket pengerjaan mendatang, tim pengembang wajib melakukan verifikasi dengan kriteria penerimaan berikut:
1. **Emulasi iPhone dengan Notch (Portrait)**:
   Top Bar harus berada tepat di bawah area status bar notch fisik tanpa celah kosong 94px+.
2. **Emulasi iPhone / Android (Landscape)**:
   - Seluruh 5 tombol komando terlihat utuh dan tidak terpotong oleh tepi atas layar.
   - Tidak terjadi tabrakan hit-box antara regu prajurit (`.hud-squads`) dan trompet komando (`.hud-cmd`).
3. **Inspeksi Ubin Peta Terbawah**:
   - Saat membuka menu bangunan (`buildingMenuOpen`), peta dapat digeser sehingga ubin baris terbawah berada di atas lembaran sheet.
   - Saat menyeleksi 2 villager atau lebih, kamera tetap memiliki `bottomPad` dan ubin peta terbawah tidak terpotong sheet.
4. **Target Sentuh**:
   Seluruh tombol interaktif (craft, cancel a-move, close dialog) dapat ditekan dengan mudah pada perangkat layar sentuh fisik tanpa membutuhkan keakuratan sub-milimeter.
