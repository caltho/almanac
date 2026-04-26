import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { sanitizeHtml } from '$lib/server/sanitize-html';

export const load: PageServerLoad = async ({ params, locals }) => {
	const [{ data: page }, { data: children }, { data: allPages }] = await Promise.all([
		locals.supabase
			.from('pages')
			.select('id, owner_id, parent_id, title, icon, body_html, updated_at')
			.eq('id', params.id)
			.maybeSingle(),
		locals.supabase
			.from('pages')
			.select('id, title, icon')
			.eq('parent_id', params.id)
			.is('archived_at', null)
			.order('order_index'),
		locals.supabase.from('pages').select('id, title').is('archived_at', null).order('title')
	]);

	if (!page) throw error(404, 'Page not found');

	return {
		page,
		children: children ?? [],
		allPages: allPages ?? [],
		canEdit: page.owner_id === locals.user!.id
	};
};

export const actions: Actions = {
	rename: async ({ request, params, locals }) => {
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim() || 'Untitled';
		const icon = String(form.get('icon') ?? '').trim() || null;
		const parentRaw = String(form.get('parent_id') ?? '').trim();
		const parent_id = parentRaw || null;

		if (parent_id === params.id) {
			return fail(400, { error: "A page can't be its own parent." });
		}

		const { error: e } = await locals.supabase
			.from('pages')
			.update({ title, icon, parent_id })
			.eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		return { renamed: true };
	},

	saveBody: async ({ request, params, locals }) => {
		const form = await request.formData();
		const raw = String(form.get('body_html') ?? '');
		const body_html = sanitizeHtml(raw);
		const { error: e } = await locals.supabase
			.from('pages')
			.update({ body_html })
			.eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		return { saved: true };
	},

	deletePage: async ({ params, locals }) => {
		await locals.supabase
			.from('pages')
			.update({ archived_at: new Date().toISOString() })
			.eq('id', params.id);
		throw redirect(303, '/pages');
	}
};
