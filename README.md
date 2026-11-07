# Nimba Stay

A front-desk screen to check room availability and book a guest.

## Run locally

Requires Node.js 24 LTS and npm.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. The SQLite database is created at `data/nimba.sqlite` on the first API request. Six sample rooms are seeded across Garden, Deluxe, and Suite categories; room 103 is under maintenance. Rates are in INR per room per night.

For a production build, run `npm run build` followed by `npm start`. Run `npm run typecheck` to check TypeScript.

## What works

Choose check-in, check-out, and an optional category to see rooms free for the full stay. Select a room, enter a guest name and 10-digit phone number, and confirm. The screen shows the total price, booking confirmation, and errors.

Booking checks and inserts run inside a SQLite write transaction to prevent double booking. A check-out date does not block a new arrival that day. Cancelled records are ignored when checking availability, and maintenance rooms are excluded. Prices are calculated on the server.

## API

- `GET /api/availability?checkIn=2026-11-20&checkOut=2026-11-23&category=Garden` - available rooms with stay totals. Omit category to search all rooms.
- `POST /api/bookings` - create a booking using the JSON below.

```json
{
  "roomId": "101",
  "guestName": "Asha Shah",
  "phone": "9876543210",
  "checkIn": "2026-11-20",
  "checkOut": "2026-11-23"
}
```

Returns 201 on success, 400 for invalid input, 409 for an unavailable room, or 404 for an unknown room.

## Scope

No authentication, payments, booking history, or cancellation screen. Cancelled records are supported by the availability query, but there is no cancellation endpoint. Past dates are allowed. SQLite needs a persistent local disk. No automated tests are included.

One small addition is clearing the selected room when search dates or category change, so a booking cannot accidentally use an earlier search.

## Tools used

Next.js for the page and API routes, React for form state, TypeScript for type checking, and Node's built-in SQLite module for persistence. Plain CSS handles the layout. OpenAI Codex assisted with implementation and verification.
