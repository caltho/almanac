import type { ZodTypeAny } from 'zod';
import {
	paragraphSchema,
	headingSchema,
	listSchema,
	checklistSchema,
	dataPointSchema,
	type BlockType
} from './types';

type Registration = {
	type: BlockType;
	schema: ZodTypeAny;
	// Default content when a new block of this type is created.
	defaultContent: unknown;
};

export const BLOCK_REGISTRY: Record<BlockType, Registration> = {
	paragraph: {
		type: 'paragraph',
		schema: paragraphSchema,
		defaultContent: { text: '' }
	},
	heading: {
		type: 'heading',
		schema: headingSchema,
		defaultContent: { text: '', level: 2 }
	},
	list: {
		type: 'list',
		schema: listSchema,
		defaultContent: { items: [], ordered: false }
	},
	checklist: {
		type: 'checklist',
		schema: checklistSchema,
		defaultContent: { items: [] }
	},
	'data-point': {
		type: 'data-point',
		schema: dataPointSchema,
		defaultContent: { label: '', value: '' }
	}
};

export function validateBlockContent(type: string, content: unknown): unknown {
	const reg = BLOCK_REGISTRY[type as BlockType];
	if (!reg) throw new Error(`Unknown block type: ${type}`);
	return reg.schema.parse(content);
}

export function coerceBlockContent(type: string, content: unknown): unknown {
	const reg = BLOCK_REGISTRY[type as BlockType];
	if (!reg) return content;
	const result = reg.schema.safeParse(content ?? reg.defaultContent);
	return result.success ? result.data : reg.defaultContent;
}
