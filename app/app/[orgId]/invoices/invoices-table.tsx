"use client";

type InvoiceRow = {
  id: string;
  periodStart: Date;
  periodEnd?: Date;
  amount: number;
  status: "PAID" | "PENDING" | "FAILED";
};

export function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-gray-600">
              Billing period
            </th>
            <th className="px-4 py-2 text-left font-medium text-gray-600">
              Amount
            </th>
            <th className="px-4 py-2 text-left font-medium text-gray-600">
              Status
            </th>
          </tr>
        </thead>

        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-b last:border-0">
              <td className="px-4 py-2 text-gray-700">
                {new Date(inv.periodStart).toLocaleDateString()}
                {inv.periodEnd && (
                  <span className="text-gray-400">
                    {" "}
                    – {new Date(inv.periodEnd).toLocaleDateString()}
                  </span>
                )}
              </td>

              <td className="px-4 py-2 font-medium text-gray-900">
                ₹{inv.amount.toLocaleString()}
              </td>

              <td className="px-4 py-2">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    inv.status === "PAID"
                      ? "bg-green-100 text-green-700"
                      : inv.status === "PENDING"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {inv.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
