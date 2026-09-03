import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Scarlett CRM — Subscriber Relationship Console" },
      {
        name: "description",
        content:
          "Scarlett CRM is a dark, minimal subscriber CRM for managing chats, segments and subscriber profiles in one console.",
      },
      { property: "og:title", content: "Scarlett CRM — Subscriber Relationship Console" },
      {
        property: "og:description",
        content:
          "Manage subscribers, chat threads and profiles from one dark, minimal console.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      navigate({ to: data.session ? "/console" : "/auth", replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <h1 className="font-display text-lg tracking-[0.3em] text-primary">SCARLETT CRM</h1>
    </main>
  );
}
