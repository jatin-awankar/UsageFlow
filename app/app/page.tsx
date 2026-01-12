import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AppHome() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">
        Welcome to UsageFlow
      </h1>
      <p>You are authenticated.</p>
    </div>
  );
}
