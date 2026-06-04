# src/routes/(app)/food/

Home for **Supplies** (the recurring restock register), the **Shopping list**
(the one-shot "what to buy now" list), and **Recipes** (the recipe book).
Three tabs share the layout because they're the food-related slice of the app.

## Routes

- `/food` — redirects to `/food/supplies`.
- `/food/supplies` — the recurring restock register (the table is still named
  `shopping_items` internally). Items group by visual state
  (Buy → Reminder → Stocked) and within each section sub-group by palette
  color. A "Boot to shopping list" button copies the Buy section onto the
  shopping list. See `src/lib/shopping/index.ts` for the state machine.
- `/food/supplies/api` — JSON endpoint for status/period/color flips, paired
  with optimistic UI.
- `/food/shopping-list` — the one-shot buy list (`shopping_list_items`). Items
  come from three sources: typed in (`manual`), booted from the Supplies Buy
  section (`supply`, linked back via `supply_item_id`), or pulled from a
  recipe's ingredients (`recipe`). Tick items off, then "Clear list" or
  "Clear & mark supplies stocked" (flips every linked supply to `stocked`).
- `/food/shopping-list/api` — JSON endpoint: `add` (dedupes by name),
  `toggle`, `remove`, `clear`, `clearAndStock`.
- `/food/recipes` — the recipe directory. Click into one to see its current
  state plus a stack of saved iterations.
- `/food/recipes/[id]` — recipe detail. Edit the current ingredients/method
  rich-text bodies, snapshot a "version", or "Add to shopping list" to push
  the ingredient lines onto the shopping list (`parseIngredientLines` in
  `$lib/shopping-list.ts`).

## Conventions

- All three tabs read from the userData store; `shopping_items`,
  `shopping_list_items`, and recipe metadata (+ current bodies) are all hot.
  Recipe versions load on demand on the detail route.
- De-duping (Supplies→list, recipe→list, manual add) is by case-insensitive
  name via `normalizeName` in `$lib/shopping-list.ts`; the `add` API op also
  enforces it server-side.
- Color tokens come from `$lib/palette.ts` and render via the shared
  `<ColorPicker>` and `<ColorDot>` components.
