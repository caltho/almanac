# src/lib/finance/

Finance domain logic: CSV import, rule engine, similarity categoriser. M4.

## Subdirectories
- `csv-import/` — parse + stage + confirm flow. See its CLAUDE.md for the deferred spreadsheet-import extension points.
- `rules/` — keyword/regex rule engine backed by `categories.rules jsonb`.
- `categorise/` — hybrid categoriser: rules → pg_trgm similarity over historical descriptions → unclassified bucket. AI fallback only for user-initiated triage.

## Schema sketch (refine in M4)
- `transactions(id, owner_id, posted_at, description, amount, currency, category_id, source, raw jsonb, custom jsonb)`
- `categories(id, owner_id, name, parent_id, rules jsonb)` — tree. `rules: [{ kind: 'keyword'|'regex', pattern, case_sensitive }]`
- `budgets(id, owner_id, category_id, period, amount)`

## Rules
- **Single currency v1.** `currency` column is there for schema future-proofing but the UI pins to one currency. Flag multi-currency as deferred.
- **No double-entry accounting.** Transactions are first-class; no journal/ledger abstraction.
- **Strict RLS.** Finance rows default to owner-only; shares are explicit and rare. Never assume a household share.
- **Importer is idempotent.** A re-imported CSV must not create duplicate rows. Use `(owner_id, posted_at, amount, description_hash)` uniqueness or an `import_batch` staging pattern.
- **Seed historical data once, carefully.** Callum has a manually-categorised dataset — this seeds the trigram corpus. Don't overwrite it.
