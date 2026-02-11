// app/onboarding/create-org/page.tsx
import CreateOrgForm from "@/components/forms/CreateOrgForm";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function CreateOrgPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }> | { error?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const resolvedSearchParams = await Promise.resolve(searchParams);

  const errorMessage =
    resolvedSearchParams.error === "duplicate"
      ? "An organization with this name already exists."
      : resolvedSearchParams.error === "failed"
      ? "Failed to create organization. Please try again."
      : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white border rounded-lg p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="text-xl font-semibold">UsageFlow</div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            Step 1 of 1
          </p>
          <h1 className="text-lg font-medium">Create your organization</h1>
          <p className="text-sm text-gray-500">
            This will be your workspace. You can rename it anytime.
          </p>
        </div>

        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

        <CreateOrgForm userId={user.id} />

        <p className="text-xs text-center text-gray-500">
          You can invite teammates later
        </p>
      </div>
    </div>
  );
}
