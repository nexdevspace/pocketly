-- Bring both existing profiles and future signups in line with SPEC.md section 7.
create or replace function public.seed_default_categories()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.categories (user_id, name, type, category_group, is_system)
  values
    (new.id, 'Gaji', 'income', 'income_group', true),
    (new.id, 'Pendapatan Lain', 'income', 'income_group', true),
    (new.id, 'Bonus', 'income', 'income_group', true),
    (new.id, 'Jualan', 'income', 'income_group', true),
    (new.id, 'Kiriman/Hadiah', 'income', 'non_income', true),
    (new.id, 'Refund', 'income', 'non_income', true),
    (new.id, 'Lain-lain', 'income', 'non_income', true),
    (new.id, 'Makan & Minum', 'expense', null, true),
    (new.id, 'Transport', 'expense', null, true),
    (new.id, 'Tagihan', 'expense', null, true),
    (new.id, 'Belanja', 'expense', null, true),
    (new.id, 'Belanja Harian', 'expense', null, true),
    (new.id, 'Kesehatan', 'expense', null, true),
    (new.id, 'Pendidikan', 'expense', null, true),
    (new.id, 'Hiburan', 'expense', null, true),
    (new.id, 'Biaya Admin', 'expense', null, true),
    (new.id, 'Bunga & Biaya', 'expense', null, true),
    (new.id, 'Tak tercatat', 'expense', null, true),
    (new.id, 'Lain-lain', 'expense', null, true)
  on conflict (user_id, name, type) do nothing;
  return new;
end;
$$;

-- Backfill defaults for profiles created before this migration.
insert into public.categories (user_id, name, type, category_group, is_system)
select p.id, defaults.name, defaults.type, defaults.category_group, true
from public.profiles p
cross join (
  values
    ('Gaji', 'income', 'income_group'),
    ('Pendapatan Lain', 'income', 'income_group'),
    ('Bonus', 'income', 'income_group'),
    ('Jualan', 'income', 'income_group'),
    ('Kiriman/Hadiah', 'income', 'non_income'),
    ('Refund', 'income', 'non_income'),
    ('Lain-lain', 'income', 'non_income'),
    ('Makan & Minum', 'expense', null),
    ('Transport', 'expense', null),
    ('Tagihan', 'expense', null),
    ('Belanja', 'expense', null),
    ('Belanja Harian', 'expense', null),
    ('Kesehatan', 'expense', null),
    ('Pendidikan', 'expense', null),
    ('Hiburan', 'expense', null),
    ('Biaya Admin', 'expense', null),
    ('Bunga & Biaya', 'expense', null),
    ('Tak tercatat', 'expense', null),
    ('Lain-lain', 'expense', null)
) as defaults(name, type, category_group)
on conflict (user_id, name, type) do nothing;

-- RLS must let an owned fee row reach this guard so a direct edit gets a clear error.
create or replace function public.reject_direct_transfer_fee_edit()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user <> 'postgres'
     and (old.transfer_id is not null or new.transfer_id is not null) then
    raise exception using
      errcode = '42501',
      message = 'Biaya diatur lewat transfernya';
  end if;
  return new;
end;
$$;

revoke all on function public.reject_direct_transfer_fee_edit() from public, anon, authenticated;

create trigger transactions_fee_edit_guard
before update on public.transactions
for each row execute function public.reject_direct_transfer_fee_edit();

drop policy if exists "transactions_update_regular_own" on public.transactions;
create policy "transactions_update_own" on public.transactions
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
