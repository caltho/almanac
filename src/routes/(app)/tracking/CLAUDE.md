# src/routes/(app)/tracking/

Combined home for **Habits** and **Activities** — what you're trying to do
regularly, and what you actually did. Two tabs share the layout because they
solve adjacent problems and we wanted one nav slot.

## Routes

- `/tracking` — redirects to `/tracking/habits`.
- `/tracking/habits` — the habits list. Items flow to the top when due for
  the **selected date**; click to record a tick (a small flight animation
  drops the row down to the "Done" zone). A horizontal `DateScroller` at
  the top lets you switch the selected date — defaults to today, can scroll
  back ~14 days at a time. Selecting a past date lets you backfill ticks.
- `/tracking/habits/[id]` — habit detail / edit.
- `/tracking/habits/fields` — manage custom-attribute defs.
- `/tracking/habits/api` — JSON endpoint paired with optimistic UI in
  `+page.svelte` (toggle, archive).
- `/tracking/activities` — the activity list, same shopping-style "due → top"
  pattern. "Due" = "not yet logged on the selected date". Same DateScroller
  at the top; selecting a past day flips clicks into backfill writes.
- `/tracking/activities/api` — JSON endpoint for toggle/create/archive.

## Conventions

- Both tabs read from the userData store (`useUserData()`); no per-page server
  load for list views.
- Optimistic mutations call `userData.toggleHabitCheck` / `toggleActivityLog`
  then post to the corresponding `/api/+server.ts` in the background.
- "Due" is computed client-side from the same `userData` data — no extra
  server query needed. Both pages compute it per-selected-day, so cadence
  is purely metadata in the UI; the per-day question ("is this ticked on
  the selected date?") is what drives the Due/Done split.
- The `DateScroller` is shared (`src/lib/components/DateScroller.svelte`).
  Pages pass a `selected` ISO string and an optional `activeDates` Set so
  days with any data show a dot indicator.
