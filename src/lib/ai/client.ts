import Anthropic from '@anthropic-ai/sdk';
// Dynamic (not static) so build doesn't fail if the key isn't set yet.
import { env } from '$env/dynamic/private';

let client: Anthropic | undefined;

export function getAnthropicClient(): Anthropic {
	if (!client) {
		const key = env.ANTHROPIC_API_KEY;
		if (!key) {
			throw new Error(
				'ANTHROPIC_API_KEY is not set. Add it to .env.local (local) or Vercel env (deployed) to use the assistant.'
			);
		}
		client = new Anthropic({ apiKey: key });
	}
	return client;
}

export const DEFAULT_MODEL = 'claude-sonnet-4-6' as const;
