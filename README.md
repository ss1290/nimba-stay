# Nimba Stay

Room availability and guest booking for the front desk at Nimba Nature Cure.

## Setup

Requires Node.js 24 LTS and npm. SQLite uses Node's built-in `node:sqlite` module, so there is no separate database to install.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000.

The app creates `data/nimba.sqlite` on the first API request and seeds six rooms across Garden, Deluxe, and Suite categories. Room 103 is under maintenance. Room descriptions and rates are sample data; prices are in INR per night.

For a production build:

```sh
npm run build
npm start
```

Run `npm run typecheck` to check TypeScript. Set `DATABASE_PATH` to use a different SQLite file.

## Features

- Search by check-in, check-out, and room category.
- See rooms available for the whole stay, with the total price.
- Book with a guest name and a 10-digit phone number.
- View recent reservations and cancel a booking.
- Show validation errors and booking conflicts on the screen.

## Booking rules

Check-out must be after check-in. A guest leaving on a date does not block another guest arriving that day. Cancelled bookings do not block rooms, and maintenance rooms cannot be booked.

The server calculates prices from the stored room rate. A SQLite transaction keeps the availability check and booking insert together. Database triggers also reject overlapping inserts and updates, so two requests cannot reserve the same room for the same night.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/availability?checkIn=2026-11-20&checkOut=2026-11-23&category=Garden` | Available rooms and stay totals; category is optional |
| POST | `/api/bookings` | Create a booking |
| GET | `/api/bookings` | Latest 50 reservations |
| DELETE | `/api/bookings/:id` | Cancel a reservation |

Example booking body:

```json
{
  "roomId": "101",
  "guestName": "Asha Shah",
  "phone": "9876543210",
  "checkIn": "2026-11-20",
  "checkOut": "2026-11-23"
}
```

Booking creation returns 201. Invalid input returns 400, an unavailable room returns 409, and an unknown room returns 404.

## Small additions

Recent reservations and cancellation let staff correct a booking without deleting its record. The price breakdown helps staff confirm the total before saving. Changing the search clears the selected room to avoid booking from stale results.

## Stack and limitations

Next.js handles the screen and API routes, TypeScript checks types, and SQLite stores rooms and reservations on disk. React manages the booking flow, with plain CSS for the responsive layout.

This is a single-property local app. Authentication, payments, taxes, and guest notifications are not implemented. Past dates are allowed. The SQLite file needs persistent storage; an ephemeral serverless deployment would need a different storage setup.
