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
	'id' | 'owner_id' | 'name' | 'description' | 'cadence' | 'archived_at' | 'custom' | 'updated_at'
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
	| 'id'
	| 'owner_id'
	| 'parent_id'
	| 'name'
	| 'description'
	| 'body_html'
	| 'status'
	| 'color'
	| 'updated_at'
>;

export type Dataset = Pick<
	T['datasets']['Row'],
	'id' | 'owner_id' | 'name' | 'columns' | 'updated_at'
>;

export type ShoppingItem = Pick<
	T['shopping_items']['Row'],
	| 'id'
	| 'owner_id'
	| 'name'
	| 'status'
	| 'restock_period'
	| 'last_purchased_at'
	| 'color'
	| 'notes'
	| 'custom'
	| 'updated_at'
>;

export type Recipe = Pick<
	T['recipes']['Row'],
	| 'id'
	| 'owner_id'
	| 'name'
	| 'description'
	| 'ingredients_html'
	| 'method_html'
	| 'custom'
	| 'updated_at'
>;

export type Checklist = Pick<T['checklists']['Row'], 'id' | 'owner_id' | 'name' | 'updated_at'>;

export type ChecklistItem = Pick<
	T['checklist_items']['Row'],
	'id' | 'checklist_id' | 'title' | 'checked' | 'order_index'
>;

export type Activity = Pick<
	T['activities']['Row'],
	'id' | 'owner_id' | 'name' | 'color' | 'order_index' | 'updated_at'
>;

export type ActivityLog = Pick<T['activity_logs']['Row'], 'id' | 'activity_id' | 'log_date'>;

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
	datasets: Dataset[];
	shoppingItems: ShoppingItem[];
	activities: Activity[];
	activityLogs: ActivityLog[];
	recipes: Recipe[];
	checklists: Checklist[];
	checklistItems: ChecklistItem[];
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
	datasets = $state<Dataset[]>([]);
	shoppingItems = $state<ShoppingItem[]>([]);
	activities = $state<Activity[]>([]);
	activityLogs = $state<ActivityLog[]>([]);
	recipes = $state<Recipe[]>([]);
	checklists = $state<Checklist[]>([]);
	checklistItems = $state<ChecklistItem[]>([]);
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
		this.datasets = seed.datasets;
		this.shoppingItems = seed.shoppingItems;
		this.activities = seed.activities;
		this.activityLogs = seed.activityLogs;
		this.recipes = seed.recipes;
		this.checklists = seed.checklists;
		this.checklistItems = seed.checklistItems;
		this.hydratedAt = seed.hydratedAt;
	}

	// --- Recipes -------------------------------------------------------------
	addRecipe(r: Recipe) {
		this.recipes = [r, ...this.recipes];
	}
	updateRecipe(id: string, patch: Partial<Recipe>) {
		const i = this.recipes.findIndex((r) => r.id === id);
		if (i >= 0) this.recipes[i] = { ...this.recipes[i], ...patch };
	}
	removeRecipe(id: string) {
		this.recipes = this.recipes.filter((r) => r.id !== id);
	}

	// --- Checklists ----------------------------------------------------------
	addChecklist(c: Checklist) {
		this.checklists = [c, ...this.checklists];
	}
	removeChecklist(id: string) {
		this.checklists = this.checklists.filter((c) => c.id !== id);
		this.checklistItems = this.checklistItems.filter((i) => i.checklist_id !== id);
	}
	addChecklistItem(item: ChecklistItem) {
		this.checklistItems = [...this.checklistItems, item];
	}
	updateChecklistItem(id: string, patch: Partial<ChecklistItem>) {
		const i = this.checklistItems.findIndex((x) => x.id === id);
		if (i >= 0) this.checklistItems[i] = { ...this.checklistItems[i], ...patch };
	}
	removeChecklistItem(id: string) {
		this.checklistItems = this.checklistItems.filter((x) => x.id !== id);
	}
	clearChecklistChecks(checklist_id: string) {
		this.checklistItems = this.checklistItems.map((i) =>
			i.checklist_id === checklist_id && i.checked ? { ...i, checked: false } : i
		);
	}

	// --- Activities ----------------------------------------------------------
	addActivity(a: Activity) {
		this.activities = [...this.activities, a];
	}
	removeActivity(id: string) {
		this.activities = this.activities.filter((a) => a.id !== id);
		this.activityLogs = this.activityLogs.filter((l) => l.activity_id !== id);
	}
	activityLoggedOn(activity_id: string, log_date: string): ActivityLog | undefined {
		return this.activityLogs.find((l) => l.activity_id === activity_id && l.log_date === log_date);
	}
	toggleActivityLog(activity_id: string, log_date: string, on: boolean, tempId?: string) {
		const existing = this.activityLoggedOn(activity_id, log_date);
		if (on) {
			if (!existing) {
				this.activityLogs = [
					...this.activityLogs,
					{
						id: tempId ?? `tmp-${Math.random().toString(36).slice(2)}`,
						activity_id,
						log_date
					}
				];
			}
		} else if (existing) {
			this.activityLogs = this.activityLogs.filter((l) => l.id !== existing.id);
		}
	}
	replaceActivityLog(tempOrPrevId: string, log: ActivityLog) {
		const i = this.activityLogs.findIndex((l) => l.id === tempOrPrevId);
		if (i >= 0) this.activityLogs[i] = log;
		else this.activityLogs = [...this.activityLogs, log];
	}

	// --- Shopping ------------------------------------------------------------
	addShoppingItem(item: ShoppingItem) {
		this.shoppingItems = [item, ...this.shoppingItems];
	}
	updateShoppingItem(id: string, patch: Partial<ShoppingItem>) {
		const i = this.shoppingItems.findIndex((x) => x.id === id);
		if (i >= 0) this.shoppingItems[i] = { ...this.shoppingItems[i], ...patch };
	}
	removeShoppingItem(id: string) {
		this.shoppingItems = this.shoppingItems.filter((x) => x.id !== id);
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
	updateHabit(id: string, patch: Partial<Habit>) {
		const i = this.habits.findIndex((h) => h.id === id);
		if (i >= 0) this.habits[i] = { ...this.habits[i], ...patch };
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
