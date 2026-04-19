// Source of truth for top-level app domains shown in the header nav.
// Each entry points to the domain's root route. Kept in one place so the nav
// auto-updates as new domains land milestone by milestone.

import type { Component } from 'svelte';
import BookOpen from '@lucide/svelte/icons/book-open';
import Moon from '@lucide/svelte/icons/moon';
import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
import Wallet from '@lucide/svelte/icons/wallet';
import Package from '@lucide/svelte/icons/package';
import FolderKanban from '@lucide/svelte/icons/folder-kanban';
import FileText from '@lucide/svelte/icons/file-text';
import Sparkles from '@lucide/svelte/icons/sparkles';

export type NavItem = {
	href: string;
	label: string;
	icon: Component;
	milestone: number;
};

export const NAV_ITEMS: NavItem[] = [
	{ href: '/journal', label: 'Journal', icon: BookOpen, milestone: 2 },
	{ href: '/sleep', label: 'Sleep', icon: Moon, milestone: 3 },
	{ href: '/tasks', label: 'Tasks', icon: CheckCircle2, milestone: 3 },
	{ href: '/finance', label: 'Finance', icon: Wallet, milestone: 4 },
	{ href: '/assets', label: 'Assets', icon: Package, milestone: 5 },
	{ href: '/projects', label: 'Projects', icon: FolderKanban, milestone: 5 },
	{ href: '/pages', label: 'Pages', icon: FileText, milestone: 6 },
	{ href: '/assistant', label: 'Assistant', icon: Sparkles, milestone: 7 }
];
