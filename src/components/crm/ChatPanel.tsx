import {
  CalendarPlus,
  Check,
  Copy,
  Eraser,
  MessageSquare,
  MoreVertical,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  buildSystemPrompt,
  chatCompletion,
  FALLBACK_MODELS,
  getPersona,
  getSettings,
  toChatHistory,
} from "@/lib/openrouter";
import type { Message, Subscriber } from "@/lib/crm";
import { cn } from "@/lib/utils";

export function ChatPanel({
  subscriber,
  messages,
  onSend,
  sending,
  onDeleteSubscriber,
  onClearChat,
  onAdvanceDay,
}: {
  subscriber: Subscriber | null;
  messages: Message[];
  onSend: (content: string) => Promise<void>;
  sending?: boolean;
  onDeleteSubscriber?: () => void;
  onClearChat?: () => void;
  onAdvanceDay?: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [generating, setGenerating] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [confirm, setConfirm] = useState<"delete" | "clear" | null>(null);
  const endRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, subscriber?.id]);

  useEffect(() => {
    setSuggestion("");
    setRemaining(0);
  }, [subscriber?.id]);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

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

  const activeSubscriber = subscriber;

  async function submit(content: string, clear: () => void) {
    const trimmed = content.trim();
    if (!trimmed) return;
    clear();
    await onSend(trimmed);
  }

  async function generate() {
    setGenerating(true);
    try {
      const [settings, persona] = await Promise.all([getSettings(), getPersona()]);
      if (!settings.openrouter_api_key) throw new Error("Add an OpenRouter API key in Settings");
      const content = await chatCompletion({
        apiKey: settings.openrouter_api_key,
        model: settings.default_model || FALLBACK_MODELS[0]!,
        temperature: 0.85,
        maxTokens: 300,
        messages: [
          { role: "system", content: buildSystemPrompt(persona, activeSubscriber) },
          ...toChatHistory(messages),
        ],
      });
      setSuggestion(content);
      setRemaining(Math.floor(Math.random() * (480 - 120 + 1)) + 120);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
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
          const mine = m.role !== "subscriber" && m.role !== "user";
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-xl border px-3 py-2",
                  mine ? "border-primary/30 bg-primary/10" : "border-border bg-card",
                )}
              >
                <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>{m.role}</span>
                  {m.sent_by && (
                    <span className="rounded border border-border px-1.5 py-px">{m.sent_by}</span>
                  )}
                  {m.imported && <span className="text-accent-foreground">imported</span>}
                  {mine && <CopyButton value={m.content} />}
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
              void submit(draft, () => setDraft(""));
            }
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" disabled={generating} onClick={() => void generate()}>
            <Sparkles className="size-4" />
            {generating ? "Generating…" : "Generate"}
          </Button>
          <Button
            size="sm"
            onClick={() => void submit(draft, () => setDraft(""))}
            disabled={sending || !draft.trim()}
          >
            <Send className="size-4" />
            Send
          </Button>
        </div>

        {suggestion && (
          <div className="mt-3 space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>AI suggestion — review before sending</span>
              <span className={cn(remaining <= 0 && "text-primary")}>
                {remaining > 0 ? `Send in ${remaining}s` : "Ready to send"}
              </span>
            </div>
            <Textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              rows={4}
              className="resize-none bg-background"
            />
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSuggestion("")}>
                Discard
              </Button>
              <Button
                size="sm"
                disabled={sending || !suggestion.trim()}
                onClick={() =>
                  void submit(suggestion, () => {
                    setSuggestion("");
                    setRemaining(0);
                  })
                }
              >
                <Send className="size-4" />
                Send
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="ml-auto inline-flex items-center gap-1 rounded border border-border px-1.5 py-px hover:text-foreground"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "copied" : "copy"}
    </button>
  );
}
