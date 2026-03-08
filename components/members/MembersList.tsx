import { Role } from "@prisma/client";

import { RoleBadge } from "@/components/members/RoleBadge";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default function MembersList({
  members,
  currentUserId,
}: {
  currentUserId: string;
  members: {
    id: string;
    userId: string;
    role: Role;
    createdAt: Date;
    user: {
      name: string | null;
      email: string;
    };
  }[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-md shadow-slate-900/5 animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:120ms]">
      <div className="mb-4 flex items-end justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Members</h3>
          <p className="text-sm text-slate-500">
            Active collaborators with organization access
          </p>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {members.map((member, index) => (
          <article
            key={member.id}
            className="rounded-xl border border-slate-200/70 bg-slate-50/85 p-3 animate-in fade-in slide-in-from-left-2"
            style={{
              animationDuration: "650ms",
              animationDelay: `${index * 55}ms`,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {member.user.name || member.user.email}
                </p>
                <p className="truncate text-xs text-slate-500">{member.user.email}</p>
              </div>
              <RoleBadge role={member.role} />
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <p>Joined {dateFormatter.format(new Date(member.createdAt))}</p>
              {member.userId === currentUserId ? (
                <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                  You
                </span>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <div className="hidden rounded-xl border border-slate-200 md:block">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="w-[44%] px-4 py-3 text-left font-medium text-slate-600">
                  Member
                </th>
                <th className="w-[20%] px-4 py-3 text-left font-medium text-slate-600">
                  Role
                </th>
                <th className="w-[20%] px-4 py-3 text-left font-medium text-slate-600">
                  Joined
                </th>
                <th className="w-[16%] px-4 py-3 text-right font-medium text-slate-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member, index) => (
                <tr
                  key={member.id}
                  className="border-b border-slate-200/80 last:border-0 animate-in fade-in"
                  style={{
                    animationDuration: "650ms",
                    animationDelay: `${index * 40}ms`,
                  }}
                >
                  <td className="px-4 py-3">
                    <p className="truncate font-medium text-slate-900">
                      {member.user.name || member.user.email}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {member.user.email}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={member.role} />
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {dateFormatter.format(new Date(member.createdAt))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {member.userId === currentUserId ? (
                      <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                        You
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
