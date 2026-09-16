# 🎨 Panduan Sistem Desain & UI/UX: FuelGuard Industrial Intelligence

Dokumen ini mendokumentasikan standar visual, token desain, aturan tipografi, komponen, serta perilaku antarmuka pengguna (UI/UX) untuk aplikasi web Admin Dashboard **FuelGuard AI (Fuel Monitoring & Anomaly Detection System)**.

---

## 1. Prinsip Utama Desain

Antarmuka ini dirancang khusus untuk operasional kritis berdensitas tinggi (*High-Density Data Architecture*). Desain harus menyeimbangkan penyajian volume data numerik yang masif dengan ketajaman peringatan dini kecurangan (*fraud*).

*   **Warna sebagai Telemetri**: Warna tidak digunakan sebagai hiasan, melainkan sebagai indikator status operasional instan.
*   **Kejelasan Angka (Zero Jitter)**: Seluruh presentasi angka menggunakan font monospaced untuk menjamin alignment vertikal yang sempurna tanpa pergeseran posisi saat data berubah real-time.
*   **Geometri Lembut Industri**: Menggunakan pendekatan radius sudut yang konsisten (4px untuk tombol/input, 8px untuk kartu) guna menampilkan kesan modern yang tetap kokoh dan disiplin.

---

## 2. Token Desain & Palet Warna

### Warna Kustom Korporat (Tailwind Extension)
*   **`pln-darkBlue` (`#156075`)**: Fondasi struktural dominan. Digunakan untuk bilah navigasi (Sidebar), tajuk halaman, teks dengan penekanan tinggi, dan tombol aksi utama.
*   **`pln-cyan` (`#18a4c5`)**: Aksen interaktif operasional. Digunakan untuk status aktif, fokus input, trace grafik, ring seleksi, dan link navigasi aktif.
*   **`pln-iceBlue` (`#e6f4f8`)**: Warna dasar kanvas (Latar belakang). Memiliki saturasi dingin yang sangat lembut guna meminimalisir kelelahan mata (*cognitive fatigue*) operator depo selama giliran kerja panjang.
*   **`pln-yellow` (`#f6e736`)**: Indikator supervisory/peringatan dini ringan. Digunakan khusus untuk transaksi berstatus `PENDING` atau `REVIEW` yang membutuhkan tinjauan manual.
*   **`anomaly-red` (`#ef4444`)**: Interupsi visual mutlak. Disimpan eksklusif untuk menandai transaksi risiko tinggi (`ml_is_anomaly: true`), lonjakan tangki drastis, bypass sensor, dan tombol aksi destruktif penolakan klaim.

---

## 3. Aturan Tipografi

Sistem menggunakan kombinasi dua font khusus:
1.  **Hanken Grotesk**: Digunakan untuk elemen antarmuka umum, judul halaman, nama menu, placeholder, labell, dan deskripsi teks. Karakteristik hurufnya yang ringkas dan efisien mencegah terjadinya pemotongan kata (*accidental wrapping*) pada istilah majemuk Bahasa Indonesia yang panjang (contoh: *Manajer Operasional Regional*).
2.  **JetBrains Mono**: Diwajibkan untuk data numerik kuantitatif. Digunakan pada volume liter BBM (`14.820 L`), nilai mata uang (`Rp 192.660.000`), pelat nomor kendaraan (`DA 1234 CD`), angka odometer (`145.890 Km`), ID transaksi (`TRX-001`), dan penanda waktu (*timestamp*).

---

## 4. Elevasi, Kedalaman & Bentuk Geometric

*   **Radius Sudut (Shapes)**:
    *   Komponen Kontrol Dasar (Tombol, Input, Badge, Chips): `rounded-[4px]` (`0.25rem`).
    *   Komponen Kontrol Struktural (Scorecards, Panels, Dialog/Modal): `rounded-[8px]` (`0.5rem`).
*   **Garis Batas (Borders)**: Menggunakan border solid 1px tipis bertipe `#d6d6d6` untuk memisahkan bento-box tanpa bayangan yang pekat.
*   **Efek Bayangan (Shadows)**: Hanya menggunakan ambient shadow tipis `shadow-sm` untuk memberikan kedalaman lapis tanpa mengotori tingkat legibilitas data pada layar resolusi rendah.

---

## 5. Pedoman Khusus Komponen UI/UX

*   **Tabel Transaksi Dual-Panel (Master-Detail)**: Daftar ringkasan klaim diletakkan di sisi kiri (lebar 5-6 kolom), dan panel investigasi mendalam diletakkan di sisi kanan secara persisten. Operator tidak boleh berpindah halaman untuk meninjau satu data ke data lain.
*   **Penanda Anomali Kritis**: Baris tabel yang memiliki `ml_is_anomaly: true` harus diberi latar belakang merah transparan (`bg-red-50/50`) dengan aksen border sisi kiri berwarna merah solid setebal 3px.
*   **Lampiran Bukti PDF**: Tata letak dokumen resmi PDF wajib menyandingkan **Foto Struk Pembelian** berdampingan langsung dengan **Foto Odometer Dasbor** dalam layout 2-kolom seimbang sebagai lampiran visual otentik untuk validasi audit fisik lapangan.
