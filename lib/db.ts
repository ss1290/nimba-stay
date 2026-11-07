import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { BookingError, categories, stayDates, validateGuest } from "./booking";

export type Room = {
  id: string;
  category: string;
  rate: number;
  status: string;
  description: string;
};
export type Booking = {
  id: string;
  roomId: string;
  guestName: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  status: string;
  createdAt: string;
};
export function createStore(filename: string) {
  if (filename !== ":memory:")
    mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, category TEXT NOT NULL, rate INTEGER NOT NULL, status TEXT NOT NULL, description TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY, roomId TEXT NOT NULL REFERENCES rooms(id), guestName TEXT NOT NULL, phone TEXT NOT NULL, checkIn TEXT NOT NULL, checkOut TEXT NOT NULL, totalPrice INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'confirmed', createdAt TEXT NOT NULL, CHECK(checkOut > checkIn));
    CREATE INDEX IF NOT EXISTS booking_dates ON bookings(roomId, status, checkIn, checkOut);
    CREATE TRIGGER IF NOT EXISTS prevent_overlap BEFORE INSERT ON bookings WHEN NEW.status != 'cancelled'
    BEGIN
      SELECT RAISE(ABORT, 'room_unavailable') WHERE EXISTS (SELECT 1 FROM rooms WHERE id = NEW.roomId AND status = 'maintenance');
      SELECT RAISE(ABORT, 'booking_clash') WHERE EXISTS (SELECT 1 FROM bookings WHERE roomId = NEW.roomId AND status != 'cancelled' AND checkIn < NEW.checkOut AND checkOut > NEW.checkIn);
    END;
    CREATE TRIGGER IF NOT EXISTS prevent_update_overlap BEFORE UPDATE ON bookings WHEN NEW.status != 'cancelled'
    BEGIN
      SELECT RAISE(ABORT, 'room_unavailable') WHERE EXISTS (SELECT 1 FROM rooms WHERE id = NEW.roomId AND status = 'maintenance');
      SELECT RAISE(ABORT, 'booking_clash') WHERE EXISTS (SELECT 1 FROM bookings WHERE id != NEW.id AND roomId = NEW.roomId AND status != 'cancelled' AND checkIn < NEW.checkOut AND checkOut > NEW.checkIn);
    END;`);
  const seed = db.prepare("INSERT OR IGNORE INTO rooms VALUES (?, ?, ?, ?, ?)");
  const rooms = [
    [
      "101",
      "Garden",
      3200,
      "available",
      "Ground floor / Garden facing / Twin beds",
    ],
    [
      "102",
      "Garden",
      3200,
      "available",
      "Ground floor / Courtyard facing / Queen bed",
    ],
    [
      "103",
      "Garden",
      3200,
      "maintenance",
      "Ground floor / Garden facing / Twin beds",
    ],
    [
      "201",
      "Deluxe",
      4800,
      "available",
      "First floor / Private balcony / King bed",
    ],
    [
      "202",
      "Deluxe",
      4800,
      "available",
      "First floor / Garden facing / Twin beds",
    ],
    [
      "301",
      "Suite",
      7200,
      "available",
      "Second floor / Living area / King bed",
    ],
  ];
  for (const room of rooms) seed.run(...room);
  return {
    db,
    availability(
      checkIn: unknown,
      checkOut: unknown,
      category?: string | null,
    ) {
      const stay = stayDates(checkIn, checkOut);
      if (
        category &&
        !categories.includes(category as (typeof categories)[number])
      )
        throw new BookingError("Choose Garden, Deluxe, or Suite.");
      const result = db
        .prepare(
          `SELECT r.* FROM rooms r WHERE r.status != 'maintenance' AND (? IS NULL OR category = ?) AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.roomId = r.id AND b.status != 'cancelled' AND b.checkIn < ? AND b.checkOut > ?) ORDER BY r.rate, r.id`,
        )
        .all(
          category || null,
          category || null,
          stay.checkOut,
          stay.checkIn,
        ) as Room[];
      return {
        ...stay,
        rooms: result.map((room) => ({
          ...room,
          totalPrice: room.rate * stay.nights,
        })),
      };
    },
    book(input: Record<string, unknown>) {
      const stay = stayDates(input.checkIn, input.checkOut);
      const guest = validateGuest(input.guestName, input.phone);
      if (typeof input.roomId !== "string")
        throw new BookingError("Choose a room before booking.");
      db.exec("BEGIN IMMEDIATE");
      try {
        const room = db
          .prepare("SELECT * FROM rooms WHERE id = ?")
          .get(input.roomId) as Room | undefined;
        if (!room) throw new BookingError("This room does not exist.", 404);
        if (room.status === "maintenance")
          throw new BookingError("This room is under maintenance.", 409);
        const clash = db
          .prepare(
            "SELECT id FROM bookings WHERE roomId = ? AND status != 'cancelled' AND checkIn < ? AND checkOut > ?",
          )
          .get(room.id, stay.checkOut, stay.checkIn);
        if (clash)
          throw new BookingError(
            "That room was just booked for these dates. Please choose another room.",
            409,
          );
        const booking: Booking = {
          id: randomUUID(),
          roomId: room.id,
          ...guest,
          checkIn: stay.checkIn,
          checkOut: stay.checkOut,
          totalPrice: room.rate * stay.nights,
          status: "confirmed",
          createdAt: new Date().toISOString(),
        };
        db.prepare(
          "INSERT INTO bookings VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ).run(
          booking.id,
          booking.roomId,
          booking.guestName,
          booking.phone,
          booking.checkIn,
          booking.checkOut,
          booking.totalPrice,
          booking.status,
          booking.createdAt,
        );
        db.exec("COMMIT");
        return booking;
      } catch (error) {
        db.exec("ROLLBACK");
        if (
          error instanceof Error &&
          /booking_clash|room_unavailable/.test(error.message)
        )
          throw new BookingError(
            "This room is no longer available for those dates.",
            409,
          );
        throw error;
      }
    },

  };
}
let store: ReturnType<typeof createStore> | undefined;
export function getStore() {
  return (store ??= createStore(
    resolve(process.env.DATABASE_PATH || "data/nimba.sqlite"),
  ));
}
