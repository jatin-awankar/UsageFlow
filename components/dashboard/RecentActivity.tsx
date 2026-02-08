export default function RecentActivity({
  logs,
}: {
  logs: {
    id: string;
    action: string;
    createdAt: Date;
  }[];
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-3 text-sm font-medium text-gray-700">
        Recent activity
      </h3>

      {logs.length === 0 ? (
        <p className="text-sm text-gray-500">No recent activity.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {logs.map((log) => (
            <li key={log.id} className="flex justify-between">
              <span className="text-gray-700">{log.action}</span>
              <span className="text-gray-400">
                {new Date(log.createdAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
