# ---- Build stage ----
FROM node:20-alpine AS build

WORKDIR /app

# Install deps first for better layer caching
COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .

# Build-time env vars are baked into the static bundle by Vite as a fallback.
# These are read by the BROWSER at runtime, not by another container, so
# they must be an address your browser can reach — not a Docker-internal
# hostname like web_backend.
ARG VITE_API_BASE_URL=http://localhost:8000
ARG VITE_WS_BASE_URL=ws://localhost:8000
ARG VITE_FACE_FRAME_INTERVAL=1

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_BASE_URL=$VITE_WS_BASE_URL
ENV VITE_FACE_FRAME_INTERVAL=$VITE_FACE_FRAME_INTERVAL

RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine AS runtime

WORKDIR /app

# `serve` is a minimal static file server - keeps the final image small
# and avoids pulling in a full nginx config for an SPA.
RUN npm install -g serve@14

COPY --from=build /app/dist ./dist
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 5173

ENTRYPOINT ["/app/docker-entrypoint.sh"]
