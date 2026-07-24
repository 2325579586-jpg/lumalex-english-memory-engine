import { Card, CardContent } from "@/components/ui/card";

type FullPageStatusProps = {
  eyebrow: string;
  title: string;
  description?: string;
  error?: boolean;
  compact?: boolean;
};

export function FullPageStatus({ eyebrow, title, description, error = false, compact = false }: FullPageStatusProps) {
  return (
    <div
      className={`flex items-center justify-center bg-background px-6 text-foreground ${compact ? "min-h-[50vh]" : "min-h-[100dvh]"}`}
    >
      <Card className="w-full max-w-lg" role={error ? "alert" : "status"} aria-live="polite">
        <CardContent className="space-y-3 p-8">
          <p className={`text-xs uppercase tracking-[0.28em] ${error ? "text-destructive" : "text-muted"}`}>{eyebrow}</p>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
