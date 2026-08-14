import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MOVA",
  description: "Coordinacion logistica premium para cargas y transportes."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
