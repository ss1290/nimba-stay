import { getStore } from "@/lib/db";
import { apiError } from "@/lib/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    return Response.json(
      getStore().availability(
        params.get("checkIn"),
        params.get("checkOut"),
        params.get("category"),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
