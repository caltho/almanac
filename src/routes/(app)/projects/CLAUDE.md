# src/routes/(app)/projects/

Personal initiatives. Each project has an ordered list of rich-text **note
blocks** (Notion-style notes, split into as many blocks as you like) plus
parent/child nesting and links to tasks via `tasks.project_id`.

## Routes

- `/projects` — top-level project cards with status filter (active / done /
  archived / all). Each card previews the first non-empty note block.
- `/projects/[id]` — detail view. Metadata (name, description, custom attrs)
  saves via the `update` form action; color + status flip directly via the
  `/api` endpoint. Notes are managed independently: add / edit / delete /
  reorder blocks inline, each persisted optimistically through `/api`.
- Field defs for every domain (projects included) live under `/settings/fields`.

## Data model

- `almanac.projects` holds the metadata only. Notes live in
  `almanac.project_blocks` (one row per block: optional `heading`, `body_html`,
  `order_index`), which inherits its RLS from the parent project via
  `can_access('projects', …)` — shared projects share their blocks. This
  mirrors the `checklist_items` parent-inherited pattern.
- Blocks are **hot** in the userData store (`userData.projectBlocks`), so both
  the list preview and the detail page render from memory. Mutations go through
  `/projects/[id]/api` (`addBlock` / `updateBlock` / `deleteBlock` /
  `reorderBlocks`) with optimistic store updates + temp-id swap.

## Conventions

- Block bodies are HTML, sanitized server-side via `$lib/server/sanitize-html`
  on every write in the `/api` handler. `RichTextEditor.svelte` is the only
  writer.
- Creating a project redirects straight to the detail page so the user can
  start adding note blocks immediately.
- Color comes from the shared 8-token palette (`$lib/palette.ts`). The
  `color` column stores the token name, not the hex.
- History: projects started with a `project_items` checklist (removed — the
  user wanted notes, not a to-do list), then a single `body_html` field. That
  single body was migrated into the first `project_blocks` row and dropped in
  `20260805120000_project_blocks.sql`. Use Tasks (or a Checklist) for
  actionable items.
