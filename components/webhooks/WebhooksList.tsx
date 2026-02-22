import ToggleWebhookButton from "@/components/forms/ToggleWebhookButton";
import { WebhookEndpointStatusBadge } from "@/components/webhooks/WebhookStatusBadges";

function toSentenceCase(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function WebhooksList({
  userId,
  orgId,
  webhooks,
}: {
  userId: string;
  orgId: string;
  webhooks: {
    id: string;
    url: string;
    events: string[];
    active: boolean;
    createdAt: Date;
  }[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:120ms]">
      <div className="mb-4 flex items-end justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Endpoints</h3>
          <p className="text-sm text-slate-500">
            Toggle delivery state per endpoint
          </p>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {webhooks.map((webhook, index) => (
          <article
            key={webhook.id}
            className="rounded-xl border border-slate-200/70 bg-slate-50/75 p-3 animate-in fade-in slide-in-from-left-2"
            style={{
              animationDuration: "650ms",
              animationDelay: `${index * 65}ms`,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <code className="max-w-[68%] truncate text-xs text-slate-700">
                {webhook.url}
              </code>
              <WebhookEndpointStatusBadge active={webhook.active} />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {webhook.events.map(toSentenceCase).join(", ")}
            </p>
            <div className="mt-3">
              <ToggleWebhookButton
                userId={userId}
                orgId={orgId}
                webhookEndpointId={webhook.id}
                active={webhook.active}
              />
            </div>
          </article>
        ))}
      </div>

      <div className="hidden rounded-xl border border-slate-200 md:block">
        <div className="overflow-x-auto">
        <table className="min-w-[860px] w-full text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="w-[36%] px-4 py-3 text-left font-medium text-slate-600">
                Endpoint
              </th>
              <th className="w-[34%] px-4 py-3 text-left font-medium text-slate-600">
                Events
              </th>
              <th className="w-[14%] px-4 py-3 text-left font-medium text-slate-600">
                Status
              </th>
              <th className="w-[16%] px-4 py-3 text-right font-medium text-slate-600">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {webhooks.map((webhook, index) => (
              <tr
                key={webhook.id}
                className="border-b border-slate-200/80 last:border-0 animate-in fade-in"
                style={{
                  animationDuration: "650ms",
                  animationDelay: `${index * 45}ms`,
                }}
              >
                <td className="px-4 py-3">
                  <div className="max-w-full truncate font-mono text-xs text-slate-700">
                    {webhook.url}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="max-w-full truncate text-slate-700">
                  {webhook.events.map(toSentenceCase).join(", ")}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <WebhookEndpointStatusBadge active={webhook.active} />
                </td>
                <td className="px-4 py-3 text-right">
                  <ToggleWebhookButton
                    userId={userId}
                    orgId={orgId}
                    webhookEndpointId={webhook.id}
                    active={webhook.active}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </section>
  );
}
