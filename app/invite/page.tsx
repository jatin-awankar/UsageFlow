import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  Mail,
  Shield,
} from "lucide-react";
import { ReactNode } from "react";

import { getInviteByToken } from "@/actions/organization/getInviteByToken";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import AcceptInviteButton from "@/components/invite/AcceptInviteButton";
import SwitchAccountButton from "@/components/invite/SwitchAccountButton";
import { Button } from "@/components/ui/button";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function roleLabel(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export default async function InvitePage({
  searchParams,
}: {
  searchParams:
    | Promise<{ token?: string | string[] }>
    | { token?: string | string[] };
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const tokenValue = resolvedSearchParams.token;
  const token = Array.isArray(tokenValue)
    ? tokenValue[0]?.trim() || ""
    : tokenValue?.trim() || "";

  if (!token) {
    return (
      <InviteShell>
        <StateCard
          icon={<AlertTriangle className="size-5 text-amber-600" />}
          title="Missing invitation token"
          description="This invitation link is incomplete. Ask your admin to generate a fresh invite link."
          actions={
            <Button asChild variant="outline">
              <Link href="/login">Go to login</Link>
            </Button>
          }
        />
      </InviteShell>
    );
  }

  const invite = await getInviteByToken(token);
  if (!invite) {
    return (
      <InviteShell>
        <StateCard
          icon={<AlertTriangle className="size-5 text-amber-600" />}
          title="Invitation not found"
          description="This invitation may be invalid, revoked, or already replaced by a newer one."
          actions={
            <Button asChild variant="outline">
              <Link href="/login">Go to login</Link>
            </Button>
          }
        />
      </InviteShell>
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite?token=${token}`)}`);
  }

  const normalizedInviteEmail = invite.email.toLowerCase().trim();
  const normalizedUserEmail = user.email?.toLowerCase().trim() || "";
  const isExpired = invite.expiresAt <= new Date();
  const isEmailMismatch = normalizedInviteEmail !== normalizedUserEmail;

  const existingMembership = await prisma.membership.findUnique({
    where: {
      userId_orgId: {
        userId: user.id,
        orgId: invite.orgId,
      },
    },
    select: {
      id: true,
    },
  });

  const isAlreadyMember = Boolean(existingMembership);

  return (
    <InviteShell>
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700 sm:p-8">
        <div className="pointer-events-none absolute -top-20 right-0 h-52 w-52 rounded-full bg-sky-300/20 blur-3xl" />

        <div className="relative">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            <Building2 className="size-3.5" />
            UsageFlow invitation
          </p>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Join {invite.org.name}
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            You are invited as <strong>{roleLabel(invite.role)}</strong>.
          </p>

          <div className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:grid-cols-2">
            <p className="flex items-start gap-2 text-sm text-slate-700">
              <Mail className="mt-0.5 size-4 text-slate-500" />
              <span>
                <span className="block text-xs uppercase tracking-wide text-slate-500">
                  Invited email
                </span>
                {invite.email}
              </span>
            </p>
            <p className="flex items-start gap-2 text-sm text-slate-700">
              <Clock3 className="mt-0.5 size-4 text-slate-500" />
              <span>
                <span className="block text-xs uppercase tracking-wide text-slate-500">
                  Expires at
                </span>
                {dateFormatter.format(new Date(invite.expiresAt))}
              </span>
            </p>
          </div>

          <div className="mt-6">
            {isExpired ? (
              <StateCard
                icon={<AlertTriangle className="size-5 text-amber-600" />}
                title="Invitation expired"
                description="This invitation is no longer active. Ask your admin to send a new link."
                actions={
                  <Button asChild variant="outline" size="lg">
                    <Link href="/app">Open app</Link>
                  </Button>
                }
              />
            ) : isEmailMismatch ? (
              <StateCard
                icon={<Shield className="size-5 text-rose-600" />}
                title="Signed in with a different email"
                description={`This invite is for ${invite.email}. You are currently signed in as ${user.email}.`}
                actions={
                  <SwitchAccountButton
                    callbackPath={`/invite?token=${token}`}
                  />
                }
              />
            ) : isAlreadyMember ? (
              <StateCard
                icon={<CheckCircle2 className="size-5 text-emerald-600" />}
                title="You are already a member"
                description="No additional action is required. You already have access to this organization."
                actions={
                  <Button asChild size="lg">
                    <Link href={`/app/${invite.orgId}/dashboard`}>
                      Open organization
                    </Link>
                  </Button>
                }
              />
            ) : (
              <StateCard
                icon={<CheckCircle2 className="size-5 text-emerald-600" />}
                title="Ready to join"
                description="Accept this invitation to be added to the organization immediately."
                actions={<AcceptInviteButton token={token} />}
              />
            )}
          </div>
        </div>
      </section>
    </InviteShell>
  );
}

function InviteShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-linear-to-b from-slate-50 to-white px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">{children}</div>
    </main>
  );
}

function StateCard({
  icon,
  title,
  description,
  actions,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actions: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        {icon}
        {title}
      </p>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>
    </article>
  );
}
