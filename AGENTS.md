<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Database schema lives in drizzle/migrations (applied by the migration tool); add new migrations there, never edit applied ones — keeps Cloud schema history in one place.
- Storage buckets are private; serve files via signed URLs — the workspace blocks public buckets.
- AI provider/key/model are admin-editable at runtime (single settings row read server-side via admin client); non-Gemini providers go through an OpenAI-compatible adapter that converts the Gemini request/response shape — keeps all assistant client code provider-agnostic.
- SYSTEM_MANIFEST.md is the rebuild guide for a fresh Lovable account (migrations, buckets, auth, AI setup, agent tables); update it whenever a table, tool, or integration is added — lets a new account recreate everything without explanation.
- Agent learning goes through agent_interactions → agent_feedback → ai_proposals; proposals affect live behavior only after admin approval of the raw operation — governance before autonomy.
- Keep WORK_LOG.md (Arabic, user-facing summary of every completed step) updated after each task — user wants a running record.
- Checkout calls the create_order RPC with a client idempotency key; the server returns the existing order for a repeated key — retries never create duplicate orders.
- tsconfig keeps the imported project's looser strictness flags (no noUncheckedIndexedAccess / exactOptionalPropertyTypes) — the imported code was written against them.
- IMPORT_PROTOCOL.md is binding: an import is never declared complete until its checklist and every open roadmap.md task are done and tested — the owner requires 100% completion before any success message.
- After every task, append changes/state/remaining to WORK_LOG.md and update roadmap.md with the phase plan — the next model continues from these files alone.
- Simple AI text features call generatePlainText in ai-provider.server.ts (active provider from settings) — never instantiate a provider SDK directly in a feature.
