"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  CreditCard,
  FileText,
  Activity,
  Layers,
  Key,
  Webhook,
  ScrollText,
  Users,
  Shield,
  Settings,
} from "lucide-react";

type SidebarProps = {
  orgId: string;
};

const navSections = [
  {
    label: "Overview",
    items: [
      {
        name: "Dashboard",
        path: "dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Observe",
    items: [
      {
        name: "Usage",
        path: "usage",
        icon: BarChart3,
      },
      {
        name: "Billing",
        path: "billing",
        icon: CreditCard,
      },
      {
        name: "Invoices",
        path: "invoices",
        icon: FileText,
      },
    ],
  },
  {
    label: "Configure",
    items: [
      {
        name: "Metrics",
        path: "metrics",
        icon: Activity,
      },
      {
        name: "Plans",
        path: "plans",
        icon: Layers,
      },
    ],
  },
  {
    label: "Developers",
    items: [
      {
        name: "API Keys",
        path: "api-keys",
        icon: Key,
      },
      {
        name: "Webhooks",
        path: "webhooks",
        icon: Webhook,
      },
      {
        name: "Webhook Logs",
        path: "webhooks/logs",
        icon: ScrollText,
      },
    ],
  },
  {
    label: "Organization",
    items: [
      {
        name: "Members",
        path: "members",
        icon: Users,
      },
      {
        name: "Audit Logs",
        path: "audit-logs",
        icon: Shield,
      },
      {
        name: "Settings",
        path: "settings",
        icon: Settings,
      },
    ],
  },
];

export default function Sidebar({ orgId }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-white px-4 py-6">
      {/* Brand */}
      <div className="mb-8 px-2">
        <h1 className="text-lg font-semibold text-gray-900">UsageFlow</h1>
        <p className="text-xs text-gray-500">Usage-based billing</p>
      </div>

      {/* Navigation */}
      <nav className="space-y-6 mb-6">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-2 text-xs font-semibold uppercase text-gray-400">
              {section.label}
            </p>

            <div className="space-y-1">
              {section.items.map((item) => {
                const href = `/app/${orgId}/${item.path}`;
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path}
                    href={href}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                      active
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
