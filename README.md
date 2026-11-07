# Nimba Stay

A room availability and booking screen for the front desk at Nimba Nature Cure.

## Run locally

Requires Node.js 24 LTS and npm. SQLite is built into Node, so no separate database service is needed.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. For a production build, run `npm run build` followed by `npm start`. `npm run typecheck` checks TypeScript.

The first API request creates `data/nimba.sqlite`. Set `DATABASE_PATH` to use another file. Inventory contains 60 sample rooms: 20 Garden (INR 3,200/night), 20 Deluxe (INR 4,800/night), and 20 Suites (INR 7,200/night). Rooms 103, 208, and 315 are under maintenance. Seeding preserves existing room statuses and reservations. No guest reservations are seeded.

## What works

- Pick dates and a category, browse available rooms six at a time, and see the total price for the stay.
- Select a room, enter a guest name and 10-digit phone number, and confirm the booking.
- See the latest 50 reservations, search by guest/phone/room, and cancel with confirmation.
- View validation errors, booking conflicts, and success messages on the screen.

## Booking rules

Check-out must be after check-in. Phone numbers must contain exactly 10 digits. Invalid input returns 400; an overlapping booking returns 409. Unknown rooms return 404 and maintenance rooms return 409.

Stays include the check-in date and exclude the check-out date. A guest leaving on 20 Nov does not block an arrival on 20 Nov. Cancelled reservations block nothing. Maintenance rooms are never returned as available.

The server calculates totals from stored nightly rates. SQLite `BEGIN IMMEDIATE` makes the conflict check and insert a single transaction, including when requests arrive together. Database triggers also protect against overlapping inserts and updates.

## API

- `GET /api/availability?checkIn=2026-11-20&checkOut=2026-11-23&category=Garden` - rooms free for the entire stay, stay totals, and inventory counts. Category is optional.
- `POST /api/bookings` - create a reservation; returns 201.
- `GET /api/bookings` - latest 50 reservations.
- `DELETE /api/bookings/:id` - cancel without deleting the reservation record.

Example booking:

```json
{
  "roomId": "101",
  "guestName": "Asha Shah",
  "phone": "9876543210",
  "checkIn": "2026-11-20",
  "checkOut": "2026-11-23"
}
```

## Additions to the brief

Reservation history and cancellation help staff correct mistakes and show that cancelled stays release rooms. Pagination keeps a larger room inventory manageable. A price breakdown is shown before confirmation. Changing search dates or category clears the selected room to prevent booking from stale results.

## Limitations

Sample inventory and prices. No authentication, payments, taxes, room administration, or guest notifications. Past dates are allowed. Guest details are intended for local staff use. SQLite requires a persistent disk; ephemeral serverless hosting would need different storage. Automated test files are not included.

## Tools used

Next.js handles the page and API, React manages form state, TypeScript checks types, and Node's built-in SQLite module stores bookings. Plain CSS provides the responsive layout. OpenAI Codex assisted with implementation and verification.
