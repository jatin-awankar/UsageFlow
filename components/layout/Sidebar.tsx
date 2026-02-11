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
  role: "OWNER" | "ADMIN" | "DEVELOPER" | "VIEWER";
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
    label: "Analytics",
    items: [
      {
        name: "Usage Analytics",
        path: "analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    label: "Billing",
    roles: ["OWNER", "ADMIN"],
    items: [
      {
        name: "Overview",
        path: "billing",
        icon: CreditCard,
      },
      {
        name: "Invoices",
        path: "billing/invoices",
        icon: FileText,
      },
    ],
  },
  {
    label: "Configure",
    roles: ["OWNER", "ADMIN"],
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
    roles: ["OWNER", "ADMIN", "DEVELOPER"],
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
    roles: ["OWNER", "ADMIN"],
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

export default function Sidebar({ orgId, role }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white px-4 py-6">
      {/* Brand */}
      <div className="shrink-0 px-2 pb-4">
        <h1 className="text-lg font-semibold text-gray-900">UsageFlow</h1>
        <p className="text-xs text-gray-500">Usage-based billing platform</p>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navSections
          .filter((section) => !section.roles || section.roles.includes(role))
          .map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
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
                          ? "bg-gray-100 text-gray-900 font-medium ring-1 ring-gray-200"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
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
