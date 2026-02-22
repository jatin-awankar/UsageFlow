"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentType } from "react";
import {
  Activity,
  BarChart3,
  CreditCard,
  FileText,
  Key,
  Layers,
  LayoutDashboard,
  ScrollText,
  Settings,
  Shield,
  Users,
  Webhook,
} from "lucide-react";

type SidebarRole = "OWNER" | "ADMIN" | "DEVELOPER" | "VIEWER";

type SidebarProps = {
  orgId: string;
  role: SidebarRole;
};

type NavSection = {
  label: string;
  roles?: SidebarRole[];
  items: {
    name: string;
    path: string;
    icon: ComponentType<{ className?: string }>;
  }[];
};

const navSections: NavSection[] = [
  {
    label: "Overview",
    items: [{ name: "Dashboard", path: "dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Analytics",
    items: [{ name: "Usage Analytics", path: "analytics", icon: BarChart3 }],
  },
  {
    label: "Billing",
    roles: ["OWNER", "ADMIN"],
    items: [
      { name: "Overview", path: "billing", icon: CreditCard },
      { name: "Invoices", path: "billing/invoices", icon: FileText },
    ],
  },
  {
    label: "Configure",
    roles: ["OWNER", "ADMIN"],
    items: [
      { name: "Metrics", path: "metrics", icon: Activity },
      { name: "Plans", path: "plans", icon: Layers },
    ],
  },
  {
    label: "Developers",
    roles: ["OWNER", "ADMIN", "DEVELOPER"],
    items: [
      { name: "API Keys", path: "api-keys", icon: Key },
      { name: "Webhooks", path: "webhooks", icon: Webhook },
      { name: "Webhook Logs", path: "webhooks/logs", icon: ScrollText },
    ],
  },
  {
    label: "Organization",
    roles: ["OWNER", "ADMIN"],
    items: [
      { name: "Members", path: "members", icon: Users },
      { name: "Audit Logs", path: "audit-logs", icon: Shield },
      { name: "Settings", path: "settings", icon: Settings },
    ],
  },
];

export default function Sidebar({ orgId, role }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[78px] shrink-0 flex-col border-r border-slate-200/80 bg-white/85 px-2 py-4 backdrop-blur-md transition-[width] duration-300 sm:w-72 sm:px-4 sm:py-6">
      <div className="mb-4 rounded-xl border border-slate-200 bg-linear-to-br from-white to-slate-50 px-2.5 py-2.5 sm:px-3 sm:py-3">
        <h1 className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
          <span className="sm:hidden">UF</span>
          <span className="hidden sm:inline">UsageFlow</span>
        </h1>
        <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">
          Usage-based billing platform
        </p>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navSections
          .filter((section) => !section.roles || section.roles.includes(role))
          .map((section) => (
            <section key={section.label} className="space-y-1.5">
              <p className="hidden px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:block">
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
                      title={item.name}
                      className={`group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition duration-200 sm:px-3 ${
                        active
                          ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                          : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                      }`}
                    >
                      <Icon
                        className={`size-4 shrink-0 ${
                          active
                            ? "text-sky-600"
                            : "text-slate-400 group-hover:text-slate-600"
                        }`}
                      />
                      <span className="hidden truncate font-medium sm:block">
                        {item.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
      </nav>
    </aside>
  );
}
