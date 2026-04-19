import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireUserApi } from '$lib/auth/guards';
import { getAnthropicClient, DEFAULT_MODEL, buildSystemPrompt, createTools } from '$lib/ai';

type ChatMessage = {
	role: 'user' | 'assistant';
	content: string;
};

export const POST: RequestHandler = async (event) => {
	const user = await requireUserApi(event);
	const body = (await event.request.json()) as { messages?: ChatMessage[] };
	const history = body.messages ?? [];

	if (history.length === 0 || history[history.length - 1].role !== 'user') {
		throw error(400, 'Last message must be from the user.');
	}

	// Load display name for a friendlier system prompt.
	const { data: profile } = await event.locals.supabase
		.from('profiles')
		.select('display_name')
		.eq('id', user.id)
		.single();

	let client;
	try {
		client = getAnthropicClient();
	} catch (e) {
		throw error(500, (e as Error).message);
	}

	const tools = createTools(event.locals.supabase, user.id);

	try {
		const finalMessage = await client.beta.messages.toolRunner({
			model: DEFAULT_MODEL,
			max_tokens: 4096,
			system: buildSystemPrompt({
				todayIso: new Date().toISOString().slice(0, 10),
				displayName: profile?.display_name ?? user.email ?? 'User'
			}),
			tools,
			messages: history.map((m) => ({
				role: m.role,
				content: m.content
			}))
		});

		// Extract plain text from the final assistant message.
		const content = Array.isArray(finalMessage.content) ? finalMessage.content : [];
		const text = content
			.filter((b) => b.type === 'text')
			.map((b) => (b as { text: string }).text)
			.join('\n\n');

		return json({
			role: 'assistant' as const,
			content: text,
			usage: finalMessage.usage ?? null
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Unknown error';
		console.error('AI loop failed:', msg);
		throw error(500, `Assistant error: ${msg}`);
	}
};
