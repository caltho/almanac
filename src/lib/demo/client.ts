// In-memory stand-in for the Supabase client, used in demo mode (see
// ./CLAUDE.md). It implements the slice of the PostgREST query builder the
// app uses, over plain arrays of fixture rows: reads filter, sort and project
// those rows, and every write resolves to a read-only error, so nothing is
// ever stored or shared between requests. It never touches the network.
//
// Browser-safe: fixtures are passed in by the server, so the browser copy is
// an empty shell that only exists to keep `supabase.auth` listeners quiet.

import type { Session, User } from '@supabase/supabase-js';
import { DEMO_READ_ONLY_MESSAGE } from './index';

export type DemoRow = Record<string, unknown>;
export type DemoTables = Record<string, DemoRow[]>;

type DemoError = { message: string; details: string | null; hint: string | null; code: string };
type DemoResult = {
	data: unknown;
	error: DemoError | null;
	count: number | null;
	status: number;
	statusText: string;
};

const READ_ONLY: DemoError = {
	message: DEMO_READ_ONLY_MESSAGE,
	details: null,
	hint: null,
	code: 'DEMO_READ_ONLY'
};

// Many-to-one foreign keys, mirroring `Relationships` in $lib/db/types.ts, so
// embedded selects like `select('*, categories(name)')` resolve either way.
const FOREIGN_KEYS: Record<string, Record<string, string>> = {
	activity_logs: { activity_id: 'activities' },
	budgets: { category_id: 'categories' },
	categories: { parent_id: 'categories' },
	checklist_items: { checklist_id: 'checklists' },
	dataset_rows: { dataset_id: 'datasets' },
	event_people: { event_id: 'events', person_id: 'people' },
	habit_checks: { habit_id: 'habits' },
	import_staging_rows: {
		batch_id: 'import_batches',
		proposed_category_id: 'categories',
		confirmed_category_id: 'categories'
	},
	project_blocks: { project_id: 'projects' },
	projects: { parent_id: 'projects' },
	recipe_versions: { recipe_id: 'recipes' },
	shopping_list_items: { supply_item_id: 'shopping_items' },
	task_list_items: { list_id: 'task_lists' },
	tasks: { project_id: 'projects' },
	transactions: { category_id: 'categories' }
};

// Postgres sorts enums by declaration order, not alphabetically.
const ENUM_ORDER: Record<string, Record<string, string[]>> = {
	tasks: { status: ['todo', 'doing', 'done', 'cancelled'] }
};

const OPERATORS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in']);

// --- select() parsing -------------------------------------------------------

type Field =
	| { kind: 'all' }
	| { kind: 'column'; name: string; alias: string }
	| {
			kind: 'embed';
			table: string;
			alias: string;
			hint: string | null;
			inner: boolean;
			fields: Field[];
	  };

/** Split on commas that aren't inside parentheses or double quotes. */
function splitTopLevel(s: string): string[] {
	const out: string[] = [];
	let depth = 0;
	let quoted = false;
	let cur = '';
	for (const ch of s) {
		if (ch === '"') quoted = !quoted;
		if (!quoted && ch === '(') depth++;
		if (!quoted && ch === ')') depth--;
		if (!quoted && depth === 0 && ch === ',') {
			out.push(cur);
			cur = '';
		} else {
			cur += ch;
		}
	}
	if (cur) out.push(cur);
	return out;
}

function parseSelect(columns: string): Field[] {
	return splitTopLevel(columns.replace(/\s+/g, '')).map((part): Field => {
		if (part === '*') return { kind: 'all' };
		const open = part.indexOf('(');
		const head = open === -1 ? part : part.slice(0, open);
		// `alias:target`, but not the `::` of a cast.
		const m = /^([^:]+):(?!:)(.+)$/.exec(head);
		const alias = m?.[1];
		const target = m ? m[2] : head;
		if (open === -1) {
			const name = target.split('::')[0];
			return { kind: 'column', name, alias: alias ?? name };
		}
		const [table, ...hints] = target.split('!');
		return {
			kind: 'embed',
			table,
			alias: alias ?? table,
			hint: hints.find((h) => h !== 'inner' && h !== 'left') ?? null,
			inner: hints.includes('inner'),
			fields: parseSelect(part.slice(open + 1, part.lastIndexOf(')')))
		};
	});
}

// --- filtering and ordering -------------------------------------------------

type Predicate = (row: DemoRow) => boolean;

function same(a: unknown, b: unknown): boolean {
	if (typeof a === 'number' || typeof b === 'number') return Number(a) === Number(b);
	return String(a) === String(b);
}

function compare(a: unknown, b: unknown): number {
	if (typeof a === 'number' || typeof b === 'number') return Number(a) - Number(b);
	if (typeof a === 'boolean' || typeof b === 'boolean') {
		return Number(String(a) === 'true') - Number(String(b) === 'true');
	}
	const sa = String(a);
	const sb = String(b);
	// Dates and timestamps compare as instants, so '2026-09-01' < '2026-09-01T08:00:00'.
	if (/^\d{4}-\d{2}-\d{2}/.test(sa) && /^\d{4}-\d{2}-\d{2}/.test(sb)) {
		const diff = Date.parse(sa) - Date.parse(sb);
		if (!Number.isNaN(diff)) return diff;
	}
	return sa.localeCompare(sb);
}

function likeToRegExp(pattern: string, caseInsensitive: boolean): RegExp {
	const body = pattern
		.split('')
		.map((ch) => (ch === '%' ? '.*' : ch === '_' ? '.' : ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
		.join('');
	return new RegExp(`^${body}$`, caseInsensitive ? 'is' : 's');
}

function test(op: string, value: unknown, arg: unknown): boolean {
	if (op === 'is') return arg === null ? value === null || value === undefined : value === arg;
	// SQL semantics: any other comparison against NULL is never true.
	if (value === null || value === undefined) return false;
	switch (op) {
		case 'eq':
			return same(value, arg);
		case 'neq':
			return !same(value, arg);
		case 'gt':
			return compare(value, arg) > 0;
		case 'gte':
			return compare(value, arg) >= 0;
		case 'lt':
			return compare(value, arg) < 0;
		case 'lte':
			return compare(value, arg) <= 0;
		case 'like':
			return likeToRegExp(String(arg), false).test(String(value));
		case 'ilike':
			return likeToRegExp(String(arg), true).test(String(value));
		case 'in':
			return Array.isArray(arg) && arg.some((a) => same(value, a));
	}
	return false;
}

function unquote(s: string): string {
	return s.length >= 2 && s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s;
}

/** Decode a PostgREST-syntax value, as passed to `.filter()`, `.not()` and `.or()`. */
function decodeArg(op: string, raw: unknown): unknown {
	if (typeof raw !== 'string') return raw;
	if (op === 'is')
		return raw === 'null' ? null : raw === 'true' ? true : raw === 'false' ? false : raw;
	if (op === 'in') return splitTopLevel(raw.replace(/^\(|\)$/g, '')).map(unquote);
	return unquote(raw);
}

// --- the query builder ------------------------------------------------------

type Order = { column: string; ascending: boolean; nullsFirst?: boolean };
type ReferencedOpts = { referencedTable?: string; foreignTable?: string };

class DemoQuery {
	private fields: Field[] = [{ kind: 'all' }];
	private filters: Predicate[] = [];
	private orders: Order[] = [];
	private offset = 0;
	private max: number | undefined;
	private mode: 'many' | 'single' | 'maybeSingle' = 'many';
	private write = false;
	private count = false;
	private head = false;
	private throws = false;
	private unsupported: string | null = null;

	constructor(
		private tables: () => DemoTables,
		// null for rpc(): no server-side functions run in the demo.
		private table: string | null
	) {}

	select(columns = '*', opts: { count?: string; head?: boolean } = {}) {
		this.fields = parseSelect(columns);
		this.count = !!opts.count;
		this.head = !!opts.head;
		return this;
	}

	// Writes: accepted so call sites chain as usual, then refused on execution.
	insert() {
		this.write = true;
		return this;
	}
	update() {
		this.write = true;
		return this;
	}
	upsert() {
		this.write = true;
		return this;
	}
	delete() {
		this.write = true;
		return this;
	}

	private where(column: string, op: string, value: unknown, negate = false): this {
		if (op.startsWith('not.')) return this.where(column, op.slice(4), value, !negate);
		if (!OPERATORS.has(op)) {
			this.unsupported = `filter operator "${op}"`;
			return this;
		}
		this.filters.push((row) => test(op, row[column], value) !== negate);
		return this;
	}

	eq(column: string, value: unknown) {
		return this.where(column, 'eq', value);
	}
	neq(column: string, value: unknown) {
		return this.where(column, 'neq', value);
	}
	gt(column: string, value: unknown) {
		return this.where(column, 'gt', value);
	}
	gte(column: string, value: unknown) {
		return this.where(column, 'gte', value);
	}
	lt(column: string, value: unknown) {
		return this.where(column, 'lt', value);
	}
	lte(column: string, value: unknown) {
		return this.where(column, 'lte', value);
	}
	like(column: string, pattern: string) {
		return this.where(column, 'like', pattern);
	}
	ilike(column: string, pattern: string) {
		return this.where(column, 'ilike', pattern);
	}
	is(column: string, value: unknown) {
		return this.where(column, 'is', value);
	}
	in(column: string, values: unknown[]) {
		return this.where(column, 'in', values);
	}
	not(column: string, op: string, value: unknown) {
		return this.where(column, op, decodeArg(op, value), true);
	}
	filter(column: string, op: string, value: unknown) {
		const bare = op.replace(/^not\./, '');
		return this.where(column, op, decodeArg(bare, value));
	}
	match(query: Record<string, unknown>) {
		for (const [column, value] of Object.entries(query)) this.where(column, 'eq', value);
		return this;
	}

	/** `.or('a.eq.1,b.is.null,and(c.gt.2,d.lt.3)')`, nested groups included. */
	or(expression: string, opts: ReferencedOpts = {}) {
		if (opts.referencedTable || opts.foreignTable) return this;
		const group = this.logic(expression, 'or');
		if (group) this.filters.push(group);
		return this;
	}

	private logic(expression: string, kind: 'and' | 'or'): Predicate | null {
		const parts: Predicate[] = [];
		for (const item of splitTopLevel(expression)) {
			const nested = /^(not\.)?(and|or)\((.*)\)$/.exec(item);
			if (nested) {
				const inner = this.logic(nested[3], nested[2] as 'and' | 'or');
				if (!inner) return null;
				parts.push(nested[1] ? (row) => !inner(row) : inner);
				continue;
			}
			// column.op.value or column.not.op.value; the value may itself contain dots.
			const m = /^([^.]+)\.(not\.)?([a-z]+)\.(.*)$/.exec(item);
			if (!m || !OPERATORS.has(m[3])) {
				this.unsupported = `or() term "${item}"`;
				return null;
			}
			const [, column, not, op, raw] = m;
			const arg = decodeArg(op, raw);
			parts.push((row) => test(op, row[column], arg) !== !!not);
		}
		return kind === 'or' ? (row) => parts.some((p) => p(row)) : (row) => parts.every((p) => p(row));
	}

	order(column: string, opts: { ascending?: boolean; nullsFirst?: boolean } & ReferencedOpts = {}) {
		if (opts.referencedTable || opts.foreignTable) return this;
		this.orders.push({ column, ascending: opts.ascending ?? true, nullsFirst: opts.nullsFirst });
		return this;
	}
	limit(count: number, opts: ReferencedOpts = {}) {
		if (!opts.referencedTable && !opts.foreignTable) this.max = count;
		return this;
	}
	range(from: number, to: number, opts: ReferencedOpts = {}) {
		if (!opts.referencedTable && !opts.foreignTable) {
			this.offset = from;
			this.max = to - from + 1;
		}
		return this;
	}

	single() {
		this.mode = 'single';
		return this;
	}
	maybeSingle() {
		this.mode = 'maybeSingle';
		return this;
	}
	throwOnError() {
		this.throws = true;
		return this;
	}
	// Type-level helpers and transport options: nothing to do in memory.
	returns() {
		return this;
	}
	overrideTypes() {
		return this;
	}
	abortSignal() {
		return this;
	}

	then<A = DemoResult, B = never>(
		onfulfilled?: ((value: DemoResult) => A | PromiseLike<A>) | null,
		onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null
	): Promise<A | B> {
		return new Promise<DemoResult>((resolve, reject) => {
			let result: DemoResult;
			try {
				result = this.run();
			} catch (e) {
				// A bug here should degrade to an empty result, never crash a page.
				result = failure(500, {
					message: `Demo client error: ${e instanceof Error ? e.message : String(e)}`,
					details: null,
					hint: null,
					code: 'DEMO_ERROR'
				});
			}
			if (this.throws && result.error) reject(result.error);
			else resolve(result);
		}).then(onfulfilled, onrejected);
	}

	private run(): DemoResult {
		if (this.write) return failure(403, READ_ONLY);
		if (this.unsupported) {
			return failure(400, {
				message: `Demo client does not support ${this.unsupported}.`,
				details: null,
				hint: 'Extend src/lib/demo/client.ts.',
				code: 'DEMO_UNSUPPORTED'
			});
		}
		if (this.table === null)
			return { data: null, error: null, count: null, status: 200, statusText: 'OK' };

		const table = this.table;
		let rows = (this.tables()[table] ?? []).filter((r) => this.filters.every((f) => f(r)));
		if (this.orders.length) rows = [...rows].sort((x, y) => this.sort(table, x, y));

		let projected = rows
			.map((r) => this.project(r, this.fields, table))
			.filter((r): r is DemoRow => r !== null);
		const count = this.count ? projected.length : null;
		projected = projected.slice(
			this.offset,
			this.max === undefined ? undefined : this.offset + this.max
		);

		let data: unknown = this.head ? null : projected;
		if (this.mode !== 'many') {
			if (projected.length > 1 || (projected.length === 0 && this.mode === 'single')) {
				return failure(406, {
					message: 'JSON object requested, multiple (or no) rows returned',
					details: `The result contains ${projected.length} rows`,
					hint: null,
					code: 'PGRST116'
				});
			}
			data = projected[0] ?? null;
		}
		// Hand out copies so callers can't mutate the fixtures underneath us.
		return { data: structuredClone(data), error: null, count, status: 200, statusText: 'OK' };
	}

	private sort(table: string, x: DemoRow, y: DemoRow): number {
		for (const o of this.orders) {
			const a = x[o.column];
			const b = y[o.column];
			const aNull = a === null || a === undefined;
			const bNull = b === null || b === undefined;
			if (aNull || bNull) {
				if (aNull && bNull) continue;
				// Postgres default: NULLS LAST ascending, NULLS FIRST descending.
				const nullsFirst = o.nullsFirst ?? !o.ascending;
				return aNull === nullsFirst ? -1 : 1;
			}
			const rank = ENUM_ORDER[table]?.[o.column];
			const c = rank ? rank.indexOf(String(a)) - rank.indexOf(String(b)) : compare(a, b);
			if (c !== 0) return o.ascending ? c : -c;
		}
		return 0;
	}

	private project(row: DemoRow, fields: Field[], table: string): DemoRow | null {
		const out: DemoRow = {};
		for (const f of fields) {
			if (f.kind === 'all') Object.assign(out, row);
			else if (f.kind === 'column') out[f.alias] = row[f.name] ?? null;
			else {
				const embedded = this.embed(row, table, f);
				if (f.inner && (embedded === null || (Array.isArray(embedded) && !embedded.length))) {
					return null;
				}
				out[f.alias] = embedded;
			}
		}
		return out;
	}

	private embed(row: DemoRow, table: string, f: Extract<Field, { kind: 'embed' }>) {
		const target = this.tables()[f.table] ?? [];
		const matches = (from: string, col: string, ref: string, to: string) =>
			ref === to && (!f.hint || f.hint === col || f.hint === `${from}_${col}_fkey`);

		// Many-to-one: this row holds the foreign key.
		const outgoing = Object.entries(FOREIGN_KEYS[table] ?? {}).find(([col, ref]) =>
			matches(table, col, ref, f.table)
		);
		if (outgoing) {
			const parent = target.find((r) => r.id === row[outgoing[0]]);
			return parent ? this.project(parent, f.fields, f.table) : null;
		}
		// One-to-many: the embedded rows point back at this one.
		const incoming = Object.entries(FOREIGN_KEYS[f.table] ?? {}).find(([col, ref]) =>
			matches(f.table, col, ref, table)
		);
		if (incoming) {
			return target
				.filter((r) => r[incoming[0]] === row.id)
				.map((r) => this.project(r, f.fields, f.table))
				.filter((r) => r !== null);
		}
		return null;
	}
}

function failure(status: number, error: DemoError): DemoResult {
	return { data: null, error, count: null, status, statusText: 'Demo' };
}

// --- the client -------------------------------------------------------------

export type DemoClientOptions = {
	/** Builds the fixture tables. Called lazily, once per client. */
	tables?: () => DemoTables;
	user?: User;
	session?: Session;
};

export function createDemoClient(options: DemoClientOptions = {}) {
	let cache: DemoTables | undefined;
	const tables = () => (cache ??= options.tables?.() ?? {});
	const refused = async () => ({ data: { user: null, session: null }, error: READ_ONLY });

	// Realtime and storage aren't used by the app today; these stubs make a
	// future call degrade quietly instead of throwing.
	const channel = {
		on: () => channel,
		subscribe: () => channel,
		unsubscribe: async () => 'ok'
	};

	const client = {
		from: (table: string) => new DemoQuery(tables, table),
		rpc: () => new DemoQuery(tables, null),
		schema: () => client,
		auth: {
			getSession: async () => ({ data: { session: options.session ?? null }, error: null }),
			getUser: async () => ({ data: { user: options.user ?? null }, error: null }),
			// Never fires: the demo session doesn't change.
			onAuthStateChange: () => ({
				data: { subscription: { id: 'demo', callback: () => {}, unsubscribe: () => {} } }
			}),
			signOut: async () => ({ error: null }),
			signInWithOtp: refused,
			exchangeCodeForSession: refused,
			verifyOtp: refused
		},
		storage: {
			from: () => ({
				list: async () => ({ data: [], error: null }),
				getPublicUrl: () => ({ data: { publicUrl: '' } }),
				download: async () => ({ data: null, error: READ_ONLY }),
				upload: async () => ({ data: null, error: READ_ONLY }),
				remove: async () => ({ data: null, error: READ_ONLY })
			})
		},
		channel: () => channel,
		removeChannel: async () => 'ok',
		removeAllChannels: async () => []
	};
	return client;
}
