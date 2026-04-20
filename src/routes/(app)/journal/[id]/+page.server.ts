import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadDefs } from '$lib/custom-attrs/server';
import { parseCustomFormData } from '$lib/custom-attrs/validate';

export const load: PageServerLoad = async ({ params, locals }) => {
	const [{ data: entry }, defs] = await Promise.all([
		locals.supabase
			.from('journal_entries')
			.select('id, owner_id, entry_date, title, body, mood, custom, created_at, updated_at')
			.eq('id', params.id)
			.is('deleted_at', null)
			.maybeSingle(),
		loadDefs(locals.supabase, locals.user!.id, 'journal_entries')
	]);

	if (!entry) throw error(404, 'Entry not found');

	return { entry, defs, canEdit: entry.owner_id === locals.user!.id };
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		const form = await request.formData();
		const entry_date = String(form.get('entry_date') ?? '').trim();
		const titleRaw = String(form.get('title') ?? '');
		const bodyRaw = String(form.get('body') ?? '');
		const title = titleRaw.trim() === '' ? null : titleRaw;
		const body = bodyRaw.trim() === '' ? null : bodyRaw;
		const moodRaw = String(form.get('mood') ?? '').trim();
		const mood = moodRaw ? Number(moodRaw) : null;

		if (!/^\d{4}-\d{2}-\d{2}$/.test(entry_date)) {
			return fail(400, { error: 'Pick a date.' });
		}
		if (mood !== null && (!Number.isInteger(mood) || mood < 1 || mood > 10)) {
			return fail(400, { error: 'Mood must be 1–10.' });
		}

		const defs = await loadDefs(locals.supabase, locals.user!.id, 'journal_entries');
		const { values: custom, errors } = parseCustomFormData(defs, form);
		if (Object.keys(errors).length > 0) {
			return fail(400, { error: 'Fix the highlighted fields.', fieldErrors: errors });
		}

		const { error: updateError } = await locals.supabase
			.from('journal_entries')
			.update({ entry_date, title, body, mood, custom: custom as never })
			.eq('id', params.id);

		if (updateError) return fail(500, { error: updateError.message });
		return { saved: true };
	},

	delete: async ({ params, locals }) => {
		const { error: delError } = await locals.supabase
			.from('journal_entries')
			.update({ deleted_at: new Date().toISOString() })
			.eq('id', params.id);

		if (delError) return fail(500, { error: delError.message });
		throw redirect(303, '/journal');
	}
};
