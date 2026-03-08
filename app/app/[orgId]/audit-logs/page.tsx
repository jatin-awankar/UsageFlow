import { redirect } from "next/navigation";

import { getAuditLogs } from "@/actions/audit/getAuditLogs";
import AuditLogsEmptyState from "@/components/audit/AuditLogsEmptyState";
import AuditLogsList from "@/components/audit/AuditLogsList";
import AuditLogsOverview from "@/components/audit/AuditLogsOverview";
import AuditLogsPagination from "@/components/audit/AuditLogsPagination";
import PageHeader from "@/components/layout/PageHeader";
import { getCurrentUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
  searchParams:
    | Promise<{ cursor?: string; direction?: string }>
    | { cursor?: string; direction?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await Promise.resolve(params);
  const { cursor, direction } = await Promise.resolve(searchParams);

  const {
    data: logs,
    prevCursor,
    nextCursor,
    hasPrev,
    hasNext,
  } = await getAuditLogs({
    userId: user.id,
    orgId,
    pageSize: 10,
    cursor,
    direction: direction === "prev" ? "prev" : "next",
  });

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Review a chronological record of security-sensitive actions in this organization."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/${orgId}/members`}>Members</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/app/${orgId}/settings`}>
                Organization settings
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        }
      />

      {logs.length === 0 ? (
        <AuditLogsEmptyState orgId={orgId} />
      ) : (
        <section className="space-y-6">
          <AuditLogsOverview logs={logs} />
          <AuditLogsList logs={logs} />
          <AuditLogsPagination
            orgId={orgId}
            prevCursor={prevCursor}
            nextCursor={nextCursor}
            hasPrev={hasPrev}
            hasNext={hasNext}
          />
        </section>
      )}
    </>
  );
}
