import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "UsageFlow - Usage-based billing and webhooks for SaaS",
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
    "webhooks",
    "event driven architecture",
    "nextjs saas",
    "prisma",
    "bullmq",
  ],

  openGraph: {
    title: "UsageFlow - Usage-based billing and webhooks",
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
    title: "UsageFlow - Usage-based billing and webhooks",
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
        className={` min-h-screen bg-background text-foreground antialiased selection:bg-sky-200/70 selection:text-slate-900`}
      >
        {children}
        <Toaster richColors position="top-right" />
        <Analytics />
      </body>
    </html>
  );
}
