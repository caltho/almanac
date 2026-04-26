import type { Database } from '$lib/db/types';

export type ShoppingStatus = Database['public']['Enums']['shopping_status'];
export type ShoppingPeriod = Database['public']['Enums']['shopping_period'];

export const SHOPPING_PERIODS: ShoppingPeriod[] = ['weekly', 'monthly', 'quarterly', 'yearly'];

export const PERIOD_LABELS: Record<ShoppingPeriod, string> = {
	weekly: 'Weekly',
	monthly: 'Monthly',
	quarterly: 'Quarterly',
	yearly: 'Yearly'
};

const PERIOD_DAYS: Record<ShoppingPeriod, number> = {
	weekly: 7,
	monthly: 30,
	quarterly: 91,
	yearly: 365
};

/** Date the item is next "due" for a restock. Returns null if never purchased. */
export function nextRestockAt(
	last: string | null | undefined,
	period: ShoppingPeriod
): Date | null {
	if (!last) return null;
	const d = new Date(last);
	d.setDate(d.getDate() + PERIOD_DAYS[period]);
	return d;
}

/**
 * Three visual states presented to the user. `reminder` is derived: a stocked
 * item that's now past its restock window. `buy` and `stocked` are the two
 * actual stored statuses on `shopping_items.status`.
 */
export type ShoppingVisual = 'buy' | 'stocked' | 'reminder';

export function visualState(item: {
	status: ShoppingStatus;
	restock_period: ShoppingPeriod;
	last_purchased_at: string | null;
}): ShoppingVisual {
	if (item.status === 'buy') return 'buy';
	const next = nextRestockAt(item.last_purchased_at, item.restock_period);
	if (next && Date.now() >= next.getTime()) return 'reminder';
	return 'stocked';
}

/** "5 days ago", "in 3 weeks", etc. */
export function relativeDays(target: Date | null, now: Date = new Date()): string {
	if (!target) return '';
	const ms = target.getTime() - now.getTime();
	const days = Math.round(ms / 86400000);
	if (days === 0) return 'today';
	const ahead = days > 0;
	const n = Math.abs(days);
	if (n < 7) return ahead ? `in ${n}d` : `${n}d ago`;
	if (n < 60) {
		const w = Math.round(n / 7);
		return ahead ? `in ${w}w` : `${w}w ago`;
	}
	if (n < 365) {
		const mo = Math.round(n / 30);
		return ahead ? `in ${mo}mo` : `${mo}mo ago`;
	}
	const y = Math.round(n / 365);
	return ahead ? `in ${y}y` : `${y}y ago`;
}
