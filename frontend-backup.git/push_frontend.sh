#!/usr/bin/env bash
set -e

# -------------------------------------------------
# 1️⃣  Masuk ke folder frontend
# -------------------------------------------------
cd "D:/monitoring-bbm-upkal2/fuel-monitoring-bbm-frontend"

# -------------------------------------------------
# 2️⃣  Pastikan paket SWR ter‑install (jika belum)
# -------------------------------------------------
npm install swr   # safe‑idempotent; will skip if already present

# -------------------------------------------------
# 3️⃣  Stage hanya file yang berubah
# -------------------------------------------------
git add middleware.ts src/lib/refresh.ts src/app/layout.tsx .gitignore

# -------------------------------------------------
# 4️⃣  Commit perubahan
# -------------------------------------------------
git commit -m "Add auth middleware, refresh helper, and SWR config for persistent login"

# -------------------------------------------------
# 5️⃣  Push ke remote (force‑push karena riwayat sebelumnya di‑rewrite)
# -------------------------------------------------
git push --force origin main   # ganti branch bila berbeda