export const categories = ["Garden", "Deluxe", "Suite"] as const;
export type Category = (typeof categories)[number];
export class BookingError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function stayDates(checkIn: unknown, checkOut: unknown) {
  const parse = (value: unknown) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
      throw new BookingError("Choose a valid check-in and check-out date.");
    const date = new Date(value + "T00:00:00.000Z");
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    )
      throw new BookingError(
        "That date does not exist. Please check your dates.",
      );
    return date.getTime();
  };
  const nights = (parse(checkOut) - parse(checkIn)) / 86400000;
  if (nights <= 0) throw new BookingError("Check-out must be after check-in.");
  return { checkIn: checkIn as string, checkOut: checkOut as string, nights };
}
export function overlaps(aIn: string, aOut: string, bIn: string, bOut: string) {
  return aIn < bOut && aOut > bIn;
}
export function validateGuest(name: unknown, phone: unknown) {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 100)
    throw new BookingError("Enter a guest name between 1 and 100 characters.");
  if (typeof phone !== "string" || !/^\d{10}$/.test(phone))
    throw new BookingError("Phone number must contain exactly 10 digits.");
  return { guestName: name.trim(), phone };
}
