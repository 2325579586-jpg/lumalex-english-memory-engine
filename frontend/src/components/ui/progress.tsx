import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-white/[0.075] shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)]", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-accent transition-all duration-500 ease-out"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
