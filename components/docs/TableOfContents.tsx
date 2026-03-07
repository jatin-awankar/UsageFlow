"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function TableOfContents() {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<
    { id: string; text: string; level: "h2" | "h3" }[]
  >([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const readHeadings = () => {
      const elements = Array.from(
        document.querySelectorAll("article h2, article h3"),
      );
      const seen = new Set<string>();
      const mapped = elements
        .map((el) => ({
          id: el.id?.trim(),
          text: el.textContent || "",
          level: el.tagName.toLowerCase() as "h2" | "h3",
        }))
        .filter(
          (item): item is { id: string; text: string; level: "h2" | "h3" } => {
            if (!item.id || seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          },
        );

      setHeadings(mapped);
    };

    // Run immediately on navigation and re-run when MDX content settles.
    readHeadings();
    const raf = requestAnimationFrame(readHeadings);

    const article = document.querySelector("article");
    if (!article) return () => cancelAnimationFrame(raf);

    const observer = new MutationObserver(readHeadings);
    observer.observe(article, {
      childList: true,
      subtree: true,
    });

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top) -
              Math.abs(b.boundingClientRect.top),
          );

        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "0px 0px -70% 0px",
        threshold: [0, 1],
      },
    );

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headings, pathname]);

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto px-4 py-4 text-sm xl:px-5 xl:py-5">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        On this page
      </h4>

      <ul className="space-y-1.5">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={`block rounded px-2 py-1 leading-5 transition-colors ${
                h.level === "h3" ? "ml-3 text-[13px]" : "text-sm"
              } ${
                activeId === h.id
                  ? "text-primary/80 font-bold text-md"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
        {!headings.length ? (
          <li className="px-2 text-sm text-slate-500">No sections yet.</li>
        ) : null}
      </ul>
    </aside>
  );
}
