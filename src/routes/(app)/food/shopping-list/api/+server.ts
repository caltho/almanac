import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { normalizeName } from '$lib/shopping-list';

const SELECT = 'id, owner_id, name, checked, source, supply_item_id, created_at';
const VALID_SOURCES = new Set(['manual', 'supply', 'recipe']);

type AddItem = { name: string; source?: string; supply_item_id?: string | null };

/**
 * JSON endpoints for the one-shot shopping list, paired with optimistic
 * client-side updates in +page.svelte (and the "boot"/"add ingredients"
 * actions on the Supplies and Recipes pages).
 *
 * Ops:
 *   add           — insert items, skipping names already on the list
 *   toggle        — flip an item's `checked` flag
 *   remove        — delete one item
 *   clear         — delete the whole list
 *   clearAndStock — mark every linked supply item 'stocked', then clear
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401);
	const uid = locals.user.id;
	const body = (await request.json()) as {
		op: 'add' | 'toggle' | 'remove' | 'clear' | 'clearAndStock';
		id?: string;
		checked?: boolean;
		items?: AddItem[];
	};

	if (body.op === 'add') {
		const incoming = (body.items ?? [])
			.map((i) => ({
				name: String(i.name ?? '').trim(),
				source: i.source && VALID_SOURCES.has(i.source) ? i.source : 'manual',
				supply_item_id: i.supply_item_id ?? null
			}))
			.filter((i) => i.name.length > 0);

		if (incoming.length === 0) return json({ ok: true, items: [] });

		// Skip names already on the list, and de-dupe within this batch.
		const { data: existing } = await locals.supabase
			.from('shopping_list_items')
			.select('name')
			.eq('owner_id', uid);
		const seen = new Set((existing ?? []).map((r) => normalizeName(r.name)));

		const rows: {
			owner_id: string;
			name: string;
			source: string;
			supply_item_id: string | null;
		}[] = [];
		for (const i of incoming) {
			const key = normalizeName(i.name);
			if (seen.has(key)) continue;
			seen.add(key);
			rows.push({
				owner_id: uid,
				name: i.name,
				source: i.source,
				supply_item_id: i.supply_item_id
			});
		}

		if (rows.length === 0) return json({ ok: true, items: [] });

		const { data, error: e } = await locals.supabase
			.from('shopping_list_items')
			.insert(rows)
			.select(SELECT);
		if (e) throw error(500, e.message);
		return json({ ok: true, items: data ?? [] });
	}

	if (body.op === 'toggle') {
		if (!body.id) throw error(400, 'Missing id');
		const { data, error: e } = await locals.supabase
			.from('shopping_list_items')
			.update({ checked: !!body.checked })
			.eq('id', body.id)
			.eq('owner_id', uid)
			.select(SELECT)
			.single();
		if (e) throw error(500, e.message);
		return json({ ok: true, item: data });
	}

	if (body.op === 'remove') {
		if (!body.id) throw error(400, 'Missing id');
		const { error: e } = await locals.supabase
			.from('shopping_list_items')
			.delete()
			.eq('id', body.id)
			.eq('owner_id', uid);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	if (body.op === 'clear') {
		const { error: e } = await locals.supabase
			.from('shopping_list_items')
			.delete()
			.eq('owner_id', uid);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	if (body.op === 'clearAndStock') {
		// Flip every supply item linked from the list to 'stocked' (the DB
		// trigger stamps last_purchased_at), then wipe the list.
		const { data: links } = await locals.supabase
			.from('shopping_list_items')
			.select('supply_item_id')
			.eq('owner_id', uid)
			.not('supply_item_id', 'is', null);

		const ids = [
			...new Set((links ?? []).map((l) => l.supply_item_id).filter(Boolean))
		] as string[];

		if (ids.length > 0) {
			const { error: ue } = await locals.supabase
				.from('shopping_items')
				.update({ status: 'stocked' })
				.in('id', ids)
				.eq('owner_id', uid);
			if (ue) throw error(500, ue.message);
		}

		const { error: de } = await locals.supabase
			.from('shopping_list_items')
			.delete()
			.eq('owner_id', uid);
		if (de) throw error(500, de.message);

		return json({ ok: true, stockedIds: ids });
	}

	throw error(400, 'Unknown op');
};
