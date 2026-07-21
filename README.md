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

Repo ini sudah siap deploy ke [Railway](https://railway.app):

- Railway (via Nixpacks) otomatis mendeteksi Node.js dari `package.json` dan
  menjalankan `npm install` lalu `npm start`.
- `Procfile` (`web: node server.js`) disertakan sebagai referensi eksplisit.
- Server membaca port dari environment variable `PORT` (disediakan otomatis oleh Railway).

Tidak ada langkah build tambahan — cukup hubungkan repo ini ke Railway dan deploy.

## Verifikasi manual

- Ganti mode populasi antara "Tidak diketahui" dan "Diketahui" — field N harus
  muncul/hilang dan hasil harus ikut berubah.
- Pastikan opsi tingkat kepercayaan sesuai dengan tabel Z-score di
  `public/js/calculator.js` (90%, 95%, 99%).
- Bandingkan hasil dengan kalkulator ukuran sampel online lain sebagai sanity check,
  misalnya N=5000, e=5%, CI=95%, p=50% → n≈357.
