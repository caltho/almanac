# src/routes/(app)/tracking/

Combined home for **Habits** and **Activities** — what you're trying to do
regularly, and what you actually did. Two tabs share the layout because they
solve adjacent problems and we wanted one nav slot.

## Routes

- `/tracking` — redirects to `/tracking/habits`.
- `/tracking/habits` — the habits list. Items flow to the top when due; click
  to record today's tick (a small flight animation drops the row down to the
  "Done" zone).
- `/tracking/habits/[id]` — habit detail / edit.
- `/tracking/habits/fields` — manage custom-attribute defs.
- `/tracking/habits/api` — JSON endpoint paired with optimistic UI in
  `+page.svelte` (toggle, archive).
- `/tracking/activities` — the activity list, same shopping-style "due → top"
  pattern. "Due" for an activity = "not yet logged today". Clicking flips it
  to logged-today; the keyboard date-picker UX from the previous version was
  removed (the user wanted the simpler shopping-style one-click flow).
- `/tracking/activities/api` — JSON endpoint for toggle/create/archive.

## Conventions

- Both tabs read from the userData store (`useUserData()`); no per-page server
  load for list views.
- Optimistic mutations call `userData.toggleHabitCheck` / `toggleActivityLog`
  then post to the corresponding `/api/+server.ts` in the background.
- "Due" is computed client-side from the same `userData` data — no extra
  server query needed.
