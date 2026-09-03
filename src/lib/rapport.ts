import type { Message, Subscriber } from "@/lib/crm";

export type RapportIndicator = {
  key: string;
  label: string;
  weight: number;
  value: number;
  manual: boolean;
};

export const MANUAL_INDICATORS = [
  { key: "response_speed", label: "Response speed", weight: 10 },
  { key: "initiated_contact", label: "Initiated contact", weight: 10 },
] as const;

function purchaseScore(total: number) {
  if (total <= 0) return 0;
  if (total < 10) return 15;
  if (total < 25) return 30;
  if (total < 50) return 50;
  if (total < 100) return 70;
  if (total < 200) return 85;
  return 100;
}

function disclosureScore(s: Subscriber) {
  const fields = [s.job, s.location, s.relationship, s.interests, s.preferences];
  let filled = fields.filter((f) => (f ?? "").trim().length > 0).length;
  if ((s.notes ?? "").toLowerCase().includes("name:")) filled += 1;
  return Math.round((filled / 6) * 100);
}

const isIncoming = (m: Message) => m.role === "user" || m.role === "subscriber";

function responseRateScore(messages: Message[]) {
  const incoming = messages.filter(isIncoming).length;
  const outgoing = messages.length - incoming;
  if (outgoing === 0) return incoming > 0 ? 100 : 0;
  return Math.min(100, Math.round((incoming / outgoing) * 60));
}

function lengthTrendScore(messages: Message[]) {
  const incoming = messages.filter(isIncoming);
  if (incoming.length < 6) return 50;
  const avg = (arr: Message[]) =>
    arr.reduce((sum, m) => sum + m.content.length, 0) / (arr.length || 1);
  const first = avg(incoming.slice(0, 3));
  const last = avg(incoming.slice(-3));
  if (first <= 0) return 50;
  const ratio = last / first;
  return Math.max(0, Math.min(100, Math.round(50 * ratio)));
}

function continuityScore(messages: Message[]) {
  return Math.min(100, Math.round((messages.length / 20) * 100));
}

export function manualValue(subscriber: Subscriber, key: string) {
  const rapport = (subscriber.rapport ?? {}) as Record<string, unknown>;
  const raw = Number(rapport[key]);
  return Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 50;
}

export function rapportIndicators(
  subscriber: Subscriber,
  messages: Message[],
): RapportIndicator[] {
  return [
    {
      key: "purchase",
      label: "Purchase behavior",
      weight: 25,
      value: purchaseScore(Number(subscriber.total_spent ?? 0)),
      manual: false,
    },
    {
      key: "disclosure",
      label: "Personal disclosure",
      weight: 20,
      value: disclosureScore(subscriber),
      manual: false,
    },
    {
      key: "response_rate",
      label: "Response rate",
      weight: 20,
      value: responseRateScore(messages),
      manual: false,
    },
    {
      key: "length_trend",
      label: "Message length trend",
      weight: 10,
      value: lengthTrendScore(messages),
      manual: false,
    },
    {
      key: "continuity",
      label: "Conversation continuity",
      weight: 5,
      value: continuityScore(messages),
      manual: false,
    },
    ...MANUAL_INDICATORS.map((m) => ({
      ...m,
      key: m.key as string,
      value: manualValue(subscriber, m.key),
      manual: true,
    })),
  ];
}

export function rapportScore(subscriber: Subscriber, messages: Message[] = []) {
  const indicators = rapportIndicators(subscriber, messages);
  const total = indicators.reduce((sum, i) => sum + i.value * (i.weight / 100), 0);
  return Math.max(0, Math.min(100, Math.round(total)));
}

export type RapportTier = { label: string; text: string; bar: string; badge: string };

export function rapportTier(score: number): RapportTier {
  if (score <= 25) {
    return {
      label: "Cold",
      text: "text-muted-foreground",
      bar: "bg-muted-foreground",
      badge: "border-border bg-muted/40 text-muted-foreground",
    };
  }
  if (score <= 50) {
    return {
      label: "Warming",
      text: "text-primary",
      bar: "bg-primary",
      badge: "border-primary/40 bg-primary/15 text-primary",
    };
  }
  if (score <= 75) {
    return {
      label: "Connected",
      text: "text-whale",
      bar: "bg-whale",
      badge: "border-whale/40 bg-whale/15 text-whale",
    };
  }
  return {
    label: "Bonded",
    text: "text-regular",
    bar: "bg-regular",
    badge: "border-regular/40 bg-regular/15 text-regular",
  };
}
