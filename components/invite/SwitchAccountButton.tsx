"use client";

import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export default function SwitchAccountButton({
  callbackPath,
}: {
  callbackPath: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);

    await signOut({
      callbackUrl: `/login?next=${encodeURIComponent(callbackPath)}`,
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={handleClick}
      disabled={loading}
      className="hover:cursor-pointer"
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Signing out...
        </>
      ) : (
        <>
          <LogOut className="size-4" />
          Switch account
        </>
      )}
    </Button>
  );
}
