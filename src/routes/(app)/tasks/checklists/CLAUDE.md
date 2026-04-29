# src/routes/(app)/tasks/checklists/

Lightweight, stateless lists of "stuff I take with me" — day pack, gym bag,
camping, etc. Deliberately tiny: just a checkbox + free text, plus a "Clear"
button that resets every check on a list back to false.

## Routes

- `/tasks/checklists` — single page showing every list as a card with its
  items inline. New-list field at the top, new-item field at the bottom of
  each card.
- `/tasks/checklists/api` — JSON endpoint for create/rename/archive lists,
  add/toggle/delete items, and the "clear all" sweep.

## Conventions

- Reads from the `userData` store (`checklists`, `checklistItems`). Mutations
  go through the API endpoint with optimistic updates.
- "Clear" is a single SQL update (`checked = false where checklist_id = X
and checked = true`) — never delete items, just unset the flag. The user
  uses these lists repeatedly.
- No custom-attribute support and no detail page. If a list grows beyond
  what fits on a card, that's a sign it should be a Project body instead.
