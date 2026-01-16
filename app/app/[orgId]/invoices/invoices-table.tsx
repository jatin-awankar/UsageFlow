// app/(dashboard)/usage/usage-table.tsx
"use client";

type InvoiceRow = {
  id: string;
  periodStart: Date;
  amount: number;
  status: string;
};

export function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
  return (
    <table className="w-full border">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-left">Period</th>
            <th className="p-2 text-left">Amount</th>
            <th className="p-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-b">
              <td className="p-2">
                {new Date(inv.periodStart).toDateString()}
              </td>
              <td className="p-2">₹{inv.amount}</td>
              <td className="p-2">{inv.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
  );
}
