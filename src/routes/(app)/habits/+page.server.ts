import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

// Data flows through (app)/+layout.server.ts → userData store. Actions stay
// for plain-form fallbacks; the JS path uses /habits/api for instant
// optimistic updates.

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const cadence = String(form.get('cadence') ?? 'daily').trim() || 'daily';
		if (!name) return fail(400, { error: 'Name is required.' });
		const { error } = await locals.supabase.from('habits').insert({
			owner_id: locals.user!.id,
			name,
			cadence
		});
		if (error) return fail(500, { error: error.message });
		return { added: true };
	},

	toggle: async ({ request, locals }) => {
		const form = await request.formData();
		const habit_id = String(form.get('habit_id') ?? '');
		const check_date = String(form.get('check_date') ?? '');
		if (!habit_id || !/^\d{4}-\d{2}-\d{2}$/.test(check_date)) {
			return fail(400, { error: 'Bad input.' });
		}

		// Attempt delete; if nothing removed, insert a check.
		const del = await locals.supabase
			.from('habit_checks')
			.delete()
			.eq('habit_id', habit_id)
			.eq('check_date', check_date)
			.select('id');

		if (del.error) return fail(500, { error: del.error.message });
		if ((del.data ?? []).length === 0) {
			const ins = await locals.supabase.from('habit_checks').insert({
				owner_id: locals.user!.id,
				habit_id,
				check_date
			});
			if (ins.error) return fail(500, { error: ins.error.message });
		}
		return { toggled: true };
	},

	archive: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing id.' });
		const { error } = await locals.supabase
			.from('habits')
			.update({ archived_at: new Date().toISOString() })
			.eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { archived: true };
	}
};
