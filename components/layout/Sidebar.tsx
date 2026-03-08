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
    roles: ["OWNER", "ADMIN", "DEVELOPER", "VIEWER"],
    items: [{ name: "Dashboard", path: "dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Analytics",
    roles: ["OWNER", "ADMIN", "DEVELOPER", "VIEWER"],
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
  const visibleSections = navSections.filter(
    (section) => !section.roles || section.roles.includes(role),
  );
  const navItemsWithHref = visibleSections.flatMap((section) =>
    section.items.map((item) => ({
      href: `/app/${orgId}/${item.path}`,
    })),
  );
  const activeHref =
    navItemsWithHref
      .filter(
        (item) =>
          pathname === item.href || pathname.startsWith(`${item.href}/`),
      )
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;

  return (
    <aside className="flex h-full w-full shrink-0 flex-col bg-white/85 px-4 py-5">
      <div className="mb-4 rounded-xl border border-slate-200 bg-linear-to-br from-white via-slate-50 to-sky-50/40 px-3 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Platform
        </p>
        <h1 className="mt-0.5 text-base font-semibold tracking-tight text-slate-900">
          UsageFlow Console
        </h1>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto pr-0.5">
        {visibleSections.map((section) => (
          <section key={section.label} className="space-y-1.5 pt-2 first:pt-0">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {section.label}
            </p>

            <div className="space-y-1 pl-1 pb-1">
              {section.items.map((item) => {
                const href = `/app/${orgId}/${item.path}`;
                const active = href === activeHref;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path}
                    href={href}
                    title={item.name}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition duration-200 ${
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
                    <span className="truncate font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="mt-4 space-y-2 border-t border-slate-200 pt-3">
        <Link
          href="/docs"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <ScrollText className="size-4 text-slate-400" />
          Documentation
        </Link>
        {role === "OWNER" || role === "ADMIN" ? (
          <Link
            href={`/app/${orgId}/settings`}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Settings className="size-4 text-slate-400" />
            Workspace Settings
          </Link>
        ) : (
          <></>
        )}
      </div>
    </aside>
  );
}
