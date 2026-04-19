# src/lib/ai/

Anthropic tool-use loop for the in-app assistant (M7).

## Scope
- Server-only. Lives here, called from `src/routes/api/ai/+server.ts`.
- Model: `claude-opus-4-7` or `claude-sonnet-4-6` — pick based on cost/latency at M7. Default to Sonnet.
- Key: `ANTHROPIC_API_KEY` from `$env/static/private`.

## Rules
- **Never call the Anthropic API from the browser.** All requests go through `/api/ai`.
- **Tools run as the current user.** Tool handlers use the request's Supabase server client → RLS enforces authorization. No tool bypasses RLS.
- **Prompt caching on every request.** System prompt + stable tool definitions use `cache_control`. Build with a structure that keeps the cache key stable.
- **No open-ended shell/eval tools.** Tools are typed, domain-specific, and validated with Zod before execution.

## Tools (M7)
Write: `create_journal_entry`, `log_sleep`, `add_task`, `toggle_habit_check`, `add_page_block`, `create_transaction`
Read: `query_journal`, `query_tasks`, `query_finance_summary`, `find_pages`
Meta: `list_custom_attrs(table)`, `propose_custom_attr(table, key, type, label)` — user confirms before it's created

## Loop shape
1. Client posts `{ messages }` to `/api/ai`.
2. Server loads session, builds system prompt (today's date, user id, table schemas), calls Anthropic with tools.
3. On `tool_use`, run handler → feed `tool_result` back → continue.
4. Stream final assistant message back to client via SSE / ReadableStream.
