// Source of truth for top-level app domains shown in the header nav.
// Each entry points to the domain's root route. Kept in one place so the nav
// auto-updates as new domains land milestone by milestone.
//
// Some entries point to a parent route that has its own internal tabs (e.g.
// /tasks → Tasks | Checklists | Habits | Activities; /food → Shopping |
// Recipes). Those sub-tabs live in the route's `+layout.svelte`.

import type { Component } from 'svelte';
import BookOpen from '@lucide/svelte/icons/book-open';
import Moon from '@lucide/svelte/icons/moon';
import Zap from '@lucide/svelte/icons/zap';
import Wallet from '@lucide/svelte/icons/wallet';
import FolderKanban from '@lucide/svelte/icons/folder-kanban';
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
	{ href: '/tasks', label: 'Doing', icon: Zap, milestone: 3 },
	{ href: '/food', label: 'Food', icon: UtensilsCrossed, milestone: 3 },
	{ href: '/finance', label: 'Finance', icon: Wallet, milestone: 4 },
	{ href: '/projects', label: 'Projects', icon: FolderKanban, milestone: 5 },
	{ href: '/assistant', label: 'Assistant', icon: Sparkles, milestone: 7 }
];
