// Demo-mode fixtures: a fictional person's Almanac, generated relative to
// today so the demo always looks current. Every name, number and note here is
// made up; recipes and other generic content are common knowledge. Nothing is
// read from (or resembles) the real database.
//
// Generation is deterministic. Ids and "random" values are seeded from stable
// keys, usually the calendar date, so the same day renders the same data on
// every request and detail links keep working. A given night's sleep log, for
// example, looks the same whichever day you view it from.
//
// Server-only (`.server.ts`), so none of this ships in the browser bundle.

import { DEMO_USER_ID } from './index';
import type { DemoRow, DemoTables } from './client';

export const DEMO_PERSONA = {
	displayName: 'Riley Morgan',
	email: 'riley.morgan@example.com'
};

/** How far back daily data (journal, sleep, habits, activities) goes. */
const HISTORY_DAYS = 75;
/** Bank history reaches a little further back: it came from CSV imports. */
const FINANCE_DAYS = 100;

// --- deterministic helpers --------------------------------------------------

function hash(s: string): number {
	// FNV-1a, 32-bit.
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/** Seeded PRNG (mulberry32): the same key always yields the same sequence. */
function seeded(key: string): () => number {
	let a = hash(key);
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Stable, UUID-shaped id for a fixture key. */
function id(key: string): string {
	const hex = [0, 1, 2, 3].map((i) => hash(`${i}:${key}`).toString(16).padStart(8, '0')).join('');
	const variant = '89ab'[parseInt(hex[16], 16) % 4];
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20)}`;
}

type Rand = () => number;
const between = (r: Rand, min: number, max: number) => min + r() * (max - min);
const pick = <T>(r: Rand, items: readonly T[]): T => items[Math.floor(r() * items.length)];
const money = (n: number) => Math.round(n * 100) / 100;
const pad = (n: number) => String(n).padStart(2, '0');

function calendar(now: Date) {
	const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const date = (offset: number) =>
		new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset);
	const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	return {
		/** Local calendar date `offset` days from today, as YYYY-MM-DD. */
		day: (offset: number) => iso(date(offset)),
		/** Day of week, 0 = Sunday. */
		dow: (offset: number) => date(offset).getDay(),
		/** Day of month. */
		dom: (offset: number) => date(offset).getDate(),
		monthDay: (offset: number) => ({
			month: date(offset).getMonth() + 1,
			day: date(offset).getDate()
		}),
		/** Days since the Unix epoch: a stable counter for rotating content. */
		serial: (offset: number) => {
			const d = date(offset);
			return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
		},
		/** Offset of the first of the month, `monthsAgo` months back. */
		monthStart: (monthsAgo: number) => {
			const d = new Date(base.getFullYear(), base.getMonth() - monthsAgo, 1);
			return Math.round((d.getTime() - base.getTime()) / 86_400_000);
		},
		/** Offset of the next given weekday (0 = Sunday), counting today. */
		next: (dow: number) => (dow - base.getDay() + 7) % 7,
		/** Real timestamp (UTC ISO) for a local time on a day. */
		at: (offset: number, time = '09:00') => {
			const [h, m] = time.split(':').map(Number);
			const d = date(offset);
			d.setHours(h, m);
			return d.toISOString();
		},
		/**
		 * Wall-clock timestamp with no zone. Used for calendar events so a
		 * 7pm dinner reads as 7pm for every visitor, wherever they are.
		 */
		wall: (offset: number, time = '00:00') => `${iso(date(offset))}T${time}:00`
	};
}
type Cal = ReturnType<typeof calendar>;

/** Common columns for a row the demo user owns. */
function owned(key: string, cal: Cal, createdOffset: number, fields: DemoRow): DemoRow {
	const created = cal.at(createdOffset, '09:00');
	return {
		id: id(key),
		owner_id: DEMO_USER_ID,
		created_at: created,
		updated_at: created,
		...fields
	};
}

// --- people, profiles, shares -----------------------------------------------

const SAM_ID = id('profile:sam');
const PRIYA_ID = id('profile:priya');

function profilesAndShares(cal: Cal) {
	const profiles = [
		{
			id: DEMO_USER_ID,
			display_name: DEMO_PERSONA.displayName,
			avatar_url: null,
			created_at: cal.at(-HISTORY_DAYS - 5),
			updated_at: cal.at(-30)
		},
		{
			id: SAM_ID,
			display_name: 'Sam Okafor',
			avatar_url: null,
			created_at: cal.at(-60),
			updated_at: cal.at(-60)
		},
		{
			id: PRIYA_ID,
			display_name: 'Priya Nair',
			avatar_url: null,
			created_at: cal.at(-40),
			updated_at: cal.at(-40)
		}
	];
	const shares = [
		owned('share:sleep-sam', cal, -58, {
			grantee_id: SAM_ID,
			resource_type: 'sleep',
			resource_id: null,
			scope: {},
			perms: ['read']
		}),
		owned('share:tasks-sam', cal, -58, {
			grantee_id: SAM_ID,
			resource_type: 'tasks',
			resource_id: null,
			scope: {},
			perms: ['read', 'write']
		}),
		{
			id: id('share:projects-priya'),
			owner_id: PRIYA_ID,
			grantee_id: DEMO_USER_ID,
			resource_type: 'projects',
			resource_id: null,
			scope: {},
			perms: ['read'],
			created_at: cal.at(-33),
			updated_at: cal.at(-33)
		}
	];
	return { profiles, shares };
}

type PersonSeed = {
	key: string;
	name: string;
	tags: string[];
	/** Days from today to their next birthday (so some always fall in the next month). */
	birthday?: number;
	year?: number;
	color?: string;
	email?: string;
	phone?: string;
	notes?: string;
	contacted?: number;
};

// Phone numbers are from the 0491 570 range the ACMA reserves for fiction.
const PEOPLE: PersonSeed[] = [
	{
		key: 'sam',
		name: 'Sam Okafor',
		tags: ['Family'],
		birthday: 12,
		year: 1993,
		color: 'purple',
		email: 'sam.okafor@example.com',
		phone: '0491 570 156',
		notes: 'Allergic to cashews. Loves Thai food and old records.'
	},
	{
		key: 'mum',
		name: 'Helen Morgan (Mum)',
		tags: ['Family'],
		birthday: 26,
		year: 1962,
		color: 'red',
		phone: '0491 570 157',
		notes: 'Gardening, crosswords, murder mysteries.',
		contacted: -4
	},
	{
		key: 'dad',
		name: 'Graham Morgan (Dad)',
		tags: ['Family'],
		birthday: 141,
		year: 1960,
		color: 'blue',
		phone: '0491 570 158',
		notes: 'Knee is on the mend. Ask about the shed.',
		contacted: -4
	},
	{
		key: 'ella',
		name: 'Ella Morgan',
		tags: ['Family'],
		birthday: 83,
		year: 1996,
		color: 'orange',
		email: 'ella.m@example.com',
		notes: 'In Sydney. Starting a masters next year.',
		contacted: -9
	},
	{
		key: 'june',
		name: 'Grandma June',
		tags: ['Family'],
		birthday: 97,
		year: 1938,
		color: 'yellow',
		notes: 'Call on Sundays. Loves hearing about the garden.',
		contacted: -31
	},
	{
		key: 'liam',
		name: 'Liam Okafor',
		tags: ['Family'],
		birthday: 233,
		year: 1990,
		notes: "Sam's brother. Perth."
	},
	{
		key: 'priya',
		name: 'Priya Nair',
		tags: ['Friends', 'Book club'],
		birthday: 47,
		color: 'teal',
		email: 'priya.nair@example.com',
		phone: '0491 570 159',
		notes: 'New job at the hospital. Makes the best dal.',
		contacted: -12
	},
	{
		key: 'tom',
		name: 'Tom Whitaker',
		tags: ['Friends', 'Book club', 'Running'],
		birthday: 201,
		color: 'green',
		notes: 'Running buddy. Also doing the half.',
		contacted: -5
	},
	{
		key: 'marco',
		name: 'Marco Rossi',
		tags: ['Friends'],
		birthday: 312,
		notes: 'Owes me a pizza.',
		contacted: -5
	},
	{
		key: 'jonah',
		name: 'Jonah Park',
		tags: ['Work'],
		birthday: 162,
		email: 'jonah.park@example.com',
		notes: 'Moved to Berlin. Keep in touch.',
		contacted: -19
	},
	{
		key: 'aisha',
		name: 'Aisha Rahman',
		tags: ['Work'],
		notes: 'Design lead. 1:1s on Tuesdays.',
		contacted: -2
	}
];

function people(cal: Cal) {
	return PEOPLE.map((p) => {
		const bday = p.birthday === undefined ? null : cal.monthDay(p.birthday);
		return owned(`person:${p.key}`, cal, -HISTORY_DAYS + 3, {
			name: p.name,
			email: p.email ?? null,
			phone: p.phone ?? null,
			notes: p.notes ?? null,
			color: p.color ?? null,
			avatar_url: null,
			birthday_month: bday?.month ?? null,
			birthday_day: bday?.day ?? null,
			birthday_year: p.year ?? null,
			tags: p.tags,
			last_contacted_at: p.contacted === undefined ? null : cal.at(p.contacted, '18:30'),
			custom: {}
		});
	});
}

const personId = (key: string) => id(`person:${key}`);

// --- custom attributes ------------------------------------------------------

const DEFS: [table: string, key: string, label: string, type: string, hints: DemoRow][] = [
	['journal_entries', 'energy', 'Energy', 'rating', { max: 5 }],
	[
		'journal_entries',
		'tags',
		'Tags',
		'multiselect',
		{ options: ['Work', 'Family', 'Friends', 'Health', 'Outdoors', 'Creative', 'Home', 'Learning'] }
	],
	['sleep_logs', 'caffeine_late', 'Caffeine after 2pm', 'boolean', {}],
	['tasks', 'context', 'Context', 'select', { options: ['Home', 'Work', 'Errands', 'Admin'] }],
	['habits', 'why', 'Why it matters', 'text', {}],
	[
		'projects',
		'area',
		'Area',
		'select',
		{ options: ['Home', 'Health', 'Creative', 'Money', 'Learning'] }
	],
	['projects', 'target_date', 'Target date', 'date', {}],
	['transactions', 'tax_deductible', 'Tax deductible', 'boolean', {}],
	['assets', 'last_valued', 'Last valued', 'date', {}]
];

function customAttributeDefs(cal: Cal) {
	return DEFS.map(([table, key, label, type, hints], i) =>
		owned(`def:${table}:${key}`, cal, -HISTORY_DAYS + 1 + i, {
			table_name: table,
			key,
			label,
			type,
			ui_hints: hints,
			required: false,
			order_index: DEFS.slice(0, i).filter((d) => d[0] === table).length
		})
	);
}

// --- journal & quick notes --------------------------------------------------

type JournalSeed = {
	title: string;
	text: string;
	tags: string[];
	mood: number;
	/** The text already describes the weather, so skip the weather opener. */
	weather?: true;
};

/** Story beats, pinned to the same days as the matching tasks, events and spending. */
const PINNED_ENTRIES: [offset: number, JournalSeed][] = [
	[
		-3,
		{
			title: 'Admin afternoon',
			text: 'Renewed the car rego and finally cancelled the streaming service I never use. The dentist can wait until next week.',
			tags: ['Home'],
			mood: 0
		}
	],
	[
		-4,
		{
			title: 'Called Mum and Dad',
			text: "Long video call with Mum and Dad. Dad's knee is on the mend and Mum is already planning Christmas. Promised we'd drive up soon.",
			tags: ['Family'],
			mood: 1
		}
	],
	[
		-5,
		{
			title: 'Pizza night',
			text: "Pizza with Tom and Marco. Marco insists this one doesn't count as the pizza he owes me.",
			tags: ['Friends'],
			mood: 1
		}
	],
	[
		-9,
		{
			title: 'Daylesford booked',
			text: 'Booked a cottage in Daylesford for our anniversary weekend. Already reading bakery reviews.',
			tags: ['Family'],
			mood: 1
		}
	],
	[
		-12,
		{
			title: 'Book club',
			text: "Book club at Priya's. We discussed the book for about ten minutes and then argued about the ending of a TV show for an hour. Classic.",
			tags: ['Friends', 'Creative'],
			mood: 1
		}
	],
	[
		-15,
		{
			title: 'Bathroom quotes',
			text: 'Second tiler came through to quote the bathroom. Their number was much closer to what we budgeted. Sam wants to wait until after summer, which is fair.',
			tags: ['Home'],
			mood: 0
		}
	],
	[
		-16,
		{
			title: '5k PB',
			text: 'Knocked 40 seconds off my 5k time. The interval sessions are clearly doing something.',
			tags: ['Health', 'Outdoors'],
			mood: 2
		}
	],
	[
		-19,
		{
			title: 'Team lunch',
			text: 'Farewell lunch for Jonah, who is off to Berlin. The team gave him a truly ugly jumper as a leaving present. He wore it immediately.',
			tags: ['Work', 'Friends'],
			mood: 1
		}
	],
	[
		-20,
		{
			title: 'Tax return lodged',
			text: 'Lodged the tax return. Small refund on the way, going straight into the holiday fund.',
			tags: ['Home'],
			mood: 1
		}
	],
	[
		-24,
		{
			title: "Sam's big pitch",
			text: 'Sam pitched the new campaign to the client and they loved it. Celebrated with dumplings.',
			tags: ['Family'],
			mood: 2
		}
	],
	[
		-25,
		{
			title: 'Back on track',
			text: 'First run after the cold. Kept it short and easy. Felt good to be moving again.',
			tags: ['Health'],
			mood: 1
		}
	],
	[
		-27,
		{
			title: 'Sick day',
			text: 'Head cold. Soup, tissues and three episodes of a baking show.',
			tags: ['Health'],
			mood: -2
		}
	],
	[
		-30,
		{
			title: 'Ella visited',
			text: 'Ella stayed over on her way through to Sydney. We walked along the beach at Williamstown and ate chips on the pier.',
			tags: ['Family', 'Outdoors'],
			mood: 2
		}
	],
	[
		-33,
		{
			title: "Dinner at Priya's",
			text: "Priya made her mum's dal and we stayed far too late talking about her new job. Good for the soul, bad for the sleep log.",
			tags: ['Friends'],
			mood: 1
		}
	],
	[
		-40,
		{
			title: 'Worm farm arrived',
			text: 'Set up the worm farm under the lemon tree. Sam is not convinced. I have named the worms, collectively, Gary.',
			tags: ['Home'],
			mood: 1
		}
	],
	[
		-45,
		{
			title: 'Spanish streak',
			text: 'Two weeks of Spanish lessons without missing a day. I can now order a coffee and apologise for my accent, which covers most situations.',
			tags: ['Learning'],
			mood: 1
		}
	],
	[
		-52,
		{
			title: 'Seedling haul',
			text: 'Went to the nursery for "a couple of herbs" and came home with a boot full of seedlings.',
			tags: ['Home', 'Outdoors'],
			mood: 1
		}
	]
];

// Everyday entries for the days in between. Rotated, so repeats are weeks apart.
const WEEKDAY_ENTRIES: JournalSeed[] = [
	{
		title: 'Design review went well',
		text: 'Presented the onboarding flow to the leadership group. Lots of questions about the empty states, but the overall direction landed. Relieved.',
		tags: ['Work'],
		mood: 1
	},
	{
		title: 'Rough day',
		text: 'Two back-to-back workshops and a bug in production that ate the whole afternoon. Went for a walk at dusk, which helped a bit.',
		tags: ['Work'],
		mood: -2
	},
	{
		title: 'Quiet one',
		text: "Worked, cooked, read. Nothing to report and that's fine.",
		tags: ['Home'],
		mood: 0
	},
	{
		title: 'Tired',
		text: 'Woke at 3am and never really got back to sleep. Moved through the day on autopilot. Early night tonight.',
		tags: ['Health'],
		mood: -2
	},
	{
		title: 'Bike commute in the rain',
		text: 'Rode in despite the forecast. Arrived soaked, smug and twenty minutes early.',
		tags: ['Health', 'Outdoors'],
		mood: 0,
		weather: true
	},
	{
		title: 'Deep work',
		text: 'Blocked out the whole morning with notifications off and got the prototype into a testable state. Should do this every week.',
		tags: ['Work'],
		mood: 1
	},
	{
		title: 'Sore',
		text: "Legs are wrecked after yesterday's run. Foam roller and an embarrassing amount of stretching.",
		tags: ['Health'],
		mood: -1
	},
	{
		title: 'Budget check-in',
		text: 'Sat down with the finance tab. The numbers are fine. Eating out is creeping up, which surprises nobody.',
		tags: ['Home'],
		mood: 0
	},
	{
		title: 'User interviews',
		text: 'Ran user interviews all afternoon. The same few pain points keep coming up, which is useful if slightly humbling.',
		tags: ['Work'],
		mood: 0
	},
	{
		title: 'New recipe',
		text: 'Tried shakshuka for dinner and it was genuinely good. Adding it to the rotation.',
		tags: ['Home', 'Creative'],
		mood: 1
	},
	{
		title: 'Windy',
		text: 'Gale force winds all day. Lost one of the garden stakes and most of my patience.',
		tags: ['Home'],
		mood: -1,
		weather: true
	},
	{
		title: 'Drinks after work',
		text: 'Went to the wine bar on Sydney Road with people from work. Stayed for one, which became three.',
		tags: ['Friends', 'Work'],
		mood: 1
	},
	{
		title: 'Good sleep streak',
		text: 'Four nights in a row over seven and a half hours. No phone in bed is working, annoyingly.',
		tags: ['Health'],
		mood: 1
	},
	{
		title: 'Hill repeats',
		text: "Seven hill repeats at the park. I said some things to that hill I'm not proud of.",
		tags: ['Health', 'Outdoors'],
		mood: 0
	},
	{
		title: 'Sketching again',
		text: 'Did a quick sketch of the lemon tree before work. First drawing in months.',
		tags: ['Creative'],
		mood: 1
	},
	{
		title: 'Grey day',
		text: "Overcast and a bit flat. Did the minimum and that's okay.",
		tags: [],
		mood: -1,
		weather: true
	},
	{
		title: 'Late one',
		text: 'Stayed late to finish the design handover. Got home, ate toast over the sink, went to bed.',
		tags: ['Work'],
		mood: -1
	},
	{
		title: 'Lunchtime walk',
		text: 'Walked to the park at lunch instead of eating at my desk. Came back with a clearer head and a plan for the afternoon.',
		tags: ['Health', 'Work'],
		mood: 1
	}
];

const WEEKEND_ENTRIES: JournalSeed[] = [
	{
		title: 'Long run done',
		text: 'Long run along the creek trail. Legs were heavy for the first 5k and then something clicked. Stretched properly afterwards, for once.',
		tags: ['Health', 'Outdoors'],
		mood: 1
	},
	{
		title: 'Garden day',
		text: 'Weeded the beds and tied up the beans. Picked a big bowl of rocket for dinner. The basil is going nuts.',
		tags: ['Home', 'Outdoors'],
		mood: 1
	},
	{
		title: 'Slow morning',
		text: "Pancakes, the crossword, a nap. Didn't open the laptop once.",
		tags: ['Home'],
		mood: 1
	},
	{
		title: 'Farmers market',
		text: 'Went to the market early with Sam. Came home with far too many greens and a sourdough the size of a pillow.',
		tags: ['Home', 'Outdoors'],
		mood: 1
	},
	{
		title: 'Photo walk',
		text: 'Took the camera around Fitzroy for an hour. Two decent shots out of about two hundred, which is roughly my usual ratio.',
		tags: ['Creative', 'Outdoors'],
		mood: 1
	},
	{
		title: 'Parkrun with Tom',
		text: 'Tom talked me into parkrun. Beat him by four seconds and will be mentioning it for weeks.',
		tags: ['Health', 'Friends'],
		mood: 1
	},
	{
		title: 'Batch cooking',
		text: 'Made a big pot of bolognese and a loaf of banana bread. Freezer is full and the week is sorted.',
		tags: ['Home'],
		mood: 1
	},
	{
		title: 'Bike ride with Sam',
		text: 'Rode the river trail with Sam and stopped for a pastry halfway, which I am counting as fuel.',
		tags: ['Family', 'Outdoors'],
		mood: 1
	}
];

const OPENINGS = [
	'Cold, clear morning.',
	'Sun out for once.',
	'Grey and drizzly all day.',
	'Up early with the birds.',
	'Slept in a bit.',
	'Proper spring weather.'
];
const CLOSINGS = [
	'In bed by 10:30, hopefully.',
	'Grateful for small things today.',
	'Tomorrow: run, work, early night.',
	'Need to drink more water.',
	'Sam cooked, which was lovely.'
];

function journalEntries(cal: Cal) {
	const rows: DemoRow[] = [];
	for (let n = 1; n <= HISTORY_DAYS; n++) {
		const date = cal.day(-n);
		const dow = cal.dow(-n);
		const r = seeded(`journal:${date}`);
		const weekend = dow === 0 || dow === 6;
		const pinned = PINNED_ENTRIES.find(([offset]) => offset === -n)?.[1];
		// Most days, and always the last couple so the dashboard has something fresh.
		if (!pinned && n > 2 && r() > (weekend ? 0.7 : 0.8)) continue;

		// Rotate through each pool in order so repeats are weeks apart.
		const week = Math.floor((cal.serial(-n) + 3) / 7);
		const seed =
			pinned ??
			(weekend
				? WEEKEND_ENTRIES[(week * 2 + (dow === 0 ? 1 : 0)) % WEEKEND_ENTRIES.length]
				: WEEKDAY_ENTRIES[(week * 5 + dow - 1) % WEEKDAY_ENTRIES.length]);
		const opening = !seed.weather && r() < 0.5 ? pick(r, OPENINGS) : '';
		const body = [opening, seed.text, r() < 0.4 ? pick(r, CLOSINGS) : ''].filter(Boolean).join(' ');
		const mood = Math.max(3, Math.min(9, Math.round(7 + seed.mood + between(r, -1, 1))));
		const written = cal.at(-n, pick(r, ['20:45', '21:30', '22:10']));
		rows.push({
			id: id(`journal:${date}`),
			owner_id: DEMO_USER_ID,
			entry_date: date,
			// The dashboard shows the latest three, so those always have titles.
			title: pinned || n <= 3 || r() < 0.9 ? seed.title : null,
			body,
			mood,
			custom: {
				energy: Math.max(1, Math.min(5, Math.round(mood / 2 - 0.5 + between(r, -0.5, 0.5)))),
				tags: seed.tags
			},
			created_at: written,
			updated_at: written,
			deleted_at: null
		});
	}
	return rows;
}

function quickNotes(cal: Cal) {
	const notes: [
		key: string,
		title: string,
		body: string,
		color: string | null,
		internalised: boolean,
		age: number
	][] = [
		[
			'gift',
			'Gift ideas for Sam',
			'Record player (the one from the market). Dinner at the new Thai place. Fancy hot sauce.',
			'purple',
			false,
			-3
		],
		[
			'physio',
			'Questions for the physio',
			'Is the tight calf from the new shoes? Should I drop Tuesday intervals for a week?',
			'red',
			false,
			-2
		],
		[
			'garden',
			'Garden',
			'Tomatoes go in after Melbourne Cup. Net the strawberries before the birds find them.',
			'green',
			false,
			-11
		],
		[
			'podcasts',
			'Podcasts to try',
			'The one about the history of design systems. The Spanish learners one Priya mentioned.',
			'teal',
			false,
			-16
		],
		[
			'bookclub',
			'Book club picks',
			'Next up: Frankenstein. After that, something short please.',
			'orange',
			false,
			-21
		],
		[
			'wifi',
			'Guest wifi',
			'Network: MorganOkafor-Guest. Password is on the fridge.',
			null,
			false,
			-44
		],
		[
			'water',
			'Water before coffee',
			'Glass of water first thing, then coffee. Works.',
			null,
			true,
			-52
		],
		[
			'twomin',
			'Two-minute rule',
			'If it takes less than two minutes, do it now instead of writing it down.',
			null,
			true,
			-67
		]
	];
	return notes.map(([key, title, body, color, internalised, age], i) =>
		owned(`note:${key}`, cal, age, { title, body, color, internalised, order_index: i, custom: {} })
	);
}

// --- sleep ------------------------------------------------------------------

const BROKEN_NIGHT_NOTES = [
	'Woke at 3am and lay awake for an hour.',
	"Neighbour's dog barked around 5.",
	"Sam's alarm went off at 5:30 by mistake.",
	'Too warm, kicked the doona off.'
];
const SLEEP_NOTES = [
	'Late dinner, felt it.',
	'Slept like a log after the long run.',
	'Read in bed instead of scrolling. Helped.',
	'Vivid dream about missing a flight.',
	'Stayed up finishing a book. Worth it.'
];

/** Minutes after midnight (may run past 24h) to a Postgres `time`, snapped to 5 minutes. */
function toTime(minutes: number): string {
	const m = (((Math.round(minutes / 5) * 5) % 1440) + 1440) % 1440;
	return `${pad(Math.floor(m / 60))}:${pad(m % 60)}:00`;
}

function sleepLogs(cal: Cal) {
	const rows: DemoRow[] = [];
	// log_date is the "night of" date, so last night is yesterday.
	for (let n = 1; n <= HISTORY_DAYS; n++) {
		const date = cal.day(-n);
		const r = seeded(`sleep:${date}`);
		if (n > 3 && r() < 0.08) continue; // the odd night goes unlogged

		const lateNight = cal.dow(-n) === 5 || cal.dow(-n) === 6; // Friday, Saturday
		const bed = Math.round((lateNight ? between(r, 23, 24.75) : between(r, 22.25, 23.75)) * 12) * 5;
		const wake =
			Math.round(((lateNight ? between(r, 7.25, 8.75) : between(r, 6, 7)) + 24) * 12) * 5;
		const caffeine = r() < 0.18;
		// Hours auto-fill from the times (the app rounds to 0.25). On a broken
		// night the user knocks some off and notes why.
		const broken = r() < 0.12;
		const hours = Math.round(((wake - bed) / 60) * 4) / 4 - (broken ? pick(r, [0.5, 0.75, 1]) : 0);
		const quality = Math.max(
			3,
			Math.min(
				9,
				Math.round(
					4 + (hours - 5.5) * 1.4 + between(r, -1, 1) - (caffeine ? 1 : 0) - (broken ? 1 : 0)
				)
			)
		);
		const logged = cal.at(-n + 1, '07:40');
		rows.push({
			id: id(`sleep:${date}`),
			owner_id: DEMO_USER_ID,
			log_date: date,
			went_to_bed: toTime(bed),
			woke_up: toTime(wake),
			hours_slept: hours,
			quality,
			notes: broken ? pick(r, BROKEN_NIGHT_NOTES) : r() < 0.1 ? pick(r, SLEEP_NOTES) : null,
			custom: { caffeine_late: caffeine },
			created_at: logged,
			updated_at: logged,
			deleted_at: null
		});
	}
	return rows;
}

// --- projects ---------------------------------------------------------------

type ProjectSeed = {
	key: string;
	name: string;
	description: string;
	status: 'active' | 'done' | 'archived';
	color: string;
	parent?: string;
	area: string;
	target?: number;
	age: number;
	blocks: [heading: string | null, html: string][];
};

const PROJECTS: ProjectSeed[] = [
	{
		key: 'garden',
		name: 'Kitchen garden',
		status: 'active',
		color: 'green',
		area: 'Home',
		target: 60,
		age: -70,
		description: 'Veggie beds along the back fence, plus pots on the deck.',
		blocks: [
			[
				'Plan',
				'<p>Four beds along the back fence. Tomatoes and zucchini get the sunniest spot, herbs go by the back door so they actually get used.</p><ul><li>Bed 1: tomatoes and basil</li><li>Bed 2: zucchini and beans</li><li>Bed 3: lettuce, rocket and spinach (sow a new row every three weeks)</li><li>Bed 4: garlic, in since autumn</li></ul>'
			],
			[
				'Log',
				'<p><strong>Week 1:</strong> drip line in, seedlings hardened off on the deck.</p><p><strong>Week 3:</strong> first rocket harvest. Snails found the lettuce.</p><p><strong>Week 5:</strong> beer traps are working. The basil is enormous.</p>'
			],
			[
				'Next season',
				'<ul><li>Companion plant marigolds with the tomatoes</li><li>Wicking beds for the deck pots</li><li>Try growing garlic from our own cloves</li></ul>'
			]
		]
	},
	{
		key: 'worms',
		name: 'Worm farm',
		parent: 'garden',
		status: 'active',
		color: 'teal',
		area: 'Home',
		age: -40,
		description: 'Three-tray worm farm under the lemon tree.',
		blocks: [
			[
				'Feeding notes',
				'<p>Small amounts every three or four days. No citrus, onion or garlic. Keep a damp hessian sack on top and the lid on when it rains.</p>'
			]
		]
	},
	{
		key: 'half',
		name: 'Half marathon (November)',
		status: 'active',
		color: 'orange',
		area: 'Health',
		target: 42,
		age: -64,
		description: 'Race day in November. Goal: under two hours.',
		blocks: [
			[
				'Plan',
				'<p>Twelve week plan, four runs a week, long run on Sundays building to 19k.</p><ol><li>Weeks 1-4: base building, everything easy</li><li>Weeks 5-8: intervals on Tuesdays</li><li>Weeks 9-11: tempo runs and the longest long runs</li><li>Week 12: taper</li></ol>'
			],
			[
				'Pacing',
				'<p>Goal pace 5:40/km. Easy runs at 6:30/km or slower. Practise taking gels on every long run.</p>'
			],
			[
				'Gear',
				'<ul><li>New shoes (current pair is past 700km)</li><li>Running belt for gels</li><li>Anti-chafe balm</li></ul>'
			]
		]
	},
	{
		key: 'bathroom',
		name: 'Bathroom refresh',
		status: 'active',
		color: 'blue',
		area: 'Home',
		target: 120,
		age: -45,
		description: 'New vanity, tiles and a proper exhaust fan. Landlord approved.',
		blocks: [
			[
				'Quotes',
				'<ul><li>Tiler A: $6,800, can start in six weeks</li><li>Tiler B: $5,950, includes waterproofing</li><li>Plumber for the vanity swap: $1,200</li></ul><p>Landlord is covering half. Probably waiting until after summer.</p>'
			],
			[
				'Ideas',
				'<p>Terrazzo-look floor, white gloss wall tiles, timber vanity, brushed nickel tapware.</p>'
			]
		]
	},
	{
		key: 'spanish',
		name: 'Learn Spanish',
		status: 'active',
		color: 'purple',
		area: 'Learning',
		age: -60,
		description: 'Conversational by the Spain trip next year.',
		blocks: [
			[
				'Resources',
				'<ul><li>Daily app lessons (keep the streak)</li><li>A podcast for learners on the commute</li><li>Conversation meetup on Thursdays</li></ul>'
			],
			[
				'Useful phrases',
				'<ul><li><em>¿Me pone un café con leche?</em> Could I get a latte?</li><li><em>Perdón, estoy aprendiendo.</em> Sorry, I am learning.</li><li><em>¿Dónde está la estación?</em> Where is the station?</li></ul>'
			]
		]
	},
	{
		key: 'spain',
		name: 'Spain trip budget',
		status: 'active',
		color: 'yellow',
		area: 'Money',
		target: 240,
		age: -30,
		description: 'Three weeks, next spring.',
		blocks: [
			[
				'Rough budget',
				'<ul><li>Flights: about $2,400 each</li><li>Accommodation: $150 a night</li><li>Food and fun: $100 a day</li></ul><p>Holiday fund is at $2,950 and growing by $400 a month.</p>'
			]
		]
	},
	{
		key: 'photobook',
		name: 'Photo book for Mum',
		status: 'done',
		color: 'slate',
		area: 'Creative',
		age: -74,
		description: 'Printed and gifted. She cried.',
		blocks: [['Notes', '<p>Done: 60 pages. Next time, start before the last fortnight.</p>']]
	},
	{
		key: 'website',
		name: 'Personal website',
		status: 'archived',
		color: 'red',
		area: 'Creative',
		age: -73,
		description: 'Parked. Revisit when things are quieter.',
		blocks: []
	}
];

const projectId = (key: string) => id(`project:${key}`);

function projects(cal: Cal) {
	const rows = PROJECTS.map((p) =>
		owned(`project:${p.key}`, cal, p.age, {
			parent_id: p.parent ? projectId(p.parent) : null,
			name: p.name,
			description: p.description,
			status: p.status,
			color: p.color,
			custom: { area: p.area, ...(p.target ? { target_date: cal.day(p.target) } : {}) },
			updated_at: cal.at(Math.min(-1, p.age + 20), '20:00')
		})
	);
	const blocks = PROJECTS.flatMap((p) =>
		p.blocks.map(([heading, body_html], i) =>
			owned(`block:${p.key}:${i}`, cal, p.age + i, {
				project_id: projectId(p.key),
				heading,
				body_html,
				order_index: i
			})
		)
	);
	return { projects: rows, blocks };
}

// --- tasks, task lists, checklists ------------------------------------------

type TaskSeed = {
	title: string;
	status: 'todo' | 'doing' | 'done' | 'cancelled';
	due?: number;
	done?: number;
	priority?: number;
	context: string;
	project?: string;
	description?: string;
};

const TASKS: TaskSeed[] = [
	{
		title: 'Book physio for tight calf',
		status: 'todo',
		due: 2,
		priority: 2,
		context: 'Admin',
		project: 'half'
	},
	{
		title: 'Draft onboarding research summary',
		status: 'todo',
		due: 3,
		priority: 1,
		context: 'Work',
		description:
			'Top three themes from the interviews, with quotes. Share with Aisha before Friday.'
	},
	{
		title: 'Order new running shoes',
		status: 'todo',
		due: 5,
		priority: 2,
		context: 'Errands',
		project: 'half'
	},
	{
		title: 'Top up worm farm bedding',
		status: 'todo',
		due: 6,
		priority: 4,
		context: 'Home',
		project: 'worms'
	},
	{
		title: "Buy Sam's birthday present",
		status: 'todo',
		due: 9,
		priority: 1,
		context: 'Errands',
		description: 'See the gift ideas note.'
	},
	{
		title: 'Pick bathroom tiles',
		status: 'todo',
		due: 14,
		priority: 3,
		context: 'Home',
		project: 'bathroom'
	},
	{
		title: 'Renew passport',
		status: 'todo',
		due: 20,
		priority: 3,
		context: 'Admin',
		project: 'spain'
	},
	{
		title: 'Email landlord about the leaking tap',
		status: 'todo',
		due: -1,
		priority: 2,
		context: 'Home'
	},
	{ title: 'Book dentist check-up', status: 'todo', due: -3, priority: 3, context: 'Admin' },
	{
		title: 'Call electrician about an outdoor power point',
		status: 'todo',
		priority: 4,
		context: 'Home',
		project: 'garden'
	},
	{ title: "Sort photos for Grandma's album", status: 'todo', priority: 5, context: 'Home' },
	{
		title: 'Refresh the component library docs',
		status: 'doing',
		due: 4,
		priority: 2,
		context: 'Work'
	},
	{
		title: 'Spanish unit 7: past tense',
		status: 'doing',
		priority: 3,
		context: 'Home',
		project: 'spanish'
	},
	{
		title: 'Compare bathroom quotes',
		status: 'doing',
		due: 7,
		priority: 2,
		context: 'Home',
		project: 'bathroom'
	},
	{ title: 'Renew car rego', status: 'done', due: -2, done: -3, context: 'Admin' },
	{ title: 'Cancel unused streaming subscription', status: 'done', done: -3, context: 'Admin' },
	{ title: 'Return library books', status: 'done', due: -5, done: -6, context: 'Errands' },
	{ title: 'Book Daylesford cottage', status: 'done', done: -9, context: 'Home' },
	{ title: 'Lodge tax return', status: 'done', due: -18, done: -20, context: 'Admin' },
	{
		title: 'Get quotes from two tilers',
		status: 'done',
		done: -15,
		context: 'Home',
		project: 'bathroom'
	},
	{ title: 'Replace bike brake pads', status: 'done', done: -18, context: 'Errands' },
	{
		title: 'Buy compost and seedling mix',
		status: 'done',
		done: -20,
		context: 'Errands',
		project: 'garden'
	},
	{
		title: 'Register for the half marathon',
		status: 'done',
		done: -40,
		context: 'Admin',
		project: 'half'
	},
	{
		title: 'Repaint the back fence',
		status: 'cancelled',
		context: 'Home',
		description: 'Landlord said no.'
	},
	{
		title: 'Sign up for a pottery class',
		status: 'cancelled',
		context: 'Home',
		description: 'Maybe next year.'
	}
];

function tasks(cal: Cal) {
	return TASKS.map((t, i) =>
		owned(`task:${t.title}`, cal, t.done !== undefined ? t.done - 7 : -(i % 9) - 2, {
			title: t.title,
			description: t.description ?? null,
			status: t.status,
			due_date: t.due === undefined ? null : cal.day(t.due),
			priority: t.priority ?? null,
			completed_at: t.done === undefined ? null : cal.at(t.done, '17:20'),
			project_id: t.project ? projectId(t.project) : null,
			custom: { context: t.context },
			deleted_at: null,
			updated_at: cal.at(t.done ?? -1, '17:20')
		})
	);
}

function listsAndChecklists(cal: Cal) {
	const lists: [
		key: string,
		name: string,
		color: string,
		age: number,
		items: [string, boolean][]
	][] = [
		[
			'weekend',
			'Weekend jobs',
			'green',
			-6,
			[
				['Mow the nature strip', true],
				['Clean the gutters', false],
				['Drop donations at the op shop', false],
				['Wash the car', true],
				['Re-pot the monstera', false]
			]
		],
		[
			'daylesford',
			'Daylesford packing',
			'purple',
			-4,
			[
				['Walking shoes', false],
				['Swimmers for the bathhouse', false],
				['Board games', false],
				['Book for the train', false],
				['Chargers', false]
			]
		],
		[
			'gifts',
			'Gift ideas',
			'orange',
			-25,
			[
				['Sam: record player', false],
				['Mum: gardening gloves and a hand trowel', false],
				['Ella: a nice notebook', false],
				['Dad: audiobook subscription', true]
			]
		]
	];
	const checklists: [key: string, name: string, age: number, items: [string, boolean][]][] = [
		[
			'longrun',
			'Before a long run',
			-50,
			[
				['Charge watch', true],
				['Fill water bottle', true],
				['Gel in pocket', false],
				['Tell Sam the route', false],
				['Sunscreen', false]
			]
		],
		[
			'reset',
			'Weekly reset',
			-62,
			[
				['Meal plan', false],
				['Order groceries', false],
				['Water the pots', false],
				['Inbox to zero', false],
				['Review the calendar', false],
				['Bins out', false]
			]
		],
		[
			'trip',
			'Leaving for a trip',
			-30,
			[
				['Lock the back door', false],
				['Water the plants', false],
				['Empty the fridge', false],
				['Heater off', false],
				['Wallet, keys, phone', false]
			]
		]
	];
	return {
		taskLists: lists.map(([key, name, color, age]) =>
			owned(`list:${key}`, cal, age, { name, color, custom: {} })
		),
		taskListItems: lists.flatMap(([key, , , age, items]) =>
			items.map(([title, checked], i) =>
				owned(`list:${key}:${i}`, cal, age, {
					list_id: id(`list:${key}`),
					title,
					checked,
					order_index: i
				})
			)
		),
		checklists: checklists.map(([key, name, age]) =>
			owned(`checklist:${key}`, cal, age, { name, archived_at: null })
		),
		checklistItems: checklists.flatMap(([key, , age, items]) =>
			items.map(([title, checked], i) =>
				owned(`checklist:${key}:${i}`, cal, age, {
					checklist_id: id(`checklist:${key}`),
					title,
					checked,
					order_index: i
				})
			)
		)
	};
}

// --- habits & activities ----------------------------------------------------

type HabitSeed = {
	key: string;
	name: string;
	cadence: 'daily' | 'weekdays' | 'weekly' | 'monthly';
	description?: string;
	why?: string;
	age: number;
	/** Chance of a tick on a due day; `ramp` makes it improve over time. */
	odds: number;
	ramp?: number;
	/** Days, counting back from today, that are always ticked. */
	streak?: number;
};

const HABITS: HabitSeed[] = [
	{
		key: 'stretch',
		name: 'Stretch for 10 minutes',
		cadence: 'daily',
		age: -70,
		odds: 0.7,
		streak: 5,
		why: 'Keeps the calves happy'
	},
	{
		key: 'spanish',
		name: 'Spanish lesson',
		cadence: 'daily',
		age: -60,
		odds: 0.85,
		streak: 12,
		description: 'One unit a day, even a short one.',
		why: 'Spain trip next year'
	},
	{ key: 'phone', name: 'No phone in bed', cadence: 'daily', age: -50, odds: 0.35, ramp: 0.5 },
	{ key: 'read', name: 'Read 20 pages', cadence: 'weekdays', age: -72, odds: 0.65 },
	{ key: 'family', name: 'Call Mum or Dad', cadence: 'weekly', age: -70, odds: 0 },
	{ key: 'card', name: 'Pay credit card in full', cadence: 'monthly', age: -74, odds: 0 }
];

function habits(cal: Cal) {
	const rows = HABITS.map((h) =>
		owned(`habit:${h.key}`, cal, h.age, {
			name: h.name,
			description: h.description ?? null,
			cadence: h.cadence,
			archived_at: null,
			custom: h.why ? { why: h.why } : {}
		})
	);
	const checks: DemoRow[] = [];
	const tick = (h: HabitSeed, n: number) =>
		checks.push({
			id: id(`check:${h.key}:${cal.day(-n)}`),
			owner_id: DEMO_USER_ID,
			habit_id: id(`habit:${h.key}`),
			check_date: cal.day(-n),
			created_at: cal.at(-n, '21:00')
		});

	for (const h of HABITS) {
		// Today counts as still in progress: only streak habits are ticked yet.
		for (let n = h.streak ? 0 : 1; n < -h.age; n++) {
			const date = cal.day(-n);
			const dow = cal.dow(-n);
			const r = seeded(`habit:${h.key}:${date}`);
			if (h.cadence === 'weekly') {
				// Once a week, on a Sunday most weeks.
				if (dow === 0 && r() < 0.85) tick(h, n);
			} else if (h.cadence === 'monthly') {
				if (cal.dom(-n) === 20) tick(h, n);
			} else if (h.cadence === 'weekdays' && (dow === 0 || dow === 6)) {
				continue;
			} else {
				const progress = 1 - n / -h.age; // 0 at the start, 1 today
				const odds = h.odds + (h.ramp ?? 0) * progress;
				if ((h.streak !== undefined && n < h.streak) || r() < odds) tick(h, n);
			}
		}
	}
	return { habits: rows, habitChecks: checks };
}

type ActivitySeed = { key: string; name: string; color: string; odds: (dow: number) => number };

const ACTIVITIES: ActivitySeed[] = [
	{ key: 'run', name: 'Run', color: 'orange', odds: (d) => ([0, 2, 4].includes(d) ? 0.88 : 0) },
	{ key: 'gym', name: 'Gym', color: 'blue', odds: (d) => ([1, 3].includes(d) ? 0.7 : 0) },
	{ key: 'bike', name: 'Bike commute', color: 'green', odds: (d) => (d >= 1 && d <= 5 ? 0.35 : 0) },
	{ key: 'yoga', name: 'Yoga', color: 'purple', odds: (d) => (d === 6 ? 0.6 : d === 3 ? 0.15 : 0) },
	{ key: 'swim', name: 'Swim', color: 'teal', odds: (d) => (d === 6 ? 0.25 : 0) }
];

function activities(cal: Cal) {
	const rows = ACTIVITIES.map((a, i) =>
		owned(`activity:${a.key}`, cal, -HISTORY_DAYS, {
			name: a.name,
			color: a.color,
			order_index: i,
			archived_at: null
		})
	);
	const logs: DemoRow[] = [];
	for (let n = 1; n <= HISTORY_DAYS; n++) {
		const date = cal.day(-n);
		for (const a of ACTIVITIES) {
			if (seeded(`activity:${a.key}:${date}`)() < a.odds(cal.dow(-n))) {
				logs.push({
					id: id(`activity:${a.key}:${date}`),
					owner_id: DEMO_USER_ID,
					activity_id: id(`activity:${a.key}`),
					log_date: date,
					notes: null,
					created_at: cal.at(-n, '19:00')
				});
			}
		}
	}
	return { activities: rows, activityLogs: logs };
}

// --- datasets ---------------------------------------------------------------

function datasets(cal: Cal, activityLogs: DemoRow[]) {
	const runId = id('dataset:runs');
	const coffeeId = id('dataset:coffee');
	const booksId = id('dataset:books');
	const sets = [
		owned('dataset:runs', cal, -60, {
			name: 'Running log',
			columns: [
				{ key: 'date', label: 'Date', type: 'date' },
				{ key: 'distance_km', label: 'Distance (km)', type: 'number' },
				{ key: 'time_min', label: 'Time (min)', type: 'number' },
				{ key: 'route', label: 'Route', type: 'text' }
			],
			updated_at: cal.at(-1, '19:30')
		}),
		owned('dataset:books', cal, -70, {
			name: 'Classics challenge',
			columns: [
				{ key: 'author', label: 'Author', type: 'text' },
				{ key: 'finished', label: 'Finished', type: 'date' },
				{ key: 'rating', label: 'Rating (1-5)', type: 'number' }
			],
			updated_at: cal.at(-8)
		}),
		owned('dataset:coffee', cal, -55, {
			name: 'Coffee beans tried',
			columns: [
				{ key: 'roaster', label: 'Roaster', type: 'text' },
				{ key: 'bought', label: 'Bought', type: 'date' },
				{ key: 'rating', label: 'Rating (1-5)', type: 'number' }
			],
			updated_at: cal.at(-4)
		})
	];

	// Runs mirror the Run activity logs from the last five weeks.
	const runActivity = id('activity:run');
	const runs = activityLogs
		.filter((l) => l.activity_id === runActivity && String(l.log_date) >= cal.day(-35))
		.sort((a, b) => String(a.log_date).localeCompare(String(b.log_date)))
		.map((l, i) => {
			const date = String(l.log_date);
			const r = seeded(`run:${date}`);
			const dow = new Date(`${date}T12:00:00`).getDay();
			const [label, km, pace, route] =
				dow === 0
					? [
							'Long run',
							12 + i * 0.35 + between(r, 0, 1.5),
							between(r, 6.1, 6.5),
							'Creek trail out and back'
						]
					: dow === 2
						? ['Intervals', between(r, 7, 8.5), between(r, 5.3, 5.7), 'Track, 6 x 800m']
						: [
								'Easy run',
								between(r, 5.5, 8),
								between(r, 6.2, 6.7),
								pick(r, ['Park loop', 'Canal path', 'Around the lake'])
							];
			return owned(`dataset:runs:${date}`, cal, -1, {
				dataset_id: runId,
				name: label,
				data: { date, distance_km: money(km), time_min: Math.round(km * pace), route },
				order_index: i
			});
		});

	const books: [string, string, number, number][] = [
		['Pride and Prejudice', 'Jane Austen', -66, 5],
		['Frankenstein', 'Mary Shelley', -51, 4],
		['The Great Gatsby', 'F. Scott Fitzgerald', -38, 3],
		['Dracula', 'Bram Stoker', -24, 4],
		['Middlemarch', 'George Eliot', -8, 5]
	];
	const beans: [string, string, number, number][] = [
		['House blend', 'Kettle & Kiln', -52, 3],
		['Ethiopia Yirgacheffe', 'Low Light Roasters', -40, 5],
		['Colombia Huila', 'Kettle & Kiln', -27, 4],
		['Brazil Cerrado', 'Morning Paper', -15, 3],
		['Kenya AA', 'Low Light Roasters', -4, 4]
	];
	const rows = [
		...runs,
		...books.map(([title, author, finished, rating], i) =>
			owned(`dataset:books:${i}`, cal, finished, {
				dataset_id: booksId,
				name: title,
				data: { author, finished: cal.day(finished), rating },
				order_index: i
			})
		),
		...beans.map(([bean, roaster, bought, rating], i) =>
			owned(`dataset:coffee:${i}`, cal, bought, {
				dataset_id: coffeeId,
				name: bean,
				data: { roaster, bought: cal.day(bought), rating },
				order_index: i
			})
		)
	];
	return { datasets: sets, datasetRows: rows };
}

// --- calendar ---------------------------------------------------------------

function events(cal: Cal) {
	const sat = cal.next(6);
	const fri = cal.next(5) + 14;
	const seeds: [
		key: string,
		title: string,
		day: number,
		time: string | null,
		location: string | null,
		color: string | null,
		people: string[],
		description?: string
	][] = [
		['haircut', 'Haircut', -21, '10:30', 'Sydney Road Barbers', null, []],
		['jonah', "Jonah's farewell lunch", -19, '12:30', 'Brightline Studio', 'blue', ['jonah']],
		['bookclub-1', 'Book club', -12, '19:00', "Priya's place", 'orange', ['priya', 'tom']],
		[
			'pizza',
			'Pizza with Tom and Marco',
			-5,
			'19:30',
			'Pizza Carlo, Brunswick',
			'red',
			['tom', 'marco']
		],
		['parents', 'Video call with Mum and Dad', -4, '18:00', null, null, ['mum', 'dad']],
		['testing', 'User testing session', 1, '14:00', 'Brightline Studio', 'blue', ['aisha']],
		['bookclub-2', 'Book club', 3, '19:00', "Tom's place", 'orange', ['tom', 'priya']],
		['parkrun', 'Parkrun', sat, '08:00', 'Princes Park', 'green', ['tom']],
		['spanish', 'Spanish conversation meetup', 8, '18:30', 'Library, level 2', 'purple', []],
		['service', 'Car service', 9, '08:30', 'Coburg Auto Care', null, []],
		[
			'sam-bday',
			"Sam's birthday dinner",
			12,
			'19:00',
			'Little Thai Kitchen',
			'purple',
			['sam', 'priya'],
			'Booked for 6 under Morgan.'
		],
		[
			'daylesford',
			'Daylesford weekend',
			fri,
			null,
			'Daylesford',
			'teal',
			['sam'],
			'Anniversary. Cottage check-in from 3pm.'
		],
		['dentist', 'Dentist check-up', 22, '09:15', 'Brunswick Dental', null, []],
		[
			'mum-bday',
			"Family lunch for Mum's birthday",
			27,
			'12:00',
			"Mum and Dad's",
			'red',
			['mum', 'dad', 'ella']
		],
		['offsite', 'Team offsite', 35, null, 'Yarra Valley', 'blue', ['aisha']],
		[
			'race',
			'Half marathon: race day',
			42,
			'07:00',
			'Start line, Albert Park',
			'orange',
			['sam', 'tom'],
			'Bib collection the day before. Gels, belt, anti-chafe.'
		]
	];
	const rows = seeds.map(([key, title, day, time, location, color, , description]) =>
		owned(`event:${key}`, cal, Math.min(day, 0) - 7, {
			title,
			description: description ?? null,
			start_at: cal.wall(day, time ?? '00:00'),
			end_at: time
				? cal.wall(
						day,
						`${pad(Math.min(23, Number(time.slice(0, 2)) + (key === 'race' ? 3 : 1)))}:${time.slice(3)}`
					)
				: null,
			all_day: time === null,
			location,
			color,
			custom: {}
		})
	);
	const links = seeds.flatMap(([key, , day, , , , who]) =>
		who.map((p) => ({
			event_id: id(`event:${key}`),
			person_id: personId(p),
			owner_id: DEMO_USER_ID,
			created_at: cal.at(Math.min(day, 0) - 7)
		}))
	);
	return { events: rows, eventPeople: links };
}

// --- food -------------------------------------------------------------------

const ul = (items: string[]) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
const ol = (items: string[]) => `<ol>${items.map((i) => `<li>${i}</li>`).join('')}</ol>`;

const RECIPES: [
	key: string,
	name: string,
	description: string,
	ingredients: string[],
	method: string[]
][] = [
	[
		'dal',
		'Weeknight red lentil dal',
		'Cheap, fast, and better the next day.',
		[
			'1 cup red lentils, rinsed',
			'1 brown onion, diced',
			'3 garlic cloves, crushed',
			'1 thumb of ginger, grated',
			'1 tbsp curry powder',
			'1 tsp ground turmeric',
			'400g tin crushed tomatoes',
			'400ml tin coconut milk',
			'2 cups vegetable stock',
			'Two handfuls of spinach',
			'Lemon, to serve'
		],
		[
			'Soften the onion in a little oil for 5 minutes.',
			'Add the garlic, ginger and spices and cook for a minute until fragrant.',
			'Add the lentils, tomatoes, coconut milk and stock.',
			'Simmer for 20 minutes, stirring now and then, until thick.',
			'Stir through the spinach, season, and finish with a squeeze of lemon.'
		]
	],
	[
		'shakshuka',
		'Shakshuka',
		'Eggs poached in a spiced tomato and capsicum sauce.',
		[
			'2 tbsp olive oil',
			'1 onion, sliced',
			'1 red capsicum, sliced',
			'2 garlic cloves, sliced',
			'1 tsp ground cumin',
			'1 tsp smoked paprika',
			'2 x 400g tins chopped tomatoes',
			'4-6 eggs',
			'Feta and parsley, to serve',
			'Crusty bread'
		],
		[
			'Cook the onion and capsicum in the oil until soft, about 8 minutes.',
			'Add the garlic and spices and cook for a minute.',
			'Add the tomatoes and simmer for 10 minutes until thickened. Season.',
			'Make wells in the sauce, crack in the eggs, cover and cook until the whites are just set.',
			'Scatter over feta and parsley. Serve straight from the pan with bread.'
		]
	],
	[
		'chicken',
		'Lemon and herb roast chicken',
		'Sunday roast with minimal fuss.',
		[
			'1 whole chicken (about 1.6kg)',
			'1 lemon, halved',
			'4 garlic cloves, bashed',
			'A few sprigs of thyme and rosemary',
			'2 tbsp olive oil',
			'1kg potatoes, cut into chunks',
			'Salt and pepper'
		],
		[
			'Heat the oven to 200°C. Pat the chicken dry.',
			'Stuff the cavity with the lemon, garlic and herbs. Rub with oil and season well.',
			'Toss the potatoes in oil and salt and spread around the chicken.',
			'Roast for about 1 hour 20 minutes, until the juices run clear.',
			'Rest for 15 minutes before carving.'
		]
	],
	[
		'banana',
		'Banana bread',
		'The reason we buy too many bananas.',
		[
			'3 very ripe bananas, mashed',
			'75g butter, melted',
			'2/3 cup brown sugar',
			'1 egg',
			'1 tsp vanilla',
			'1 tsp bicarb soda',
			'Pinch of salt',
			'1 1/2 cups plain flour',
			'Handful of walnuts (optional)'
		],
		[
			'Heat the oven to 175°C and line a loaf tin.',
			'Mix the banana and melted butter, then the sugar, egg and vanilla.',
			'Stir in the bicarb and salt, then fold in the flour until just combined.',
			'Add walnuts if using. Pour into the tin.',
			'Bake for about 55 minutes, until a skewer comes out clean.'
		]
	],
	[
		'soup',
		'Pumpkin soup',
		'Big batch, freezes well.',
		[
			'1kg pumpkin, peeled and chopped',
			'1 onion, chopped',
			'2 garlic cloves',
			'1 litre vegetable stock',
			'1/2 tsp nutmeg',
			'Splash of cream',
			'Toasted pepitas, to serve'
		],
		[
			'Soften the onion and garlic in a large pot.',
			'Add the pumpkin and stock and simmer for 20 minutes until tender.',
			'Blend until smooth. Stir in the nutmeg and cream and season.',
			'Serve topped with pepitas.'
		]
	],
	[
		'stirfry',
		'Chicken and veg stir-fry',
		'Ten minutes once everything is chopped.',
		[
			'500g chicken thigh, sliced',
			'1 head broccoli, in florets',
			'1 carrot, sliced thinly',
			'1 capsicum, sliced',
			'2 tbsp soy sauce',
			'1 tbsp oyster sauce',
			'1 tsp sesame oil',
			'2 garlic cloves and a knob of ginger',
			'Rice, to serve'
		],
		[
			'Mix the sauces with a splash of water.',
			'Stir-fry the chicken in a very hot wok until browned. Remove.',
			'Stir-fry the vegetables with the garlic and ginger for 3 minutes.',
			'Return the chicken, add the sauce and toss until glossy.',
			'Serve over rice.'
		]
	],
	[
		'oats',
		'Overnight oats',
		'Breakfast for busy weeks.',
		[
			'1/2 cup rolled oats',
			'1/2 cup milk',
			'1/4 cup yoghurt',
			'1 tsp chia seeds',
			'1 tsp honey',
			'Berries, to serve'
		],
		[
			'Stir everything except the berries together in a jar.',
			'Refrigerate overnight.',
			'Top with berries in the morning.'
		]
	],
	[
		'bolognese',
		'Spaghetti bolognese',
		'Freezer staple.',
		[
			'500g beef mince',
			'1 onion, 1 carrot, 1 celery stick, finely diced',
			'2 garlic cloves',
			'2 tbsp tomato paste',
			'2 x 400g tins crushed tomatoes',
			'1 cup beef stock',
			'1 tsp dried oregano',
			'400g spaghetti',
			'Parmesan, to serve'
		],
		[
			'Cook the onion, carrot and celery gently for 10 minutes.',
			'Add the garlic and mince and brown well.',
			'Stir in the tomato paste, then the tomatoes, stock and oregano.',
			'Simmer, partly covered, for at least 45 minutes.',
			'Serve over spaghetti with parmesan.'
		]
	]
];

function recipes(cal: Cal) {
	const rows = RECIPES.map(([key, name, description, ingredients, method], i) =>
		owned(`recipe:${key}`, cal, -70 + i * 6, {
			name,
			description,
			ingredients_html: ul(ingredients),
			method_html: ol(method),
			custom: {},
			archived_at: null,
			updated_at: cal.at(-60 + i * 7, '19:00')
		})
	);
	const dal = RECIPES[0];
	const banana = RECIPES[3];
	const versions = [
		owned('version:dal:1', cal, -40, {
			recipe_id: id('recipe:dal'),
			ingredients_html: ul(dal[3].filter((l) => !/ginger|Lemon/.test(l))),
			method_html: ol(dal[4].slice(0, 4)),
			notes: 'First go. A bit bland.'
		}),
		owned('version:dal:2', cal, -18, {
			recipe_id: id('recipe:dal'),
			ingredients_html: ul(dal[3]),
			method_html: ol(dal[4]),
			notes: 'Added ginger and lemon. Much better.'
		}),
		owned('version:banana:1', cal, -30, {
			recipe_id: id('recipe:banana'),
			ingredients_html: ul(
				banana[3].map((l) => (l.startsWith('2/3 cup') ? '1 cup brown sugar' : l))
			),
			method_html: ol(banana[4]),
			notes: 'Original, before cutting the sugar.'
		})
	];
	return { recipes: rows, recipeVersions: versions };
}

type SupplySeed = [
	key: string,
	name: string,
	status: 'buy' | 'stocked',
	period: string,
	bought: number | null,
	color: string | null,
	notes?: string
];

const SUPPLIES: SupplySeed[] = [
	['oatmilk', 'Oat milk', 'buy', 'weekly', -8, null],
	['oil', 'Olive oil', 'buy', 'monthly', -34, 'yellow'],
	['beans', 'Coffee beans', 'buy', 'weekly', -9, null, 'Whole bean, not ground.'],
	['dishwasher', 'Dishwasher tablets', 'buy', 'monthly', -31, 'blue'],
	['eggs', 'Eggs', 'stocked', 'weekly', -3, null],
	['rice', 'Rice', 'stocked', 'monthly', -10, null],
	['lentils', 'Red lentils', 'stocked', 'monthly', -26, null],
	['pasta', 'Pasta', 'stocked', 'monthly', -8, null],
	['tomatoes', 'Tinned tomatoes', 'stocked', 'monthly', -36, null],
	['coconut', 'Coconut milk', 'stocked', 'monthly', -12, null],
	['pb', 'Peanut butter', 'stocked', 'monthly', -20, null],
	['flour', 'Bread flour', 'stocked', 'none', -50, null],
	['laundry', 'Laundry liquid', 'stocked', 'quarterly', -40, 'blue'],
	['binbags', 'Bin bags', 'stocked', 'quarterly', -30, 'blue'],
	['sunscreen', 'Sunscreen', 'stocked', 'quarterly', -100, 'purple'],
	['toothpaste', 'Toothpaste', 'stocked', 'quarterly', -60, 'purple'],
	['gels', 'Running gels', 'stocked', 'monthly', -14, 'orange'],
	['electrolytes', 'Electrolyte tablets', 'stocked', 'monthly', -33, 'orange'],
	['bedding', 'Worm farm bedding', 'stocked', 'none', -45, 'green'],
	['tp', 'Toilet paper', 'buy', 'monthly', -29, 'purple']
];

function supplies(cal: Cal) {
	const items = SUPPLIES.map(([key, name, status, period, bought, color, notes]) =>
		owned(`supply:${key}`, cal, -HISTORY_DAYS + 2, {
			name,
			status,
			restock_period: period,
			last_purchased_at: bought === null ? null : cal.at(bought, '11:00'),
			color,
			notes: notes ?? null,
			custom: {},
			archived_at: null,
			updated_at: cal.at(bought ?? -30, '11:00')
		})
	);
	const list: [name: string, source: string, supply: string | null, checked: boolean][] = [
		['Oat milk', 'supply', 'oatmilk', false],
		['Olive oil', 'supply', 'oil', false],
		['Coffee beans', 'supply', 'beans', false],
		['Spinach', 'recipe', null, false],
		['Lemons', 'recipe', null, false],
		['Birthday candles', 'manual', null, false],
		['Sourdough', 'manual', null, true],
		['Bananas', 'manual', null, true]
	];
	const listItems = list.map(([name, source, supply, checked], i) => ({
		id: id(`shopping:${name}`),
		owner_id: DEMO_USER_ID,
		name,
		checked,
		source,
		supply_item_id: supply ? id(`supply:${supply}`) : null,
		created_at: cal.at(-2, `${pad(9 + i)}:00`)
	}));
	return { shoppingItems: items, shoppingListItems: listItems };
}

// --- finance ----------------------------------------------------------------

type CategorySeed = [
	key: string,
	name: string,
	color: string,
	parent: string | null,
	rules: DemoRow[]
];

const kw = (pattern: string) => ({ kind: 'keyword', pattern, case_sensitive: false });

const CATEGORIES: CategorySeed[] = [
	['income', 'Income', '#009E73', null, [kw('payroll'), kw('refund')]],
	[
		'groceries',
		'Groceries',
		'#E69F00',
		null,
		[kw('woolworths'), kw('aldi'), kw('coles'), kw('fruit market')]
	],
	[
		'eatingout',
		'Eating out',
		'#D55E00',
		null,
		[{ kind: 'regex', pattern: 'dumpling|pizza|thai|bistro|banh mi|nori', case_sensitive: false }]
	],
	['coffee', 'Coffee', '#8B5E3C', 'eatingout', [kw('espresso'), kw('cafe')]],
	['transport', 'Transport', '#0072B2', null, [kw('myki'), kw('uber')]],
	['car', 'Car', '#3B82F6', 'transport', [kw('rego'), kw('auto care')]],
	['rent', 'Rent', '#6B7280', null, [kw('rent')]],
	['utilities', 'Utilities', '#56B4E9', null, [kw('energy'), kw('internet'), kw('mobile')]],
	[
		'subscriptions',
		'Subscriptions',
		'#CC79A7',
		null,
		[kw('spotify'), kw('netflix'), kw('cloud storage')]
	],
	[
		'health',
		'Health and fitness',
		'#10B981',
		null,
		[kw('gym'), kw('physio'), kw('pharmacy'), kw('dental')]
	],
	['shopping', 'Shopping', '#E2C044', null, []],
	['home', 'Home and garden', '#84CC16', null, [kw('hardware'), kw('nursery')]],
	['entertainment', 'Entertainment', '#A855F7', null, [kw('picture house'), kw('tickethub')]],
	['gifts', 'Gifts', '#F472B6', null, []],
	['travel', 'Travel', '#14B8A6', null, [kw('cottages')]],
	['saving', 'Savings and investing', '#15803D', null, [kw('auto-invest'), kw('holiday fund')]]
];

const categoryId = (key: string) => id(`category:${key}`);

type TxSeed = {
	description: string;
	amount: number;
	category: string | null;
	source?: string;
	taxDeductible?: boolean;
};

/** One day's bank activity. Depends only on the date, so each day is stable. */
function dayTransactions(cal: Cal, offset: number): TxSeed[] {
	const r = seeded(`tx:${cal.day(offset)}`);
	const dow = cal.dow(offset);
	const dom = cal.dom(offset);
	const fortnight = Math.floor((cal.serial(offset) + 3) / 7) % 2 === 0;
	const out: TxSeed[] = [];
	const add = (
		description: string,
		amount: number,
		category: string | null,
		extra: Partial<TxSeed> = {}
	) => out.push({ description, amount: money(amount), category, ...extra });

	if (dow === 4 && fortnight) add('BRIGHTLINE STUDIO PAYROLL', 3184.62, 'income');
	if (dow === 1 && fortnight) add('RENT HARBOUR REALTY REF 1402', -1090, 'rent');
	if (dow === 3 && !fortnight) add('FLEXFIT GYM DIRECT DEBIT', -27.9, 'health');

	if (dom === 3) add('SPOTIFY P2B91C', -13.99, 'subscriptions');
	if (dom === 5) add('BRIGHTSPARK ENERGY', -between(r, 128, 176), 'utilities');
	if (dom === 9) add('CLOUD STORAGE PLAN', -4.49, 'subscriptions');
	if (dom === 12) add('SWIFTNET INTERNET', -79, 'utilities');
	if (dom === 15) add('NETFLIX.COM', -18.99, 'subscriptions');
	if (dom === 18) add('ALLCALL MOBILE PLAN', -35, 'utilities');
	if (dom === 20) add('INDEX FUND AUTO-INVEST', -500, 'saving');
	if (dom === 21) add('TRANSFER TO HOLIDAY FUND', -400, 'saving');

	if (dow === 6)
		add(
			pick(r, ['WOOLWORTHS BRUNSWICK', 'ALDI COBURG', 'COLES BRUNSWICK EAST']),
			-between(r, 118, 186),
			'groceries'
		);
	if (dow === 3 && r() < 0.8)
		add(
			pick(r, ['SYDNEY RD FRUIT MARKET', 'WOOLWORTHS BRUNSWICK']),
			-between(r, 22, 64),
			'groceries'
		);
	if (dow >= 1 && dow <= 5 && r() < 0.7)
		add(
			pick(r, ['LOW LIGHT ESPRESSO', 'KETTLE & KILN CAFE', 'MORNING PAPER CAFE']),
			-pick(r, [5, 5.2, 5.5]),
			'coffee'
		);
	if (dow >= 1 && dow <= 5 && r() < 0.15)
		add(pick(r, ['BANH MI BROS', 'NORI ROLL BAR']), -between(r, 12, 19), 'eatingout');
	if ((dow === 5 || dow === 6) && r() < 0.55)
		add(
			pick(r, [
				'SHANGHAI DUMPLING HOUSE',
				'PIZZA CARLO',
				'LITTLE THAI KITCHEN',
				'THE UNION BISTRO'
			]),
			-between(r, 36, 92),
			'eatingout'
		);
	if (dow === 1 && r() < 0.6) add('MYKI TOP UP', -30, 'transport');
	if ((dow === 5 || dow === 6) && r() < 0.18) add('UBER *TRIP', -between(r, 16, 31), 'transport');
	if (r() < 0.07)
		add(
			pick(r, ['HOMEWARES DEPOT', 'PAPER & SPINE BOOKS', 'STRIDE RUNNING CO']),
			-between(r, 24, 110),
			'shopping'
		);
	if (r() < 0.04) add('DESK SUPPLY CO', -between(r, 30, 85), 'shopping', { taxDeductible: true });
	if ((dow === 0 || dow === 6) && r() < 0.12)
		add(pick(r, ['BRUNSWICK HARDWARE', 'GREEN THUMB NURSERY']), -between(r, 18, 75), 'home');
	if (r() < 0.05)
		add(pick(r, ['NORTHSIDE PICTURE HOUSE', 'TICKETHUB AU']), -between(r, 22, 64), 'entertainment');
	if (r() < 0.04) add('SYDNEY RD PHARMACY', -between(r, 9, 34), 'health');
	// The odd thing the rules don't know about yet.
	if (r() < 0.03)
		add(pick(r, ['SQ *MARKET STALL', 'PAYPAL *ONLINESHOP']), -between(r, 12, 48), null);
	if (r() < 0.02) add('TRANSFER FROM S OKAFOR', pick(r, [25, 40, 45]), null);
	if (r() < 0.03)
		add('CASH: FARMERS MARKET', -between(r, 15, 40), 'groceries', { source: 'manual' });
	return out;
}

/** One-off purchases that line up with the journal, tasks and calendar. */
const ONE_OFFS: [offset: number, TxSeed][] = [
	[-3, { description: 'VEHICLE REGO RENEWAL VIC', amount: -872.4, category: 'car' }],
	[-6, { description: 'ATO TAX REFUND', amount: 412.18, category: 'income' }],
	[-9, { description: 'DAYLESFORD COTTAGES DEPOSIT', amount: -250, category: 'travel' }],
	[
		-26,
		{ description: 'GIFT: FLOWERS FOR GRANDMA', amount: -55, category: 'gifts', source: 'manual' }
	],
	[-33, { description: 'STRIDE RUNNING CO', amount: -219.95, category: 'shopping' }],
	[
		-40,
		{ description: 'HALF MARATHON ENTRY TICKETHUB AU', amount: -129, category: 'entertainment' }
	],
	[-47, { description: 'BRUNSWICK PHYSIO', amount: -95, category: 'health' }],
	[-52, { description: 'GREEN THUMB NURSERY', amount: -64.5, category: 'home' }],
	[-68, { description: 'BRUNSWICK DENTAL', amount: -185, category: 'health' }]
];

function finance(cal: Cal) {
	const categories = CATEGORIES.map(([key, name, color, parent, rules]) =>
		owned(`category:${key}`, cal, -FINANCE_DAYS, {
			name,
			color,
			parent_id: parent ? categoryId(parent) : null,
			rules
		})
	);
	const budgets = (
		[
			['groceries', 750, 'monthly'],
			['eatingout', 350, 'monthly'],
			['coffee', 110, 'monthly'],
			['transport', 160, 'monthly'],
			['health', 180, 'monthly'],
			['shopping', 300, 'monthly'],
			['home', 150, 'monthly'],
			['entertainment', 120, 'monthly'],
			['gifts', 1200, 'yearly'],
			['travel', 3000, 'yearly']
		] as const
	).map(([key, amount, period]) =>
		owned(`budget:${key}:${period}`, cal, -FINANCE_DAYS + 5, {
			category_id: categoryId(key),
			amount,
			period,
			currency: 'AUD'
		})
	);

	// Every transaction in the window, oldest first.
	const all: (TxSeed & { id: string; offset: number })[] = [];
	for (let offset = -FINANCE_DAYS; offset <= 0; offset++) {
		const seeds = [
			...dayTransactions(cal, offset),
			...ONE_OFFS.filter(([o]) => o === offset).map(([, t]) => t)
		];
		seeds.forEach((t, i) => all.push({ ...t, id: id(`tx:${cal.day(offset)}:${i}`), offset }));
	}

	// Everyday bank rows from the last two days are sitting in an unconfirmed
	// CSV import, so the review screen has something to show. Pay and rent
	// stay posted so this month's totals look like a normal month.
	const staged = all.filter(
		(t) => t.offset >= -2 && t.source === undefined && Math.abs(t.amount) < 500
	);
	const posted = all.filter((t) => !staged.includes(t));
	const transactions = posted.map((t) => ({
		id: t.id,
		owner_id: DEMO_USER_ID,
		posted_at: cal.day(t.offset),
		description: t.description,
		amount: t.amount,
		currency: 'AUD',
		category_id: t.category ? categoryId(t.category) : null,
		source: t.source ?? 'anz',
		raw: {},
		custom: t.taxDeductible ? { tax_deductible: true } : {},
		description_hash: null,
		created_at: cal.at(t.offset + 1, '06:00'),
		updated_at: cal.at(t.offset + 1, '06:00'),
		deleted_at: null
	}));

	// One confirmed import per calendar month, one for this month so far,
	// and today's unconfirmed upload.
	const batches: DemoRow[] = [];
	const stagingRows: DemoRow[] = [];
	const addBatch = (
		key: string,
		filename: string,
		rows: typeof all,
		createdOffset: number,
		confirmed: boolean,
		dupes: typeof all = []
	) => {
		if (!rows.length) return;
		const batchId = id(`batch:${key}`);
		[...rows.map((t) => ({ t, dupe: false })), ...dupes.map((t) => ({ t, dupe: true }))].forEach(
			({ t, dupe }, i) => {
				const category = t.category ? categoryId(t.category) : null;
				const [y, m, d] = cal.day(t.offset).split('-');
				stagingRows.push({
					id: id(`staging:${key}:${t.id}:${dupe}`),
					owner_id: DEMO_USER_ID,
					batch_id: batchId,
					row_index: i,
					raw: { date: `${d}/${m}/${y}`, amount: t.amount.toFixed(2), description: t.description },
					posted_at: cal.day(t.offset),
					description: t.description,
					amount: t.amount,
					proposed_category_id: dupe ? null : category,
					confirmed_category_id: null,
					proposed_source: dupe ? 'duplicate' : category ? 'rule' : 'unclassified',
					is_duplicate: dupe,
					include: !dupe,
					created_at: cal.at(createdOffset, '08:00')
				});
			}
		);
		batches.push({
			id: batchId,
			owner_id: DEMO_USER_ID,
			filename,
			source: 'anz',
			total_rows: rows.length + dupes.length,
			confirmed_rows: confirmed ? rows.length : 0,
			duplicate_rows: dupes.length,
			status: confirmed ? 'confirmed' : 'staged',
			created_at: cal.at(createdOffset, '08:00'),
			confirmed_at: confirmed ? cal.at(createdOffset, '08:05') : null
		});
	};
	const bank = posted.filter((t) => t.source === undefined);
	for (let monthsAgo = 3; monthsAgo >= 1; monthsAgo--) {
		const from = cal.monthStart(monthsAgo);
		const to = cal.monthStart(monthsAgo - 1) - 1;
		const [y, m] = cal.day(from).split('-');
		addBatch(
			`${y}-${m}`,
			`anz-${y}-${m}.csv`,
			bank.filter((t) => t.offset >= from && t.offset <= to),
			to + 2,
			true
		);
	}
	addBatch(
		`${cal.day(cal.monthStart(0))}-partial`,
		`anz-${cal.day(-3)}.csv`,
		bank.filter((t) => t.offset >= cal.monthStart(0) && t.offset <= -3),
		-2,
		true
	);
	addBatch(
		`${cal.day(0)}-staged`,
		`anz-${cal.day(0)}.csv`,
		staged,
		0,
		false,
		bank.filter((t) => t.offset === -3).slice(0, 2)
	);

	return {
		categories,
		budgets,
		transactions,
		importBatches: batches,
		importStagingRows: stagingRows
	};
}

// --- assets & net worth -----------------------------------------------------

type AssetSeed = [
	key: string,
	name: string,
	kind: string,
	value: number | null,
	acquired: number | null,
	location: string | null,
	tags: string[],
	notes: string | null
];

const ASSETS: AssetSeed[] = [
	[
		'everyday',
		'Everyday account',
		'cash',
		3640.27,
		null,
		'Bank',
		['bank'],
		'Bills and day-to-day spending.'
	],
	[
		'savings',
		'High-interest savings',
		'cash',
		21480,
		null,
		'Bank',
		['bank', 'emergency-fund'],
		"Six months of expenses. Don't touch."
	],
	['holiday', 'Holiday fund', 'cash', 2950, null, 'Bank', ['bank', 'travel'], 'Spain trip.'],
	[
		'index',
		'Index fund portfolio',
		'investment',
		34812.55,
		-1400,
		null,
		['investing'],
		'Auto-invest $500 a month.'
	],
	[
		'car',
		'2017 hatchback',
		'vehicle',
		13500,
		-2010,
		'Street parking',
		['car'],
		'Rego renewed this month.'
	],
	['bike', 'Road bike', 'possession', 1650, -900, 'Hallway', ['bike', 'fitness'], null],
	[
		'camera',
		'Mirrorless camera and two lenses',
		'possession',
		1900,
		-620,
		'Study',
		['photography'],
		null
	],
	[
		'laptop',
		'Laptop',
		'possession',
		1400,
		-380,
		'Study',
		['tech', 'work'],
		'Claim depreciation at tax time.'
	],
	['couch', 'Couch', 'possession', 900, -1100, 'Living room', ['furniture'], null],
	[
		'ring',
		"Grandma's ring",
		'possession',
		null,
		-3650,
		'Bedroom',
		['sentimental'],
		'Not for sale. Get it valued for insurance.'
	]
];

function assetsAndNetWorth(cal: Cal) {
	const assets = ASSETS.map(([key, name, kind, value, acquired, location, tags, notes]) =>
		owned(`asset:${key}`, cal, -HISTORY_DAYS + 1, {
			name,
			kind,
			value,
			currency: 'AUD',
			acquired_on: acquired === null ? null : cal.day(acquired),
			location,
			tags,
			notes,
			photo_url: null,
			custom: value === null ? {} : { last_valued: cal.day(key === 'car' ? -3 : -12) },
			archived_at: null
		})
	);

	// Monthly snapshots for the past year, walked back from today's totals.
	const now: Record<string, number> = { cash: 0, investment: 0, vehicle: 0, possession: 0 };
	for (const [, , kind, value] of ASSETS) now[kind] += value ?? 0;
	const snapshots: DemoRow[] = [];
	for (let monthsAgo = 12; monthsAgo >= 0; monthsAgo--) {
		const offset = cal.monthStart(monthsAgo);
		const date = cal.day(offset);
		const r = seeded(`networth:${date}`);
		const breakdown = {
			cash: money(now.cash - monthsAgo * 820 + between(r, -600, 600)),
			investment: money((now.investment - monthsAgo * 600) * (1 + between(r, -0.04, 0.03))),
			vehicle: money(now.vehicle + monthsAgo * 110),
			possession: money(now.possession - (monthsAgo > 6 ? 1400 : 0))
		};
		snapshots.push({
			id: id(`networth:${date}`),
			owner_id: DEMO_USER_ID,
			snapshot_date: date,
			total_value: money(Object.values(breakdown).reduce((a, b) => a + b, 0)),
			breakdown,
			currency: 'AUD',
			note:
				monthsAgo >= 3
					? 'Imported from the old spreadsheet.'
					: monthsAgo === 6
						? 'Bought the laptop.'
						: null,
			created_at: cal.at(offset, '10:00')
		});
	}
	return { assets, netWorthSnapshots: snapshots };
}

// --- everything -------------------------------------------------------------

/** Build every demo table, relative to `now`. */
export function buildDemoTables(now = new Date()): DemoTables {
	const cal = calendar(now);
	const { profiles, shares } = profilesAndShares(cal);
	const { projects: projectRows, blocks } = projects(cal);
	const lists = listsAndChecklists(cal);
	const habitData = habits(cal);
	const activityData = activities(cal);
	const datasetData = datasets(cal, activityData.activityLogs);
	const eventData = events(cal);
	const recipeData = recipes(cal);
	const supplyData = supplies(cal);
	const financeData = finance(cal);
	const assetData = assetsAndNetWorth(cal);

	return {
		profiles,
		shares,
		custom_attribute_defs: customAttributeDefs(cal),
		journal_entries: journalEntries(cal),
		quick_notes: quickNotes(cal),
		sleep_logs: sleepLogs(cal),
		tasks: tasks(cal),
		task_lists: lists.taskLists,
		task_list_items: lists.taskListItems,
		checklists: lists.checklists,
		checklist_items: lists.checklistItems,
		habits: habitData.habits,
		habit_checks: habitData.habitChecks,
		activities: activityData.activities,
		activity_logs: activityData.activityLogs,
		projects: projectRows,
		project_blocks: blocks,
		datasets: datasetData.datasets,
		dataset_rows: datasetData.datasetRows,
		events: eventData.events,
		event_people: eventData.eventPeople,
		people: people(cal),
		recipes: recipeData.recipes,
		recipe_versions: recipeData.recipeVersions,
		shopping_items: supplyData.shoppingItems,
		shopping_list_items: supplyData.shoppingListItems,
		categories: financeData.categories,
		budgets: financeData.budgets,
		transactions: financeData.transactions,
		import_batches: financeData.importBatches,
		import_staging_rows: financeData.importStagingRows,
		assets: assetData.assets,
		net_worth_snapshots: assetData.netWorthSnapshots
	};
}
