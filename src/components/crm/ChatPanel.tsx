import { MessageSquare, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Message, Subscriber } from "@/lib/crm";
import { cn } from "@/lib/utils";

export function ChatPanel({
  subscriber,
  messages,
  onSend,
  sending,
}: {
  subscriber: Subscriber | null;
  messages: Message[];
  onSend: (content: string) => Promise<void>;
  sending?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, subscriber?.id]);

  if (!subscriber) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-background px-6 text-center">
        <MessageSquare className="size-7 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No subscriber selected</p>
        <p className="text-xs text-muted-foreground">
          Pick someone from the list to open their thread.
        </p>
      </div>
    );
  }

  async function submit() {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    await onSend(content);
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="hidden items-center justify-between border-b border-border px-5 py-3 md:flex">
        <div>
          <p className="text-sm font-medium">{subscriber.name}</p>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {subscriber.segment} · day {subscriber.sequence_day}
          </p>
        </div>
        <span className="text-[11px] text-muted-foreground">{messages.length} messages</span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 md:px-5">
        {messages.length === 0 && (
          <p className="pt-10 text-center text-sm text-muted-foreground">
            No messages yet. Start the conversation below.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.role !== "subscriber";
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-xl border px-3 py-2",
                  mine
                    ? "border-primary/30 bg-primary/10"
                    : "border-border bg-card",
                )}
              >
                <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>{m.role}</span>
                  {m.sent_by && (
                    <span className="rounded border border-border px-1.5 py-px">{m.sent_by}</span>
                  )}
                  {m.imported && <span className="text-accent-foreground">imported</span>}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border p-3 md:p-4">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${subscriber.name}…`}
          rows={3}
          className="resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" disabled title="AI generation comes later">
            <Sparkles className="size-4" />
            Generate
          </Button>
          <Button size="sm" onClick={() => void submit()} disabled={sending || !draft.trim()}>
            <Send className="size-4" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
