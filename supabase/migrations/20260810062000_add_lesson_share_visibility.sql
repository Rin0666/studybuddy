begin;

alter table public.lesson_shares
  add column if not exists visibility text not null default 'private';

alter table public.lesson_shares
  drop constraint if exists lesson_shares_visibility_check;
alter table public.lesson_shares
  add constraint lesson_shares_visibility_check
  check (visibility in ('private', 'public'));

-- Preserve public links created before visibility was stored explicitly.
update public.lesson_shares share
set visibility = 'public'
where exists (
  select 1
  from public.shared_study_sets public_share
  where public_share.study_set_id = share.lesson_id
);

commit;
