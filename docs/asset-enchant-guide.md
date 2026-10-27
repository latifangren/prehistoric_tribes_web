# Panduan & Preset Remastering Asset Game (Real-ESRGAN NCNN)

Dokumen ini mencatat konfigurasi, tools, dan alur kerja AI upscaling yang digunakan untuk remastering aset 2D pada `prehistoric_tribes_web`. Anda dapat menggunakan panduan ini untuk menguji atau menjalankan proses serupa di mesin Windows dengan GPU dedicated.

---

## 1. Spesifikasi Tool & Model

Tool yang digunakan adalah **Real-ESRGAN (NCNN Vulkan)**, implementasi portabel tanpa ketergantungan Python/PyTorch yang mendukung akselerasi GPU (NVIDIA/AMD/Intel) melalui Vulkan API.

### Model Weights:
1. **`realesrgan-x4plus-anime` (Rekomendasi untuk Aset Statis & Line-Art)**
   - **Karakteristik**: Mempertajam garis tepi (*line art*), meratakan blok warna kartun/2D, dan membersihkan noise kompresi tanpa membuat tekstur pecah.
   - **Cocok Untuk**: `buildings/` (gedung), `animals/` (hewan), `story/faces/` (potret dialog), `ui/`, dan `objects/`.
2. **`realesr-animevideov3` (Rekomendasi untuk Animasi & Kecepatan Tinggi)**
   - **Karakteristik**: Ringan, menjaga posisi anchor/edge modular, dan memproses 5-10x lebih cepat.
   - **Cocok Untuk**: `parts/` (potongan sendi modular karakter) dan `effects/` (ratusan frame efek partikel).
3. **`realesrgan-x4plus` (Tekstur Realistis)**
   - **Karakteristik**: Menambahkan detail mikro pada permukaan alami (serat kayu, retakan batu, jerami).

---

## 2. Strategi Branch & Skala (Presets)

| Branch | Konfigurasi | Ukuran Aset | Rekomendasi Penggunaan |
| :--- | :--- | :--- | :--- |
| **`asset-enchant`** (2x Murni) | Semua 1.768 file di-upscale **2x** menggunakan `realesr-animevideov3` & `anime`. | ~130 MB | **Default Production**: Seimbang, ringan dimuat di HP/web canvas, animasi sendi 100% presisi. |
| **`asset-enchant-4x-selective`** (Hybrid) | `buildings`, `animals`, `story/faces`, dan `objects` (pohon, batu, alam) di-upscale **4x** murni dari file original (`origin/dev`); `parts/` dan `effects/` tetap **2x**. | ~250 MB | **Ultra-Sharp**: Tampilan bangunan, hewan, dan objek alam ultra tajam di layar 2K/4K tanpa membebani animasi pergerakan karakter. |

---

## 3. Menjalankan di Windows (Manual / GPU)

### A. Download Binary Windows
1. Download release portabel Windows:
   - [Real-ESRGAN v0.2.5.0 Windows (github.com/xinntao/Real-ESRGAN)](https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-windows.zip)
2. Ekstrak file zip ke folder, misalnya: `D:\tools\realesrgan\`

### B. Command CLI Standar (PowerShell / CMD)

#### 1. Uji Coba 1 File (4x Ultra HD):
```powershell
.\realesrgan-ncnn-vulkan.exe -i "input.png" -o "output.png" -n realesrgan-x4plus-anime -s 4
```

#### 2. Uji Coba 1 File (2x Cepat dengan Preservasi Transparansi):
```powershell
.\realesrgan-ncnn-vulkan.exe -i "input.png" -o "output.png" -n realesr-animevideov3 -s 2
```

#### 3. Mode TTA (Test-Time Augmentation untuk Detail Lekukan Maksimal):
```powershell
.\realesrgan-ncnn-vulkan.exe -i "input.png" -o "output_tta.png" -n realesrgan-x4plus-anime -s 4 -x
```

#### 4. Batch Satu Folder Penuh:
```powershell
.\realesrgan-ncnn-vulkan.exe -i "D:\path\to\input_folder" -o "D:\path\to\output_folder" -n realesrgan-x4plus-anime -s 2 -f png
```

---

## 4. Parameter Command Line Lengkap

- `-i`: Path file input atau folder input.
- `-o`: Path file output atau folder output.
- `-s`: Rasio perbesaran (`2`, `3`, atau `4`).
- `-n`: Nama model (`realesrgan-x4plus-anime`, `realesr-animevideov3`, `realesrgan-x4plus`).
- `-m`: Folder tempat file `.bin` dan `.param` model berada (default: folder `models/`).
- `-g`: ID GPU yang digunakan (misal: `-g 0` untuk GPU NVIDIA utama).
- `-x`: Mengaktifkan mode TTA (memproses 8 orientasi gambar untuk eliminasi artefak garis).
- `-f`: Format output (wajib gunakan `-f png` untuk aset game agar channel transparansi RGBA tetap utuh).

---

## 5. Catatan Penting untuk Aset Game
- **Selalu proses dari file original (1x)** jika ingin mencoba skala 4x. Jangan memperbesar file yang sudah pernah di-upscale 2x (*double-upscaling*) karena akan menimbulkan efek cat minyak/blur berlebih.
- **Transparansi (Channel Alpha)**: Real-ESRGAN NCNN secara default memisahkan channel RGB dan Alpha (A) saat inferensi, sehingga background transparan pada sprite game tetap bersih tanpa noda hitam/putih.
