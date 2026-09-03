import { supabase } from "@/integrations/supabase/client";
import type { Message, Subscriber } from "@/lib/crm";

export const FALLBACK_MODELS = [
  "deepseek/deepseek-v4-flash",
  "nothingiisreal/mn-celeste-12b",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition",
];

export const EXTRACTION_MODEL = "deepseek/deepseek-v4-flash";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function getSettings() {
  const { data, error } = await supabase
    .from("settings")
    .select("openrouter_api_key, default_model")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? { openrouter_api_key: null, default_model: null };
}

export async function getPersona() {
  const { data, error } = await supabase
    .from("persona")
    .select("system_prompt")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.system_prompt ?? "";
}

export async function saveSettings(patch: {
  openrouter_api_key?: string | null;
  default_model?: string | null;
}) {
  const { error } = await supabase
    .from("settings")
    .upsert({ id: 1, ...patch, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function savePersona(system_prompt: string) {
  const { error } = await supabase
    .from("persona")
    .upsert({ id: 1, system_prompt, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function fetchModels(apiKey: string): Promise<string[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  });
  if (!res.ok) throw new Error(`Model list failed (${res.status})`);
  const json = (await res.json()) as { data?: Array<{ id?: string }> };
  const ids = (json.data ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));
  if (ids.length === 0) throw new Error("No models returned");
  return ids.sort();
}

export async function chatCompletion(opts: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.85,
      max_tokens: opts.maxTokens ?? 300,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter error ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response from model");
  return content;
}

export function parseJsonLoose<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice) as T;
}

function nameFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/name\s*:\s*([^\n,]+)/i);
  return match?.[1]?.trim() || null;
}

export function buildSubscriberContext(s: Subscriber): string {
  const lines = ["WHAT YOU ALREADY KNOW — treat as hard facts, never contradict:"];
  if (s.location) lines.push(`He is from ${s.location}`);
  const realName = nameFromNotes(s.notes);
  if (realName) lines.push(`His name is ${realName}`);
  if (s.job) lines.push(`His job: ${s.job}`);
  if (s.relationship) lines.push(`Relationship: ${s.relationship}`);
  if (s.interests) lines.push(`Interests: ${s.interests}`);
  if (s.preferences) lines.push(`Preferences: ${s.preferences}`);
  if (s.notes) lines.push(`Notes: ${s.notes}`);
  lines.push(
    `Total spent: $${Number(s.total_spent ?? 0)}, Last PPV: $${Number(s.last_ppv ?? 0)}, Sequence day: ${s.sequence_day}`,
  );
  return lines.join("\n");
}

export function buildSystemPrompt(persona: string, subscriber: Subscriber): string {
  const context = buildSubscriberContext(subscriber);
  const base = persona?.trim() || "You are Scarlett, a warm, flirty creator chatting with a fan.";
  return base.includes("{subscriber_context}")
    ? base.replaceAll("{subscriber_context}", context)
    : `${base}\n\n${context}`;
}

export function toChatHistory(messages: Message[]): ChatMessage[] {
  return messages.slice(-20).map((m) => ({
    role: m.role === "assistant" || m.role === "operator" ? "assistant" : "user",
    content: m.content,
  }));
}

export type ExtractedProfile = {
  name?: string | null;
  age?: string | number | null;
  location?: string | null;
  relationship?: string | null;
  job?: string | null;
  hobbies?: string | null;
  interests?: string | null;
};

export const EXTRACTION_SYSTEM_PROMPT =
  "You are a data extraction assistant. Extract information from conversations and return only valid JSON with no markdown.";

export async function extractProfileFromMessage(
  apiKey: string,
  content: string,
): Promise<ExtractedProfile> {
  const raw = await chatCompletion({
    apiKey,
    model: EXTRACTION_MODEL,
    temperature: 0,
    maxTokens: 300,
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Extract any of these facts about the person writing this message. Return JSON with keys name, age, location, relationship, job, hobbies. Use null when unknown.\n\nMESSAGE:\n${content}`,
      },
    ],
  });
  return parseJsonLoose<ExtractedProfile>(raw);
}

export type IngestResult = {
  username?: string | null;
  name?: string | null;
  age?: string | number | null;
  location?: string | null;
  relationship?: string | null;
  job?: string | null;
  interests?: string | null;
  notes?: string | null;
  messages?: Array<{ role?: string; content?: string; sender?: string }>;
};

export async function extractConversation(
  apiKey: string,
  transcript: string,
  scarlettUsername: string,
): Promise<IngestResult> {
  const raw = await chatCompletion({
    apiKey,
    model: EXTRACTION_MODEL,
    temperature: 0,
    maxTokens: 4000,
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Extract data from this Reddit conversation. Scarlett's username is "${scarlettUsername}"; her messages have role "assistant", every other participant has role "user".

Return JSON exactly shaped as:
{"username": string|null, "name": string|null, "age": string|null, "location": string|null, "relationship": string|null, "job": string|null, "interests": string|null, "notes": string|null, "messages": [{"role": "user"|"assistant", "content": string}]}

"username" is the other person's username. Keep messages in chronological order.

CONVERSATION:
${transcript}`,
      },
    ],
  });
  return parseJsonLoose<IngestResult>(raw);
}
