import { getStore } from "@/lib/db";
import { BookingError } from "@/lib/booking";
import { apiError } from "@/lib/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() {
  try {
    return Response.json({ bookings: getStore().bookings() });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const input = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new BookingError("Send a booking object.");
    return Response.json({ booking: getStore().book(input) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
