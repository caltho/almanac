import type { Adapter } from '../parser';
import { parseDate, parseAmount } from '../parser';

/**
 * Generic fallback — expects a header row containing "date", "description",
 * and "amount" (or obvious synonyms). Matches first by exact column name, then
 * by substring. Prefers DD/MM/YYYY on ambiguous dates.
 */
export const generic: Adapter = {
	name: 'generic',
	displayName: 'Generic CSV',
	sniff: (header) => {
		const hasDate = header.some((h) => /date|posted/i.test(h));
		const hasDesc = header.some((h) => /desc|narration|memo|details/i.test(h));
		const hasAmt = header.some((h) => /amount|amt|debit|credit/i.test(h));
		return hasDate && hasDesc && hasAmt;
	},
	parse: (row, header) => {
		const find = (re: RegExp) => header.findIndex((h) => re.test(h));
		const dateIdx = find(/date|posted/i);
		const descIdx = find(/desc|narration|memo|details/i);
		const amtIdx = find(/^amount$|^amt$/i);
		const debitIdx = find(/debit/i);
		const creditIdx = find(/credit/i);

		const posted_at = dateIdx >= 0 ? parseDate(row[dateIdx]) : null;
		const description = descIdx >= 0 ? (row[descIdx] ?? '') : '';

		let amount: number;
		if (amtIdx >= 0) {
			amount = parseAmount(row[amtIdx] ?? '');
		} else if (debitIdx >= 0 || creditIdx >= 0) {
			const debit = debitIdx >= 0 ? parseAmount(row[debitIdx] ?? '') : NaN;
			const credit = creditIdx >= 0 ? parseAmount(row[creditIdx] ?? '') : NaN;
			amount = !isNaN(credit) && credit > 0 ? credit : !isNaN(debit) ? -Math.abs(debit) : NaN;
		} else {
			amount = NaN;
		}

		return { posted_at, description, amount };
	}
};
