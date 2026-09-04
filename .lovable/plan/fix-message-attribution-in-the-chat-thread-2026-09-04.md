# Fix message attribution in the chat thread

Incoming and outgoing messages are currently both stamped with the signed-in account's email, so the thread reads as if one person wrote everything.

## What changes

- A pasted incoming message is stored as an incoming message and labelled with the subscriber's name (falling back to "subscriber" when the name is empty).
- A sent reply keeps being stored as an outgoing message and stays labelled with the signed-in account's email.
- Display stays as-is: incoming on the left, outgoing on the right, each showing its label badge.

Nothing else in the chat panel changes — the input layout, Generate, Summary, +Day, Clear chat and Delete subscriber all stay exactly as they are.

## Technical detail

In `src/routes/_authenticated/console.tsx`, the insert inside `sendMessage` (around line 248) sets `sent_by: email || "admin"` for every message. Change that single field to depend on the role already passed into the function: subscriber name (or `"subscriber"`) when the role is `user`, otherwise the existing email fallback.

No database migration and no RLS change is needed — the `messages` table already has `role` and `sent_by` columns and permissive policies for signed-in users.
