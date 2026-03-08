import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AuditLogsPagination({
  orgId,
  prevCursor,
  nextCursor,
  hasPrev,
  hasNext,
}: {
  orgId: string;
  prevCursor: string | null;
  nextCursor: string | null;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const prevHref = prevCursor
    ? `/app/${orgId}/audit-logs?cursor=${encodeURIComponent(prevCursor)}&direction=prev`
    : "";

  const nextHref = nextCursor
    ? `/app/${orgId}/audit-logs?cursor=${encodeURIComponent(nextCursor)}&direction=next`
    : "";

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 shadow-md shadow-slate-900/5 animate-in fade-in duration-500 [animation-delay:180ms]">
      {hasPrev && prevCursor ? (
        <Button asChild variant="outline" size="sm">
          <Link href={prevHref}>
            <ChevronLeft className="size-4" />
            Newer
          </Link>
        </Button>
      ) : (
        <Button type="button" variant="outline" size="sm" disabled>
          <ChevronLeft className="size-4" />
          Newer
        </Button>
      )}

      {hasNext && nextCursor ? (
        <Button asChild variant="outline" size="sm">
          <Link href={nextHref}>
            Older
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      ) : (
        <Button type="button" variant="outline" size="sm" disabled>
          Older
          <ChevronRight className="size-4" />
        </Button>
      )}
    </div>
  );
}
