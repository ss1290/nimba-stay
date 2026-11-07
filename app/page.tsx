"use client";

import { useEffect, useRef, useState } from "react";
import type { Booking, Room } from "@/lib/db";

type Search = { checkIn: string; checkOut: string; category: string };
type AvailableRoom = Room & { totalPrice: number };
const money = (amount: number) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
}).format(amount);

function today(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function FrontDesk() {
  const [dates, setDates] = useState<Search>({ checkIn: "", checkOut: "", category: "" });
  const [searched, setSearched] = useState<Search | null>(null);
  const [rooms, setRooms] = useState<AvailableRoom[]>([]);
  const [nights, setNights] = useState(0);
  const [selected, setSelected] = useState<AvailableRoom | null>(null);
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    setDates({ checkIn: today(), checkOut: today(1), category: "" });
  }, []);

  function changeSearch(update: Partial<Search>) {
    requestId.current++;
    setDates(previous => ({ ...previous, ...update }));
    setSearched(null);
    setSelected(null);
    setRooms([]);
    setBooking(null);
    setError("");
    setLoading(false);
  }

  async function findRooms(event: React.FormEvent) {
    event.preventDefault();
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    setBooking(null);
    setSelected(null);
    setSearched(null);
    try {
      const response = await fetch(`/api/availability?${new URLSearchParams(dates)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (id !== requestId.current) return;
      setRooms(data.rooms);
      setNights(data.nights);
      setSearched({ ...dates });
    } catch (error) {
      if (id === requestId.current) setError(error instanceof Error ? error.message : "Could not load rooms. Please try again.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  async function bookRoom(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !searched || saving) return;
    setSaving(true);
    setError("");
    setBooking(null);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: selected.id, guestName, phone, checkIn: searched.checkIn, checkOut: searched.checkOut }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          setRooms(previous => previous.filter(room => room.id !== selected.id));
          setSelected(null);
        }
        throw new Error(data.error);
      }
      setBooking(data.booking);
      setRooms(previous => previous.filter(room => room.id !== selected.id));
      setSelected(null);
      setGuestName("");
      setPhone("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save the booking. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      <header>
        <h1>Nimba Stay</h1>
        <p>Front desk / Room booking</p>
      </header>

      <form className="search-form" onSubmit={findRooms}>
        <label>Check-in
          <input type="date" value={dates.checkIn} onChange={event => changeSearch({ checkIn: event.target.value })} disabled={saving} required />
        </label>
        <label>Check-out
          <input type="date" value={dates.checkOut} min={dates.checkIn || undefined} onChange={event => changeSearch({ checkOut: event.target.value })} disabled={saving} required />
        </label>
        <label>Category
          <select value={dates.category} onChange={event => changeSearch({ category: event.target.value })} disabled={saving}>
            <option value="">All categories</option>
            <option>Garden</option><option>Deluxe</option><option>Suite</option>
          </select>
        </label>
        <button disabled={loading || saving}>{loading ? "Checking..." : "Find rooms"}</button>
      </form>

      {error && <p className="message error" role="alert">{error}</p>}
      {booking && <div className="message success" role="status">
        <strong>Room {booking.roomId} booked for {booking.guestName}.</strong>
        <p>{booking.checkIn} to {booking.checkOut} / Total: {money(booking.totalPrice)}</p>
        <small>Booking ID: {booking.id}</small>
      </div>}

      <div className="booking-layout">
        <section aria-labelledby="rooms-heading" aria-busy={loading}>
          <h2 id="rooms-heading">Available rooms{searched ? ` (${rooms.length})` : ""}</h2>
          {!searched ? <p className="empty">Choose dates and search to see available rooms.</p> : <>
            <p className="stay-note">{nights} {nights === 1 ? "night" : "nights"}, {searched.checkIn} to {searched.checkOut}</p>
            {rooms.length === 0 ? <p className="empty">No rooms available. Try different dates or a different category.</p> : <div className="room-list">
              {rooms.map(room => <button key={room.id} type="button" className={`room ${selected?.id === room.id ? "selected" : ""}`} aria-pressed={selected?.id === room.id} disabled={saving} onClick={() => { setSelected(room); setBooking(null); }}>
                <span><strong>Room {room.id} / {room.category}</strong><small>{room.description}</small><small>{money(room.rate)} per night</small></span>
                <span className="room-price"><strong>{money(room.totalPrice)}</strong><small>{selected?.id === room.id ? "Selected" : "Select room"}</small></span>
              </button>)}
            </div>}
          </>}
        </section>

        <section className="guest-section" aria-labelledby="guest-heading">
          <h2 id="guest-heading">Guest details</h2>
          {!selected || !searched ? <p className="empty">Select a room to continue.</p> : <form onSubmit={bookRoom}>
            <p className="stay-note">Room {selected.id} / {selected.category}</p>
            <fieldset disabled={saving}>
              <label>Guest name<input value={guestName} onChange={event => setGuestName(event.target.value)} autoComplete="name" maxLength={100} required /></label>
              <label>Phone number<input type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} placeholder="10-digit phone number" value={phone} onChange={event => setPhone(event.target.value)} autoComplete="tel-national" required /></label>
            </fieldset>
            <div className="total"><span>{money(selected.rate)} x {nights} nights</span><strong>{money(selected.totalPrice)}</strong></div>
            <button className="book-button" disabled={saving}>{saving ? "Booking..." : "Confirm booking"}</button>
          </form>}
        </section>
      </div>
    </main>
  );
}
