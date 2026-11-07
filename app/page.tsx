"use client";
import { useEffect, useRef, useState } from "react";
import type { Booking, Room } from "@/lib/db";
type AvailableRoom = Room & { totalPrice: number };
type Search = { checkIn: string; checkOut: string; category: string };
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
const date = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
function today(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function Leaf() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M26 5C11 4 4 10 7 20c9 5 19-1 19-15Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="m6 27 15-16M11 21l-1-7m6 2 6 1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
export default function FrontDesk() {
  const [dates, setDates] = useState<Search>({
    checkIn: "",
    checkOut: "",
    category: "",
  });
  const [searched, setSearched] = useState<Search | null>(null);
  const [rooms, setRooms] = useState<AvailableRoom[]>([]);
  const [nights, setNights] = useState(0);
  const [selected, setSelected] = useState<AvailableRoom | null>(null);
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [success, setSuccess] = useState<Booking | null>(null);
  const requestId = useRef(0);
  const guestInput = useRef<HTMLInputElement>(null);
  async function recent() {
    try {
      const r = await fetch("/api/bookings", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setBookings(d.bookings);
      setHistoryError("");
    } catch {
      setHistoryError(
        "Recent bookings could not be loaded. Use Refresh to try again.",
      );
    }
  }
  useEffect(() => {
    setDates({ checkIn: today(), checkOut: today(2), category: "" });
    void recent();
  }, []);
  function changeDates(update: Partial<Search>) {
    requestId.current++;
    setDates((p) => ({ ...p, ...update }));
    setSearched(null);
    setSelected(null);
    setRooms([]);
    setError("");
    setSuccess(null);
    setLoading(false);
  }
  async function search(query: Search) {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    setSelected(null);
    setSearched(null);
    try {
      const r = await fetch(`/api/availability?${new URLSearchParams(query)}`, {
        cache: "no-store",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (id !== requestId.current) return;
      setRooms(d.rooms);
      setNights(d.nights);
      setSearched(query);
    } catch (e) {
      if (id === requestId.current)
        setError(
          e instanceof Error ? e.message : "Unable to check availability.",
        );
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }
  async function book(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !searched || saving) return;
    setSaving(true);
    setError("");
    setSuccess(null);
    try {
      const r = await fetch("/api/bookings", {
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
      const d = await r.json();
      if (!r.ok) {
        if (r.status === 409) {
          setSelected(null);
          setRooms((p) => p.filter((x) => x.id !== selected.id));
        }
        throw new Error(d.error);
      }
      setSuccess(d.booking);
      setRooms((p) => p.filter((x) => x.id !== selected.id));
      setSelected(null);
      setGuestName("");
      setPhone("");
      await recent();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Booking failed. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function cancel(id: string) {
    setCancelling(id);
    setError("");
    try {
      const r = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setCancelTarget(null);
      await recent();
      if (searched) await search(searched);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel booking.");
    } finally {
      setCancelling(null);
    }
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Nimba Stay home">
          <Leaf />
          <span>
            nimba<small>NATURE CURE</small>
          </span>
        </a>
        <div className="workspace-label">STAY MANAGEMENT</div>
        <nav aria-label="Main navigation">
          <a className="nav-item active" href="#reservation">
            <span aria-hidden="true">▦</span> Front desk <i />
          </a>
          <a className="nav-item" href="#recent-bookings">
            <span aria-hidden="true">☷</span> Reservations
          </a>
        </nav>
        <div className="sidebar-note">
          <Leaf />
          <p>
            A little more nature.
            <br />A little more care.
          </p>
          <small>NIMBA STAY</small>
        </div>
        <div className="desk-profile">
          <span className="avatar">FD</span>
          <div>
            Front desk<small>Reception workspace</small>
          </div>
          <i className="online-dot" />
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Nimba Stay</span>
            <span className="slash">/</span>Front desk
          </div>
          <span className="staff-label">
            <i className="online-dot" /> Reception
          </span>
        </header>
        <main>
          <section id="reservation" aria-labelledby="page-title">
            <div className="page-heading">
              <div>
                <p className="eyebrow">ROOMS & RESERVATIONS</p>
                <h1 id="page-title">Make room for a little rest.</h1>
                <p className="intro">
                  Find the right room. Take care of the rest.
                </p>
              </div>
              <div className="property-label">
                <span className="property-icon">
                  <Leaf />
                </span>
                <div>
                  Nimba Nature Cure<small>Mehsana, Gujarat</small>
                </div>
              </div>
            </div>
            <form
              className="search-bar"
              onSubmit={(e) => {
                e.preventDefault();
                setSuccess(null);
                void search(dates);
              }}
            >
              <label>
                Check-in
                <input
                  type="date"
                  value={dates.checkIn}
                  onChange={(e) => changeDates({ checkIn: e.target.value })}
                  required
                  disabled={saving}
                />
              </label>
              <label>
                Check-out
                <input
                  type="date"
                  value={dates.checkOut}
                  min={dates.checkIn || undefined}
                  onChange={(e) => changeDates({ checkOut: e.target.value })}
                  required
                  disabled={saving}
                />
              </label>
              <label>
                Room category
                <select
                  value={dates.category}
                  onChange={(e) => changeDates({ category: e.target.value })}
                  disabled={saving}
                >
                  <option value="">All categories</option>
                  <option>Garden</option>
                  <option>Deluxe</option>
                  <option>Suite</option>
                </select>
              </label>
              <button
                className="button primary search-button"
                disabled={loading || saving}
              >
                {loading ? "Checking rooms…" : "Find a room"}
                <span aria-hidden="true">→</span>
              </button>
            </form>
            {error && (
              <div className="notice error" role="alert">
                <strong>Please check</strong>
                <span>{error}</span>
                <button onClick={() => setError("")} aria-label="Dismiss error">
                  ×
                </button>
              </div>
            )}
            {success && (
              <div className="notice success" role="status">
                <span className="success-tick">✓</span>
                <div>
                  <strong>
                    You’re all set. Room {success.roomId} is booked.
                  </strong>
                  <span>
                    {success.guestName} · {date(success.checkIn)} –{" "}
                    {date(success.checkOut)} · {money(success.totalPrice)}
                    <br />
                    Reference {success.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={() => setSuccess(null)}
                  aria-label="Dismiss confirmation"
                >
                  ×
                </button>
              </div>
            )}
            <div className="booking-layout">
              <section
                className="room-section"
                aria-labelledby="rooms-title"
                aria-busy={loading}
              >
                <div className="section-heading">
                  <h2 id="rooms-title">
                    {searched ? "Available rooms" : "A stay that feels right"}
                    {searched && <span className="count">{rooms.length}</span>}
                  </h2>
                  <span>
                    {searched
                      ? `${nights} ${nights === 1 ? "night" : "nights"} · prices in INR`
                      : "YOUR NEXT ARRIVAL"}
                  </span>
                </div>
                {!searched ? (
                  <div className="welcome-state">
                    <div className="room-drawing" aria-hidden="true">
                      <svg viewBox="0 0 240 150" fill="none">
                        <path
                          d="M40 118h160M55 118V57h130v61M64 57V37h112v20M68 118V85h104v33M72 85V70h43v15m10 0V70h43v15M55 98h130M90 37V23h40v14M192 118V80m0 18c-19-9-15-24 0-27 16 4 20 20 0 27Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M77 28c-13-6-18-2-18 6 10 5 17 2 18-6Z"
                          fill="currentColor"
                          opacity=".3"
                        />
                      </svg>
                    </div>
                    <h3>A fresh start, for every guest.</h3>
                    <p>
                      Choose the stay dates above to see available
                      <br /> rooms and the full price before you book.
                    </p>
                    <div className="welcome-tags">
                      <span>
                        01 <b>Choose dates</b>
                      </span>
                      <span>
                        02 <b>Pick a room</b>
                      </span>
                      <span>
                        03 <b>Welcome your guest</b>
                      </span>
                    </div>
                  </div>
                ) : rooms.length === 0 ? (
                  <div className="empty-state">
                    <Leaf />
                    <h3>No rooms for these dates.</h3>
                    <p>Try another category or adjust the stay dates.</p>
                    <button
                      className="text-button"
                      onClick={() => changeDates({ category: "" })}
                    >
                      Change your search ↗
                    </button>
                  </div>
                ) : (
                  <div className="room-list">
                    {rooms.map((room) => (
                      <button
                        key={room.id}
                        disabled={saving}
                        className={`room-card ${selected?.id === room.id ? "selected" : ""}`}
                        aria-pressed={selected?.id === room.id}
                        onClick={() => {
                          setSelected(room);
                          setSuccess(null);
                          setTimeout(() => guestInput.current?.focus(), 0);
                        }}
                      >
                        <span
                          className={`room-number ${room.category.toLowerCase()}`}
                        >
                          <small>ROOM</small>
                          {room.id}
                          <span aria-hidden="true">
                            {room.category === "Garden"
                              ? "❧"
                              : room.category === "Suite"
                                ? "✧"
                                : "☼"}
                          </span>
                        </span>
                        <span className="room-info">
                          <span className="room-category">
                            {room.category} room
                          </span>
                          <span className="room-description">
                            {room.description}
                          </span>
                          <span className="room-rate">
                            {money(room.rate)} <span>/ night</span>
                          </span>
                        </span>
                        <span className="room-total">
                          <strong>{money(room.totalPrice)}</strong>
                          <small>
                            for {nights} {nights === 1 ? "night" : "nights"}
                          </small>
                          <span className="select-room">
                            {selected?.id === room.id
                              ? "Selected ✓"
                              : "Select room →"}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="availability-note">
                  <span aria-hidden="true">→</span> Availability is checked
                  again when you confirm the booking.
                </p>
              </section>
              <aside className="guest-panel" aria-labelledby="guest-title">
                <div className="panel-top">
                  <span className="step-number">02</span>
                  <span>THE GUEST DETAILS</span>
                </div>
                <h2 id="guest-title">A warm welcome starts here.</h2>
                <p className="panel-description">
                  {selected
                    ? `You’ve selected ${selected.category.toLowerCase()} room ${selected.id}. Add your guest to finish.`
                    : "Select an available room, then add your guest’s details."}
                </p>
                <form onSubmit={book}>
                  <fieldset disabled={!selected || saving}>
                    <label>
                      Guest name
                      <input
                        ref={guestInput}
                        placeholder="e.g. Asha Shah"
                        autoComplete="name"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        required
                        maxLength={100}
                      />
                    </label>
                    <label>
                      Phone number
                      <div className="phone-input">
                        <span>+91</span>
                        <input
                          aria-label="Phone number"
                          placeholder="10-digit mobile number"
                          autoComplete="tel-national"
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]{10}"
                          maxLength={10}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                        />
                      </div>
                    </label>
                  </fieldset>
                  <div className="booking-summary">
                    <div>
                      <span>Room</span>
                      <strong>
                        {selected
                          ? `${selected.category} · ${selected.id}`
                          : "—"}
                      </strong>
                    </div>
                    <div>
                      <span>Stay</span>
                      <strong>
                        {selected && searched
                          ? `${date(searched.checkIn)} – ${date(searched.checkOut)}`
                          : "—"}
                      </strong>
                    </div>
                    {selected && (
                      <div>
                        <span>
                          {money(selected.rate)} × {nights} nights
                        </span>
                        <span>{money(selected.totalPrice)}</span>
                      </div>
                    )}
                    <div className="summary-total">
                      <span>Total for stay</span>
                      <strong>
                        {selected ? money(selected.totalPrice) : "—"}
                      </strong>
                    </div>
                  </div>
                  <button
                    className="button primary confirm-button"
                    disabled={!selected || saving}
                  >
                    {saving ? "Confirming booking…" : "Confirm booking"}
                    <span aria-hidden="true">→</span>
                  </button>
                  <p className="panel-footnote">
                    {selected
                      ? "The room is reserved once you confirm."
                      : "Choose a room to continue"}
                  </p>
                </form>
              </aside>
            </div>
          </section>
          <section
            className="recent-section"
            id="recent-bookings"
            aria-labelledby="recent-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">AT A GLANCE</p>
                <h2 id="recent-title">Recent reservations</h2>
              </div>
              <button className="text-button" onClick={() => void recent()}>
                Refresh ↻
              </button>
            </div>
            {historyError && (
              <p role="alert" className="history-error">
                {historyError}
              </p>
            )}
            {bookings.length === 0 ? (
              <div className="empty-history">
                <span aria-hidden="true">→</span>
                <div>
                  <strong>A clean page, ready for your first guest.</strong>
                  <p>
                    New bookings will appear here, with the option to cancel.
                  </p>
                </div>
              </div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Guest</th>
                      <th>Room</th>
                      <th>Dates</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <strong>{b.guestName}</strong>
                          <small>{b.phone}</small>
                        </td>
                        <td>{b.roomId}</td>
                        <td>
                          {date(b.checkIn)} – {date(b.checkOut)}
                          <small>
                            {b.checkIn.slice(0, 4)}
                            {b.checkIn.slice(0, 4) !== b.checkOut.slice(0, 4)
                              ? ` – ${b.checkOut.slice(0, 4)}`
                              : ""}
                          </small>
                        </td>
                        <td>{money(b.totalPrice)}</td>
                        <td>
                          <span className={`status ${b.status}`}>
                            {b.status}
                          </span>
                        </td>
                        <td>
                          {b.status !== "cancelled" &&
                            (cancelTarget === b.id ? (
                              <div className="cancel-actions">
                                <button
                                  className="cancel-confirm"
                                  disabled={!!cancelling || saving}
                                  onClick={() => void cancel(b.id)}
                                >
                                  {cancelling === b.id
                                    ? "Cancelling…"
                                    : "Confirm cancel"}
                                </button>
                                <button
                                  className="text-button"
                                  disabled={!!cancelling}
                                  onClick={() => setCancelTarget(null)}
                                >
                                  Keep
                                </button>
                              </div>
                            ) : (
                              <button
                                className="text-button"
                                disabled={saving || !!cancelling}
                                onClick={() => setCancelTarget(b.id)}
                              >
                                Cancel
                              </button>
                            ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <footer>
            <span>
              <Leaf /> A quieter stay. A simpler day.
            </span>
            <span>Nimba Stay · Front desk</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
