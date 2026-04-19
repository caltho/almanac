# src/lib/finance/csv-import/

CSV bank-transaction importer. Staged import flow.

## Flow

1. User uploads CSV via `src/routes/(app)/finance/import/+page.svelte`.
2. Server action parses and writes to `import_staging` table (user-scoped, RLS).
3. UI shows a preview: proposed categorisation per row (rules → pg_trgm match → unclassified).
4. User confirms / edits → server promotes staging rows to `transactions` in a transaction.

## Bank format adapters

Each bank has a parser module (`adapters/anz.ts`, `adapters/commbank.ts`, ...) exposing:

- `sniff(headerRow: string[]): boolean` — identify the format
- `parse(row: string[]): Partial<Transaction>` — map columns

Registry tries each adapter's `sniff` in order. Add a new bank by dropping in a module and registering it.

## Deferred extension — historical spreadsheet import

Callum has a large historical, manually-categorised spreadsheet. When we pick this up:

- Add an `adapters/legacy-spreadsheet.ts` parser matching his column set.
- A one-shot import path (distinct from the normal CSV flow) that preserves original category assignments as the canonical labels (not re-categorised by rules).
- Seeds the pg_trgm corpus — see `../categorise/CLAUDE.md`.

Don't delete this note until the import has been completed.
