import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ShoppingPeriod, ShoppingStatus } from '$lib/shopping';
import { SHOPPING_PERIODS } from '$lib/shopping';

const VALID_STATUSES: ShoppingStatus[] = ['buy', 'stocked'];
const SELECT =
	'id, owner_id, name, status, restock_period, last_purchased_at, notes, custom, updated_at';

function isValidPeriod(v: string): v is ShoppingPeriod {
	return (SHOPPING_PERIODS as readonly string[]).includes(v);
}

/**
 * JSON endpoints for the shopping list — paired with optimistic client-side
 * updates in +page.svelte. Status flips to 'stocked' explicitly stamp
 * last_purchased_at = now() so successive "Reminder → Stocked" clicks
 * refresh the timer. (The DB trigger only stamps if last_purchased_at is
 * null, so the explicit write is needed for re-stocks.)
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401);
	const body = (await request.json()) as {
		op: 'setStatus' | 'setPeriod' | 'rename';
		id: string;
		status?: ShoppingStatus;
		restock_period?: ShoppingPeriod;
		name?: string;
	};

	if (!body.id) throw error(400, 'Missing id');

	if (body.op === 'setStatus') {
		if (!body.status || !VALID_STATUSES.includes(body.status)) {
			throw error(400, 'Bad status');
		}
		const update: { status: ShoppingStatus; last_purchased_at?: string } = {
			status: body.status
		};
		if (body.status === 'stocked') {
			update.last_purchased_at = new Date().toISOString();
		}
		const { data, error: e } = await locals.supabase
			.from('shopping_items')
			.update(update)
			.eq('id', body.id)
			.select(SELECT)
			.single();
		if (e) throw error(500, e.message);
		return json({ ok: true, item: data });
	}

	if (body.op === 'setPeriod') {
		if (!body.restock_period || !isValidPeriod(body.restock_period)) {
			throw error(400, 'Bad period');
		}
		const { data, error: e } = await locals.supabase
			.from('shopping_items')
			.update({ restock_period: body.restock_period })
			.eq('id', body.id)
			.select(SELECT)
			.single();
		if (e) throw error(500, e.message);
		return json({ ok: true, item: data });
	}

	if (body.op === 'rename') {
		const name = (body.name ?? '').trim();
		if (!name) throw error(400, 'Empty name');
		const { error: e } = await locals.supabase
			.from('shopping_items')
			.update({ name })
			.eq('id', body.id);
		if (e) throw error(500, e.message);
		return json({ ok: true });
	}

	throw error(400, 'Unknown op');
};
