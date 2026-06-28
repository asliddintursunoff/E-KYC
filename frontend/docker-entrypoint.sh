#!/bin/sh
set -e

# Vite bakes VITE_* variables into the bundle at build time, but Docker
# Compose injects `environment:` at container start time. To let the same
# image be reused across environments (dev/staging) without a rebuild, we
# write a small runtime config file that index.html loads before the app
# bundle. window.__ENV__ takes priority over the build-time fallback in
# src/utils/env.ts.

cat > /app/dist/env-config.js <<EOF
window.__ENV__ = {
  VITE_API_BASE_URL: "${VITE_API_BASE_URL:-http://localhost:8000}",
  VITE_WS_BASE_URL: "${VITE_WS_BASE_URL:-ws://localhost:8000}",
  VITE_FACE_FRAME_INTERVAL: "${VITE_FACE_FRAME_INTERVAL:-1}"
};
EOF

exec serve -s dist -l 5173
