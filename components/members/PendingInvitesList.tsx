import { Role } from "@prisma/client";
import { Clock3, Mail, Send } from "lucide-react";

import PendingInviteActions from "@/components/members/PendingInviteActions";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function timeUntil(expiresAt: Date) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";

  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h left`;

  const days = Math.floor(hours / 24);
  return `${days}d left`;
}

function toTitleCase(role: Role) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export default function PendingInvitesList({
  orgId,
  invites,
}: {
  orgId: string;
  invites: {
    id: string;
    email: string;
    role: Role;
    token: string;
    expiresAt: Date;
    createdAt: Date;
  }[];
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const buildInviteUrl = (token: string) =>
    appUrl ? `${appUrl}/invite?token=${token}` : `/invite?token=${token}`;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:180ms]">
      <div className="mb-4 flex items-end justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Pending invites</h3>
          <p className="text-sm text-slate-500">
            Invitations that are not yet accepted
          </p>
        </div>
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
          {invites.length}
        </span>
      </div>

      {invites.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-5 text-center">
          <p className="text-sm font-medium text-slate-700">No pending invitations</p>
          <p className="mt-1 text-xs text-slate-500">
            New invites will appear here until accepted or canceled.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {invites.map((invite, index) => {
              const inviteUrl = buildInviteUrl(invite.token);

              return (
                <article
                  key={invite.id}
                  className="rounded-xl border border-slate-200/70 bg-slate-50/75 p-3 animate-in fade-in slide-in-from-left-2"
                  style={{
                    animationDuration: "650ms",
                    animationDelay: `${index * 55}ms`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {invite.email}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Role {toTitleCase(invite.role)}
                      </p>
                    </div>
                    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      {timeUntil(invite.expiresAt)}
                    </span>
                  </div>

                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock3 className="size-3.5" />
                    Expires {dateTimeFormatter.format(new Date(invite.expiresAt))}
                  </p>

                  <div className="mt-3">
                    <PendingInviteActions
                      inviteId={invite.id}
                      orgId={orgId}
                      inviteUrl={inviteUrl}
                    />
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden rounded-xl border border-slate-200 md:block">
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-sm">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="w-[36%] px-4 py-3 text-left font-medium text-slate-600">
                      Invitee
                    </th>
                    <th className="w-[14%] px-4 py-3 text-left font-medium text-slate-600">
                      Role
                    </th>
                    <th className="w-[26%] px-4 py-3 text-left font-medium text-slate-600">
                      Expires
                    </th>
                    <th className="w-[24%] px-4 py-3 text-right font-medium text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite, index) => {
                    const inviteUrl = buildInviteUrl(invite.token);

                    return (
                      <tr
                        key={invite.id}
                        className="border-b border-slate-200/80 last:border-0 animate-in fade-in"
                        style={{
                          animationDuration: "650ms",
                          animationDelay: `${index * 40}ms`,
                        }}
                      >
                        <td className="px-4 py-3">
                          <p className="flex items-center gap-1.5 font-medium text-slate-900">
                            <Mail className="size-3.5 text-slate-500" />
                            <span className="truncate">{invite.email}</span>
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Sent {dateTimeFormatter.format(new Date(invite.createdAt))}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {toTitleCase(invite.role)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-700">
                            {dateTimeFormatter.format(new Date(invite.expiresAt))}
                          </p>
                          <p className="mt-1 text-xs text-amber-700">
                            {timeUntil(invite.expiresAt)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <PendingInviteActions
                            inviteId={invite.id}
                            orgId={orgId}
                            inviteUrl={inviteUrl}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-xs text-slate-500">
            <p className="flex items-center gap-1.5 font-medium text-slate-700">
              <Send className="size-3.5" />
              Invitation links expire in 48 hours.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
