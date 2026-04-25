import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";
import type { ReactNode } from "react";

const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Recuro - Non-custodial recurring stablecoin subscriptions on Solana",
  description:
    "Accept recurring stablecoin subscriptions on Solana without ever taking custody of subscriber funds.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title:
      "Recuro — Non-custodial recurring stablecoin subscriptions on Solana",
    description:
      "Accept recurring stablecoin subscriptions on Solana without ever taking custody of subscriber funds.",
    type: "website",
    siteName: "Recuro",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Recuro — Non-custodial recurring stablecoin subscriptions on Solana",
    description:
      "Accept recurring stablecoin subscriptions on Solana without ever taking custody of subscriber funds.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
