import { Slider } from "@/components/ui/slider";
import { rapportIndicators, rapportScore, rapportTier } from "@/lib/rapport";
import type { Message, Subscriber } from "@/lib/crm";
import { cn } from "@/lib/utils";

export function RapportCard({
  subscriber,
  messages,
  onManualChange,
}: {
  subscriber: Subscriber;
  messages: Message[];
  onManualChange: (key: string, value: number) => void;
}) {
  const indicators = rapportIndicators(subscriber, messages);
  const score = rapportScore(subscriber, messages);
  const tier = rapportTier(score);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-3">
      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-2">
          <span className={cn("font-display text-3xl font-semibold", tier.text)}>{score}</span>
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
            rapport
          </span>
        </div>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider",
            tier.badge,
          )}
        >
          {tier.label}
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", tier.bar)}
          style={{ width: `${score}%` }}
        />
      </div>

      <div className="space-y-2.5 pt-1">
        {indicators.map((ind) => (
          <div key={ind.key} className="space-y-1">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="truncate">
                {ind.label} · {ind.weight}%
              </span>
              <span className="flex items-center gap-1.5">
                {!ind.manual && <span className="opacity-60">auto</span>}
                <span className="text-foreground">{ind.value}</span>
              </span>
            </div>
            {ind.manual ? (
              <Slider
                value={[ind.value]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) => onManualChange(ind.key, v[0] ?? 0)}
              />
            ) : (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${ind.value}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
