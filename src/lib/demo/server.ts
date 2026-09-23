// Demo mode, server side: the per-request client, the fixed session, and the
// write guard that hooks.server.ts runs before any route. See ./CLAUDE.md.

import type { RequestEvent } from '@sveltejs/kit';
import type { Session, User } from '@supabase/supabase-js';
import { createDemoClient } from './client';
import { buildDemoTables, DEMO_PERSONA } from './fixtures.server';
import { DEMO_BLOCKED_HEADER, DEMO_READ_ONLY_MESSAGE, DEMO_USER_ID } from './index';

const DEMO_USER: User = {
	id: DEMO_USER_ID,
	aud: 'authenticated',
	role: 'authenticated',
	email: DEMO_PERSONA.email,
	app_metadata: { provider: 'demo' },
	user_metadata: { display_name: DEMO_PERSONA.displayName },
	created_at: '2026-01-01T00:00:00.000Z'
};

// Never validated against Supabase Auth; the tokens are placeholders.
const DEMO_SESSION: Session = {
	access_token: 'demo',
	refresh_token: 'demo',
	token_type: 'bearer',
	expires_in: 3600,
	expires_at: 4102444800,
	user: DEMO_USER
};

export const DEMO_AUTH = { session: DEMO_SESSION, user: DEMO_USER };

/** Canned /api/ai reply. The demo never calls Anthropic. */
export const DEMO_ASSISTANT_REPLY =
	'The assistant is switched off in the demo, so nothing you type here is sent anywhere. Sign in to use it with your own data: it can summarise your week, log sleep or tasks from plain English, and answer questions like "what did I spend on groceries this month?"';

/** A fresh in-memory client for one request. Fixtures are rebuilt, never shared. */
export function createDemoServerClient(): App.Locals['supabase'] {
	return createDemoClient({
		tables: () => buildDemoTables(),
		user: DEMO_USER,
		session: DEMO_SESSION
	}) as unknown as App.Locals['supabase'];
}

/** Non-GET routes that still run in demo mode. Each one handles `locals.demo` itself. */
const WRITE_ALLOWED = new Set(['/api/ai', '/auth/signout']);

/**
 * Refuse a write before it reaches a route. Form actions get a SvelteKit
 * `failure` result (pages already render `form.error`), fetch calls get a
 * plain-text 403 (pages that surface `res.text()` show the message), and
 * no-JS form posts bounce back to the page. All carry DEMO_BLOCKED_HEADER.
 */
export function refuseDemoWrite(event: RequestEvent): Response | null {
	const { method, headers } = event.request;
	if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null;
	if (WRITE_ALLOWED.has(event.url.pathname)) return null;

	const marker = { [DEMO_BLOCKED_HEADER]: 'read-only', 'cache-control': 'no-store' };
	if (headers.get('x-sveltekit-action') === 'true') {
		// `use:enhance` expects an ActionResult whose `data` is devalue-encoded;
		// this is devalue's flat form of `{ error: DEMO_READ_ONLY_MESSAGE }`.
		const data = JSON.stringify([{ error: 1 }, DEMO_READ_ONLY_MESSAGE]);
		return new Response(JSON.stringify({ type: 'failure', status: 403, data }), {
			headers: { 'content-type': 'application/json', ...marker }
		});
	}
	if (headers.get('accept')?.includes('text/html')) {
		return new Response(null, {
			status: 303,
			headers: { location: event.url.pathname, ...marker }
		});
	}
	return new Response(DEMO_READ_ONLY_MESSAGE, {
		status: 403,
		headers: { 'content-type': 'text/plain; charset=utf-8', ...marker }
	});
}
