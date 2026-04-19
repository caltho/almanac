# src/lib/custom-attrs/

Powers the "customizable from the frontend" attribute system on every fixed domain.

## Model

- Each fixed-domain table has a `custom jsonb NOT NULL DEFAULT '{}'::jsonb` column.
- `custom_attribute_defs(id, owner_id, table_name, key, label, type, ui_hints jsonb, order_index)` — user-owned definitions that drive the attribute-edit UI.
- `type` is one of: `text`, `longtext`, `number`, `boolean`, `date`, `datetime`, `select`, `multiselect`, `url`, `rating`. Extend here first, UI renderer second.

## Rules

- **Never mutate row columns to add a "new field" when a custom attr would do.** Adding a top-level column is reserved for opinionated, query-hot fields we explicitly want indexed.
- **Deleting a def** does NOT delete values stored in rows' `custom` jsonb. Design the UI to flag "orphaned" keys and let the user purge explicitly.
- **Shares carry custom attrs along with the row** — no per-key visibility v1.
- **Do not query on `custom` jsonb in a hot path** without a GIN index. Opinionated columns exist for a reason.

## Components (to be built in M2)

- `<CustomAttrRenderer defs={...} value={...} />` — read-only display
- `<CustomAttrEditor defs={...} bind:value />` — form editor, groups by type, validates against `type`
- `<AttrDefsManager table="journal_entries" />` — add/remove/reorder defs for a table
