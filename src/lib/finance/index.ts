export { parseCsv, ADAPTERS } from './csv-import/parser';
export type { ParsedRow, ParseResult, Adapter } from './csv-import/parser';
export { parseRules, anyRuleMatches, ruleSchema, rulesSchema } from './rules';
export type { Rule } from './rules';
export { categorise, categoriseByRules } from './categorise';
export type { CategoriseHit } from './categorise';

/** Centralised currency formatting. */
export function formatMoney(
	amount: number,
	currency = 'AUD',
	opts: { locale?: string; showSign?: boolean } = {}
): string {
	const formatter = new Intl.NumberFormat(opts.locale ?? 'en-AU', {
		style: 'currency',
		currency,
		signDisplay: opts.showSign ? 'always' : 'auto'
	});
	return formatter.format(amount);
}

export function monthRange(yearMonth: string): { start: string; end: string } {
	// yearMonth: 'YYYY-MM'
	const [y, m] = yearMonth.split('-').map(Number);
	const start = new Date(Date.UTC(y, m - 1, 1));
	const end = new Date(Date.UTC(y, m, 0));
	return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function currentYearMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
