"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { docsNav } from "@/components/docs/docs-nav";

export default function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto px-4 py-4 lg:px-5 lg:py-5">
      <Link
        href="/docs"
        className="mb-7 inline-flex items-center rounded-md px-2 py-1 text-sm font-semibold text-slate-900"
      >
        OVERVIEW
      </Link>

      {docsNav.map((section) => (
        <div
          key={section.title}
          className="mb-5 border-t border-slate-200 pt-3"
        >
          <h3 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            {section.title}
          </h3>
          <ul className="space-y-1 ml-2">
            {section.links.map((link) => (
              <li key={link.title}>
                <Link
                  href={link.href}
                  className={`block rounded-md px-2 py-1.5 text-sm transition-colors ${
                    pathname === link.href
                      ? "text-primary font-bold text-md"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}
