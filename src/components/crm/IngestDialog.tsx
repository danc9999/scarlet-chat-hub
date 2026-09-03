import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { extractConversation, getSettings } from "@/lib/openrouter";

export function IngestDialog({ onImported }: { onImported?: (subscriberId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [scarlett, setScarlett] = useState("freckledwho");
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!transcript.trim()) return;
    setBusy(true);
    try {
      const settings = await getSettings();
      if (!settings.openrouter_api_key) throw new Error("Add an OpenRouter API key in Settings");
      const result = await extractConversation(
        settings.openrouter_api_key,
        transcript.trim(),
        scarlett.trim() || "freckledwho",
      );

      const username = (result.username ?? "").trim() || "Imported subscriber";
      const { data: existing } = await supabase
        .from("subscribers")
        .select("*")
        .eq("name", username)
        .maybeSingle();

      const notesParts = [
        result.name ? `Name: ${result.name}` : null,
        result.age ? `Age: ${result.age}` : null,
        result.notes ?? null,
      ].filter(Boolean);

      const profile = {
        name: username,
        platform: "reddit",
        location: result.location ?? null,
        relationship: result.relationship ?? null,
        job: result.job ?? null,
        interests: result.interests ?? null,
        notes: notesParts.length ? notesParts.join("\n") : null,
      };

      let subscriberId = existing?.id ?? null;
      if (subscriberId) {
        const patch = Object.fromEntries(
          Object.entries(profile).filter(([, v]) => v !== null && v !== undefined),
        );
        const { error } = await supabase.from("subscribers").update(patch).eq("id", subscriberId);
        if (error) throw new Error(error.message);
      } else {
        const { data, error } = await supabase
          .from("subscribers")
          .insert(profile)
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        subscriberId = data.id;
      }

      const rows = (result.messages ?? [])
        .filter((m) => typeof m.content === "string" && m.content.trim())
        .map((m) => ({
          subscriber_id: subscriberId!,
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content!.trim(),
          sent_by: m.role === "assistant" ? scarlett.trim() || "freckledwho" : username,
          imported: true,
        }));

      if (rows.length) {
        const { error } = await supabase.from("messages").insert(rows);
        if (error) throw new Error(error.message);
      }

      toast.success(`Imported ${rows.length} messages for ${username}`);
      setTranscript("");
      setOpen(false);
      if (subscriberId) onImported?.(subscriberId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Download className="size-4" />
          Ingest
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ingest conversation</DialogTitle>
          <DialogDescription>
            Paste a Reddit thread — the model extracts the profile and message history.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="scarlett">Scarlett username</Label>
          <Input
            id="scarlett"
            value={scarlett}
            onChange={(e) => setScarlett(e.target.value)}
            placeholder="freckledwho"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="transcript">Conversation</Label>
          <Textarea
            id="transcript"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={12}
            className="resize-none font-mono text-xs"
            placeholder="u/someone: hey…"
          />
        </div>
        <Button onClick={() => void run()} disabled={busy || !transcript.trim()}>
          {busy ? "Extracting…" : "Extract & Import"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
