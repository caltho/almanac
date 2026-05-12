-- Move custom enum types and user-callable RPCs into the almanac schema so
-- they show up under almanac in the generated TypeScript types and are
-- reachable via supabase-js (which only addresses functions in its
-- configured default schema). Trigger functions stay in public — they're
-- internal plumbing, not part of the public API surface.

-- Enums
alter type public.share_perm set schema almanac;
alter type public.custom_attr_type set schema almanac;
alter type public.task_status set schema almanac;
alter type public.budget_period set schema almanac;
alter type public.import_batch_status set schema almanac;
alter type public.asset_kind set schema almanac;
alter type public.shopping_status set schema almanac;
alter type public.shopping_period set schema almanac;

-- can_access now lives in almanac and references the moved share_perm enum
-- by its new schema. The function body is otherwise identical to the
-- previous public.can_access — drop the old one after recreation so we
-- don't leave a stale duplicate behind.
create or replace function almanac.can_access(
	p_resource_type text,
	p_resource_id uuid,
	p_perm almanac.share_perm default 'read',
	p_extra jsonb default '{}'::jsonb
) returns boolean
language sql
stable
security invoker
set search_path = almanac, public
as $$
	select exists (
		select 1
		from almanac.shares s
		where s.grantee_id = auth.uid()
			and s.resource_type = p_resource_type
			and s.perms && array[p_perm]::almanac.share_perm[]
			and (s.resource_id is null or s.resource_id = p_resource_id)
			and (s.scope = '{}'::jsonb or s.scope <@ p_extra)
	);
$$;
revoke all on function almanac.can_access(text, uuid, almanac.share_perm, jsonb) from public;
grant execute on function almanac.can_access(text, uuid, almanac.share_perm, jsonb) to authenticated;

-- Rebind every existing policy that called public.can_access(...) so they
-- now call almanac.can_access(...). Easier than droppping+recreating
-- dozens of policies: just keep the old function as a thin proxy.
create or replace function public.can_access(
	p_resource_type text,
	p_resource_id uuid,
	p_perm almanac.share_perm default 'read',
	p_extra jsonb default '{}'::jsonb
) returns boolean
language sql
stable
security invoker
set search_path = almanac, public
as $$
	select almanac.can_access(p_resource_type, p_resource_id, p_perm, p_extra);
$$;
grant execute on function public.can_access(text, uuid, almanac.share_perm, jsonb) to authenticated;

-- suggest_category_by_similarity moves to almanac so supabase-js can RPC it.
create or replace function almanac.suggest_category_by_similarity(
	p_description text,
	p_min float default 0.3
) returns uuid
language sql stable security invoker
set search_path = almanac, public
as $$
	select category_id from almanac.transactions
	where owner_id = auth.uid()
		and deleted_at is null
		and category_id is not null
		and similarity(description, p_description) >= p_min
	order by similarity(description, p_description) desc,
		posted_at desc
	limit 1;
$$;
revoke all on function almanac.suggest_category_by_similarity(text, float) from public;
grant execute on function almanac.suggest_category_by_similarity(text, float) to authenticated;

-- Drop the old public copy so it doesn't shadow when codepaths rpc()
-- against almanac.
drop function if exists public.suggest_category_by_similarity(text, float);

-- find_user_by_email is called from settings/shares to map email → uuid for
-- invites. Move it to almanac too so the typed RPC surface is consistent.
create or replace function almanac.find_user_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
	select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;
revoke all on function almanac.find_user_by_email(text) from public;
grant execute on function almanac.find_user_by_email(text) to authenticated;
drop function if exists public.find_user_by_email(text);

notify pgrst, 'reload schema';
