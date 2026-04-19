# src/lib/blocks/

Notion-lite block registry for the Pages feature (M6).

## Scope (v1)
Foundational, not feature-complete. Goal: enough building blocks to be useful for structured notes; a solid schema that the rich-text editor (deferred) can plug into later.

## Model
- `pages(id, owner_id, parent_id, title, icon, order_index, created_at, updated_at)` — nestable.
- `blocks(id, page_id, parent_block_id, order_index, type, content jsonb)` — flat table with ordered tree via `parent_block_id` + `order_index`.

## Registry
Each block type is a module exporting:
- `type: string` (stable id, e.g. `paragraph`, `heading`, `list`, `checklist`, `data-point`)
- `schema: z.ZodType` for `content`
- `Render: SvelteComponent` (read view)
- `Edit: SvelteComponent` (edit view — textarea-level, not rich text in v1)

## Core types for v1
- `paragraph` — `{ text: string }`
- `heading` — `{ text: string, level: 1|2|3 }`
- `list` — `{ items: string[], ordered: boolean }`
- `checklist` — `{ items: { text: string, done: boolean }[] }`
- `data-point` — links a measured value (weight, mood, etc.) into a page. `{ label: string, value: number|string, unit?: string, logged_at?: string }`

## Rules
- **No rich-text in v1.** Block content is plain strings. Migrating to a real editor later means replacing `paragraph` with a richer block type, not rewriting the table.
- **Register new types in `src/lib/blocks/registry.ts`.** Nothing else reaches into individual block modules.
