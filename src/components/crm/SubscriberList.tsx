import { CheckSquare, Plus, Square, Trash2, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { money, segmentClasses, type Subscriber } from "@/lib/crm";
import { rapportScore, rapportTier } from "@/lib/rapport";
import { cn } from "@/lib/utils";

export function SubscriberList({
  subscribers,
  selectedId,
  onSelect,
  onAdd,
  adding,
  headerAction,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  onBulkDelete,
}: {
  subscribers: Subscriber[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  adding?: boolean;
  headerAction?: ReactNode;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onBulkDelete?: () => void;
}) {
  const allSelected = subscribers.length > 0 && selectedIds.length === subscribers.length;

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <p className="font-display text-sm font-semibold tracking-[0.22em] text-primary">
            SCARLETT
          </p>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {subscribers.length} subscribers
            {selectedIds.length > 0 && ` · ${selectedIds.length} selected`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {onToggleSelectAll && subscribers.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              title={allSelected ? "Deselect all" : "Select all"}
              onClick={onToggleSelectAll}
            >
              {allSelected ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
            </Button>
          )}
          {onBulkDelete && selectedIds.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Delete selected">
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {selectedIds.length} subscribers?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the selected subscribers and all of their messages.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onBulkDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
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
            {subscribers.map((s) => {
              const score = rapportScore(s);
              const tier = rapportTier(score);
              return (
                <li key={s.id}>
                  <div
                    className={cn(
                      "flex items-start gap-2 px-3 py-3 transition-colors hover:bg-sidebar-accent",
                      selectedId === s.id && "bg-sidebar-accent border-l-2 border-primary",
                    )}
                  >
                    {onToggleSelect && (
                      <Checkbox
                        className="mt-1"
                        checked={selectedIds.includes(s.id)}
                        onCheckedChange={() => onToggleSelect(s.id)}
                        aria-label={`Select ${s.name}`}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => onSelect(s.id)}
                      className="min-w-0 flex-1 text-left"
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
                      <div className="mt-1 flex items-center gap-2 text-[11px]">
                        <span className={cn("font-medium", tier.text)}>
                          Rapport {score} · {tier.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>Day {s.sequence_day}</span>
                        <span>{money(s.total_spent)}</span>
                        {s.platform && <span className="truncate">{s.platform}</span>}
                      </div>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
