import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "UsageFlow - Usage-based billing & webhooks for SaaS",
    template: "%s | UsageFlow",
  },
  description:
    "UsageFlow is a production-grade, multi-tenant SaaS platform for usage-based billing, invoices, and reliable webhooks.",

  applicationName: "UsageFlow",
  authors: [{ name: "Jatin Awankar" }],
  creator: "Jatin Awankar",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },

  metadataBase: new URL("https://usageflow.vercel.app"),

  keywords: [
    "usage based billing",
    "saas billing system",
    "stripe-like billing",
    "webhooks",
    "event driven architecture",
    "nextjs saas project",
    "prisma",
    "bullmq",
  ],

  openGraph: {
    title: "UsageFlow - Usage-based billing & webhooks",
    description:
      "A production-grade SaaS platform demonstrating usage tracking, pricing, invoicing, and event-driven webhooks.",
    url: "https://usageflow.vercel.app",
    siteName: "UsageFlow",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "UsageFlow - SaaS billing architecture",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "UsageFlow - Usage-based billing & webhooks",
    description:
      "A production-grade SaaS billing platform built with Next.js, Prisma, and BullMQ.",
    images: ["/og.png"],
  },

  robots: {
    index: true,
    follow: true,
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster richColors />
      </body>
    </html>
  );
}
