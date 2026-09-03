import { Plus, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { money, segmentClasses, type Subscriber } from "@/lib/crm";
import { cn } from "@/lib/utils";

export function SubscriberList({
  subscribers,
  selectedId,
  onSelect,
  onAdd,
  adding,
  headerAction,
}: {
  subscribers: Subscriber[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  adding?: boolean;
  headerAction?: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <p className="font-display text-sm font-semibold tracking-[0.22em] text-primary">
            SCARLETT
          </p>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {subscribers.length} subscribers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {headerAction}
          <Button size="sm" onClick={onAdd} disabled={adding}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {subscribers.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <Users className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No subscribers yet</p>
            <p className="text-xs text-muted-foreground">
              Add your first subscriber to start a thread.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {subscribers.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className={cn(
                    "w-full px-4 py-3 text-left transition-colors hover:bg-sidebar-accent",
                    selectedId === s.id && "bg-sidebar-accent border-l-2 border-primary",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{s.name}</span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider",
                        segmentClasses(s.segment),
                      )}
                    >
                      {s.segment}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>Day {s.sequence_day}</span>
                    <span>{money(s.total_spent)}</span>
                    {s.platform && <span className="truncate">{s.platform}</span>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
