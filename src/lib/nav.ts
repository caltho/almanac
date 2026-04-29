// Source of truth for top-level app domains shown in the header nav.
// Each entry points to the domain's root route. Kept in one place so the nav
// auto-updates as new domains land milestone by milestone.
//
// Some entries point to a parent route that has its own internal tabs (e.g.
// /tracking → Habits | Activities; /tasks → Tasks | Checklists; /food →
// Shopping | Recipes). Those sub-tabs live in the route's `+layout.svelte`.

import type { Component } from 'svelte';
import BookOpen from '@lucide/svelte/icons/book-open';
import Moon from '@lucide/svelte/icons/moon';
import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
import Repeat from '@lucide/svelte/icons/repeat';
import Wallet from '@lucide/svelte/icons/wallet';
import Package from '@lucide/svelte/icons/package';
import FolderKanban from '@lucide/svelte/icons/folder-kanban';
import Database from '@lucide/svelte/icons/database';
import Sparkles from '@lucide/svelte/icons/sparkles';
import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';

export type NavItem = {
	href: string;
	label: string;
	icon: Component;
	milestone: number;
	/** Treat this prefix as the active section, even if `href` differs. */
	matchPrefix?: string;
};

export const NAV_ITEMS: NavItem[] = [
	{ href: '/journal', label: 'Journal', icon: BookOpen, milestone: 2 },
	{ href: '/sleep', label: 'Sleep', icon: Moon, milestone: 3 },
	{ href: '/tasks', label: 'Tasks', icon: CheckCircle2, milestone: 3 },
	{ href: '/tracking', label: 'Tracking', icon: Repeat, milestone: 3 },
	{ href: '/food', label: 'Food', icon: UtensilsCrossed, milestone: 3 },
	{ href: '/finance', label: 'Finance', icon: Wallet, milestone: 4 },
	{ href: '/assets', label: 'Stuff', icon: Package, milestone: 5 },
	{ href: '/projects', label: 'Projects', icon: FolderKanban, milestone: 5 },
	{ href: '/datasets', label: 'Datasets', icon: Database, milestone: 6 },
	{ href: '/assistant', label: 'Assistant', icon: Sparkles, milestone: 7 }
];
