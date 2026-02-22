import RevokeApiKeyButton from "@/components/forms/RevokeApiKeyButton";
import ApiKeyStatusBadge from "@/components/apiKeys/ApiKeyStatusBadge";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default function ApiKeysList({
  userId,
  orgId,
  keys,
}: {
  userId: string;
  orgId: string;
  keys: {
    id: string;
    name: string;
    active: boolean;
    createdAt: Date;
  }[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:120ms]">
      <div className="mb-4 flex items-end justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Keys</h3>
          <p className="text-sm text-slate-500">
            Revoke compromised credentials immediately
          </p>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {keys.map((key, index) => (
          <article
            key={key.id}
            className="rounded-xl border border-slate-200/70 bg-slate-50/75 p-3 animate-in fade-in slide-in-from-left-2"
            style={{
              animationDuration: "650ms",
              animationDelay: `${index * 65}ms`,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-900">{key.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Created {dateFormatter.format(new Date(key.createdAt))}
                </p>
              </div>
              <ApiKeyStatusBadge active={key.active} />
            </div>
            {key.active ? (
              <div className="mt-3">
                <RevokeApiKeyButton userId={userId} orgId={orgId} apiKeyId={key.id} />
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Name
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Created
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Status
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key, index) => (
              <tr
                key={key.id}
                className="border-b border-slate-200/80 last:border-0 animate-in fade-in"
                style={{
                  animationDuration: "650ms",
                  animationDelay: `${index * 45}ms`,
                }}
              >
                <td className="px-4 py-3 font-medium text-slate-900">{key.name}</td>
                <td className="px-4 py-3 text-slate-700">
                  {dateFormatter.format(new Date(key.createdAt))}
                </td>
                <td className="px-4 py-3">
                  <ApiKeyStatusBadge active={key.active} />
                </td>
                <td className="px-4 py-3 text-right">
                  {key.active ? (
                    <RevokeApiKeyButton
                      userId={userId}
                      orgId={orgId}
                      apiKeyId={key.id}
                    />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
