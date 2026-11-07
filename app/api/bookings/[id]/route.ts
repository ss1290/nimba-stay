import { getStore } from "@/lib/db";
import { apiError } from "@/lib/http";
export const runtime = "nodejs";
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    getStore().cancel(id);
    return Response.json({ status: "cancelled" });
  } catch (error) {
    return apiError(error);
  }
}
