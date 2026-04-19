import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadDefs } from '$lib/custom-attrs/server';
import { parseCustomFormData } from '$lib/custom-attrs/validate';

export const load: PageServerLoad = async ({ locals }) => {
	const defs = await loadDefs(locals.supabase, locals.user!.id, 'journal_entries');
	return { defs };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const entry_date = String(form.get('entry_date') ?? '').trim();
		const title = String(form.get('title') ?? '').trim() || null;
		const body = String(form.get('body') ?? '').trim() || null;
		const moodRaw = String(form.get('mood') ?? '').trim();
		const mood = moodRaw ? Number(moodRaw) : null;

		if (!/^\d{4}-\d{2}-\d{2}$/.test(entry_date)) {
			return fail(400, { error: 'Pick a date.', values: Object.fromEntries(form) });
		}
		if (mood !== null && (!Number.isInteger(mood) || mood < 1 || mood > 10)) {
			return fail(400, { error: 'Mood must be 1–10.', values: Object.fromEntries(form) });
		}

		const defs = await loadDefs(locals.supabase, locals.user!.id, 'journal_entries');
		const { values: custom, errors } = parseCustomFormData(defs, form);
		if (Object.keys(errors).length > 0) {
			return fail(400, { error: 'Fix the highlighted fields.', fieldErrors: errors });
		}

		const { data: row, error } = await locals.supabase
			.from('journal_entries')
			.insert({
				owner_id: locals.user!.id,
				entry_date,
				title,
				body,
				mood,
				custom: custom as never
			})
			.select('id')
			.single();

		if (error) return fail(500, { error: error.message });

		throw redirect(303, `/journal/${row.id}`);
	}
};
