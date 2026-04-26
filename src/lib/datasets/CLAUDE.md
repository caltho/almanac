# src/lib/datasets/

User-defined small tables. Each dataset has a built-in `name` column plus up to 7 user-named columns of type `text` / `number` / `date`. Replaces the earlier pages/blocks model.

## Schema

- `datasets(id, owner_id, name, columns jsonb)` — columns is an array of `{ key, label, type }`. DB constraint: `jsonb_array_length(columns) <= 7`.
- `dataset_rows(id, dataset_id, owner_id, name, data jsonb, order_index)` — `data` is a flat `{ [columnKey]: value }` map. RLS inherits from the parent dataset.

## Rules

- **`key` is stable.** Renaming a column updates `label` only; row data stays addressed by `key`. Never rewrite row data on rename.
- **Validate columns through `columnsSchema`** in `server.ts` (Zod). UI never trusts raw form input for the columns blob.
- **Cell values are coerced to the declared type on save** via `coerceCellValue`. Empty inputs become `null`. Don't widen the type set without also extending `coerceCellValue`.
- **Datasets are hot data.** The list (id, name, columns) sits in the userData store. Row data is cold — load on the dataset detail route, never in `loadHotData`.
- **Sharing is explicit.** Datasets follow the same `shares` pattern as the fixed-domain tables; RLS uses `can_access('datasets', id, perm)`.

## Extension points

- More column types: add to `DATASET_COLUMN_TYPES`, extend `coerceCellValue`, render in the table cell component.
- Per-cell formulas / derived columns: not in v1. Would live as a `formula` field on the column def + a client-side evaluator.
