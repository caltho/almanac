import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { SHOPPING_PERIODS, type ShoppingPeriod } from '$lib/shopping';
import { isPaletteToken } from '$lib/palette';

// Data flows through (app)/+layout.server.ts → userData store. These actions
// stay for plain-form fallbacks; the JS path uses /food/shopping/api for
// instant optimistic updates (see +page.svelte and the sibling +server.ts).

function isValidPeriod(v: string): v is ShoppingPeriod {
	return (SHOPPING_PERIODS as readonly string[]).includes(v);
}

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const periodRaw = String(form.get('restock_period') ?? 'monthly');
		const colorRaw = String(form.get('color') ?? '');
		const color = colorRaw && isPaletteToken(colorRaw) ? colorRaw : null;

		if (!name) return fail(400, { error: 'Name is required.' });
		if (!isValidPeriod(periodRaw)) {
			return fail(400, { error: 'Bad restock period.' });
		}
		const { error: e } = await locals.supabase.from('shopping_items').insert({
			owner_id: locals.user!.id,
			name,
			status: 'buy',
			restock_period: periodRaw,
			color
		});
		if (e) return fail(500, { error: e.message });
		return { added: true };
	},

	archive: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing id.' });
		const { error: e } = await locals.supabase
			.from('shopping_items')
			.update({ archived_at: new Date().toISOString() })
			.eq('id', id);
		if (e) return fail(500, { error: e.message });
		return { archived: true };
	}
};
