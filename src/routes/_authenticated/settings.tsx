import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { supabase } from "@/integrations/supabase/client";
import {
  FALLBACK_MODELS,
  fetchModels,
  getPersona,
  getSettings,
  savePersona,
  saveSettings,
} from "@/lib/openrouter";

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Settings — Scarlett CRM" },
      {
        name: "description",
        content: "Configure the OpenRouter API key, default model and persona prompt for Scarlett CRM.",
      },
      { property: "og:title", content: "Settings — Scarlett CRM" },
      {
        property: "og:description",
        content: "Configure API access, model selection and the Scarlett persona prompt.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [persona, setPersona] = useState("");
  const [models, setModels] = useState<string[]>(FALLBACK_MODELS);
  const [loadingModels, setLoadingModels] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingPersona, setSavingPersona] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return setAllowed(false);
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      const raw = (profile?.role ?? (data.user.user_metadata as { role?: string } | null)?.role) as
        | string
        | undefined;
      const isAdmin = raw === "admin" || raw === "operator";
      setAllowed(isAdmin);
      if (!isAdmin) navigate({ to: "/console", replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [settings, personaPrompt] = await Promise.all([getSettings(), getPersona()]);
        setApiKey(settings.openrouter_api_key ?? "");
        setModel(settings.default_model ?? FALLBACK_MODELS[0]!);
        setPersona(personaPrompt);
        if (settings.openrouter_api_key) void loadModels(settings.openrouter_api_key);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load settings");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadModels(key: string) {
    setLoadingModels(true);
    try {
      const ids = await fetchModels(key);
      setModels(ids);
    } catch {
      setModels(FALLBACK_MODELS);
      toast.message("Using fallback models", { description: "Live model list unavailable." });
    } finally {
      setLoadingModels(false);
    }
  }

  async function onSaveSettings() {
    setSavingSettings(true);
    try {
      await saveSettings({ openrouter_api_key: apiKey || null, default_model: model || null });
      toast.success("Settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  }

  async function onSavePersona() {
    setSavingPersona(true);
    try {
      await savePersona(persona);
      toast.success("Persona saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save persona");
    } finally {
      setSavingPersona(false);
    }
  }

  const options = models.includes(model) || !model ? models : [model, ...models];

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-2 border-b border-border px-4 py-2">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/console" })}>
          <ArrowLeft className="size-4" />
        </Button>
        <span className="font-display text-xs tracking-[0.28em] text-primary">SETTINGS</span>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-4 py-6">
        <section className="space-y-4 rounded-xl border border-border bg-card p-4">
          <h1 className="font-display text-sm uppercase tracking-widest text-primary">
            OpenRouter
          </h1>
          <div className="space-y-2">
            <Label htmlFor="apiKey">API key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-..."
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Default model</Label>
            <div className="flex gap-2">
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id="model" className="flex-1">
                  <SelectValue placeholder="Pick a model" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {options.map((id) => (
                    <SelectItem key={id} value={id}>
                      {id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                title="Refresh model list"
                disabled={loadingModels}
                onClick={() => void loadModels(apiKey)}
              >
                <RefreshCw className={loadingModels ? "size-4 animate-spin" : "size-4"} />
              </Button>
            </div>
          </div>
          <Button onClick={() => void onSaveSettings()} disabled={savingSettings}>
            <Save className="size-4" />
            Save settings
          </Button>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div>
            <h2 className="font-display text-sm uppercase tracking-widest text-primary">Persona</h2>
            <p className="text-xs text-muted-foreground">
              Use {"{subscriber_context}"} where the subscriber facts should be injected.
            </p>
          </div>
          <Textarea
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            rows={14}
            className="font-mono text-xs"
            placeholder="You are Scarlett…"
          />
          <Button onClick={() => void onSavePersona()} disabled={savingPersona}>
            <Save className="size-4" />
            Save persona
          </Button>
        </section>
      </main>
    </div>
  );
}
