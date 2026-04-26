// Centralized client-side reactive store for the authenticated app shell.
//
// Hydrated once from `(app)/+layout.server.ts`'s `loadHotData()` and exposed
// via Svelte context so each SSR request gets its own instance (singleton
// instances would leak state between concurrent requests on the server).
//
// Pages get the store with `useUserData()`. Reading is just `userData.tasks`
// etc.; the `$state` fields are reactive. Mutations either:
//   1. Use a form action with `use:enhance` — `await update()` invalidates the
//      layout's load and the store re-hydrates from fresh server data.
//   2. Use a fetch endpoint and call a store helper (`addTask`, `removeTask`,
//      `toggleHabitCheck`, …) for instant optimistic UI.
//
// Heavy / unbounded data lives elsewhere: finance routes still query their
// own month windows (transactions can grow large), page bodies load with the
// page detail, etc. See `src/lib/stores/server.ts` for the loaded windows.

import { getContext, setContext } from 'svelte';
import type { Database } from '$lib/db/types';

type T = Database['public']['Tables'];

export type Profile = Pick<T['profiles']['Row'], 'id' | 'display_name' | 'avatar_url'>;
export type Share = T['shares']['Row'];
export type CustomAttrDef = T['custom_attribute_defs']['Row'];

export type JournalEntry = Pick<
	T['journal_entries']['Row'],
	'id' | 'owner_id' | 'entry_date' | 'title' | 'body' | 'mood' | 'custom' | 'updated_at'
>;

export type SleepLog = Pick<
	T['sleep_logs']['Row'],
	| 'id'
	| 'owner_id'
	| 'log_date'
	| 'went_to_bed'
	| 'woke_up'
	| 'hours_slept'
	| 'quality'
	| 'notes'
	| 'custom'
	| 'updated_at'
>;

export type Task = Pick<
	T['tasks']['Row'],
	| 'id'
	| 'owner_id'
	| 'title'
	| 'description'
	| 'status'
	| 'due_date'
	| 'priority'
	| 'completed_at'
	| 'custom'
	| 'updated_at'
>;

export type Habit = Pick<
	T['habits']['Row'],
	| 'id'
	| 'owner_id'
	| 'name'
	| 'description'
	| 'cadence'
	| 'archived_at'
	| 'custom'
	| 'updated_at'
>;

export type HabitCheck = Pick<T['habit_checks']['Row'], 'id' | 'habit_id' | 'check_date'>;

export type Category = Pick<T['categories']['Row'], 'id' | 'name' | 'parent_id' | 'color'>;
export type Budget = Pick<T['budgets']['Row'], 'category_id' | 'amount' | 'period'>;

export type Transaction = Pick<
	T['transactions']['Row'],
	| 'id'
	| 'posted_at'
	| 'description'
	| 'amount'
	| 'currency'
	| 'category_id'
	| 'source'
	| 'custom'
	| 'updated_at'
>;

export type Asset = Pick<
	T['assets']['Row'],
	| 'id'
	| 'owner_id'
	| 'name'
	| 'kind'
	| 'value'
	| 'currency'
	| 'acquired_on'
	| 'location'
	| 'tags'
	| 'notes'
	| 'custom'
	| 'archived_at'
	| 'updated_at'
>;

export type Project = Pick<
	T['projects']['Row'],
	'id' | 'owner_id' | 'parent_id' | 'name' | 'description' | 'status' | 'color' | 'updated_at'
>;

export type ProjectItem = Pick<
	T['project_items']['Row'],
	'id' | 'project_id' | 'parent_item_id' | 'order_index' | 'title' | 'notes' | 'done_at' | 'custom'
>;

export type PageRow = Pick<
	T['pages']['Row'],
	'id' | 'owner_id' | 'parent_id' | 'title' | 'icon' | 'order_index' | 'updated_at'
>;

export type HotData = {
	profile: Profile | null;
	shares: Share[];
	defs: CustomAttrDef[];
	journalEntries: JournalEntry[];
	sleepLogs: SleepLog[];
	tasks: Task[];
	habits: Habit[];
	habitChecks: HabitCheck[];
	categories: Category[];
	budgets: Budget[];
	recentTransactions: Transaction[];
	assets: Asset[];
	projects: Project[];
	projectItems: ProjectItem[];
	pages: PageRow[];
	hydratedAt: number;
};

export class UserData {
	profile = $state<Profile | null>(null);
	shares = $state<Share[]>([]);
	defs = $state<CustomAttrDef[]>([]);
	journalEntries = $state<JournalEntry[]>([]);
	sleepLogs = $state<SleepLog[]>([]);
	tasks = $state<Task[]>([]);
	habits = $state<Habit[]>([]);
	habitChecks = $state<HabitCheck[]>([]);
	categories = $state<Category[]>([]);
	budgets = $state<Budget[]>([]);
	recentTransactions = $state<Transaction[]>([]);
	assets = $state<Asset[]>([]);
	projects = $state<Project[]>([]);
	projectItems = $state<ProjectItem[]>([]);
	pages = $state<PageRow[]>([]);
	hydratedAt = $state(0);

	hydrate(seed: HotData) {
		this.profile = seed.profile;
		this.shares = seed.shares;
		this.defs = seed.defs;
		this.journalEntries = seed.journalEntries;
		this.sleepLogs = seed.sleepLogs;
		this.tasks = seed.tasks;
		this.habits = seed.habits;
		this.habitChecks = seed.habitChecks;
		this.categories = seed.categories;
		this.budgets = seed.budgets;
		this.recentTransactions = seed.recentTransactions;
		this.assets = seed.assets;
		this.projects = seed.projects;
		this.projectItems = seed.projectItems;
		this.pages = seed.pages;
		this.hydratedAt = seed.hydratedAt;
	}

	defsFor(table: string): CustomAttrDef[] {
		return this.defs.filter((d) => d.table_name === table);
	}

	// --- Tasks ---------------------------------------------------------------
	addTask(t: Task) {
		this.tasks = [t, ...this.tasks];
	}
	replaceTask(oldId: string, t: Task) {
		const i = this.tasks.findIndex((x) => x.id === oldId);
		if (i >= 0) this.tasks[i] = t;
		else this.tasks = [t, ...this.tasks];
	}
	updateTask(id: string, patch: Partial<Task>) {
		const i = this.tasks.findIndex((x) => x.id === id);
		if (i >= 0) this.tasks[i] = { ...this.tasks[i], ...patch };
	}
	removeTask(id: string) {
		this.tasks = this.tasks.filter((x) => x.id !== id);
	}

	// --- Habits --------------------------------------------------------------
	removeHabit(id: string) {
		this.habits = this.habits.filter((h) => h.id !== id);
		this.habitChecks = this.habitChecks.filter((c) => c.habit_id !== id);
	}
	habitTickedOn(habit_id: string, check_date: string): boolean {
		return this.habitChecks.some((c) => c.habit_id === habit_id && c.check_date === check_date);
	}
	toggleHabitCheck(habit_id: string, check_date: string, on: boolean) {
		if (on) {
			if (!this.habitTickedOn(habit_id, check_date)) {
				this.habitChecks = [
					...this.habitChecks,
					{
						id: `tmp-${Math.random().toString(36).slice(2)}`,
						habit_id,
						check_date
					}
				];
			}
		} else {
			this.habitChecks = this.habitChecks.filter(
				(c) => !(c.habit_id === habit_id && c.check_date === check_date)
			);
		}
	}
}

const KEY = Symbol('almanac.userData');

/** Call once in `(app)/+layout.svelte` with the layout's hot data. */
export function setUserData(seed: HotData): UserData {
	const u = new UserData();
	u.hydrate(seed);
	setContext(KEY, u);
	return u;
}

/** Read the store from anywhere in the (app) component tree. */
export function useUserData(): UserData {
	const u = getContext<UserData | undefined>(KEY);
	if (!u) {
		throw new Error('useUserData() must be called inside the (app)/+layout.svelte tree');
	}
	return u;
}
