# Scarlett Connect

Build a dark minimal subscriber CRM app called Scarlett CRM. Use Supabase for backend and auth.

PHASE 1 — Foundation only:

AUTH:
- Email and password login via Supabase Auth
- No self registration
- Two roles stored in a profiles table: operator and creator
- After login, operator sees full app, creator sees chat-only view

DATABASE:
Create these tables in Supabase:

subscribers: id (uuid), name (text), platform (text), segment (text default lurker), sequence_day (int default 1), total_spent (numeric default 0), last_ppv (numeric default 0), job (text), location (text), relationship (text), interests (text), preferences (text), notes (text), rapport (jsonb default {}), created_at (timestamptz)

messages: id (uuid), subscriber_id (uuid references subscribers), role (text), content (text), sent_by (text), timestamp (timestamptz default now()), imported (boolean default false)

persona: id (int default 1), system_prompt (text), updated_at (timestamptz)

settings: id (int default 1), openrouter_api_key (text), default_model (text), updated_at (timestamptz)

Enable realtime on subscribers and messages tables.

UI:
Three panel desktop layout with dark background, amber/gold accent colour:
- Left sidebar: subscriber list showing name, segment badge (whale/regular/lurker), sequence day, total spent. Add subscriber button at top. Empty state if no subscribers.
- Centre panel: chat thread for selected subscriber. Messages showing role and sent_by badge. Input textarea at bottom with a Generate button. Empty state if no subscriber selected.
- Right panel: subscriber profile fields — name, segment selector, sequence day, total spent, last ppv, job, location, relationship, interests, preferences, notes. All editable and saved to Supabase on change.

Mobile: single column, subscriber cards list, tap to open chat, profile in a slide-out drawer.

Keep it simple and working. No AI integration yet — just the UI, auth, and database connection.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://scarlet-chat-hub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d28e3c4c-6da8-4709-bc5a-343859464680).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
