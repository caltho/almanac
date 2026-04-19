import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '$env/static/private';

let client: Anthropic | undefined;

export function getAnthropicClient(): Anthropic {
	if (!client) {
		if (!ANTHROPIC_API_KEY) {
			throw new Error(
				'ANTHROPIC_API_KEY is not set. Add it to .env.local (local) or Vercel env (deployed) to use the assistant.'
			);
		}
		client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
	}
	return client;
}

export const DEFAULT_MODEL = 'claude-sonnet-4-6' as const;
