import type { Tables } from "@/integrations/supabase/types";

export type Subscriber = Tables<"subscribers">;
export type Message = Tables<"messages">;

export const SEGMENTS = ["whale", "regular", "lurker"] as const;
export type Segment = (typeof SEGMENTS)[number];

export function segmentClasses(segment: string | null) {
  switch (segment) {
    case "whale":
      return "border-whale/40 bg-whale/15 text-whale";
    case "regular":
      return "border-regular/40 bg-regular/15 text-regular";
    default:
      return "border-lurker/40 bg-lurker/15 text-lurker";
  }
}

export function money(value: number | null | undefined) {
  const n = Number(value ?? 0);
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  });
}
