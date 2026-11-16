import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Tutor IA — Energías Renovables | Tecnología e Ingeniería",
  description:
    "Herramienta de evaluación formativa con método socrático para memorias de Energías Renovables de 1.º de Bachillerato en Canarias.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="min-h-dvh bg-[#F8FAFC] font-sans text-[#1E293B] antialiased">
        {children}
      </body>
    </html>
  );
}
