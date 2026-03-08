"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const description =
    process.env.NODE_ENV === "development" && error.message
      ? error.message
      : "Something unexpected happened while loading this organization. Please retry.";

  return (
    <div className="mx-auto w-full max-w-3xl">
      <ErrorState
        title="Unable to load this workspace"
        description={description}
        retry={reset}
        retryLabel="Reload workspace or try logging again"
      />
    </div>
  );
}
