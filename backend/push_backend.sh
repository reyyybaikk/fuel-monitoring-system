#!/usr/bin/env bash
# -------------------------------------------------
# push_backend.sh – Deploy backend (Render) with auth‑token handling
# -------------------------------------------------
set -e   # abort on any error

# -----------------------------------------------------------------
# 0️⃣  Pastikan identitas Git tersedia (diperlukan untuk commit)
# -----------------------------------------------------------------
if ! git config --global user.name >/dev/null || ! git config --global user.email >/dev/null; then
  echo "⚙️  Menetapkan identitas Git default..."
  git config --global user.name "AutoDeploy Bot"
  git config --global user.email "autodeploy@example.com"
fi

# -----------------------------------------------------------------
# 1️⃣  Go to the backend repository root
# -----------------------------------------------------------------
cd "$(dirname "${BASH_SOURCE[0]}")"

# -----------------------------------------------------------------
# 2️⃣  Install / update npm dependencies (uses package‑lock)
# -----------------------------------------------------------------
npm ci   # deterministic, fast install based on lockfile

# -----------------------------------------------------------------
# 3️⃣  OPTIONAL: run the server locally to verify it starts
# -----------------------------------------------------------------
# If your backend is plain JavaScript you can just use `node src/app.js`
# If you have a `start` script defined in package.json, use it:
if npm run start --if-present; then
  echo "✅  Local start succeeded"
else
  echo "⚠️  No start script or start failed – continue anyway (Render will use Procfile)."
fi

# -----------------------------------------------------------------
# 4️⃣  Stage ONLY backend‑specific files (ignore submodule changes)
# -----------------------------------------------------------------
git add Procfile render.yaml package.json package-lock.json .env.example

# -----------------------------------------------------------------
# 5️⃣  Commit the staged changes ONLY IF there are changes
# -----------------------------------------------------------------
if git diff --cached --quiet; then
  echo "📌  Tidak ada perubahan yang perlu di‑commit."
else
  git commit -m "Add Render config (Procfile, render.yaml) dan .env.example"
fi

# -----------------------------------------------------------------
# 6️⃣  Push to remote (force‑push only if you have rewritten history)
# -----------------------------------------------------------------
# Replace `main` by your actual branch name if different.
git push --force origin main

# -----------------------------------------------------------------
# 7️⃣  (Optional) Trigger a Render redeploy via API
# -----------------------------------------------------------------
# Uncomment and fill the values if you want the script to notify Render
# RENDER_SERVICE_ID="YOUR_RENDER_SERVICE_ID"
# RENDER_API_KEY="YOUR_RENDER_API_KEY"
# curl -X POST "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys" \
#      -H "Authorization: Bearer ${RENDER_API_KEY}" \
#      -H "Content-Type: application/json" \
#      -d '{}'
# echo "🚀  Render redeploy triggered"

echo "✅  Backend changes pushed successfully. Render will pick up the new commit automatically."