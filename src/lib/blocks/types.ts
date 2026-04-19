import type { Database } from '$lib/db/types';
import { z } from 'zod';

export type Block = Database['public']['Tables']['blocks']['Row'];
export type Page = Database['public']['Tables']['pages']['Row'];

// Content schemas per block type. Registered in ./registry.ts.
export const paragraphSchema = z.object({ text: z.string().default('') });
export const headingSchema = z.object({
	text: z.string().default(''),
	level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2)
});
export const listSchema = z.object({
	items: z.array(z.string()).default([]),
	ordered: z.boolean().default(false)
});
export const checklistSchema = z.object({
	items: z.array(z.object({ text: z.string(), done: z.boolean().default(false) })).default([])
});
export const dataPointSchema = z.object({
	label: z.string().default(''),
	value: z.union([z.string(), z.number()]).default(''),
	unit: z.string().optional(),
	logged_at: z.string().optional()
});

export type BlockContent = {
	paragraph: z.infer<typeof paragraphSchema>;
	heading: z.infer<typeof headingSchema>;
	list: z.infer<typeof listSchema>;
	checklist: z.infer<typeof checklistSchema>;
	'data-point': z.infer<typeof dataPointSchema>;
};

export type BlockType = keyof BlockContent;

export const BLOCK_TYPES: BlockType[] = ['paragraph', 'heading', 'list', 'checklist', 'data-point'];

export const BLOCK_LABELS: Record<BlockType, string> = {
	paragraph: 'Paragraph',
	heading: 'Heading',
	list: 'List',
	checklist: 'Checklist',
	'data-point': 'Data point'
};
