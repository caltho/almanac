import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { loadDefs } from '$lib/custom-attrs/server';
import { parseCustomFormData } from '$lib/custom-attrs/validate';

// Data flows through (app)/+layout.server.ts → userData store. Actions stay
// here so progressive-enhanced forms work; on success, `enhance`'s `update()`
// invalidates the layout and the store re-hydrates.

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const log_date = String(form.get('log_date') ?? '').trim();
		const went_to_bed = (String(form.get('went_to_bed') ?? '').trim() || null) as string | null;
		const woke_up = (String(form.get('woke_up') ?? '').trim() || null) as string | null;
		const hoursRaw = String(form.get('hours_slept') ?? '').trim();
		const hours_slept = hoursRaw ? Number(hoursRaw) : null;
		const qualityRaw = String(form.get('quality') ?? '').trim();
		const quality = qualityRaw ? Number(qualityRaw) : null;
		const notes = (String(form.get('notes') ?? '').trim() || null) as string | null;

		if (!/^\d{4}-\d{2}-\d{2}$/.test(log_date)) {
			return fail(400, { error: 'Pick a date.' });
		}
		if (hours_slept !== null && (isNaN(hours_slept) || hours_slept < 0 || hours_slept > 24)) {
			return fail(400, { error: 'Hours slept must be 0–24.' });
		}
		if (quality !== null && (quality < 1 || quality > 10)) {
			return fail(400, { error: 'Quality must be 1–10.' });
		}

		const defs = await loadDefs(locals.supabase, locals.user!.id, 'sleep_logs');
		const { values: custom, errors } = parseCustomFormData(defs, form);
		if (Object.keys(errors).length > 0) {
			return fail(400, { error: 'Fix the highlighted fields.', fieldErrors: errors });
		}

		const { error } = await locals.supabase.from('sleep_logs').insert({
			owner_id: locals.user!.id,
			log_date,
			went_to_bed,
			woke_up,
			hours_slept,
			quality,
			notes,
			custom: custom as never
		});
		if (error) return fail(500, { error: error.message });
		return { created: true };
	},

	delete: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing id.' });
		// Hard delete instead of soft-delete-via-UPDATE. The UPDATE path was
		// hitting the WITH CHECK clause of sleep_logs_update for some
		// existing rows (cause unclear without DB introspection). The
		// SELECT policy already filtered deleted_at != null rows out, so
		// soft delete was effectively a permanent hide — hard delete has
		// the same end-user behavior and uses the simpler delete policy
		// (owner_id = auth.uid(), no WITH CHECK).
		const { error } = await locals.supabase
			.from('sleep_logs')
			.delete()
			.eq('id', id)
			.eq('owner_id', locals.user!.id);
		if (error) return fail(500, { error: error.message });
		return { deleted: true };
	}
};
