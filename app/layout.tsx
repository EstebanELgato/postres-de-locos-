import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Postres de Locos",
  description: "Tienda web para pedir postres caseros de Postres de Locos."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
