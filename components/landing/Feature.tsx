export default function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-6 space-y-3 transition-colors hover:border-foreground/20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 text-muted-foreground">{icon}</span>

        <h3 className="text-lg font-medium leading-tight">{title}</h3>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
