import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SEGMENTS, type Message, type Subscriber } from "@/lib/crm";
import { RapportCard } from "@/components/crm/RapportCard";

type Patch = Partial<Subscriber>;

export function ProfilePanel({
  subscriber,
  messages = [],
  onChange,
}: {
  subscriber: Subscriber | null;
  messages?: Message[];
  onChange: (patch: Patch) => void;
}) {
  if (!subscriber) {
    return (
      <div className="flex h-full items-center justify-center bg-sidebar px-6 text-center">
        <p className="text-xs text-muted-foreground">Select a subscriber to view their profile.</p>
      </div>
    );
  }

  const activeSubscriber = subscriber;


  const text = (
    key: keyof Subscriber,
    label: string,
    multiline = false,
  ) => (
    <div className="space-y-1.5" key={key as string}>
      <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {multiline ? (
        <Textarea
          rows={3}
          className="resize-none"
          defaultValue={(subscriber[key] as string) ?? ""}
          onBlur={(e) => onChange({ [key]: e.target.value } as Patch)}
        />
      ) : (
        <Input
          defaultValue={(subscriber[key] as string) ?? ""}
          onBlur={(e) => onChange({ [key]: e.target.value } as Patch)}
        />
      )}
    </div>
  );

  const num = (key: keyof Subscriber, label: string, step = "1") => (
    <div className="space-y-1.5" key={key as string}>
      <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <Input
        type="number"
        step={step}
        defaultValue={String(subscriber[key] ?? 0)}
        onBlur={(e) => onChange({ [key]: Number(e.target.value || 0) } as Patch)}
      />
    </div>
  );

  return (
    <div className="h-full overflow-y-auto bg-sidebar">
      <div className="border-b border-border px-4 py-3">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Profile</p>
        <p className="text-sm font-medium">
          {subscriber.first_name?.trim()
            ? `${subscriber.first_name} · ${subscriber.name}`
            : subscriber.name}
        </p>
      </div>
      <div key={subscriber.id} className="space-y-4 px-4 py-4">
        <RapportCard
          subscriber={activeSubscriber}
          messages={messages}
          onManualChange={(key, value) =>
            onChange({
              rapport: {
                ...((activeSubscriber.rapport ?? {}) as Record<string, unknown>),
                [key]: value,
              },
            } as Patch)
          }
        />
        {text("name", "Username")}
        {text("first_name", "First name")}
        {text("platform", "Platform")}
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Segment
          </Label>
          <Select
            value={subscriber.segment}
            onValueChange={(value) => onChange({ segment: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEGMENTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {num("sequence_day", "Sequence day")}
          {num("total_spent", "Total spent", "0.01")}
        </div>
        {num("last_ppv", "Last PPV", "0.01")}
        {text("job", "Job")}
        {text("location", "Location")}
        {text("relationship", "Relationship")}
        {text("interests", "Interests", true)}
        {text("preferences", "Preferences", true)}
        {text("notes", "Notes", true)}
      </div>
    </div>
  );
}
