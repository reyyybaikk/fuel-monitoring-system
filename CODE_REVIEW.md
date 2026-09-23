# Laporan Tinjauan Sistem Fuel Monitoring

## 1. Tinjauan Arsitektur Umum
Sistem ini menggunakan arsitektur **Microservices/Service-Oriented** yang terbagi menjadi tiga komponen utama:
- **Backend**: Node.js + Express
- **Frontend**: Next.js 13+ (App Router) + React
- **ML Engine**: Python (Memproses anomali menggunakan OCR dan Rules Engine)

**Penilaian Arsitektur:** 
**Sangat Baik (8.5/10)**. Pemisahan *concern* sudah sangat tepat. Memisahkan *machine learning / rule engine* dalam service Python tersendiri memungkinkan backend Node.js tetap ringan (fokus pada I/O dan API), sementara Python menangani komputasi berat (Tesseract OCR, algoritma deteksi anomali).

---

## 2. Tinjauan Spesifik Komponen

### A. Backend (Node.js & Express)
*Struktur*: Menggunakan pola arsitektur Layered (Controller -> Service -> Repository -> Model).
*Teknologi Utama*: Express 5, Sequelize (PostgreSQL), Supabase, Firebase-admin, BullMQ (Redis), Multer.

**Kelebihan:**
- Lapisan abstraksi data (`repositories`) dan logika bisnis (`services`) sudah sangat baik, membuat unit testing dan modifikasi menjadi lebih mudah.
- Penggunaan *message broker* (BullMQ) untuk me- *offload* *fuel analysis* ke worker (background process).

**Catatan & Area Pembenahan:**
- **Konsistensi Database**: Terdapat penggunaan `Sequelize` (ORM standar) namun juga terdapat dependensi `@supabase/supabase-js`. Hal ini bisa menimbulkan kerancuan jika manajemen transaksi (ACID) terjadi di dua *client* berbeda. Disarankan memusatkan semua operasi DB melalui ORM (Sequelize) atau Supabase Client seutuhnya, kecuali Supabase hanya digunakan untuk Storage (Object Storage).

### B. Frontend (Next.js 16)
*Struktur*: Next.js App Router (`app/`), dengan komponen modular (`components/`, `lib/`, `services/`, `store/`).
*Teknologi Utama*: React 19, Tailwind CSS v4, React Query, Zustand, Leaflet.

**Kelebihan:**
- Sudah mengadopsi standar ekosistem React yang paling modern (React 19, Next.js App Router, Tailwind 4).
- Pemisahan state management (`Zustand`) dan data fetching (`React Query` tersirat dari package.json, meski fetching manual menggunakan `axios`).
- UI yang kaya (menggunakan *Radix/Shadcn UI* dan *Leaflet* untuk pemetaan telemetri GPS real-time).

**Catatan & Area Pembenahan:**
- **Clean Architecture di Frontend**: Folder `features` dan `utils` terlihat kosong atau kurang dimanfaatkan. Pertimbangkan untuk memindahkan *business logic* spesifik (misal: logic *transaction review*) ke dalam folder `features/transactions` alih-alih meletakkannya langsung di dalam hirarki App Router.

### C. ML Engine (Python)
*Struktur*: Python konvensional (`app/config`, `app/preprocessing`, `app/services`, `app/workers`).
*Teknologi Utama*: PyTesseract (OCR), Redis, Psycopg2.

**Kelebihan:**
- Pendekatan implementasi *Rule-Engine* yang terstruktur (Kapasitas tangki, Odometer, OCR nota, Deteksi duplikat) berjalan baik.

**Catatan & Area Pembenahan:**
- **Clutter / Berantakan di Root Level**: Terlalu banyak file *testing* (`test_db.py`, `test_features.py`, dll.) dan script *sync* berserakan di *root* folder.
- **Dead Code / Duplikasi Logika**: Pada file `app/services/rule_engine.py`, fungsi `evaluate_transaction_rules` memiliki blok *return* ganda yang identik di bagian paling bawah fungsinya. Blok kedua menjadi *dead code* (tidak akan pernah dieksekusi).

---

## 3. Langkah Pembenahan (Action Plan)

### Fase 1: Perbaikan Struktur dan *Clean Up* (Segera)
1. **ML Engine Refactoring**: 
   - Buat folder `tests/` di `ml-engine` dan pindahkan semua file `test_*.py`.
   - Buat folder `scripts/` dan pindahkan `sync_*.py` serta `check_*.py`.
   - Hapus kode duplikat (dead code) pada baris paling akhir di fungsi `evaluate_transaction_rules` (`ml-engine/app/services/rule_engine.py`).
2. **Frontend Cleanup**:
   - Jika folder `features` dan `utils` tidak digunakan, pertimbangkan untuk dihapus atau mulai migrasikan komponen fungsional yang padat ke dalam struktur *Feature-Sliced Design* (FSD).

### Fase 2: Peningkatan Stabilitas Backend & Keamanan
1. **Standarisasi Koneksi DB**: Pastikan bahwa dependensi `pg` dan `Sequelize` tidak bertabrakan dengan instance `Supabase` (jika Supabase juga dihubungkan ke database Postgres yang sama). Jika Supabase hanya untuk otentikasi dan storage, tegaskan di konfigurasi (`config/supabaseAdmin.js`).
2. **Penanganan Error Terpusat**: Pastikan `errorHandler.js` membungkus semua `try-catch` dari controllers. Anda bisa memanfaatkan library seperti `express-async-errors` agar tidak perlu menulis `try-catch` dan `next(error)` secara manual di setiap fungsi controller.

### Fase 3: Peningkatan Skalabilitas ML Engine
1. **Containerization & Deployment**: Meskipun sudah ada `Dockerfile`, pastikan dependensi sistem operasi (seperti instalasi paket `tesseract-ocr`) sudah terdefinisi dengan benar di dalam Dockerfile, mengingat PyTesseract butuh binary Tesseract pada level OS.
2. **ML API Framework**: Jika saat ini *ML Engine* hanya dijalankan melalui worker/background script (berbasis Redis queue), pertimbangkan menambahkan Lightweight API Server (seperti `FastAPI`) ke dalam *ML Engine* jika kedepannya Frontend butuh API langsung (misal: *live scan* kamera pengguna ke ML Engine).
