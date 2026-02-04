"use client";

import { ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 w-full transition-all",
        isScrolled
          ? "bg-background/80 backdrop-blur border-b"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/usageFlow.png"
            alt="UsageFlow logo"
            width={28}
            height={28}
            priority
          />
          <span className="text-lg font-semibold">UsageFlow</span>
        </Link>

        {/* Nav actions */}
        <div className="flex items-center gap-4">
          <Link
            href="https://github.com/jatin-awankar/UsageFlow/blob/main/README.md"
            className="hidden md:inline text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
          >
            Docs
          </Link>

          <Link
            href="https://github.com/jatin-awankar/UsageFlow"
            target="_blank"
            className="hidden md:flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
          >
            GitHub
            <ExternalLink size={14} />
          </Link>

          <Button asChild variant="secondary">
            <Link href="/app">Open Dashboard</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
