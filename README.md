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

## Local persistent demo

The demo API uses a dedicated local SQLite database. It starts with three fictional identities and no rides; create rides and bookings in the app. It is not production-ready and must not contain real personal data.

```powershell
npm install
copy apps\mobile\.env.example apps\mobile\.env
npm run demo:setup
```

In separate terminals, start the demo API and web app:

```powershell
npm run demo:api
npm run dev:web
```

The example mobile configuration connects to the API at `http://localhost:3000`. Data is stored in the ignored `apps/api/prisma/demo.db` and survives app and API restarts. With API servers stopped, `demo:setup` applies migrations and adds missing fictional users without overwriting existing rides or users. To reset this database to just the fictional users, **stop the demo API first** and run `npm run demo:reset -- --confirm`. This permanently deletes all data in that demo database; it never uses the `DATABASE_URL` from your environment.

The demo commands deliberately select that database and reject `NODE_ENV=production`. The demo API listens only on `127.0.0.1` by default; `DEMO_API_PORT` overrides port 3000, and `DEMO_API_HOST=0.0.0.0` explicitly exposes it to your trusted network. Match the mobile API URL and permitted web origins to your setup. The separate `dev:api`, `db:generate`, `db:migrate`, and `db:seed` commands use your normal API environment instead; for those, copy `apps\api\.env.example` to `apps\api\.env.local` and configure the database explicitly.

## Running

| Command | Purpose |
|---|---|
| `npm run dev:api` | API on port 3000, bound to all interfaces |
| `npm run dev:web` | Expo web (default origin `http://localhost:8081`) |
| `npm run dev:mobile` | Expo dev server (scan QR for a device) |
| `npm run dev:android` / `npm run dev:ios` | Launch an emulator / simulator |

Check the API with `GET http://localhost:3000/api/health`. The app uses the configured API and reports connection errors instead of falling back to sample data; selecting a fictional user is not authentication. Mock fixtures remain available for automated tests only.

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
- The demo has no real authorization, abuse protection, managed backups, operational monitoring, or production deployment configuration. Do not expose it publicly or treat it as production-ready.
- Do not use real employee data. Production use needs the reviews listed in [docs/future-production.md](docs/future-production.md).