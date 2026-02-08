import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { getMembers } from "@/actions/members/getMembers";
import { RoleBadge } from "@/components/members/RoleBadge";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await params;
  const members = await getMembers(user.id, orgId);

  return (
    <>
      <PageHeader
        title="Members"
        description="Manage who has access to this organization."
      />

      {members.length === 0 ? (
        <EmptyState
          title="No members"
          description="Invite teammates to collaborate in this organization."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Email
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Role
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="px-4 py-2 text-gray-900">{m.user.email}</td>
                  <td className="px-4 py-2">
                    <RoleBadge role={m.role} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
