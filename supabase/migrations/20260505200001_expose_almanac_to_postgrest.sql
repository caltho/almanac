-- Tell PostgREST to expose the `almanac` schema in addition to its defaults.
-- Without this, supabase-js requests with `db.schema = 'almanac'` would get
-- "schema not exposed" errors. NOTIFY signals the running PostgREST to
-- pick up the new config without a restart.

alter role authenticator
	set pgrst.db_schemas to 'public, graphql_public, almanac';

notify pgrst, 'reload config';
