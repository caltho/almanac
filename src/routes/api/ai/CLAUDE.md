# src/routes/api/ai/

Anthropic chat endpoint. See [src/lib/ai/CLAUDE.md](../../../lib/ai/CLAUDE.md) for the tool-use loop design.

## Endpoint
- `POST /api/ai` — `{ messages: AnthropicMessageParam[] }` → streaming `text/event-stream` response.

## Rules
- Server-only. `ANTHROPIC_API_KEY` lives in `$env/static/private`.
- Requires an authenticated session (`event.locals.safeGetSession()`), 401 otherwise.
- Tool handlers run with the session's Supabase server client — RLS does the rest.
- Log token usage + cache-hit stats for each request. Free-tier budget awareness matters.
