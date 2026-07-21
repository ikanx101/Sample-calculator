# Requirement & Alur Aplikasi — Kalkulator Ukuran Sampel

Dokumen ini menjelaskan kebutuhan (requirement) dan alur kerja (flow) lengkap
dari aplikasi web Kalkulator Ukuran Sampel: apa yang harus diisi user, apa yang
dihitung sistem, dan apa yang ditampilkan sebagai output.

## 1. Tujuan Aplikasi

Membantu peneliti/tim survei menghitung **jumlah sampel (responden) minimum**
yang dibutuhkan agar hasil survei valid secara statistik, tanpa perlu menghitung
manual rumus statistik.

## 2. Input Pengguna

Aplikasi menerima 4 input dari user melalui form di halaman utama
(`public/index.html`):

### 2.1 Populasi (N)

- **Mode "Tidak diketahui / tak terhingga"** (default): dipilih ketika jumlah
  populasi sangat besar atau tidak diketahui pastinya (misal seluruh pengguna
  internet). Perhitungan sampel menggunakan rumus untuk populasi tak terhingga.
- **Mode "Diketahui"**: user memasukkan angka N (jumlah populasi). Perhitungan
  sampel menggunakan **koreksi populasi terhingga**, sehingga jumlah sampel yang
  dihasilkan lebih kecil/efisien dibanding mode tak terhingga.
- Kontrol UI: segmented control (`.segmented` di `#population-mode-unknown` /
  `#population-mode-known`). Field angka N (`#population-size`) hanya muncul
  saat mode "Diketahui" dipilih.
- Validasi: N harus berupa angka lebih besar dari 0 saat mode "Diketahui" aktif.

### 2.2 Margin of Error (e)

- Rentang: 1%–30%, default **5%**.
- Kontrol UI: slider (`#margin-of-error-range`) tersinkron dua arah dengan
  input angka (`#margin-of-error`).
- Semakin kecil nilai ini, semakin presisi hasil survei, namun sampel yang
  dibutuhkan semakin banyak.
- Validasi: harus di antara 0% dan 100% (eksklusif).

### 2.3 Tingkat Kepercayaan / Confidence Interval (CI)

- Pilihan: **90%** (default), 95%, 99%.
- Setiap tingkat kepercayaan dipetakan ke nilai Z-score (tabel `Z_SCORES` di
  `public/js/calculator.js`):
  | CI | Z-score |
  |----|---------|
  | 90% | 1.645 |
  | 95% | 1.96 |
  | 99% | 2.576 |
- Kontrol UI: segmented control (`#confidence-level`), opsi dibuat otomatis dari
  key-key `Z_SCORES` — menambah level baru cukup menambah entri di tabel, UI
  ikut menyesuaikan.
- Semakin tinggi CI, semakin banyak sampel yang dibutuhkan.

### 2.4 Distribusi Respons (p)

- Rentang: 1%–99%, default **50%**.
- Kontrol UI: slider (`#response-distribution-range`) tersinkron dua arah
  dengan input angka (`#response-distribution`).
- 50% adalah asumsi paling konservatif (menghasilkan sampel terbesar) dan
  digunakan bila tidak ada data/perkiraan sebelumnya.

## 3. Proses Perhitungan

Logika perhitungan murni (tanpa dependensi DOM) ada di `public/js/calculator.js`,
diekspos sebagai modul UMD (`window.SampleSizeCalculator` di browser, atau
`require()` langsung dari Node — dipakai juga oleh test).

Alur `calculateSampleSize(input)`:

1. **Validasi input** (`validateInputs`) — mengecek margin of error, distribusi
   respons, N (jika mode "known"), dan CI yang didukung. Jika ada error,
   fungsi mengembalikan `{ n: null, errors: [...] }` dan UI menampilkan pesan
   error, tidak menghitung apa pun.
2. **Ambil Z-score** dari `CI` via `getZScore`.
3. **Hitung n0** (ukuran sampel dasar untuk populasi tak terhingga):
   ```
   n0 = Z² × p × (1 - p) / e²
   ```
4. **Jika mode populasi "known"**, terapkan koreksi populasi terhingga:
   ```
   n = n0 / (1 + (n0 - 1) / N)
   ```
   Jika mode "unknown", `n = n0`.
5. **Bulatkan ke atas** (`Math.ceil`) → ini angka final yang ditampilkan.

Fungsi ini dipanggil ulang oleh `recalculate()` di `public/js/app.js` setiap
kali salah satu dari 4 input berubah (event `input`/`change`), sehingga hasil
dan visualisasi ter-update secara real-time tanpa reload halaman maupun
komunikasi ke server.

## 4. Output

### 4.1 Angka Hasil (Hero Number)

- **Jumlah sampel minimum** ditampilkan besar di kartu "Hasil"
  (`#result-number`), dibulatkan ke atas.
- Detail pendukung (`#result-detail`): nilai mentah sebelum dibulatkan dan
  Z-score yang dipakai, untuk transparansi perhitungan.

### 4.2 Visualisasi 1 — Meter "Sampel vs. Total Populasi"

- Hanya tampil saat mode populasi **"Diketahui"**.
- Berupa progress bar (meter) yang menunjukkan proporsi sampel (n) terhadap
  total populasi (N), dengan caption "**n** dari N populasi (x%)".
- Elemen: `#chart-a-block`, `#meter-fill`, `#meter-caption`.

### 4.3 Visualisasi 2 — Grafik Sensitivitas Margin of Error

- Selalu tampil, berupa grafik garis (Chart.js) yang menghitung ulang ukuran
  sampel untuk rentang margin of error 1%–20% (langkah 0.5%), dengan CI,
  distribusi respons, dan mode populasi yang sama seperti input saat ini.
- Titik yang sesuai dengan margin of error yang sedang diisi user ditandai
  dengan marker dan label langsung ("n = ...") sehingga user bisa melihat
  posisinya pada kurva.
- Elemen: `#chart-sensitivity`.

## 5. Alur Interaksi End-to-End

1. Halaman dimuat → `app.js` mengisi opsi tingkat kepercayaan, menyembunyikan
   field N, lalu memanggil `recalculate()` sekali dengan nilai default
   (populasi tidak diketahui, e=5%, CI=90%, p=50%).
2. User mengubah salah satu input (toggle populasi, geser slider, ubah angka,
   pilih CI) → event listener memicu `recalculate()`.
3. `recalculate()`:
   - Membaca semua nilai input saat ini dari DOM.
   - Memanggil `calculateSampleSize()`.
   - Jika error → tampilkan pesan error, kosongkan hasil.
   - Jika sukses → update angka hasil, update meter (jika relevan), update
     grafik sensitivitas.
4. Semua terjadi di sisi klien (browser) — tidak ada request ke server setelah
   halaman pertama kali dimuat.

## 6. Arsitektur Teknis

- **Server** (`server.js`): Express, hanya menyajikan file statis dari
  folder `public/` dan membaca port dari `process.env.PORT`. Tidak ada API,
  tidak ada database.
- **Frontend**: HTML/CSS/JS murni tanpa build step. Chart.js di-vendor lokal
  (`public/js/vendor/chart.umd.min.js`) agar tidak bergantung pada CDN saat
  runtime.
- **Test**: `tests/calculator.test.js` menggunakan `node --test` (test runner
  bawaan Node, tanpa framework tambahan) untuk memverifikasi rumus terhadap
  kasus-kasus baku (mis. N tak terhingga, e=5%, CI=95%, p=50% → n=385).

## 7. Ringkasan File

| File | Peran |
|---|---|
| `server.js` | Server Express, menyajikan `public/` |
| `public/index.html` | Struktur halaman & form input |
| `public/css/style.css` | Styling, tema terang/gelap |
| `public/js/calculator.js` | Logika rumus (dipakai browser & test) |
| `public/js/app.js` | Wiring form, kalkulasi ulang, render meter & grafik |
| `public/js/vendor/chart.umd.min.js` | Library Chart.js (vendored) |
| `tests/calculator.test.js` | Unit test rumus |
| `Procfile` | Perintah start untuk Railway (referensi eksplisit) |
