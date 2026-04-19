import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: pages } = await locals.supabase
		.from('pages')
		.select('id, parent_id, title, icon, order_index, updated_at')
		.is('archived_at', null)
		.order('parent_id', { nullsFirst: true })
		.order('order_index')
		.order('title');
	return { pages: pages ?? [] };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim() || 'Untitled';
		const parentRaw = String(form.get('parent_id') ?? '').trim();
		const parent_id = parentRaw || null;
		const icon = String(form.get('icon') ?? '').trim() || null;

		const { data: last } = await locals.supabase
			.from('pages')
			.select('order_index')
			.eq('parent_id', parent_id as never)
			.order('order_index', { ascending: false })
			.limit(1)
			.maybeSingle();

		const { data, error } = await locals.supabase
			.from('pages')
			.insert({
				owner_id: locals.user!.id,
				title,
				parent_id,
				icon,
				order_index: (last?.order_index ?? -1) + 1
			})
			.select('id')
			.single();

		if (error) return fail(500, { error: error.message });
		return { createdId: data.id };
	}
};
