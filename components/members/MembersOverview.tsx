import { ReactNode } from "react";
import { Crown, UserPlus2, Users, UserCog } from "lucide-react";
import { Role } from "@prisma/client";

const numberFormatter = new Intl.NumberFormat("en-IN");
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type MemberSummary = {
  id: string;
  role: Role;
  createdAt: Date;
};

export default function MembersOverview({
  members,
  pendingInviteCount,
}: {
  members: MemberSummary[];
  pendingInviteCount: number;
}) {
  const adminCount = members.filter(
    (member) => member.role === Role.OWNER || member.role === Role.ADMIN,
  ).length;

  const latestJoined =
    members.length > 0
      ? dateFormatter.format(
          new Date(
            Math.max(
              ...members.map((member) => new Date(member.createdAt).getTime()),
            ),
          ),
        )
      : "N/A";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-br from-white via-sky-50/35 to-cyan-50/35 p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-700">
      <div className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-sky-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-8 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />

      <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div>
          <p className="mb-2 inline-flex items-center rounded-full border border-slate-300/80 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600">
            Organization access
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Team membership
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Control who can access this organization and keep invitation flows
            clean and auditable.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SnapshotTile
            title="Members"
            value={numberFormatter.format(members.length)}
            icon={<Users className="size-4" />}
          />
          <SnapshotTile
            title="Admins"
            value={numberFormatter.format(adminCount)}
            icon={<Crown className="size-4" />}
          />
          <SnapshotTile
            title="Pending"
            value={numberFormatter.format(pendingInviteCount)}
            helper={`Latest join ${latestJoined}`}
            icon={<UserPlus2 className="size-4" />}
          />
        </div>
      </div>
    </section>
  );
}

function SnapshotTile({
  title,
  value,
  icon,
  helper,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  helper?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/85 p-3 shadow-sm backdrop-blur-sm transition-transform duration-300 hover:-translate-y-0.5">
      <div className="mb-2 inline-flex rounded-md bg-slate-100 p-2 text-slate-600">
        {icon}
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-base font-semibold text-slate-900">
        {title === "Admins" ? (
          <UserCog className="size-4 text-slate-500" />
        ) : null}
        {value}
      </p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}
