import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
test("staff can find a room, book a guest, and cancel the stay", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Make room for a little rest." }),
  ).toBeVisible();
  await page.getByLabel("Check-in", { exact: true }).fill("2027-11-20");
  await page.getByLabel("Check-out", { exact: true }).fill("2027-11-23");
  await page.getByRole("combobox").selectOption("Garden");
  await page.getByRole("button", { name: "Find a room" }).click();
  await expect(page.locator(".room-card")).toHaveCount(2);
  await page.locator(".room-card").first().click();
  await page.getByLabel("Guest name").fill("Test Guest");
  await page.getByLabel("Phone number", { exact: true }).fill("9876543210");
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("status")).toContainText("Room 101 is booked");
  await expect(page.locator(".room-card")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText("Test Guest");
  mkdirSync("artifacts", { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Confirm cancel" }).click();
  await expect(page.locator("tbody .status")).toHaveText("cancelled");
  await expect(page.locator(".room-card")).toHaveCount(2);
  expect(errors).toEqual([]);
});
test("API rejects invalid input and concurrent double booking", async ({
  request,
}) => {
  const input = {
    roomId: "201",
    guestName: "Concurrent Guest",
    phone: "9876543210",
    checkIn: "2028-11-20",
    checkOut: "2028-11-23",
  };
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      request.post("/api/bookings", { data: input }),
    ),
  );
  expect(results.filter((r) => r.status() === 201)).toHaveLength(1);
  expect(results.filter((r) => r.status() === 409)).toHaveLength(7);
  expect(
    (
      await request.post("/api/bookings", { data: { ...input, phone: "123" } })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/bookings", {
        data: { ...input, checkOut: input.checkIn },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/bookings", { data: { ...input, roomId: "103" } })
    ).status(),
  ).toBe(409);
  const response = await request.get(
    "/api/availability?checkIn=2028-11-23&checkOut=2028-11-24&category=Deluxe",
  );
  expect(
    (await response.json()).rooms.map((r: { id: string }) => r.id),
  ).toContain("201");
});
test("mobile layout fits the screen and date changes clear stale choices", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Check-in", { exact: true }).fill("2029-11-20");
  await page.getByLabel("Check-out", { exact: true }).fill("2029-11-23");
  await page.getByRole("button", { name: "Find a room" }).click();
  await expect(page.locator(".room-card")).toHaveCount(5);
  await page.locator(".room-card").first().click();
  await expect(
    page.getByRole("button", { name: "Confirm booking" }),
  ).toBeEnabled();

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
  await page.getByLabel("Check-out", { exact: true }).fill("2029-11-24");
  await expect(
    page.getByRole("button", { name: "Confirm booking" }),
  ).toBeDisabled();
  await expect(page.locator(".room-card")).toHaveCount(0);
});
