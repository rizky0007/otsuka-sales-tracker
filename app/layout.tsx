
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Otsuka Sales Tracker",
  description: "Dashboard pencapaian target sales Otsuka",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
