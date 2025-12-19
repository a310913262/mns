import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const siteTitle = "Intragroup Netting & Cash Pooling Platform | MNS";
const siteDescription =
  "Automate intercompany debt netting, cascade optimization, and cash pooling with Excel import/export, audit logs, and visual flows.";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  keywords: [
    "intragroup netting",
    "cash pooling",
    "intercompany settlement",
    "debt netting",
    "treasury",
    "cash management",
    "Excel import",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
