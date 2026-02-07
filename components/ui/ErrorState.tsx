import { Button } from "./button";

type ErrorStateProps = {
  title?: string;
  description?: string;
  retry?: () => void;
};

export default function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  retry,
}: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4">
      <h3 className="text-sm font-semibold text-red-800">{title}</h3>
      <p className="mt-1 text-sm text-red-700">{description}</p>

      {retry && (
        <Button
          variant="destructive"
          onClick={retry}
          className="mt-3 hover:cursor-pointer"
        >
          Try again
        </Button>
      )}
    </div>
  );
}
