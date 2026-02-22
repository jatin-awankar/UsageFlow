const numberFormatter = new Intl.NumberFormat("en-IN");
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

type BreakdownRow = {
  metric: string;
  used: number;
  included: number;
  overage: number;
  pricePerUnit: number;
  cost: number;
};

export default function InvoiceBreakdown({
  planName,
  basePrice,
  invoiceAmount,
  rows,
}: {
  planName: string;
  basePrice: number;
  invoiceAmount: number;
  rows: BreakdownRow[];
}) {
  const sortedRows = [...rows].sort((a, b) => b.cost - a.cost);
  const maxCost = Math.max(...sortedRows.map((row) => row.cost), 1);

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:160ms]">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Usage breakdown
          </h3>
          <p className="text-sm text-slate-500">
            Cost composition for this invoice period
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-800">Base plan ({planName})</p>
          <p className="text-sm font-semibold text-slate-900">
            {currencyFormatter.format(basePrice)}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {sortedRows.length === 0 ? (
          <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 text-center text-sm text-slate-500">
            No metered overage charges for this period.
          </div>
        ) : (
          sortedRows.map((row, index) => {
            const width = Math.max(8, Math.round((row.cost / maxCost) * 100));

            return (
              <article
                key={`${row.metric}-${row.used}`}
                className="rounded-xl border border-slate-200/70 bg-slate-50/75 p-3 animate-in fade-in slide-in-from-left-2"
                style={{
                  animationDuration: "650ms",
                  animationDelay: `${index * 70}ms`,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800">{row.metric}</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {currencyFormatter.format(row.cost)}
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <span>Used: {numberFormatter.format(row.used)}</span>
                  <span>Included: {numberFormatter.format(row.included)}</span>
                  <span>Overage: {numberFormatter.format(row.overage)}</span>
                  <span>
                    Rate: {currencyFormatter.format(row.pricePerUnit)}
                  </span>
                </div>
              </article>
            );
          })
        )}
      </div>

      <div className="mt-4 border-t border-slate-200/80 pt-3">
        <div className="flex items-center justify-between gap-2 text-base font-semibold text-slate-900">
          <span>Total</span>
          <span>{currencyFormatter.format(invoiceAmount)}</span>
        </div>
      </div>
    </section>
  );
}
