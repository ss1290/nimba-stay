# Nimba Stay

A small front-desk booking tool for Nimba Nature Cure. Next.js, TypeScript, and SQLite.

## Run locally

Requires Node.js 24 LTS (uses the built-in `node:sqlite` module).

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. SQLite is created at `data/nimba.sqlite` on the first API request. Set `DATABASE_PATH` to change its location. The database is ignored by Git. Six rooms are seeded; room 103 is under maintenance. No guest bookings are seeded.

```sh
npm test
npm run typecheck
npm run build
npm start
```

## Booking rules

Stays use calendar dates and a half-open interval: check-in is included, check-out is excluded. A departure and arrival on the same day do not clash. Cancelled bookings are ignored and maintenance rooms cannot be booked. Rates are INR per room per night; the server calculates totals from the stored room rate.

Booking writes use SQLite `BEGIN IMMEDIATE`, so a competing writer waits before checking availability. Database triggers also enforce overlaps on inserts and updates. This keeps the check and insert atomic across connections, rather than trusting the browser's last availability result.

## API

- `GET /api/availability?checkIn=2026-11-20&checkOut=2026-11-23&category=Garden`: free rooms and total prices; omit category for all rooms.
- `POST /api/bookings`: JSON `{ "roomId": "101", "guestName": "Asha Shah", "phone": "9876543210", "checkIn": "2026-11-20", "checkOut": "2026-11-23" }`. Returns 201; invalid input returns 400; clash/maintenance returns 409; unknown room returns 404.
- `GET /api/bookings`: latest 50 bookings.
- `DELETE /api/bookings/:id`: cancel a booking, retaining its record.

## Added to the brief

Recent bookings and cancellation make mistakes recoverable at the desk and demonstrate that cancelled stays release rooms. The booking panel shows a price breakdown before confirmation. Changed dates clear the chosen room so staff cannot accidentally book stale search results.

## Scope and tradeoffs

This is a local assessment app. There is no staff authentication, payment collection, tax calculation, guest messaging, or multi-property support. Do not expose guest details publicly. Use a persistent local disk for SQLite; this setup is not suitable for ephemeral or edge hosting. A production version would need staff access controls and backups. Prices and room descriptions are sample data. Past dates are allowed to keep assessment scenarios reproducible.

## Tools

Built with assistance from OpenAI Codex for implementation, review, and test execution. Next.js serves the screen and API; TypeScript checks data contracts; Node's SQLite module provides transactions without a separate database service; the Node test runner verifies booking rules. No generated photography or UI component template is used.
