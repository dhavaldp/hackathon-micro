# Carpool application prototype plan

## Goal and approach

Build a carpool prototype for Rogers people that demonstrates offering rides, finding them, and automatically booking available seats on Android, iOS, and web. The repository currently contains only a README, so this is a new application rather than an extension of an existing codebase.

Use Expo and React Native with TypeScript for a shared mobile and web frontend, and a separate Next.js API backend with Prisma and a local SQLite database. Seed fictional users and rides, and provide a demo-user selector without sign-in. Persist changes on the local API server so connected mobile and web clients share the same data. The selector is for demonstration only and does not authenticate or authorize real people. SQLite is intended for a single local deployment, not a distributed or horizontally scaled deployment.

## Confirmed scope and behavior

- People can offer rides, search for rides, and book available seats immediately without driver approval.
- Use fictional sample users and demo data; do not restrict access or implement employee sign-in in this prototype.
- Provide one shared Expo frontend for Android, iOS, and web, with a Next.js API backend. Mobile clients access the same locally hosted API as the web client.
- Persist shared demo data in local SQLite using Prisma.
- Use city or neighborhood names for origins and destinations; no map or exact street address is required.
- Riders can cancel bookings and drivers can cancel rides. A rider cancellation restores capacity; cancelling a ride makes it unavailable for new bookings and marks affected bookings cancelled.
- Exclude payments, recurring rides, notifications, and administrative tooling from this prototype. Do not treat demo identities or displayed contact details as verified.

## Activities and todos

1. **Define prototype details and acceptance criteria.** Record the core user journeys, required ride fields, input constraints, empty/error states, platform-specific accessibility and responsive expectations, and explicit non-production limitations. Decide how demo users and booking confirmations are displayed.
2. **Initialize the application.** Scaffold an Expo TypeScript app for Android, iOS, and web alongside a Next.js TypeScript API, establish a minimal shared repository structure and scripts, configure Prisma and SQLite, and define the API base URL configuration for each platform. Document prerequisites without committing secrets or generated local database files.
3. **Design and seed the data model.** Model sample users, rides, seat capacity, departure time, and booking status and relations. Define uniqueness and integrity constraints so a demo user cannot hold multiple active bookings for a ride. Create a reproducible migration and a seed routine with fictional sample data.
4. **Implement the API and ride discovery.** Define typed request/response contracts and server-side validation. Let the selected demo driver create a ride with origin, destination, future departure time, and seat capacity. Expose upcoming active rides and search/filter by location and date, including remaining seats and explicit API errors.
5. **Implement booking and cancellation.** Add API-backed immediate booking for an eligible selected demo user and a view of their rides and bookings. Enforce available capacity, prevent the driver from booking their own ride and duplicate active bookings, handle full, cancelled, or departed rides, and make booking/cancellation updates atomic. Support rider booking cancellation and driver ride cancellation, including consistent affected bookings and capacity.
6. **Build the cross-platform experience.** Implement shared Expo screens for the demo-user switcher, ride creation and search, bookings, and cancellations. Provide platform-appropriate navigation, responsive layouts, readable feedback, keyboard access on web, and accessible labels and status/error messages on all platforms. Make clear that user switching provides no real identity protection.
7. **Verify the complete workflow.** Test creation, search, automatic booking, full-capacity and concurrent booking attempts, duplicate attempts, cancellation and rebooking, cancelled/departed rides, validation, demo-user switching, persistence across reloads, and relevant accessibility and responsive behavior. Exercise the same journeys on web, Android, and iOS using available simulators or devices, including connectivity to the shared API; report any platform that cannot be exercised. Run targeted tests, lint, type-check, and applicable builds.
8. **Document and hand off.** Add this plan as `plan.md` at the repository root after approval. Update the README with prerequisites, local API and Expo startup, migration and seed instructions, web and mobile run commands, simulator/device API connectivity, verification commands, prototype scope, SQLite deployment limitations, and the absence of real authentication and privacy protections. Record a separate future-production checklist rather than implementing it.

## Dependencies and considerations

- Application setup precedes schema and feature implementation; ride creation and the data model precede booking; end-to-end verification and handoff follow implementation.
- A phone or emulator cannot necessarily reach the API at the development machine's `localhost`. Document and configure a reachable development address, browser cross-origin access where required, and platform-specific local networking requirements; expose only fictional data on trusted networks.
- iOS and Android validation depends on available Apple/Android development tooling or suitable physical devices. App-store publishing and production deployment are outside the prototype scope.
- Seed and migration steps should be repeatable and avoid unexpectedly overwriting user-created demo data. Store departure timestamps consistently and display the time zone clearly.
- Capacity must remain correct under simultaneous requests; enforce the rule at the database transaction boundary rather than trusting client-side state.
- Do not use real employee details in seed data. No production deployment or real user data should be used without appropriate Rogers approvals, identity controls, security and privacy review, retention rules, abuse handling, and an operational deployment design.
- Future production discovery should assess company SSO and employee eligibility, privacy and precise-location sharing, safety and support policies, a production database and hosting, monitoring, accessibility, and whether notifications, recurring rides, payments, or admin tools are warranted. These are not commitments in the prototype.
