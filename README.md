# Kalkulator Ukuran Sampel

Aplikasi web sederhana untuk menghitung jumlah sampel (responden) minimum yang
dibutuhkan untuk survei atau penelitian, berdasarkan 4 input:

1. **Populasi (N)** — mendukung mode populasi diketahui (dengan koreksi populasi
   terhingga) maupun tidak diketahui/tak terhingga.
2. **Margin of error** — default 5%.
3. **Tingkat kepercayaan (confidence interval)** — default 90% (tersedia 90%, 95%, 99%).
4. **Distribusi respons** — default 50%.

Hasil ditampilkan sebagai angka sampel minimum, beserta dua visualisasi:
- Perbandingan sampel vs total populasi (jika populasi diketahui).
- Grafik sensitivitas ukuran sampel terhadap perubahan margin of error.

Untuk penjelasan detail alur aplikasi (proses input → perhitungan → output,
arsitektur, dan peran tiap file), lihat [`requirement.md`](./requirement.md).

## Rumus

- Populasi tak terhingga/tidak diketahui: `n0 = Z² × p × (1-p) / e²`
- Koreksi populasi terhingga: `n = n0 / (1 + (n0 - 1) / N)`

## Menjalankan secara lokal

```bash
npm install
npm start
```

Buka `http://localhost:3000`.

## Menjalankan test

```bash
npm test
```

## Deploy ke Railway

Repo ini sudah siap deploy ke [Railway](https://railway.app) tanpa konfigurasi
tambahan — tidak ada langkah build, database, atau environment variable wajib.

### Cara 1 — Lewat Dashboard Railway (paling mudah)

1. Login ke [railway.app](https://railway.app) dan buka dashboard project Anda.
2. Klik **New Project** → **Deploy from GitHub repo**.
3. Pilih repository `ikanx101/Sample-calculator` (hubungkan akun GitHub Anda ke
   Railway terlebih dahulu jika repo belum muncul di daftar).
4. Pilih branch yang ingin dideploy (misalnya `main`).
5. Railway otomatis mendeteksi ini sebagai project Node.js (via Nixpacks) dari
   `package.json`, lalu menjalankan:
   - Build: `npm install`
   - Start: `npm start` (yaitu `node server.js`)
6. Tunggu proses build & deploy selesai (biasanya < 1 menit karena tidak ada
   build step berat).
7. Buka tab **Settings** → **Networking** pada service tersebut, klik
   **Generate Domain** untuk mendapatkan URL publik (`https://xxxx.up.railway.app`).
8. Buka URL tersebut — aplikasi kalkulator siap dipakai.

### Cara 2 — Lewat Railway CLI

```bash
# Install CLI (sekali saja)
npm install -g @railway/cli

# Login
railway login

# Di dalam folder repo ini
railway init          # buat project baru, atau `railway link` untuk project yang sudah ada
railway up             # build & deploy kode saat ini
railway domain         # generate/tampilkan URL publik
```

### Environment variable

Tidak ada environment variable yang wajib diisi. Railway otomatis menyuntikkan
`PORT`, dan `server.js` sudah membaca port dari `process.env.PORT`:

```js
const PORT = process.env.PORT || 3000;
```

### File konfigurasi terkait

- `package.json` → script `"start": "node server.js"` dipakai Nixpacks sebagai
  perintah start.
- `Procfile` (`web: node server.js`) → disertakan sebagai referensi eksplisit,
  berguna jika Anda beralih ke platform lain yang memakai konvensi Procfile.
- `.gitignore` → memastikan `node_modules/` tidak ikut ter-commit; Railway akan
  menjalankan `npm install` sendiri saat build.

### Re-deploy setelah update kode

- **Dashboard**: setiap `git push` ke branch yang terhubung akan otomatis
  memicu deploy baru (auto-deploy default Railway).
- **CLI**: jalankan `railway up` lagi dari folder repo.

### Troubleshooting singkat

| Gejala | Kemungkinan penyebab | Solusi |
|---|---|---|
| Build gagal, "Cannot find module express" | `node_modules` ter-commit tapi rusak/beda versi | Pastikan `node_modules/` masuk `.gitignore`, biarkan Railway `npm install` sendiri |
| Aplikasi crash langsung setelah start | Port di-hardcode, tidak baca `process.env.PORT` | Pastikan `server.js` memakai `process.env.PORT \|\| 3000` |
| Chart/CSS tidak muncul di production | Path aset salah | Pastikan aset diakses relatif dari `public/` (mis. `js/app.js`, bukan `/public/js/app.js`) |

## Verifikasi manual

- Ganti mode populasi antara "Tidak diketahui" dan "Diketahui" — field N harus
  muncul/hilang dan hasil harus ikut berubah.
- Pastikan opsi tingkat kepercayaan sesuai dengan tabel Z-score di
  `public/js/calculator.js` (90%, 95%, 99%).
- Bandingkan hasil dengan kalkulator ukuran sampel online lain sebagai sanity check,
  misalnya N=5000, e=5%, CI=95%, p=50% → n≈357.
