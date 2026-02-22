import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "./button";

type ErrorStateProps = {
  title?: string;
  description?: string;
  retry?: () => void;
  retryLabel?: string;
};

export default function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  retry,
  retryLabel = "Try again",
}: ErrorStateProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-rose-200/80 bg-linear-to-br from-white via-rose-50/50 to-orange-50/60 p-6 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="pointer-events-none absolute -top-20 right-0 h-52 w-52 rounded-full bg-rose-300/20 blur-3xl" />
      <div className="relative">
        <span className="inline-flex rounded-lg bg-rose-100 p-2 text-rose-700">
          <AlertTriangle className="size-5" />
        </span>
        <h3 className="mt-3 text-lg font-semibold text-rose-950">{title}</h3>
        <p className="mt-1 text-sm text-rose-800/85">{description}</p>

        {retry ? (
          <Button
            variant="destructive"
            onClick={retry}
            className="mt-4 hover:cursor-pointer"
          >
            <RefreshCcw className="size-4" />
            {retryLabel}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
