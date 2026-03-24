import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import AppHeader from "@/components/AppHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WC2026",
  description: "WC2026",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL
      ? process.env.NEXT_PUBLIC_SITE_URL
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"
  ),
  openGraph: {
    title: "WC2026",
    description: "WC2026",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WC2026",
    description: "WC2026",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(() => { try { const key = 'theme'; const v = localStorage.getItem(key); const t = v === 'light' || v === 'dark' || v === 'system' ? v : 'system'; const el = document.documentElement; el.classList.remove('theme-light', 'theme-dark'); if (t === 'light') el.classList.add('theme-light'); if (t === 'dark') el.classList.add('theme-dark'); } catch {} })();",
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppHeader />
        <main className="appMain">{children}</main>
        <footer className="appFooter" />
      </body>
    </html>
  );
}
