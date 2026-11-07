import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Nimba Stay | Front desk", description: "Room availability and guest reservations at Nimba Nature Cure." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
