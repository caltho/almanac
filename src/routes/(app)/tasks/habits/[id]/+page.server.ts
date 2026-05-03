import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadDefs } from '$lib/custom-attrs/server';
import { parseCustomFormData } from '$lib/custom-attrs/validate';

export const load: PageServerLoad = async ({ params, locals }) => {
	const [{ data: habit }, { data: checks }, defs] = await Promise.all([
		locals.supabase
			.from('habits')
			.select('id, owner_id, name, description, cadence, archived_at, custom, updated_at')
			.eq('id', params.id)
			.maybeSingle(),
		locals.supabase
			.from('habit_checks')
			.select('id, check_date')
			.eq('habit_id', params.id)
			.order('check_date', { ascending: false })
			.limit(365),
		loadDefs(locals.supabase, locals.user!.id, 'habits')
	]);

	if (!habit) throw error(404, 'Habit not found');

	// Streak compute moved to the client (see +page.svelte) so it uses the
	// user's local "today" instead of the server's UTC clock — otherwise
	// users in positive offsets see an off-by-one streak in the morning.

	return {
		habit,
		checks: checks ?? [],
		defs,
		canEdit: habit.owner_id === locals.user!.id
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const description = String(form.get('description') ?? '').trim() || null;
		const cadence = String(form.get('cadence') ?? 'daily').trim() || 'daily';

		if (!name) return fail(400, { error: 'Name is required.' });

		const defs = await loadDefs(locals.supabase, locals.user!.id, 'habits');
		const { values: custom, errors } = parseCustomFormData(defs, form);
		if (Object.keys(errors).length > 0) {
			return fail(400, { error: 'Fix the highlighted fields.', fieldErrors: errors });
		}

		const { error: updateError } = await locals.supabase
			.from('habits')
			.update({ name, description, cadence, custom: custom as never })
			.eq('id', params.id);

		if (updateError) return fail(500, { error: updateError.message });
		return { saved: true };
	},

	delete: async ({ params, locals }) => {
		const { error: delError } = await locals.supabase.from('habits').delete().eq('id', params.id);
		if (delError) return fail(500, { error: delError.message });
		throw redirect(303, '/tasks/habits');
	}
};
