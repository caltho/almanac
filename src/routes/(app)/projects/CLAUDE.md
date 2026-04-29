# src/routes/(app)/projects/

Personal initiatives. Each project has a single rich-text body (Notion-style
notes) plus parent/child nesting and links to tasks via `tasks.project_id`.

## Routes

- `/projects` — top-level project cards with status filter (active / done /
  archived / all). Each card shows a body preview.
- `/projects/[id]` — detail view. Click into the body area to edit; save
  writes both the body and the metadata (name, status, color, custom attrs).
- `/projects/fields` — manage custom-attribute defs for projects.

## Conventions

- The body is HTML, sanitized server-side via `$lib/server/sanitize-html`
  before write. The `RichTextEditor.svelte` component is the only writer.
- Creating a project redirects straight to the detail page so the user can
  start typing notes immediately.
- Color comes from the shared 8-token palette (`$lib/palette.ts`). The
  `color` column stores the token name, not the hex.
- The previous `project_items` checklist model was removed — the user wanted
  projects to feel like notes, not a to-do list. Use Tasks (or a Checklist)
  for actionable items.
