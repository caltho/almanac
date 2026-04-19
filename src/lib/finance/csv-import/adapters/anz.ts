import type { Adapter } from '../parser';
import { parseDate, parseAmount } from '../parser';

/**
 * ANZ Australia online-banking export. Columns:
 *   Date, Amount, Description, Balance
 */
export const anz: Adapter = {
	name: 'anz',
	displayName: 'ANZ (AU)',
	sniff: (header) => {
		const has = (s: string) => header.includes(s);
		return has('date') && has('amount') && has('description') && has('balance');
	},
	parse: (row, header) => {
		const idx = (k: string) => header.indexOf(k);
		return {
			posted_at: parseDate(row[idx('date')], 'dmy'),
			description: row[idx('description')] ?? '',
			amount: parseAmount(row[idx('amount')] ?? '')
		};
	}
};
