// Source of truth for shareable domains + permission names.
// Keep in sync with migration semantics (can_access.sql) and individual
// domain tables' RLS policies as they're added.

export const SHARE_RESOURCE_TYPES = [
	{ value: 'journal', label: 'Journal' },
	{ value: 'sleep', label: 'Sleep' },
	{ value: 'tasks', label: 'Tasks' },
	{ value: 'habits', label: 'Habits' },
	{ value: 'finance', label: 'Finance' },
	{ value: 'assets', label: 'Assets' },
	{ value: 'projects', label: 'Projects' },
	{ value: 'pages', label: 'Pages' }
] as const;

export type ShareResourceType = (typeof SHARE_RESOURCE_TYPES)[number]['value'];

export const SHARE_PERMS = ['read', 'comment', 'write'] as const;
export type SharePerm = (typeof SHARE_PERMS)[number];

export function resourceTypeLabel(value: string): string {
	return SHARE_RESOURCE_TYPES.find((t) => t.value === value)?.label ?? value;
}
