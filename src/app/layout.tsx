import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NavBar } from "@/components/ui/NavBar";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AEGIS | Plate Recognition System",
  description:
    "Aerial Engagement & Grid Identification System — Drone-based license plate recognition",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#050510",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrains.variable} antialiased bg-aegis-bg text-aegis-text`}
      >
        <div className="min-h-dvh flex flex-col aegis-grid-bg">
          <main className="flex-1 pb-20">{children}</main>
          <NavBar />
        </div>
      </body>
    </html>
  );
}
