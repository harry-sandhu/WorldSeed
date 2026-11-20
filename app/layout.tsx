import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "WorldSeed", description: "A register of artificial worlds and the lives that pass through them." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
