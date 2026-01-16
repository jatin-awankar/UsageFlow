import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function MembersPage({
  params,
}: {
  params: Promise<{orgId: string}> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const resolvedParams = await Promise.resolve(params)
  const orgId = resolvedParams.orgId

  const members = await prisma.membership.findMany({
    where: { orgId },
    include: { user: true },
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Members</h1>

      <table className="w-full border">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Role</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="border-b">
              <td className="p-2">{m.user.email}</td>
              <td className="p-2">{m.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
