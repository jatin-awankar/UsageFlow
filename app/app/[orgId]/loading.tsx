// app/app/[orgId]/loading.tsx
export default function Loading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page title */}
      <div className="h-7 w-48 rounded-md bg-gray-200 animate-pulse" />

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="h-24 rounded-lg bg-gray-200 animate-pulse" />
        <div className="h-24 rounded-lg bg-gray-200 animate-pulse" />
        <div className="h-24 rounded-lg bg-gray-200 animate-pulse" />
      </div>

      {/* Main table / chart */}
      <div className="h-64 rounded-lg bg-gray-200 animate-pulse" />
    </div>
  );
}
