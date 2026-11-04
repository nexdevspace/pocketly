-- Normalize legacy default category names without changing category history.
-- The current schema has no budgets or merchant_rules tables; transaction
-- references are moved before a duplicate source category is removed.
do $$
declare
  v_pair record;
  v_source record;
  v_target_id uuid;
begin
  for v_pair in
    select * from (values
      ('expense', 'Belanja', 'Belanja Harian'),
      ('income', 'Pendapatan Lain', 'Lain-lain')
    ) as category_pairs(category_type, source_name, target_name)
  loop
    for v_source in
      select id, user_id
      from public.categories
      where type = v_pair.category_type and name = v_pair.source_name
      order by user_id
    loop
      select id into v_target_id
      from public.categories
      where user_id = v_source.user_id
        and type = v_pair.category_type
        and name = v_pair.target_name;

      if v_target_id is null then
        update public.categories
        set name = v_pair.target_name,
            category_group = case
              when v_pair.category_type = 'income' then 'non_income'
              else null
            end
        where id = v_source.id and user_id = v_source.user_id;
      else
        update public.transactions
        set category_id = v_target_id
        where user_id = v_source.user_id and category_id = v_source.id;

        delete from public.categories
        where id = v_source.id and user_id = v_source.user_id;
      end if;
    end loop;
  end loop;
end;
$$;

-- Normalize the target group even when a user already had the destination row.
update public.categories
set category_group = 'non_income'
where type = 'income' and name = 'Lain-lain';

-- Seed the canonical names for existing profiles and future signups.
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
    (new.id, 'Bonus', 'income', 'income_group', true),
    (new.id, 'Jualan', 'income', 'income_group', true),
    (new.id, 'Kiriman/Hadiah', 'income', 'non_income', true),
    (new.id, 'Refund', 'income', 'non_income', true),
    (new.id, 'Lain-lain', 'income', 'non_income', true),
    (new.id, 'Makan & Minum', 'expense', null, true),
    (new.id, 'Transport', 'expense', null, true),
    (new.id, 'Tagihan', 'expense', null, true),
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

insert into public.categories (user_id, name, type, category_group, is_system)
select p.id, defaults.name, defaults.type, defaults.category_group, true
from public.profiles p
cross join (
  values
    ('Gaji', 'income', 'income_group'),
    ('Bonus', 'income', 'income_group'),
    ('Jualan', 'income', 'income_group'),
    ('Kiriman/Hadiah', 'income', 'non_income'),
    ('Refund', 'income', 'non_income'),
    ('Lain-lain', 'income', 'non_income'),
    ('Makan & Minum', 'expense', null),
    ('Transport', 'expense', null),
    ('Tagihan', 'expense', null),
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
