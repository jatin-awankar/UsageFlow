type CalloutProps = {
  children: React.ReactNode;
  tone?: "info" | "warning";
};

export default function Callout({ children, tone = "info" }: CalloutProps) {
  const toneClass =
    tone === "warning"
      ? "border-amber-300 bg-amber-50/80 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
      : "border-sky-300 bg-sky-50/80 text-sky-950 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-100";

  return (
    <div className={`my-5 rounded-lg border p-4 text-sm leading-6 ${toneClass}`}>
      {children}
    </div>
  );
}
