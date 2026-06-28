# Face ID Frontend

A lightweight React + TypeScript frontend for the E-KYC face verification backend. Built with Vite, TailwindCSS, React Router, Axios, Zustand, and the native WebSocket API.

## Project structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── camera/       # CameraView, ScanFrame, overlays, enrollment flow
│   │   ├── ui/            # Button, Input, GlassCard, StatusBadge, FaceMark
│   │   └── layout/         # PageShell, TopBar
│   ├── pages/              # One file per route
│   ├── services/           # Axios API calls, job polling, WebSocket logic lives in hooks/
│   ├── hooks/              # useCameraStream, useFrameCapture, useFaceVerificationSocket
│   ├── store/               # Zustand stores: auth, face-flow UI state
│   ├── routes/              # Router config + ProtectedRoute guard
│   ├── types/                # API & WebSocket message types
│   └── utils/                 # env config, token storage, guidance text map
├── Dockerfile
├── docker-entrypoint.sh     # Injects runtime env vars into env-config.js
├── .env.example
└── package.json
```

## Local development (without Docker)

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The dev server runs at `http://localhost:5173` and talks to the backend at `http://localhost:8000` by default — adjust `.env` if your backend runs elsewhere.

## Running with Docker Compose

The frontend is added via `docker-compose.dev.yml`, layered on top of your existing `docker-compose.yml` (which is never modified):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

The app will be available at `http://localhost:5173`.

### Important: `web_backend` is not reachable from the browser

`web_backend` is a Docker-internal hostname. It only resolves *between containers* on the same Docker network — e.g. if `celery_worker` needs to call `web_backend`, that works. It does **not** resolve from your browser, because your browser runs on your host machine (or phone), outside the Docker network entirely.

Since `VITE_API_BASE_URL` and `VITE_WS_BASE_URL` are read by client-side JavaScript running in the browser, they must point to an address your browser can actually reach:

- Same machine as Docker → `http://localhost:8000` / `ws://localhost:8000` (works because `docker-compose.yml` publishes `8000:8000` to the host)
- Testing from a phone or another device on your network → your host machine's LAN IP, e.g. `http://192.168.1.50:8000`

Using `web_backend` here will fail with `ERR_NAME_NOT_RESOLVED` in the browser console.

### How environment variables work in Docker

Vite normally bakes `VITE_*` variables into the JS bundle at **build time**, which means changing them in `docker-compose.dev.yml`'s `environment:` block would do nothing without a rebuild.

To avoid that, this image uses a small runtime-injection trick:

1. `docker-entrypoint.sh` runs when the container starts, reads the actual environment variables passed by Compose, and writes them to `dist/env-config.js`.
2. `index.html` loads `env-config.js` before the app bundle, setting `window.__ENV__`.
3. `src/utils/env.ts` reads `window.__ENV__` first, falling back to the build-time Vite values if absent (e.g. local dev without Docker).

This means you can change `VITE_API_BASE_URL`, `VITE_WS_BASE_URL`, or `VITE_FACE_FRAME_INTERVAL` in `docker-compose.dev.yml` and just restart the container — no rebuild needed.

## Frame interval behavior

`VITE_FACE_FRAME_INTERVAL` controls how often a camera frame is sent over the WebSocket during live face verification:

| Value      | Behavior                                   |
|------------|---------------------------------------------|
| `1`        | One frame every second                      |
| `0.5`      | One frame every 500ms                       |
| `0.25`     | One frame every 250ms                       |
| `ALL_TIME` | Continuous streaming via `requestAnimationFrame` |

## Routes

| Path                     | Page                  | Auth required |
|--------------------------|------------------------|----------------|
| `/`                      | Landing                | No             |
| `/register`              | Account registration   | No             |
| `/register/face`         | Face enrollment (step 2) | No (requires selfie token from step 1) |
| `/login`                 | Login                  | No             |
| `/verify`                | Live face verification (WebSocket) | No (requires temp login token) |
| `/profile`               | Profile                | Yes            |
| `/profile/update-face`   | Re-enroll face image    | Yes            |

## Endpoint paths (confirmed against OpenAPI schema)

These match the project's `E-KYC system (Face ID)` OpenAPI schema exactly:

| Action | Method | Path |
|---|---|---|
| Register account | POST | `/api/users/register/` |
| Upload registration selfie | POST | `/api/users/register/selfie/` |
| Poll registration job | GET | `/api/users/job/{job_id}/` |
| Login | POST | `/api/users/login/` |
| Get profile | GET | `/api/users/me/` |

Note `/api/users/me/` — **users**, not `user` — and `/api/users/register/selfie/` has a trailing slash.

The job-status endpoint (`/api/users/job/{job_id}/`) accepts either `TemporaryTokenAuth` or `jwtAuth` per its security schema. During registration, before any `access_token` exists, the frontend explicitly passes the `selfie_verification_token` as the bearer credential on every poll request — it does not rely on the default `access_token` interceptor, since that token doesn't exist yet at that point in the flow.

## Known assumption — re-enrollment token

The OpenAPI schema doesn't define a separate endpoint that issues a fresh `selfie_verification_token` for the "Update Face Image" flow — only the registration flow produces one. `UpdateFacePage` currently authorizes the selfie upload and job-status poll using the user's existing `access_token` instead. If your backend expects a distinct re-enrollment token from a dedicated endpoint, update `src/pages/UpdateFacePage.tsx` accordingly — the rest of the flow (capture → upload → poll → success) won't need to change.

## Known assumption — WebSocket message shape

The OpenAPI schema only documents REST endpoints; it has no way to describe the WebSocket payload. The live verification screen (`/verify`) currently:

- Sends frames as **binary JPEG blobs** over the socket
- Expects JSON messages back shaped as `{ type: "success" | "error", ... }` per the original product spec
- Treats **any** message that isn't `success` or `error` as a steady-state tracking frame (face detected, nothing wrong) and still extracts `face_location` from it for live box drawing

Face boxes are drawn as **squares** (corner brackets, Face-ID style) around the detected face, continuously updated from whatever the backend sends back — not gated to any specific error code. The parsing logic in `src/utils/parseFaceBoxes.ts` accepts several common shapes (`{face_location: [...]}`, arrays of those, or raw `[x,y,w,h]` arrays) so it should survive minor backend formatting differences without code changes. If your backend uses `[top, right, bottom, left]` ordering (the Python `face_recognition` library convention) instead of `[x, y, width, height]`, flip the `COORDINATE_FORMAT` constant at the top of that file.
