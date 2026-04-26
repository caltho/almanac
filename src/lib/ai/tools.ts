import { z } from 'zod';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/db/types';

type TypedClient = SupabaseClient<Database>;

/**
 * Build the set of tools the assistant can use, each bound to the current
 * request's Supabase client (RLS-scoped to the authenticated user).
 * All writes insert with owner_id = userId; RLS enforces correctness.
 */
export function createTools(supabase: TypedClient, userId: string) {
	return [
		// --- READS -----------------------------------------------------------

		betaZodTool({
			name: 'list_journal',
			description: 'List recent journal entries. Sorted newest first.',
			inputSchema: z.object({
				from_date: z.string().optional().describe('YYYY-MM-DD (inclusive)'),
				to_date: z.string().optional().describe('YYYY-MM-DD (inclusive)'),
				limit: z.number().int().min(1).max(50).optional().default(10)
			}),
			run: async ({ from_date, to_date, limit }) => {
				let q = supabase
					.from('journal_entries')
					.select('id, entry_date, title, body, mood, custom')
					.is('deleted_at', null)
					.order('entry_date', { ascending: false })
					.limit(limit ?? 10);
				if (from_date) q = q.gte('entry_date', from_date);
				if (to_date) q = q.lte('entry_date', to_date);
				const { data, error } = await q;
				if (error) return `error: ${error.message}`;
				return JSON.stringify(data ?? []);
			}
		}),

		betaZodTool({
			name: 'list_tasks',
			description: 'List tasks. Filter by status if given.',
			inputSchema: z.object({
				status: z.enum(['todo', 'doing', 'done', 'cancelled']).optional(),
				due_before: z.string().optional().describe('YYYY-MM-DD (inclusive)'),
				limit: z.number().int().min(1).max(100).optional().default(25)
			}),
			run: async ({ status, due_before, limit }) => {
				let q = supabase
					.from('tasks')
					.select('id, title, status, due_date, priority, description')
					.is('deleted_at', null)
					.order('due_date', { ascending: true, nullsFirst: false })
					.limit(limit ?? 25);
				if (status) q = q.eq('status', status);
				if (due_before) q = q.lte('due_date', due_before);
				const { data, error } = await q;
				if (error) return `error: ${error.message}`;
				return JSON.stringify(data ?? []);
			}
		}),

		betaZodTool({
			name: 'list_habits',
			description: 'List active (non-archived) habits with their ids.',
			inputSchema: z.object({}),
			run: async () => {
				const { data, error } = await supabase
					.from('habits')
					.select('id, name, cadence')
					.is('archived_at', null)
					.order('name');
				if (error) return `error: ${error.message}`;
				return JSON.stringify(data ?? []);
			}
		}),

		betaZodTool({
			name: 'list_categories',
			description:
				'List finance categories with their ids (needed to create/categorise transactions).',
			inputSchema: z.object({}),
			run: async () => {
				const { data, error } = await supabase
					.from('categories')
					.select('id, name, parent_id')
					.order('name');
				if (error) return `error: ${error.message}`;
				return JSON.stringify(data ?? []);
			}
		}),

		betaZodTool({
			name: 'finance_summary',
			description:
				'Return aggregates for a given month (YYYY-MM): total income, total spend, top 5 categories by spend.',
			inputSchema: z.object({
				year_month: z.string().regex(/^\d{4}-\d{2}$/)
			}),
			run: async ({ year_month }) => {
				const [y, m] = year_month.split('-').map(Number);
				const start = `${year_month}-01`;
				const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
				const { data: txs, error } = await supabase
					.from('transactions')
					.select('category_id, amount')
					.gte('posted_at', start)
					.lte('posted_at', end)
					.is('deleted_at', null);
				if (error) return `error: ${error.message}`;

				let income = 0;
				let spend = 0;
				const byCat = new Map<string, number>();
				for (const t of txs ?? []) {
					if (t.amount >= 0) income += t.amount;
					else spend += Math.abs(t.amount);
					if (t.category_id && t.amount < 0) {
						byCat.set(t.category_id, (byCat.get(t.category_id) ?? 0) + Math.abs(t.amount));
					}
				}
				const top5 = [...byCat.entries()]
					.sort((a, b) => b[1] - a[1])
					.slice(0, 5)
					.map(([id, v]) => ({ category_id: id, spent: v }));

				return JSON.stringify({
					year_month,
					income,
					spend,
					net: income - spend,
					top_categories: top5
				});
			}
		}),

		// --- WRITES ----------------------------------------------------------

		betaZodTool({
			name: 'create_journal_entry',
			description:
				'Create a journal entry. Title/body optional; mood is 1-10. Confirm with the user before calling if the request was ambiguous.',
			inputSchema: z.object({
				entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
				title: z.string().optional(),
				body: z.string().optional(),
				mood: z.number().int().min(1).max(10).optional()
			}),
			run: async ({ entry_date, title, body, mood }) => {
				const { data, error } = await supabase
					.from('journal_entries')
					.insert({
						owner_id: userId,
						entry_date,
						title: title ?? null,
						body: body ?? null,
						mood: mood ?? null
					})
					.select('id')
					.single();
				if (error) return `error: ${error.message}`;
				return `created entry ${data.id}`;
			}
		}),

		betaZodTool({
			name: 'create_task',
			description: 'Create a new task.',
			inputSchema: z.object({
				title: z.string().min(1),
				description: z.string().optional(),
				due_date: z
					.string()
					.regex(/^\d{4}-\d{2}-\d{2}$/)
					.optional(),
				priority: z.number().int().min(1).max(5).optional(),
				project_id: z.string().uuid().optional()
			}),
			run: async ({ title, description, due_date, priority, project_id }) => {
				const { data, error } = await supabase
					.from('tasks')
					.insert({
						owner_id: userId,
						title,
						description: description ?? null,
						due_date: due_date ?? null,
						priority: priority ?? null,
						project_id: project_id ?? null
					})
					.select('id')
					.single();
				if (error) return `error: ${error.message}`;
				return `created task ${data.id}`;
			}
		}),

		betaZodTool({
			name: 'log_sleep',
			description: 'Create a sleep log for a date. All time fields optional.',
			inputSchema: z.object({
				log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
				went_to_bed: z
					.string()
					.regex(/^\d{2}:\d{2}$/)
					.optional(),
				woke_up: z
					.string()
					.regex(/^\d{2}:\d{2}$/)
					.optional(),
				hours_slept: z.number().min(0).max(24).optional(),
				quality: z.number().int().min(1).max(10).optional(),
				notes: z.string().optional()
			}),
			run: async ({ log_date, went_to_bed, woke_up, hours_slept, quality, notes }) => {
				const { data, error } = await supabase
					.from('sleep_logs')
					.insert({
						owner_id: userId,
						log_date,
						went_to_bed: went_to_bed ?? null,
						woke_up: woke_up ?? null,
						hours_slept: hours_slept ?? null,
						quality: quality ?? null,
						notes: notes ?? null
					})
					.select('id')
					.single();
				if (error) return `error: ${error.message}`;
				return `logged ${data.id}`;
			}
		}),

		betaZodTool({
			name: 'toggle_habit_check',
			description:
				'Tick or untick a habit for a given date. Use list_habits first if you need the id.',
			inputSchema: z.object({
				habit_id: z.string().uuid(),
				check_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
				done: z.boolean()
			}),
			run: async ({ habit_id, check_date, done }) => {
				if (done) {
					const { error } = await supabase.from('habit_checks').insert({
						owner_id: userId,
						habit_id,
						check_date
					});
					if (error && error.code !== '23505') return `error: ${error.message}`;
					return `ticked ${habit_id} on ${check_date}`;
				} else {
					const { error } = await supabase
						.from('habit_checks')
						.delete()
						.eq('habit_id', habit_id)
						.eq('check_date', check_date);
					if (error) return `error: ${error.message}`;
					return `unticked ${habit_id} on ${check_date}`;
				}
			}
		}),

		betaZodTool({
			name: 'create_transaction',
			description:
				'Create a finance transaction. Positive amount = income, negative = spend. Use list_categories to find a category_id.',
			inputSchema: z.object({
				posted_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
				description: z.string().min(1),
				amount: z.number(),
				category_id: z.string().uuid().optional()
			}),
			run: async ({ posted_at, description, amount, category_id }) => {
				const { data, error } = await supabase
					.from('transactions')
					.insert({
						owner_id: userId,
						posted_at,
						description,
						amount,
						category_id: category_id ?? null,
						source: 'ai'
					})
					.select('id')
					.single();
				if (error) return `error: ${error.message}`;
				return `created transaction ${data.id}`;
			}
		}),

		betaZodTool({
			name: 'list_assets',
			description: 'List active (non-archived) assets with id, name, kind, value, tags.',
			inputSchema: z.object({
				kind: z
					.enum(['cash', 'investment', 'property', 'vehicle', 'possession', 'other'])
					.optional()
			}),
			run: async ({ kind }) => {
				let q = supabase
					.from('assets')
					.select('id, name, kind, value, currency, location, tags')
					.is('archived_at', null)
					.order('name');
				if (kind) q = q.eq('kind', kind);
				const { data, error } = await q;
				if (error) return `error: ${error.message}`;
				return JSON.stringify(data ?? []);
			}
		}),

		betaZodTool({
			name: 'create_asset',
			description: 'Create an asset. kind defaults to "other".',
			inputSchema: z.object({
				name: z.string().min(1),
				kind: z
					.enum(['cash', 'investment', 'property', 'vehicle', 'possession', 'other'])
					.optional(),
				value: z.number().optional(),
				location: z.string().optional(),
				tags: z.array(z.string()).optional(),
				notes: z.string().optional()
			}),
			run: async ({ name, kind, value, location, tags, notes }) => {
				const { data, error } = await supabase
					.from('assets')
					.insert({
						owner_id: userId,
						name,
						kind: (kind ?? 'other') as never,
						value: value ?? null,
						location: location ?? null,
						tags: tags ?? [],
						notes: notes ?? null
					})
					.select('id')
					.single();
				if (error) return `error: ${error.message}`;
				return `created asset ${data.id}`;
			}
		}),

		betaZodTool({
			name: 'list_datasets',
			description:
				'List the user\'s datasets with id, name, and column definitions. Use this to find a dataset_id before adding rows.',
			inputSchema: z.object({}),
			run: async () => {
				const { data, error } = await supabase
					.from('datasets')
					.select('id, name, columns')
					.order('name');
				if (error) return `error: ${error.message}`;
				return JSON.stringify(data ?? []);
			}
		}),

		betaZodTool({
			name: 'add_dataset_row',
			description:
				'Append a row to a dataset. `data` is a map of column key → value; only keys that match the dataset\'s columns are stored. Call list_datasets first to find the right dataset_id and column keys.',
			inputSchema: z.object({
				dataset_id: z.string().uuid(),
				name: z.string().default(''),
				data: z.record(z.string(), z.unknown()).default({})
			}),
			run: async ({ dataset_id, name, data }) => {
				const { data: last } = await supabase
					.from('dataset_rows')
					.select('order_index')
					.eq('dataset_id', dataset_id)
					.order('order_index', { ascending: false })
					.limit(1)
					.maybeSingle();

				const { data: inserted, error } = await supabase
					.from('dataset_rows')
					.insert({
						owner_id: userId,
						dataset_id,
						name,
						data: data as never,
						order_index: (last?.order_index ?? -1) + 1
					})
					.select('id')
					.single();
				if (error) return `error: ${error.message}`;
				return `added row ${inserted.id}`;
			}
		})
	];
}
