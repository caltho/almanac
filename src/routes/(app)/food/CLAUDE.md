# src/routes/(app)/food/

Combined home for **Shopping** (the recurring buy-list) and **Recipes** (the
recipe book). Two tabs share the layout because they're the food-related
slice of the app.

## Routes

- `/food` — redirects to `/food/shopping`.
- `/food/shopping` — the buy-list. Items group by visual state
  (Buy → Reminder → Stocked) and within each section sub-group by palette
  color so related groceries cluster. See `src/lib/shopping/CLAUDE.md` for
  the state machine.
- `/food/shopping/api` — JSON endpoint for status/period/color flips, paired
  with optimistic UI.
- `/food/recipes` — the recipe directory. Click into one to see its current
  state plus a stack of saved iterations.
- `/food/recipes/[id]` — recipe detail. Edit the current ingredients/method
  rich-text bodies, snapshot a "version" with a "how it turned out" note.

## Conventions

- Both tabs read from the userData store; recipes are part of `loadHotData`
  metadata-only (versions load on demand on the detail route).
- Color tokens come from `$lib/palette.ts` and render via the shared
  `<ColorPicker>` and `<ColorDot>` components.
