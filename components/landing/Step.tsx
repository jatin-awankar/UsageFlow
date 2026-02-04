export default function Step({
  number,
  title,
  desc,
}: {
  number: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex-1 rounded-lg border bg-background p-6 space-y-3 shadow-2xl">
      {/* Step number */}
      <span className="inline-block rounded bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">
        {number}
      </span>

      {/* Title */}
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
