import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alertas Tech Personales (MVP)",
  description: "Agregador RSS con filtros por intereses para Java, DevOps, IA y Seguridad."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
