begin;

create table if not exists public.lesson_shares (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.study_sets(id) on delete cascade,
  owner_id uuid not null,
  topic text not null,
  scope text not null,
  payload jsonb not null,
  shared_emails text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lesson_shares_owner_id_idx
  on public.lesson_shares(owner_id);
create index if not exists lesson_shares_shared_emails_idx
  on public.lesson_shares using gin(shared_emails);

alter table public.lesson_shares enable row level security;

drop policy if exists "Owners can view lesson shares" on public.lesson_shares;
create policy "Owners can view lesson shares"
  on public.lesson_shares
  for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Recipients can view shared lessons" on public.lesson_shares;
create policy "Recipients can view shared lessons"
  on public.lesson_shares
  for select
  to authenticated
  using (
    lower(coalesce(auth.jwt() ->> 'email', '')) = any(shared_emails)
  );

drop policy if exists "Owners can create lesson shares" on public.lesson_shares;
create policy "Owners can create lesson shares"
  on public.lesson_shares
  for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Owners can update lesson shares" on public.lesson_shares;
create policy "Owners can update lesson shares"
  on public.lesson_shares
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Owners can delete lesson shares" on public.lesson_shares;
create policy "Owners can delete lesson shares"
  on public.lesson_shares
  for delete
  to authenticated
  using (owner_id = auth.uid());

grant select, insert, update, delete on table public.lesson_shares to authenticated;

-- Preserve invitations created by the previous implementation. The lesson
-- payload is copied so recipients never need permission to query study_sets.
insert into public.lesson_shares (
  lesson_id,
  owner_id,
  topic,
  scope,
  payload,
  shared_emails
)
select
  lesson.id,
  lesson.user_id,
  lesson.topic,
  lesson.scope::text,
  lesson.payload,
  array_agg(distinct lower(trim(invitation.email)))
from public.study_sets lesson
join public.study_set_invites invitation
  on invitation.study_set_id = lesson.id
where trim(invitation.email) <> ''
group by lesson.id, lesson.user_id, lesson.topic, lesson.scope, lesson.payload
on conflict (lesson_id) do update
set
  owner_id = excluded.owner_id,
  topic = excluded.topic,
  scope = excluded.scope,
  payload = excluded.payload,
  shared_emails = (
    select array_agg(distinct address)
    from unnest(
      lesson_shares.shared_emails || excluded.shared_emails
    ) as address
  ),
  updated_at = now();

commit;
