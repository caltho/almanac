import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { SHARE_PERMS, SHARE_RESOURCE_TYPES } from '$lib/shares/constants';

const RESOURCE_TYPES = SHARE_RESOURCE_TYPES.map((t) => t.value);

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	// Outgoing: I granted to someone. Incoming: someone granted to me.
	const [outgoing, incoming] = await Promise.all([
		locals.supabase
			.from('shares')
			.select('id, grantee_id, resource_type, resource_id, scope, perms, created_at')
			.eq('owner_id', userId)
			.order('created_at', { ascending: false }),
		locals.supabase
			.from('shares')
			.select('id, owner_id, resource_type, resource_id, scope, perms, created_at')
			.eq('grantee_id', userId)
			.order('created_at', { ascending: false })
	]);

	const counterpartIds = new Set<string>();
	outgoing.data?.forEach((s) => counterpartIds.add(s.grantee_id));
	incoming.data?.forEach((s) => counterpartIds.add(s.owner_id));

	const profiles = counterpartIds.size
		? await locals.supabase
				.from('profiles')
				.select('id, display_name, avatar_url')
				.in('id', Array.from(counterpartIds))
		: { data: [] };

	const profileMap = new Map((profiles.data ?? []).map((p) => [p.id, p]));

	return {
		outgoing: (outgoing.data ?? []).map((s) => ({
			...s,
			grantee: profileMap.get(s.grantee_id) ?? null
		})),
		incoming: (incoming.data ?? []).map((s) => ({
			...s,
			owner: profileMap.get(s.owner_id) ?? null
		}))
	};
};

export const actions: Actions = {
	invite: async ({ request, locals }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const resourceType = String(form.get('resource_type') ?? '');
		const perms = form.getAll('perms').map(String);

		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { error: 'Enter a valid email address.', email });
		}
		if (!RESOURCE_TYPES.includes(resourceType as (typeof RESOURCE_TYPES)[number])) {
			return fail(400, { error: 'Pick a domain to share.', email });
		}
		if (perms.length === 0 || !perms.every((p) => SHARE_PERMS.includes(p as never))) {
			return fail(400, { error: 'Pick at least one permission.', email });
		}

		// Resolve email → user id via the security-definer helper.
		const { data: granteeId, error: lookupError } = await locals.supabase.rpc(
			'find_user_by_email',
			{ p_email: email }
		);
		if (lookupError) {
			return fail(500, { error: lookupError.message, email });
		}
		if (!granteeId) {
			return fail(404, {
				error: 'No Almanac user with that email. Ask them to sign up first.',
				email
			});
		}
		if (granteeId === locals.user!.id) {
			return fail(400, { error: "You can't share with yourself.", email });
		}

		const { error: insertError } = await locals.supabase.from('shares').insert({
			owner_id: locals.user!.id,
			grantee_id: granteeId,
			resource_type: resourceType,
			resource_id: null,
			perms: perms as ('read' | 'comment' | 'write')[]
		});

		if (insertError) {
			// Unique-violation = already shared
			if (insertError.code === '23505') {
				return fail(409, { error: 'You already share that with this person.', email });
			}
			return fail(500, { error: insertError.message, email });
		}

		return { invited: true, email };
	},

	revoke: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing share id.' });

		// RLS already enforces owner_or_grantee; this is a straight delete.
		const { error } = await locals.supabase.from('shares').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });

		return { revoked: true };
	}
};
