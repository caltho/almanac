import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { BLOCK_REGISTRY, type BlockType } from '$lib/blocks';

export const load: PageServerLoad = async ({ params, locals }) => {
	const [{ data: page }, { data: blocks }, { data: children }, { data: allPages }] =
		await Promise.all([
			locals.supabase.from('pages').select('*').eq('id', params.id).maybeSingle(),
			locals.supabase.from('blocks').select('*').eq('page_id', params.id).order('order_index'),
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
		blocks: blocks ?? [],
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

	addBlock: async ({ request, params, locals }) => {
		const form = await request.formData();
		const type = String(form.get('type') ?? 'paragraph') as BlockType;
		const reg = BLOCK_REGISTRY[type];
		if (!reg) return fail(400, { error: 'Unknown block type.' });

		const { data: last } = await locals.supabase
			.from('blocks')
			.select('order_index')
			.eq('page_id', params.id)
			.is('parent_block_id', null)
			.order('order_index', { ascending: false })
			.limit(1)
			.maybeSingle();

		const { error: e } = await locals.supabase.from('blocks').insert({
			owner_id: locals.user!.id,
			page_id: params.id,
			type,
			content: reg.defaultContent as never,
			order_index: (last?.order_index ?? -1) + 1
		});
		if (e) return fail(500, { error: e.message });
		return { addedType: type };
	},

	updateBlock: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const contentRaw = String(form.get('content') ?? '{}');
		let content: unknown;
		try {
			content = JSON.parse(contentRaw);
		} catch {
			return fail(400, { error: 'Content must be valid JSON.' });
		}

		const { error: e } = await locals.supabase
			.from('blocks')
			.update({ content: content as never })
			.eq('id', id);
		if (e) return fail(500, { error: e.message });
		return { updated: true };
	},

	moveBlock: async ({ request, params, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const direction = String(form.get('direction') ?? '');
		if (!id || !['up', 'down'].includes(direction)) {
			return fail(400, { error: 'Bad move.' });
		}

		const { data: target } = await locals.supabase
			.from('blocks')
			.select('id, order_index, parent_block_id')
			.eq('id', id)
			.maybeSingle();
		if (!target) return fail(404, { error: 'Block not found.' });

		const cmp = direction === 'up' ? { op: 'lt', sort: false } : { op: 'gt', sort: true };
		const neighbour = await locals.supabase
			.from('blocks')
			.select('id, order_index')
			.eq('page_id', params.id)
			.eq(
				target.parent_block_id ? 'parent_block_id' : ('parent_block_id' as never),
				(target.parent_block_id ?? null) as never
			)
			.filter('order_index', cmp.op, target.order_index)
			.order('order_index', { ascending: cmp.sort })
			.limit(1)
			.maybeSingle();

		if (!neighbour.data) return { noop: true };

		// Swap order_index values.
		await Promise.all([
			locals.supabase
				.from('blocks')
				.update({ order_index: neighbour.data.order_index })
				.eq('id', target.id),
			locals.supabase
				.from('blocks')
				.update({ order_index: target.order_index })
				.eq('id', neighbour.data.id)
		]);
		return { moved: true };
	},

	deleteBlock: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing id.' });
		const { error: e } = await locals.supabase.from('blocks').delete().eq('id', id);
		if (e) return fail(500, { error: e.message });
		return { deletedId: id };
	},

	deletePage: async ({ params, locals }) => {
		await locals.supabase
			.from('pages')
			.update({ archived_at: new Date().toISOString() })
			.eq('id', params.id);
		throw redirect(303, '/pages');
	}
};
