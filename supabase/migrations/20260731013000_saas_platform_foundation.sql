-- Fondation commerciale et administration SaaS.
-- Migration préparée localement : ne pas appliquer sans validation séparée.

create table if not exists public.platform_access_requests (
  id uuid primary key default gen_random_uuid(),
  company_name text not null check (char_length(company_name) between 2 and 160),
  manager_first_name text not null check (char_length(manager_first_name) between 1 and 80),
  manager_last_name text not null check (char_length(manager_last_name) between 1 and 80),
  professional_email text not null,
  email_normalized text not null,
  phone text not null check (char_length(phone) between 6 and 32),
  technician_count integer not null check (technician_count between 0 and 10000),
  city_or_region text not null check (char_length(city_or_region) between 2 and 160),
  message text check (message is null or char_length(message) <= 2000),
  terms_version text not null,
  terms_accepted_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'rejected', 'cancelled')),
  request_fingerprint text not null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  decision_reason text check (decision_reason is null or char_length(decision_reason) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists platform_access_requests_pending_email_unique
  on public.platform_access_requests (email_normalized)
  where status = 'pending';

create index if not exists platform_access_requests_status_created_idx
  on public.platform_access_requests (status, created_at desc);

create table if not exists public.platform_request_rate_limits (
  request_fingerprint text primary key,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 1 check (attempt_count > 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_accounts (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  request_id uuid unique references public.platform_access_requests(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'rejected', 'suspended', 'cancelled')),
  current_reason text check (current_reason is null or char_length(current_reason) <= 1000),
  activated_at timestamptz,
  suspended_at timestamptz,
  cancelled_at timestamptz,
  last_decided_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_accounts_status_idx
  on public.platform_accounts (status, created_at desc);

create table if not exists public.platform_access_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.platform_access_requests(id) on delete set null,
  owner_id uuid references auth.users(id) on delete set null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  old_value text,
  new_value text not null,
  reason text check (reason is null or char_length(reason) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists platform_access_events_request_idx
  on public.platform_access_events (request_id, created_at desc);

create index if not exists platform_access_events_owner_idx
  on public.platform_access_events (owner_id, created_at desc);

alter table public.platform_access_requests enable row level security;
alter table public.platform_request_rate_limits enable row level security;
alter table public.platform_admins enable row level security;
alter table public.platform_accounts enable row level security;
alter table public.platform_access_events enable row level security;

create or replace function public.is_platform_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins
    where user_id = p_user_id
      and active = true
  );
$$;

revoke all on function public.is_platform_admin(uuid) from public, anon;
grant execute on function public.is_platform_admin(uuid) to authenticated, service_role;

create or replace function public.current_account_access_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select pa.status
      from public.platform_accounts pa
      where pa.owner_id = public.account_owner()
      limit 1
    ),
    'pending'
  );
$$;

revoke all on function public.current_account_access_status() from public, anon;
grant execute on function public.current_account_access_status() to authenticated, service_role;

create or replace function public.current_platform_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_platform_admin boolean := false;
  v_status text := null;
  v_role text := null;
  v_poste text := null;
begin
  if v_user_id is null then
    return jsonb_build_object(
      'authenticated', false,
      'platformAdmin', false,
      'status', null,
      'role', null,
      'poste', null
    );
  end if;

  v_platform_admin := public.is_platform_admin(v_user_id);

  if not v_platform_admin then
    v_status := public.current_account_access_status();
    v_role := public.current_user_role();

    select tm.poste
      into v_poste
      from public.team_members tm
      where tm.user_id = v_user_id
      limit 1;
  end if;

  return jsonb_build_object(
    'authenticated', true,
    'platformAdmin', v_platform_admin,
    'status', case when v_platform_admin then 'active' else v_status end,
    'role', v_role,
    'poste', v_poste
  );
end;
$$;

revoke all on function public.current_platform_context() from public, anon;
grant execute on function public.current_platform_context() to authenticated, service_role;

-- Les comptes déjà présents dans l'application sont conservés comme actifs.
-- Les lignes company_settings orphelines créées pour les employés sont exclues.
insert into public.platform_accounts (owner_id, status, activated_at)
select cs.user_id, 'active', now()
from public.company_settings cs
where not exists (
  select 1
  from public.team_members tm
  where tm.user_id = cs.user_id
)
on conflict (owner_id) do nothing;

create policy "platform admins read own role"
  on public.platform_admins
  for select
  to authenticated
  using (user_id = auth.uid() and active = true);

create policy "platform admins read access requests"
  on public.platform_access_requests
  for select
  to authenticated
  using (public.is_platform_admin());

create policy "platform admins read rate limits"
  on public.platform_request_rate_limits
  for select
  to authenticated
  using (public.is_platform_admin());

create policy "account members read own platform account"
  on public.platform_accounts
  for select
  to authenticated
  using (
    owner_id = public.account_owner()
    or public.is_platform_admin()
  );

create policy "platform admins read access events"
  on public.platform_access_events
  for select
  to authenticated
  using (public.is_platform_admin());

create or replace function public.submit_platform_access_request(
  p_company_name text,
  p_manager_first_name text,
  p_manager_last_name text,
  p_professional_email text,
  p_phone text,
  p_technician_count integer,
  p_city_or_region text,
  p_message text,
  p_terms_version text,
  p_request_fingerprint text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_professional_email));
  v_limit public.platform_request_rate_limits%rowtype;
begin
  select *
    into v_limit
    from public.platform_request_rate_limits
    where request_fingerprint = p_request_fingerprint
    for update;

  if not found then
    insert into public.platform_request_rate_limits (
      request_fingerprint,
      window_started_at,
      attempt_count
    )
    values (p_request_fingerprint, now(), 1);
  elsif v_limit.window_started_at < now() - interval '1 hour' then
    update public.platform_request_rate_limits
      set window_started_at = now(),
          attempt_count = 1,
          updated_at = now()
      where request_fingerprint = p_request_fingerprint;
  elsif v_limit.attempt_count >= 5 then
    raise exception using errcode = 'P0001', message = 'RATE_LIMIT';
  else
    update public.platform_request_rate_limits
      set attempt_count = attempt_count + 1,
          updated_at = now()
      where request_fingerprint = p_request_fingerprint;
  end if;

  insert into public.platform_access_requests (
    company_name,
    manager_first_name,
    manager_last_name,
    professional_email,
    email_normalized,
    phone,
    technician_count,
    city_or_region,
    message,
    terms_version,
    request_fingerprint
  )
  values (
    trim(p_company_name),
    trim(p_manager_first_name),
    trim(p_manager_last_name),
    trim(p_professional_email),
    v_email,
    trim(p_phone),
    p_technician_count,
    trim(p_city_or_region),
    nullif(trim(p_message), ''),
    p_terms_version,
    p_request_fingerprint
  )
  on conflict (email_normalized) where status = 'pending'
  do nothing;
end;
$$;

revoke all on function public.submit_platform_access_request(
  text, text, text, text, text, integer, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.submit_platform_access_request(
  text, text, text, text, text, integer, text, text, text, text
) to service_role;

create or replace function public.platform_accept_request(
  p_request_id uuid,
  p_owner_id uuid,
  p_actor_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_status text;
begin
  if not public.is_platform_admin(p_actor_user_id) then
    raise exception 'PLATFORM_ADMIN_REQUIRED';
  end if;

  select status
    into v_old_status
    from public.platform_access_requests
    where id = p_request_id
    for update;

  if v_old_status is distinct from 'pending' then
    raise exception 'REQUEST_NOT_PENDING';
  end if;

  insert into public.platform_accounts (
    owner_id,
    request_id,
    status,
    activated_at,
    last_decided_by
  )
  values (
    p_owner_id,
    p_request_id,
    'active',
    now(),
    p_actor_user_id
  )
  on conflict (owner_id) do update
    set request_id = excluded.request_id,
        status = 'active',
        activated_at = now(),
        suspended_at = null,
        cancelled_at = null,
        current_reason = null,
        last_decided_by = p_actor_user_id,
        updated_at = now();

  update public.platform_access_requests
    set status = 'active',
        reviewed_by = p_actor_user_id,
        reviewed_at = now(),
        decision_reason = null,
        updated_at = now()
    where id = p_request_id;

  insert into public.platform_access_events (
    request_id,
    owner_id,
    actor_user_id,
    action,
    old_value,
    new_value
  )
  values (
    p_request_id,
    p_owner_id,
    p_actor_user_id,
    'request_accepted',
    v_old_status,
    'active'
  );
end;
$$;

revoke all on function public.platform_accept_request(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.platform_accept_request(uuid, uuid, uuid)
  to service_role;

create or replace function public.platform_reject_request(
  p_request_id uuid,
  p_actor_user_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_status text;
begin
  if not public.is_platform_admin(p_actor_user_id) then
    raise exception 'PLATFORM_ADMIN_REQUIRED';
  end if;

  select status
    into v_old_status
    from public.platform_access_requests
    where id = p_request_id
    for update;

  if v_old_status is distinct from 'pending' then
    raise exception 'REQUEST_NOT_PENDING';
  end if;

  update public.platform_access_requests
    set status = 'rejected',
        reviewed_by = p_actor_user_id,
        reviewed_at = now(),
        decision_reason = nullif(trim(p_reason), ''),
        updated_at = now()
    where id = p_request_id;

  insert into public.platform_access_events (
    request_id,
    actor_user_id,
    action,
    old_value,
    new_value,
    reason
  )
  values (
    p_request_id,
    p_actor_user_id,
    'request_rejected',
    v_old_status,
    'rejected',
    nullif(trim(p_reason), '')
  );
end;
$$;

revoke all on function public.platform_reject_request(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.platform_reject_request(uuid, uuid, text)
  to service_role;

create or replace function public.platform_set_account_status(
  p_owner_id uuid,
  p_new_status text,
  p_actor_user_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_status text;
begin
  if not public.is_platform_admin(p_actor_user_id) then
    raise exception 'PLATFORM_ADMIN_REQUIRED';
  end if;

  if p_new_status not in ('active', 'suspended', 'cancelled') then
    raise exception 'INVALID_ACCOUNT_STATUS';
  end if;

  select status
    into v_old_status
    from public.platform_accounts
    where owner_id = p_owner_id
    for update;

  if not found then
    raise exception 'ACCOUNT_NOT_FOUND';
  end if;

  update public.platform_accounts
    set status = p_new_status,
        current_reason = case
          when p_new_status = 'active' then null
          else nullif(trim(p_reason), '')
        end,
        activated_at = case
          when p_new_status = 'active' then coalesce(activated_at, now())
          else activated_at
        end,
        suspended_at = case
          when p_new_status = 'suspended' then now()
          else null
        end,
        cancelled_at = case
          when p_new_status = 'cancelled' then now()
          else null
        end,
        last_decided_by = p_actor_user_id,
        updated_at = now()
    where owner_id = p_owner_id;

  insert into public.platform_access_events (
    owner_id,
    actor_user_id,
    action,
    old_value,
    new_value,
    reason
  )
  values (
    p_owner_id,
    p_actor_user_id,
    'account_status_changed',
    v_old_status,
    p_new_status,
    nullif(trim(p_reason), '')
  );
end;
$$;

revoke all on function public.platform_set_account_status(uuid, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.platform_set_account_status(uuid, text, uuid, text)
  to service_role;

-- Une policy restrictive s'ajoute aux policies existantes sans les remplacer :
-- l'isolation multi-tenant continue de s'appliquer ET le compte doit être actif.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'clients',
    'company_settings',
    'contracts',
    'devis',
    'devis_lines',
    'interventions',
    'invoice_lines',
    'invoices',
    'produits_biocides',
    'relances',
    'service_presets',
    'stock_levels',
    'stock_movements',
    'stock_products',
    'stock_requests',
    'team_members'
  ]
  loop
    if to_regclass('public.' || v_table) is not null
      and not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = v_table
          and policyname = 'platform active account required'
      )
    then
      execute format(
        'create policy %I on public.%I as restrictive for all to authenticated using (public.current_account_access_status() = %L) with check (public.current_account_access_status() = %L)',
        'platform active account required',
        v_table,
        'active',
        'active'
      );
    end if;
  end loop;
end;
$$;

-- Les buckets existants sont publics. Cette policy bloque les mutations
-- authentifiées d'un compte suspendu. Les anciennes URLs publiques restent
-- publiques par conception et devront être migrées vers des buckets privés
-- dans un chantier distinct si leur révocation est requise.
do $$
begin
  if to_regclass('storage.objects') is not null
    and not exists (
      select 1
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'platform active account required'
    )
  then
    execute $policy$
      create policy "platform active account required"
      on storage.objects
      as restrictive
      for all
      to authenticated
      using (
        bucket_id not in (
          'company-logos',
          'intervention-photos',
          'intervention-signatures'
        )
        or public.current_account_access_status() = 'active'
      )
      with check (
        bucket_id not in (
          'company-logos',
          'intervention-photos',
          'intervention-signatures'
        )
        or public.current_account_access_status() = 'active'
      )
    $policy$;
  end if;
end;
$$;

grant select on public.platform_admins to authenticated;
grant select on public.platform_access_requests to authenticated;
grant select on public.platform_request_rate_limits to authenticated;
grant select on public.platform_accounts to authenticated;
grant select on public.platform_access_events to authenticated;
grant all on public.platform_access_requests to service_role;
grant all on public.platform_request_rate_limits to service_role;
grant all on public.platform_admins to service_role;
grant all on public.platform_accounts to service_role;
grant all on public.platform_access_events to service_role;
