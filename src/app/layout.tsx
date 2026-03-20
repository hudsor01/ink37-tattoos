import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ink37 Tattoos",
  description: "Professional tattoo studio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
