// onboarding/create-org/page.tsx
import { createOrganization } from "@/actions/organization/createOrganization";
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
      ? "An organization with this name already exists"
      : resolvedSearchParams.error === "failed"
      ? "Failed to create organization. Please try again."
      : null;

  async function action(formData: FormData) {
    "use server";
    if (!user) redirect("/login");

    const name = formData.get("name") as string;
    const result = await createOrganization({ name }, user.id);

    if ("error" in result) {
      const errorParam =
        result.error === "An organization with this name already exists"
          ? "duplicate"
          : "failed";
      redirect(`/onboarding/create-org?error=${errorParam}`);
    }

    redirect(`/app/${result.org.id}/dashboard`);
  }

  return (
    <div className="max-w-md mx-auto mt-24">
      <h1 className="text-2xl font-semibold mb-4">Create your organization</h1>

      <form action={action} className="space-y-4">
        <input
          name="name"
          placeholder="Organization name"
          required
          className="w-full border p-2"
        />

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {errorMessage}
          </div>
        )}
        <button className="w-full bg-black text-white p-2">
          Create Organization
        </button>
      </form>
    </div>
  );
}
