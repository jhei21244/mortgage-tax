import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LoyaltyTax — How much is your bank charging you for staying?",
  description:
    "Find out exactly how much more you're paying than new customers — and what to do about it. The Australian mortgage loyalty tax calculator.",
  openGraph: {
    title: "LoyaltyTax",
    description: "Your bank charges new customers less than you. Find out by how much.",
    url: "https://loyaltytax.com.au",
    siteName: "LoyaltyTax",
    locale: "en_AU",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
