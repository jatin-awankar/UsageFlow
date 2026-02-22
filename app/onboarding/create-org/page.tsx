import AuthShell from "@/components/auth/AuthShell";
import CreateOrgForm from "@/components/forms/CreateOrgForm";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function CreateOrgPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }> | { error?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/onboarding/create-org");

  const resolvedSearchParams = await Promise.resolve(searchParams);

  const errorMessage =
    resolvedSearchParams.error === "duplicate"
      ? "An organization with this name already exists."
      : resolvedSearchParams.error === "failed"
        ? "Failed to create organization. Please try again."
        : null;

  return (
    <AuthShell
      eyebrow="Step 1 of 1"
      title="Create your organization"
      description="This workspace holds your metrics, plans, subscriptions, and team access."
      footer={
        <p className="text-xs text-slate-500">
          You can invite teammates and configure access controls after setup.
        </p>
      }
    >
      <CreateOrgForm userId={user.id} initialError={errorMessage} />
    </AuthShell>
  );
}
