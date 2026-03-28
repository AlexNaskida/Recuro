import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recuro - Non-Custodial Recurring Payments on Solana",
  description:
    "Accept automated, recurring USDC subscription payments without ever touching subscriber funds. Built on Solana.",
  keywords: [
    "Solana",
    "subscriptions",
    "recurring payments",
    "USDC",
    "crypto payments",
    "non-custodial",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] text-white antialiased">{children}</body>
    </html>
  );
}
