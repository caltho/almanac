import type { Database } from '$lib/db/types';

export type CustomAttrType = Database['public']['Enums']['custom_attr_type'];

export type CustomAttrDef = Database['public']['Tables']['custom_attribute_defs']['Row'];
export type CustomAttrDefInsert = Database['public']['Tables']['custom_attribute_defs']['Insert'];

// Runtime-safe shape for ui_hints across types.
export type UiHints = {
	options?: string[]; // select / multiselect
	max?: number; // rating (defaults to 5), number
	min?: number; // number
	step?: number; // number
	unit?: string; // number
	placeholder?: string;
};

export type CustomAttrValues = Record<string, unknown>;

export const ATTR_TYPE_LABELS: Record<CustomAttrType, string> = {
	text: 'Short text',
	longtext: 'Long text',
	number: 'Number',
	boolean: 'Yes / no',
	date: 'Date',
	datetime: 'Date & time',
	select: 'Single choice',
	multiselect: 'Multiple choices',
	url: 'URL',
	rating: 'Rating (1–N)'
};

export const ATTR_TYPES: CustomAttrType[] = [
	'text',
	'longtext',
	'number',
	'boolean',
	'date',
	'datetime',
	'select',
	'multiselect',
	'url',
	'rating'
];
