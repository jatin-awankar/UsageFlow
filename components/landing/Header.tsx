"use client";

import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "../ui/button";

const navItems = [
  { href: "#about", label: "What is it" },
  { href: "#flow", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#architecture", label: "Architecture" },
];

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 36);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 py-3 sm:px-6">
      <nav
        className={cn(
          "mx-auto flex h-14 w-full max-w-6xl items-center justify-between rounded-2xl border px-3 transition-all duration-300 sm:px-4",
          isScrolled
            ? "border-white/45 bg-white/55 shadow-lg shadow-slate-900/10 backdrop-blur-xl supports-backdrop-filter:backdrop-saturate-150"
            : "border-white/60 bg-white/35 shadow-sm shadow-slate-900/5 backdrop-blur-lg supports-backdrop-filter:backdrop-saturate-150",
        )}
      >
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/icon.png"
            alt="UsageFlow logo"
            width={22}
            height={22}
            priority
          />
          <span className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
            UsageFlow
          </span>
        </Link>

        <div className="hidden items-center gap-4 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-slate-700/90 transition hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Link
              href="https://github.com/jatin-awankar/UsageFlow/blob/main/README.md"
              target="_blank"
            >
              Docs
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/app">Open App</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
