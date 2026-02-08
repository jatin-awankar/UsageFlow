export default function LoadingState({
  label = "Loading...",
}: {
  label?: string;
}) {
  return (
    <div className="flex items-center justify-center rounded-lg border py-12">
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
