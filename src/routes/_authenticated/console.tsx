import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, LogOut, Settings as SettingsIcon, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { SubscriberList } from "@/components/crm/SubscriberList";
import { ChatPanel } from "@/components/crm/ChatPanel";
import { ProfilePanel } from "@/components/crm/ProfilePanel";
import { IngestDialog } from "@/components/crm/IngestDialog";
import { extractProfileFromMessage, getSettings } from "@/lib/openrouter";
import { money, segmentClasses, type Message, type Subscriber } from "@/lib/crm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/console")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Console — Scarlett CRM" },
      {
        name: "description",
        content: "Manage subscribers, chat threads and profile details in the Scarlett CRM console.",
      },
      { property: "og:title", content: "Console — Scarlett CRM" },
      {
        property: "og:description",
        content: "Manage subscribers, chat threads and profile details in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Console,
});

function Console() {
  const navigate = useNavigate();
  const [role, setRole] = useState<"operator" | "creator" | null>(null);
  const [email, setEmail] = useState<string>("");
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [sending, setSending] = useState(false);
  const [mobileChat, setMobileChat] = useState(false);

  const selected = useMemo(
    () => subscribers.find((s) => s.id === selectedId) ?? null,
    [subscribers, selectedId],
  );

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setEmail(data.user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      const metaRole = (data.user.user_metadata as { role?: string } | null)?.role;
      setRole((profile?.role || metaRole || "creator") as "operator" | "creator");
    });
  }, []);

  const loadSubscribers = useCallback(async () => {
    const { data, error } = await supabase
      .from("subscribers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setSubscribers(data ?? []);
  }, []);

  useEffect(() => {
    void loadSubscribers();
    const channel = supabase
      .channel("crm-subscribers")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscribers" },
        () => void loadSubscribers(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadSubscribers]);

  const loadMessages = useCallback(async (subscriberId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("subscriber_id", subscriberId)
      .order("timestamp", { ascending: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    setMessages(data ?? []);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedId);
    const channel = supabase
      .channel(`crm-messages-${selectedId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `subscriber_id=eq.${selectedId}` },
        () => void loadMessages(selectedId),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedId, loadMessages]);

  // Auto profile extraction from the latest incoming message.
  const extractedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const last = [...messages].reverse().find((m) => m.role === "user" || m.role === "subscriber");
    if (!last || last.imported || extractedRef.current.has(last.id)) return;
    const target = subscribers.find((s) => s.id === last.subscriber_id);
    if (!target) return;
    extractedRef.current.add(last.id);
    void (async () => {
      try {
        const settings = await getSettings();
        if (!settings.openrouter_api_key) return;
        const facts = await extractProfileFromMessage(settings.openrouter_api_key, last.content);
        const patch: Partial<Subscriber> = {};
        if (!target.location && facts.location) patch.location = String(facts.location);
        if (!target.job && facts.job) patch.job = String(facts.job);
        if (!target.relationship && facts.relationship) {
          patch.relationship = String(facts.relationship);
        }
        const hobbies = facts.hobbies ?? facts.interests;
        if (!target.interests && hobbies) patch.interests = String(hobbies);
        const noteBits = [
          facts.name ? `Name: ${facts.name}` : null,
          facts.age ? `Age: ${facts.age}` : null,
        ].filter(Boolean);
        if (!target.notes && noteBits.length) patch.notes = noteBits.join("\n");
        if (Object.keys(patch).length === 0) return;
        const { error } = await supabase.from("subscribers").update(patch).eq("id", target.id);
        if (error) return;
        setSubscribers((prev) =>
          prev.map((s) => (s.id === target.id ? { ...s, ...patch } : s)),
        );
        toast.success("Profile updated");
      } catch {
        // background extraction stays silent on failure
      }
    })();
  }, [messages, subscribers]);


  async function addSubscriber() {
    setAdding(true);
    const { data, error } = await supabase
      .from("subscribers")
      .insert({ name: "New subscriber" })
      .select()
      .single();
    setAdding(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSubscribers((prev) => [data, ...prev]);
    setSelectedId(data.id);
  }

  async function updateSubscriber(patch: Partial<Subscriber>) {
    if (!selected) return;
    const previous = selected;
    setSubscribers((prev) =>
      prev.map((s) => (s.id === previous.id ? { ...s, ...patch } : s)),
    );
    const { error } = await supabase.from("subscribers").update(patch).eq("id", previous.id);
    if (error) {
      toast.error(error.message);
      setSubscribers((prev) => prev.map((s) => (s.id === previous.id ? previous : s)));
    }
  }

  async function sendMessage(content: string) {
    if (!selected) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      subscriber_id: selected.id,
      role: "operator",
      content,
      sent_by: email || "operator",
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    void loadMessages(selected.id);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const header = (
    <header className="flex items-center justify-between border-b border-border px-4 py-2">
      <div className="flex items-center gap-2">
        {mobileChat && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileChat(false)}
          >
            <ArrowLeft className="size-4" />
          </Button>
        )}
        <span className="font-display text-xs tracking-[0.28em] text-primary">SCARLETT CRM</span>
        {role && (
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            {role}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {role === "operator" && (
          <Button
            variant="ghost"
            size="sm"
            className="hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:inline-flex"
            onClick={() => toast.info(`${email || "unknown"} — ${role}`)}
          >
            Debug identity
          </Button>
        )}
        {role === "operator" && (
          <Button
            variant="ghost"
            size="icon"
            title="Settings"
            onClick={() => navigate({ to: "/settings" })}
          >
            <SettingsIcon className="size-4" />
          </Button>
        )}
        {selected && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <User className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88vw] p-0 sm:max-w-sm">
              <SheetTitle className="sr-only">Subscriber profile</SheetTitle>
              <ProfilePanel subscriber={selected} onChange={updateSubscriber} />
            </SheetContent>
          </Sheet>
        )}
        <Button variant="ghost" size="icon" onClick={() => void signOut()}>
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );

  if (role === "creator") {
    return (
      <div className="flex h-screen flex-col bg-background">
        {header}
        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-64 shrink-0 border-r border-border md:block">
            <SubscriberList
              subscribers={subscribers}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAdd={addSubscriber}
              adding={adding}
            />
          </aside>
          <main className="min-w-0 flex-1">
            {!mobileChat && (
              <div className="h-full md:hidden">
                <MobileList
                  subscribers={subscribers}
                  onSelect={(id) => {
                    setSelectedId(id);
                    setMobileChat(true);
                  }}
                />
              </div>
            )}
            <div className={cn("h-full", !mobileChat && "hidden md:block")}>
              <ChatPanel
                subscriber={selected}
                messages={messages}
                onSend={sendMessage}
                sending={sending}
              />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {header}
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 border-r border-border md:block">
          <SubscriberList
            subscribers={subscribers}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAdd={addSubscriber}
            adding={adding}
          />
        </aside>

        <main className="min-w-0 flex-1">
          {!mobileChat && (
            <div className="h-full md:hidden">
              <MobileList
                subscribers={subscribers}
                onAdd={addSubscriber}
                onSelect={(id) => {
                  setSelectedId(id);
                  setMobileChat(true);
                }}
              />
            </div>
          )}
          <div className={cn("h-full", !mobileChat && "hidden md:block")}>
            <ChatPanel
              subscriber={selected}
              messages={messages}
              onSend={sendMessage}
              sending={sending}
            />
          </div>
        </main>

        <aside className="hidden w-80 shrink-0 border-l border-border lg:block">
          <ProfilePanel subscriber={selected} onChange={updateSubscriber} />
        </aside>
      </div>
    </div>
  );
}

function MobileList({
  subscribers,
  onSelect,
  onAdd,
}: {
  subscribers: Subscriber[];
  onSelect: (id: string) => void;
  onAdd?: () => void;
}) {
  return (
    <div className="h-full overflow-y-auto p-3">
      {onAdd && (
        <Button className="mb-3 w-full" onClick={onAdd}>
          Add subscriber
        </Button>
      )}
      {subscribers.length === 0 ? (
        <p className="pt-16 text-center text-sm text-muted-foreground">No subscribers yet</p>
      ) : (
        <ul className="space-y-2">
          {subscribers.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                className="w-full rounded-lg border border-border bg-card px-3 py-3 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{s.name}</span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider",
                      segmentClasses(s.segment),
                    )}
                  >
                    {s.segment}
                  </span>
                </div>
                <div className="mt-1 flex gap-3 text-[11px] text-muted-foreground">
                  <span>Day {s.sequence_day}</span>
                  <span>{money(s.total_spent)}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
