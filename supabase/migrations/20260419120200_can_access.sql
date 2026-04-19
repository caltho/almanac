-- can_access(resource_type, resource_id, perm, extra)
-- Domain-table RLS policies call this to decide whether the current user has a
-- share granting them the requested permission. Returns false for anon.

create or replace function public.can_access(
	p_resource_type text,
	p_resource_id uuid,
	p_perm public.share_perm default 'read',
	p_extra jsonb default '{}'::jsonb
) returns boolean
language sql
stable
security invoker
set search_path = public
as $$
	select exists (
		select 1
		from public.shares s
		where s.grantee_id = auth.uid()
			and s.resource_type = p_resource_type
			and s.perms && array[p_perm]::public.share_perm[]
			and (s.resource_id is null or s.resource_id = p_resource_id)
			and (s.scope = '{}'::jsonb or s.scope <@ p_extra)
	);
$$;

comment on function public.can_access(text, uuid, public.share_perm, jsonb) is
	'Returns true if auth.uid() has been granted `perm` on the given resource via shares. '
	'scope narrowing: share.scope is a subset of the row-supplied extra (all keys in share.scope must match).';

revoke all on function public.can_access(text, uuid, public.share_perm, jsonb) from public;
grant execute on function public.can_access(text, uuid, public.share_perm, jsonb) to authenticated;
