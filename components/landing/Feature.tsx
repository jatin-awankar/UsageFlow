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
    <div className="flex items-start gap-4">
      <span className="h-5 w-5 text-muted-foreground mt-1">{icon}</span>
      <div className="rounded-xl border border-border bg-background p-6 space-y-3 hover:border-foreground/20 transition-colors">
        {/* Title */}
        <h3 className="text-lg font-medium leading-tight">{title}</h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
