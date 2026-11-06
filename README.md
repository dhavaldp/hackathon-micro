# Carpool prototype

A prototype for Rogers people to offer rides, search for them, and book seats immediately on Android, iOS, and web. Fictional demo data only; see the limitations below. The plan is in [plan.md](plan.md) and [six-module-prototype-plan.md](six-module-prototype-plan.md).

## Layout

- `apps/api`: Next.js API (Prisma + SQLite persistence supplied by Module 2)
- `apps/mobile`: Expo / React Native app for Android, iOS, and web
- `packages/contracts`: shared types, schemas, fixtures
- `docs/foundation.md`: contract decisions; `docs/verification.md`: acceptance matrix; `docs/future-production.md`: production discovery checklist

## Prerequisites

- Node.js 22.13 or newer and npm
- For native testing: Android Studio emulator or iOS Simulator (macOS with Xcode), or Expo Go on a physical device

## Setup

```
npm install
copy apps\api\.env.example apps\api\.env.local
copy apps\mobile\.env.example apps\mobile\.env
```

Database (Module 2 supplies the Prisma schema and seed; the seed must not overwrite user-created data):

```
npm run db:generate
npm run db:migrate
npm run db:seed
```

## Running

| Command | Purpose |
|---|---|
| `npm run dev:api` | API on port 3000, bound to all interfaces |
| `npm run dev:web` | Expo web (default origin `http://localhost:8081`) |
| `npm run dev:mobile` | Expo dev server (scan QR for a device) |
| `npm run dev:android` / `npm run dev:ios` | Launch an emulator / simulator |

Check the API with `GET http://localhost:3000/api/health`.
The app starts with sample data. Choose **Use live API** to use the configured API and its seeded SQLite data; selecting a demo user is not authentication.

For a mock-only demo, run `npm install` and `npm run dev:web` (or `npm run dev:mobile`) and leave **Sample data (local mock)** selected. No API or database is required. Mock data is fictional, held in memory, and resets when the app reloads; it is not a fallback for live API errors.

## Networking

Set `EXPO_PUBLIC_API_BASE_URL` in `apps/mobile/.env`:

- Web and iOS simulator: `http://localhost:3000`
- Android emulator: `http://10.0.2.2:3000`
- Physical device: `http://<development-machine-LAN-IP>:3000` on the same trusted network (allow port 3000 through the firewall)

Browser cross-origin access: set `CORS_ALLOWED_ORIGINS` in `apps/api/.env.local` to the exact comma-separated Expo web origins. Restart the API after changes. Expose only fictional data on trusted networks.

## Verification

```
npm test
npm run lint
npm run typecheck
npm run build
```

Live-API integration checks and the acceptance matrix are in [docs/verification.md](docs/verification.md). Platforms not exercised are disclosed there.

## Scope and exclusions

Offer, search, immediately book, and cancel rides and bookings. Excluded: payments, recurring rides, notifications, administrative tooling, maps and street addresses, and employee sign-in.

## Limitations

- **No real authentication or privacy protection.** The demo-user selector sends `X-Demo-User-Id`; it does not verify anyone. Contact details are fictional and unverified.
- SQLite supports a single local deployment, not distributed or horizontally scaled servers.
- Do not use real employee data. Production use needs the reviews listed in [docs/future-production.md](docs/future-production.md).