export type DocsNavLink = {
  title: string;
  href: string;
  description?: string;
};

export type DocsNavSection = {
  title: string;
  links: DocsNavLink[];
};

export const docsNav: DocsNavSection[] = [
  {
    title: "Get Started",
    links: [
      {
        title: "Getting Started",
        href: "/docs/getting-started",
        description: "Set up UsageFlow and understand the end-to-end billing flow.",
      },
      {
        title: "Core Concepts",
        href: "/docs/concepts",
        description: "Learn the primitives behind usage-based billing in UsageFlow.",
      },
      {
        title: "Quick Start",
        href: "/docs/quick-start",
        description: "Integrate event tracking and invoicing in under 10 minutes.",
      },
    ],
  },
  {
    title: "API Reference",
    links: [
      {
        title: "Track Usage",
        href: "/docs/api/track",
        description: "Record billable usage events from your backend.",
      },
      {
        title: "Invoices",
        href: "/docs/api/invoices",
        description: "Fetch generated invoices for an organization.",
      },
      {
        title: "Subscriptions",
        href: "/docs/api/subscriptions",
        description: "Read current subscription and lifecycle status.",
      },
    ],
  },
  {
    title: "Guides",
    links: [
      {
        title: "Webhooks",
        href: "/docs/webhooks",
        description: "Handle billing events reliably with retries and idempotency.",
      },
      {
        title: "Architecture",
        href: "/docs/architecture",
        description: "Understand workers, queues, and multi-tenant system design.",
      },
      {
        title: "Integration Examples",
        href: "/docs/integration-examples",
        description: "Plug UsageFlow into Node.js, Next.js, and Python backends.",
      },
    ],
  },
];

export const docsLinks = docsNav.flatMap((section) => section.links);
