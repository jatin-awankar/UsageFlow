import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { getMembers } from "@/actions/members/getMembers";
import { getPendingInvites } from "@/actions/members/getPendingInvites";
import InviteMemberForm from "@/components/forms/InviteMemberForm";
import PageHeader from "@/components/layout/PageHeader";
import MembersEmptyState from "@/components/members/MembersEmptyState";
import MembersList from "@/components/members/MembersList";
import MembersOverview from "@/components/members/MembersOverview";
import PendingInvitesList from "@/components/members/PendingInvitesList";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await Promise.resolve(params);

  const [members, pendingInvites] = await Promise.all([
    getMembers(user.id, orgId),
    getPendingInvites(user.id, orgId),
  ]);

  return (
    <>
      <PageHeader
        title="Members"
        description="Manage organization access, invitations, and teammate permissions."
        actions={<InviteMemberForm orgId={orgId} />}
      />

      {members.length === 0 ? (
        <MembersEmptyState orgId={orgId} />
      ) : (
        <section className="space-y-6">
          <MembersOverview
            members={members}
            pendingInviteCount={pendingInvites.length}
          />

          <div className="grid gap-6">
            <MembersList members={members} currentUserId={user.id} />
            <PendingInvitesList orgId={orgId} invites={pendingInvites} />
          </div>
        </section>
      )}
    </>
  );
}
