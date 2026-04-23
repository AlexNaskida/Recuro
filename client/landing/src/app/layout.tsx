import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import "./globals.css";
import type { ReactNode } from "react";

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
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
    <html lang="en" className={`${syne.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
