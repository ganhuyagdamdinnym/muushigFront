import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Muushig Game",
  description: "Real-time UNO card game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
