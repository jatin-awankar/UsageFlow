import Link from "next/link";
import React from "react";

type SidebarProps = {
  orgId: string;
};

export default function Sidebar({ orgId }: SidebarProps) {
  const navItems = [
    { name: "Dashboard", path: "dashboard" },
    { name: "Usage", path: "usage" },
    { name: "Billing", path: "billing" },
    { name: "Invoices", path: "invoices" },
    { name: "Metrics", path: "metrics" },
    { name: "Plans", path: "plans" },
    { name: "API Keys", path: "api-keys" },
    { name: "Webhooks", path: "webhooks" },
    { name: "Audit Logs", path: "audit-logs" },
    { name: "Members", path: "members" },
    { name: "Settings", path: "settings" },
  ];

  return (
    <aside className="w-64 border-r p-4">
      <h2 className="text-xl font-semibold mb-6">UsageFlow</h2>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={`/app/${orgId}/${item.path}`}
            className="block px-3 py-2 rounded hover:bg-gray-700"
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
