import { BookingError } from "./booking";
export function apiError(error: unknown) {
  if (error instanceof BookingError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof SyntaxError)
    return Response.json(
      { error: "Send a valid JSON request." },
      { status: 400 },
    );
  console.error(error);
  return Response.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 },
  );
}
