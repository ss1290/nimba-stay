"use client";

import { useEffect, useRef, useState } from "react";
import type { Booking, Room } from "@/lib/db";

type Search = { checkIn: string; checkOut: string; category: string };
type AvailableRoom = Room & { totalPrice: number };
type Inventory = { totalRooms: number; maintenanceRooms: number };
const pageSize = 6;
const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
const shortDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function today(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function FrontDesk() {
  const [dates, setDates] = useState<Search>({
    checkIn: "",
    checkOut: "",
    category: "",
  });
  const [searched, setSearched] = useState<Search | null>(null);
  const [rooms, setRooms] = useState<AvailableRoom[]>([]);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [nights, setNights] = useState(0);
  const [selected, setSelected] = useState<AvailableRoom | null>(null);
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const [guestFilter, setGuestFilter] = useState("");
  const requestId = useRef(0);
  const historyRequestId = useRef(0);
  const guestInput = useRef<HTMLInputElement>(null);
  const busy = saving || cancelling !== null;
  const pageCount = Math.max(1, Math.ceil(rooms.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRooms = rooms.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const visibleBookings = bookings.filter((item) =>
    `${item.guestName} ${item.phone} ${item.roomId}`
      .toLowerCase()
      .includes(guestFilter.toLowerCase()),
  );

  useEffect(() => {
    const initial = { checkIn: today(), checkOut: today(1), category: "" };
    setDates(initial);
    void loadRooms(initial);
    void loadBookings();
  }, []);

  async function loadBookings() {
    const id = ++historyRequestId.current;
    setHistoryLoading(true);
    try {
      const response = await fetch("/api/bookings", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (id !== historyRequestId.current) return;
      setBookings(data.bookings);
      setHistoryError("");
    } catch {
      if (id === historyRequestId.current)
        setHistoryError(
          "Could not load reservations. Please refresh this section.",
        );
    } finally {
      if (id === historyRequestId.current) setHistoryLoading(false);
    }
  }

  async function loadRooms(query: Search) {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    setSelected(null);
    setSearched(null);
    try {
      const response = await fetch(
        `/api/availability?${new URLSearchParams(query)}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (id !== requestId.current) return;
      setRooms(data.rooms);
      setInventory(data.inventory);
      setNights(data.nights);
      setPage(1);
      setSearched({ ...query });
    } catch (error) {
      if (id === requestId.current)
        setError(
          error instanceof Error
            ? error.message
            : "Could not load rooms. Please try again.",
        );
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  function changeSearch(update: Partial<Search>) {
    requestId.current++;
    setDates((previous) => ({ ...previous, ...update }));
    setSearched(null);
    setSelected(null);
    setRooms([]);
    setBooking(null);
    setNotice("");
    setError("");
    setPage(1);
    setLoading(false);
  }

  async function bookRoom(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !searched || busy) return;
    setSaving(true);
    setError("");
    setBooking(null);
    setNotice("");
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selected.id,
          guestName,
          phone,
          checkIn: searched.checkIn,
          checkOut: searched.checkOut,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          setRooms((previous) =>
            previous.filter((room) => room.id !== selected.id),
          );
          setSelected(null);
        }
        throw new Error(data.error);
      }
      setBooking(data.booking);
      setRooms((previous) =>
        previous.filter((room) => room.id !== selected.id),
      );
      setSelected(null);
      setGuestName("");
      setPhone("");
      await loadBookings();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not save the booking. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancelBooking(item: Booking) {
    if (busy) return;
    setCancelling(item.id);
    setError("");
    setBooking(null);
    setNotice("");
    try {
      const response = await fetch(`/api/bookings/${item.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCancelTarget(null);
      setNotice(
        `Reservation for ${item.guestName}, room ${item.roomId}, has been cancelled.`,
      );
      await loadBookings();
      if (searched) await loadRooms(searched);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not cancel the reservation.",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setCancelling(null);
    }
  }

  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark">N</span>
          <span>
            Nimba Stay<small>NATURE CURE</small>
          </span>
        </a>
        <a className="history-link" href="#reservations">
          Reservations
        </a>
        <span className="desk-label">
          <i /> Front desk
        </span>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <p className="eyebrow">RECEPTION WORKSPACE</p>
            <h1>Rooms & reservations</h1>
            <p className="intro">
              Check availability, choose a room, and book your guest.
            </p>
          </div>
          <span className="property-label">
            Nimba Nature Cure<small>Room rates in INR</small>
          </span>
        </div>

        <form
          className="search-form"
          onSubmit={(event) => {
            event.preventDefault();
            setBooking(null);
            setNotice("");
            void loadRooms(dates);
          }}
        >
          <label>
            Check-in
            <input
              type="date"
              value={dates.checkIn}
              onChange={(event) =>
                changeSearch({ checkIn: event.target.value })
              }
              disabled={busy}
              required
            />
          </label>
          <label>
            Check-out
            <input
              type="date"
              value={dates.checkOut}
              min={dates.checkIn || undefined}
              onChange={(event) =>
                changeSearch({ checkOut: event.target.value })
              }
              disabled={busy}
              required
            />
          </label>
          <label>
            Room category
            <select
              value={dates.category}
              onChange={(event) =>
                changeSearch({ category: event.target.value })
              }
              disabled={busy}
            >
              <option value="">All categories</option>
              <option>Garden</option>
              <option>Deluxe</option>
              <option>Suite</option>
            </select>
          </label>
          <button disabled={loading || busy}>
            {loading ? "Checking rooms..." : "Find rooms"}
          </button>
        </form>

        {error && (
          <p className="message error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="message success" role="status">
            {notice}
          </p>
        )}
        {booking && (
          <div className="message success" role="status">
            <strong>
              Room {booking.roomId} booked for {booking.guestName}.
            </strong>
            <p>
              {shortDate(booking.checkIn)} to {shortDate(booking.checkOut)} /
              Total: {money(booking.totalPrice)}
            </p>
            <small>Booking ID: {booking.id}</small>
          </div>
        )}

        <div className="overview" aria-label="Room inventory">
          <div>
            <span>Total rooms</span>
            <strong>{inventory?.totalRooms ?? "--"}</strong>
          </div>
          <div>
            <span>Available for this search</span>
            <strong>{searched ? rooms.length : "--"}</strong>
          </div>
          <div>
            <span>Under maintenance</span>
            <strong>{inventory?.maintenanceRooms ?? "--"}</strong>
          </div>
          <p>Same-day check-out and check-in are welcome.</p>
        </div>

        <div className="booking-layout">
          <section aria-labelledby="rooms-heading" aria-busy={loading}>
            <div className="section-heading">
              <div>
                <h2 id="rooms-heading">
                  Available rooms{" "}
                  {searched && <span className="count">{rooms.length}</span>}
                </h2>
                <p>
                  {searched
                    ? `${nights} ${nights === 1 ? "night" : "nights"} / ${shortDate(searched.checkIn)} to ${shortDate(searched.checkOut)}`
                    : "Choose the dates for your guest's stay."}
                </p>
              </div>
            </div>
            {!searched ? (
              <div className="empty-state">
                <span className="empty-icon">01</span>
                <h3>
                  {loading
                    ? "Checking availability..."
                    : "Start with your stay dates"}
                </h3>
                <p>
                  {loading
                    ? "Looking for rooms free for the whole stay."
                    : "Use Find rooms to see available rooms and prices."}
                </p>
              </div>
            ) : rooms.length === 0 ? (
              <div className="empty-state">
                <h3>No rooms available</h3>
                <p>Try another category or change the stay dates.</p>
              </div>
            ) : (
              <>
                <div className="room-list">
                  {visibleRooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      className={`room ${selected?.id === room.id ? "selected" : ""}`}
                      aria-pressed={selected?.id === room.id}
                      disabled={busy}
                      onClick={() => {
                        setSelected(room);
                        setBooking(null);
                        setNotice("");
                        setTimeout(() => guestInput.current?.focus(), 0);
                      }}
                    >
                      <span className="room-top">
                        <span
                          className={`room-category ${room.category.toLowerCase()}`}
                        >
                          {room.category}
                        </span>
                        <span className="available-label">Available</span>
                      </span>
                      <span className="room-title">Room {room.id}</span>
                      <span className="room-description">
                        {room.description}
                      </span>
                      <span className="room-bottom">
                        <span>
                          <strong>{money(room.totalPrice)}</strong>
                          <small>{money(room.rate)} / night</small>
                        </span>
                        <span className="select-label">
                          {selected?.id === room.id
                            ? "Selected"
                            : "Select room"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="pagination">
                  <span>
                    Showing {(currentPage - 1) * pageSize + 1}-
                    {Math.min(currentPage * pageSize, rooms.length)} of{" "}
                    {rooms.length} rooms
                  </span>
                  <div>
                    <button
                      className="secondary"
                      disabled={currentPage === 1 || busy}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      Previous
                    </button>
                    <span>
                      {currentPage} / {pageCount}
                    </span>
                    <button
                      className="secondary"
                      disabled={currentPage === pageCount || busy}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
            <p className="availability-note">
              Availability is checked again when you confirm a booking.
            </p>
          </section>

          <section className="guest-section" aria-labelledby="guest-heading">
            <div className="panel-title">
              <span className="step">02</span>
              <span>COMPLETE THE BOOKING</span>
            </div>
            <h2 id="guest-heading">Guest details</h2>
            <p className="panel-intro">
              {selected
                ? `Room ${selected.id} / ${selected.category}`
                : "Choose a room to add your guest."}
            </p>
            <form onSubmit={bookRoom}>
              <fieldset disabled={!selected || busy}>
                <label>
                  Guest name
                  <input
                    ref={guestInput}
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                    placeholder="Full name"
                    autoComplete="name"
                    maxLength={100}
                    required
                  />
                </label>
                <label>
                  Phone number
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel-national"
                    required
                  />
                </label>
              </fieldset>
              <div className="booking-summary">
                <div>
                  <span>Room</span>
                  <strong>
                    {selected
                      ? `${selected.category} / ${selected.id}`
                      : "Not selected"}
                  </strong>
                </div>
                <div>
                  <span>Stay</span>
                  <strong>
                    {selected && searched
                      ? `${nights} ${nights === 1 ? "night" : "nights"}`
                      : "--"}
                  </strong>
                </div>
                {selected && (
                  <div>
                    <span>
                      {money(selected.rate)} x {nights} nights
                    </span>
                    <span>{money(selected.totalPrice)}</span>
                  </div>
                )}
                <div className="total">
                  <span>Total for stay</span>
                  <strong>
                    {selected ? money(selected.totalPrice) : "--"}
                  </strong>
                </div>
              </div>
              <button className="book-button" disabled={!selected || busy}>
                {saving ? "Confirming..." : "Confirm booking"}
              </button>
              <p className="panel-footnote">
                {selected
                  ? "The room is reserved after confirmation."
                  : "Select an available room to continue."}
              </p>
            </form>
          </section>
        </div>

        <section
          className="history-section"
          id="reservations"
          aria-labelledby="history-heading"
        >
          <div className="section-heading">
            <div>
              <h2 id="history-heading">Recent reservations</h2>
              <p>Latest 50 bookings. Cancelled reservations stay on record.</p>
            </div>
            <button
              className="secondary"
              disabled={historyLoading || busy}
              onClick={() => void loadBookings()}
            >
              {historyLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          {historyError && (
            <p className="message error" role="alert">
              {historyError}
            </p>
          )}
          {bookings.length > 0 && (
            <label className="history-search">
              <span className="visually-hidden">Search reservations</span>
              <input
                placeholder="Search guest name, phone or room..."
                value={guestFilter}
                onChange={(event) => setGuestFilter(event.target.value)}
              />
            </label>
          )}
          {historyLoading && bookings.length === 0 ? (
            <div className="history-empty">Loading reservations...</div>
          ) : bookings.length === 0 ? (
            <div className="history-empty">
              <strong>No reservations yet</strong>
              <p>Your first booking will appear here.</p>
            </div>
          ) : visibleBookings.length === 0 ? (
            <div className="history-empty">No matching reservations.</div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Guest</th>
                    <th>Room</th>
                    <th>Stay dates</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleBookings.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.guestName}</strong>
                        <small>{item.phone}</small>
                      </td>
                      <td>{item.roomId}</td>
                      <td>
                        {shortDate(item.checkIn)}
                        <small>to {shortDate(item.checkOut)}</small>
                      </td>
                      <td>{money(item.totalPrice)}</td>
                      <td>
                        <span className={`status ${item.status}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        {item.status === "cancelled" ? (
                          <span className="muted">--</span>
                        ) : cancelTarget === item.id ? (
                          <div className="cancel-actions">
                            <button
                              className="cancel-confirm"
                              disabled={busy || loading}
                              onClick={() => void cancelBooking(item)}
                            >
                              {cancelling === item.id
                                ? "Cancelling..."
                                : "Confirm cancel"}
                            </button>
                            <button
                              className="text-button"
                              disabled={busy}
                              onClick={() => setCancelTarget(null)}
                            >
                              Keep booking
                            </button>
                          </div>
                        ) : (
                          <button
                            className="text-button"
                            disabled={busy || loading}
                            onClick={() => setCancelTarget(item.id)}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <footer>
          <span>Nimba Stay / Front desk</span>
          <span>All prices in INR per room.</span>
        </footer>
      </main>
    </>
  );
}
