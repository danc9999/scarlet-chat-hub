# AI replies land directly in the chat thread

Right now a generated reply appears in a separate "AI suggestion" box below the thread. Instead, the reply will be saved and shown as a normal message in the conversation, on the right side, as soon as it is generated.

## New flow

1. Paste his message into the box at the bottom.
2. Click Generate.
3. His message is saved (left side) and the AI reply is saved right after it (right side) — both appear in the thread.
4. Hover the AI message to Copy it, or use Regen to replace it with a fresh version.

The separate suggestion panel, its editable textarea, and the Discard button are removed.

## Details on the thread message

- The generated reply is stored as an assistant message attributed to the signed-in user, exactly like a manually sent reply, so it survives refresh and shows for everyone in real time.
- While generating, a placeholder bubble with a spinner shows on the right so the wait is visible.
- Hover actions on each assistant message: Copy (existing) and Regen.
- Regen re-generates from the conversation up to that message and replaces that message's content in place, rather than adding a new one.
- Messages can still be edited away via Clear chat; Summary, +Day, and the actions menu are unchanged.

## Technical notes

- `src/components/crm/ChatPanel.tsx`: drop `suggestion` state and the suggestion panel; after a successful `chatCompletion`, call `onSend(reply, "assistant")`. Add a local `pending` flag for the placeholder bubble and a per-message `regenerating` id.
- Regen needs an update path: add an `onUpdateMessage(id, content)` callback wired in `src/routes/_authenticated/console.tsx` to `supabase.from("messages").update({ content }).eq("id", id)`. Existing RLS (`messages_all_auth`) already allows this; no migration needed.
- Regen context = messages up to (excluding) the target message, run through the existing `toChatHistory` + `buildSystemPrompt` helpers, same model/settings resolution as Generate.
- Error handling stays as-is: missing key and API errors surface via toast, and his pasted message is still saved even if generation fails.
