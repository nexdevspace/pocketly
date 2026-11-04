-- Pocketly's first ledger schema. Amounts are integer Rupiah and balances are
-- calculated from the ledger rather than stored as mutable account totals.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  onboarding_completed_at timestamptz,
  start_date date,
  created_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('asset', 'liability')),
  type text not null check (
    type in ('bank', 'ewallet', 'cash', 'investment', 'receivable', 'paylater', 'loan', 'payable')
  ),
  name text not null check (length(trim(name)) > 0),
  institution text,
  counterparty_name text,
  opening_balance bigint not null default 0 check (opening_balance >= 0),
  opening_date date not null default (now() at time zone 'Asia/Jakarta')::date,
  credit_limit bigint check (credit_limit is null or credit_limit >= 0),
  due_day smallint check (due_day is null or due_day between 1 and 31),
  is_default boolean not null default false,
  is_archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, id),
  check (
    (kind = 'asset' and type in ('bank', 'ewallet', 'cash', 'investment', 'receivable'))
    or (kind = 'liability' and type in ('paylater', 'loan', 'payable'))
  ),
  check (
    (type in ('receivable', 'payable') and nullif(trim(counterparty_name), '') is not null)
    or type not in ('receivable', 'payable')
  ),
  check (is_archived = (archived_at is not null))
);

create unique index accounts_one_default_per_user
  on public.accounts (user_id)
  where is_default and not is_archived;

create index accounts_user_type_idx on public.accounts (user_id, type);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  type text not null check (type in ('income', 'expense')),
  category_group text check (category_group in ('income_group', 'non_income')),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, name, type),
  check (
    (type = 'income' and category_group is not null)
    or (type = 'expense' and category_group is null)
  )
);

create table public.account_balance_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  account_id uuid not null,
  adjustment_type text not null check (adjustment_type in ('opening_edit', 'reconciliation')),
  amount_delta bigint not null check (amount_delta <> 0),
  previous_balance bigint check (previous_balance is null or previous_balance >= 0),
  new_balance bigint check (new_balance is null or new_balance >= 0),
  effective_date date not null default (now() at time zone 'Asia/Jakarta')::date,
  note text,
  created_at timestamptz not null default now(),
  foreign key (user_id, account_id)
    references public.accounts (user_id, id) on delete no action,
  check (
    (adjustment_type = 'opening_edit' and previous_balance is not null and new_balance is not null)
    or adjustment_type = 'reconciliation'
  ),
  check (
    adjustment_type <> 'opening_edit'
    or amount_delta = new_balance - previous_balance
  )
);

create index adjustments_user_account_date_idx
  on public.account_balance_adjustments (user_id, account_id, effective_date);

create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  from_account_id uuid not null,
  to_account_id uuid not null,
  amount bigint not null check (amount > 0),
  fee bigint not null default 0 check (fee >= 0),
  date date not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, id),
  foreign key (user_id, from_account_id)
    references public.accounts (user_id, id) on delete no action,
  foreign key (user_id, to_account_id)
    references public.accounts (user_id, id) on delete no action,
  check (from_account_id <> to_account_id)
);

create index transfers_user_date_idx on public.transfers (user_id, date);
create index transfers_user_from_idx on public.transfers (user_id, from_account_id);
create index transfers_user_to_idx on public.transfers (user_id, to_account_id);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  account_id uuid not null,
  category_id uuid not null,
  amount bigint not null check (amount > 0),
  note text,
  date date not null,
  source text not null default 'web'
    check (source in ('text', 'receipt', 'web', 'recurring', 'system')),
  transfer_id uuid,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (user_id, account_id)
    references public.accounts (user_id, id) on delete no action,
  foreign key (user_id, category_id)
    references public.categories (user_id, id) on delete no action,
  foreign key (user_id, transfer_id)
    references public.transfers (user_id, id) on delete no action,
  check (
    (transfer_id is null)
    or (type = 'expense' and source = 'system')
  ),
  check (source <> 'system' or transfer_id is not null)
);

create unique index transactions_one_fee_row_per_transfer
  on public.transactions (user_id, transfer_id)
  where transfer_id is not null;

create index transactions_user_date_idx on public.transactions (user_id, date);
create index transactions_user_account_idx on public.transactions (user_id, account_id);
create index transactions_user_category_date_idx
  on public.transactions (user_id, category_id, date);

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
    (new.id, 'Kiriman/Hadiah', 'income', 'non_income', true),
    (new.id, 'Refund', 'income', 'non_income', true),
    (new.id, 'Makan & Minum', 'expense', null, true),
    (new.id, 'Transport', 'expense', null, true),
    (new.id, 'Tagihan', 'expense', null, true),
    (new.id, 'Belanja', 'expense', null, true),
    (new.id, 'Kesehatan', 'expense', null, true),
    (new.id, 'Pendidikan', 'expense', null, true),
    (new.id, 'Hiburan', 'expense', null, true),
    (new.id, 'Bunga & Biaya', 'expense', null, true),
    (new.id, 'Tak tercatat', 'expense', null, true)
  on conflict (user_id, name, type) do nothing;
  return new;
end;
$$;

create trigger profiles_seed_categories
after insert on public.profiles
for each row execute function public.seed_default_categories();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger auth_user_create_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.validate_transaction()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_account public.accounts%rowtype;
  v_category public.categories%rowtype;
begin
  if tg_op = 'UPDATE'
     and (new.account_id, new.category_id, new.type, new.date)
         is not distinct from (old.account_id, old.category_id, old.type, old.date) then
    if old.transfer_id is not null and current_user <> 'postgres' then
      raise exception using
        errcode = '42501',
        message = 'Biaya transfer hanya dapat diubah lewat edit transfernya.';
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' and new.transfer_id is not null and current_user <> 'postgres' then
    raise exception using
      errcode = '42501',
      message = 'Biaya transfer hanya dapat dibuat lewat transfer.';
  end if;

  if tg_op = 'UPDATE' and old.transfer_id is not null and current_user <> 'postgres' then
    raise exception using
      errcode = '42501',
      message = 'Biaya transfer hanya dapat diubah lewat edit transfernya.';
  end if;

  select * into v_account
  from public.accounts
  where id = new.account_id and user_id = new.user_id;

  if not found then
    raise exception using errcode = '23503', message = 'Akun tidak ditemukan.';
  end if;

  if new.type = 'income' and v_account.kind = 'liability' then
    raise exception using
      errcode = 'P0001',
      message = 'Pemasukan hanya dapat dicatat ke akun aset. Untuk pembayaran utang, gunakan Transfer.';
  end if;

  if new.date < v_account.opening_date then
    raise exception using
      errcode = 'P0001',
      message = 'Tanggal transaksi tidak boleh sebelum tanggal mulai akun.';
  end if;

  if v_account.is_archived and new.deleted_at is null then
    raise exception using errcode = 'P0001', message = 'Akun ini sudah diarsipkan.';
  end if;

  select * into v_category
  from public.categories
  where id = new.category_id and user_id = new.user_id;

  if not found or v_category.type <> new.type then
    raise exception using errcode = '23514', message = 'Kategori tidak sesuai dengan jenis transaksi.';
  end if;

  return new;
end;
$$;

create trigger transactions_validate
before insert or update on public.transactions
for each row execute function public.validate_transaction();

create or replace function public.complete_onboarding(
  p_start_date date,
  p_accounts jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_asset_count integer;
  v_rows integer;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Silakan masuk kembali.';
  end if;
  perform 1 from public.profiles
  where id = v_user_id and onboarding_completed_at is null
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'Onboarding sudah selesai.';
  end if;
  if p_start_date is null or jsonb_typeof(p_accounts) <> 'array' then
    raise exception using errcode = '22023', message = 'Data onboarding tidak valid.';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_accounts) as input(kind text, type text, name text)
    where coalesce(trim(input.name), '') = ''
       or input.type not in ('bank', 'ewallet', 'cash', 'investment', 'receivable', 'paylater', 'loan', 'payable')
       or input.kind not in ('asset', 'liability')
  ) then
    raise exception using errcode = '22023', message = 'Periksa kembali jenis dan nama akun.';
  end if;

  select count(*) into v_asset_count
  from jsonb_to_recordset(p_accounts) as input(kind text)
  where input.kind = 'asset';
  if v_asset_count < 1 then
    raise exception using errcode = '22023', message = 'Tambahkan minimal satu akun aset untuk melanjutkan.';
  end if;

  insert into public.accounts (
    user_id, kind, type, name, institution, counterparty_name,
    opening_balance, opening_date, credit_limit, due_day, is_default
  )
  select
    v_user_id,
    input.kind,
    input.type,
    trim(input.name),
    nullif(trim(input.institution), ''),
    nullif(trim(input.counterparty_name), ''),
    greatest(coalesce(input.opening_balance, 0), 0),
    p_start_date,
    input.credit_limit,
    input.due_day,
    input.is_default
  from jsonb_to_recordset(p_accounts) as input(
    kind text,
    type text,
    name text,
    institution text,
    counterparty_name text,
    opening_balance bigint,
    credit_limit bigint,
    due_day smallint,
    is_default boolean
  );
  get diagnostics v_rows = row_count;
  if v_rows < 1 then
    raise exception using errcode = '22023', message = 'Tambahkan minimal satu akun aset untuk melanjutkan.';
  end if;

  update public.profiles
  set onboarding_completed_at = now(), start_date = p_start_date
  where id = v_user_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Profil belum siap. Silakan coba lagi.';
  end if;
end;
$$;

create or replace function public.record_opening_balance_change(
  p_account_id uuid,
  p_new_opening_balance bigint
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_account public.accounts%rowtype;
  v_current_opening bigint;
  v_delta bigint;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Silakan masuk kembali.';
  end if;
  if p_new_opening_balance is null or p_new_opening_balance < 0 then
    raise exception using errcode = '22023', message = 'Saldo awal tidak boleh negatif.';
  end if;

  select * into v_account
  from public.accounts
  where id = p_account_id and user_id = v_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Akun tidak ditemukan.';
  end if;

  select v_account.opening_balance + coalesce(sum(amount_delta), 0)
  into v_current_opening
  from public.account_balance_adjustments
  where user_id = v_user_id and account_id = p_account_id
    and adjustment_type = 'opening_edit';

  v_delta := p_new_opening_balance - v_current_opening;
  if v_delta = 0 then
    return;
  end if;

  insert into public.account_balance_adjustments (
    user_id, account_id, adjustment_type, amount_delta,
    previous_balance, new_balance, effective_date, note
  ) values (
    v_user_id, p_account_id, 'opening_edit', v_delta,
    v_current_opening, p_new_opening_balance, v_account.opening_date,
    'Perubahan saldo awal'
  );
end;
$$;

create or replace function public.create_transfer(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount bigint,
  p_fee bigint,
  p_date date
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_transfer_id uuid;
  v_from public.accounts%rowtype;
  v_to public.accounts%rowtype;
  v_fee_category_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Silakan masuk kembali.';
  end if;
  if p_from_account_id = p_to_account_id then
    raise exception using errcode = '23514', message = 'Akun asal dan tujuan harus berbeda.';
  end if;
  if p_amount is null or p_amount <= 0 or p_fee is null or p_fee < 0 or p_date is null then
    raise exception using errcode = '22023', message = 'Nominal, biaya, atau tanggal transfer tidak valid.';
  end if;

  select * into v_from from public.accounts
  where id = p_from_account_id and user_id = v_user_id and not is_archived;
  if not found then
    raise exception using errcode = 'P0002', message = 'Akun asal tidak ditemukan atau sudah diarsipkan.';
  end if;
  select * into v_to from public.accounts
  where id = p_to_account_id and user_id = v_user_id and not is_archived;
  if not found then
    raise exception using errcode = 'P0002', message = 'Akun tujuan tidak ditemukan atau sudah diarsipkan.';
  end if;
  if p_date < v_from.opening_date or p_date < v_to.opening_date then
    raise exception using errcode = 'P0001', message = 'Tanggal transfer tidak boleh sebelum tanggal mulai akun.';
  end if;

  insert into public.transfers (user_id, from_account_id, to_account_id, amount, fee, date)
  values (v_user_id, p_from_account_id, p_to_account_id, p_amount, p_fee, p_date)
  returning id into v_transfer_id;

  if p_fee > 0 then
    select id into v_fee_category_id from public.categories
    where user_id = v_user_id and type = 'expense' and name = 'Bunga & Biaya' and is_system;
    if v_fee_category_id is null then
      raise exception using errcode = 'P0002', message = 'Kategori Bunga & Biaya belum tersedia.';
    end if;
    insert into public.transactions (
      user_id, type, account_id, category_id, amount, note, date, source, transfer_id
    ) values (
      v_user_id, 'expense', p_from_account_id, v_fee_category_id,
      p_fee, 'Biaya transfer', p_date, 'system', v_transfer_id
    );
  end if;
  return v_transfer_id;
end;
$$;

create or replace function public.update_transfer(
  p_transfer_id uuid,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount bigint,
  p_fee bigint,
  p_date date
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_fee_category_id uuid;
  v_fee_transaction_id uuid;
  v_from public.accounts%rowtype;
  v_to public.accounts%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Silakan masuk kembali.';
  end if;
  if p_from_account_id = p_to_account_id then
    raise exception using errcode = '23514', message = 'Akun asal dan tujuan harus berbeda.';
  end if;
  if p_amount is null or p_amount <= 0 or p_fee is null or p_fee < 0 or p_date is null then
    raise exception using errcode = '22023', message = 'Nominal, biaya, atau tanggal transfer tidak valid.';
  end if;

  perform 1 from public.transfers
  where id = p_transfer_id and user_id = v_user_id and deleted_at is null
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Transfer tidak ditemukan atau sudah dihapus.';
  end if;
  select * into v_from from public.accounts
  where id = p_from_account_id and user_id = v_user_id and not is_archived;
  if not found then
    raise exception using errcode = 'P0002', message = 'Akun asal tidak ditemukan atau sudah diarsipkan.';
  end if;
  select * into v_to from public.accounts
  where id = p_to_account_id and user_id = v_user_id and not is_archived;
  if not found then
    raise exception using errcode = 'P0002', message = 'Akun tujuan tidak ditemukan atau sudah diarsipkan.';
  end if;
  if p_date < v_from.opening_date or p_date < v_to.opening_date then
    raise exception using errcode = 'P0001', message = 'Tanggal transfer tidak boleh sebelum tanggal mulai akun.';
  end if;

  update public.transfers
  set from_account_id = p_from_account_id,
      to_account_id = p_to_account_id,
      amount = p_amount,
      fee = p_fee,
      date = p_date
  where id = p_transfer_id and user_id = v_user_id;

  select id into v_fee_transaction_id from public.transactions
  where user_id = v_user_id and transfer_id = p_transfer_id;

  if p_fee > 0 then
    select id into v_fee_category_id from public.categories
    where user_id = v_user_id and type = 'expense' and name = 'Bunga & Biaya' and is_system;
    if v_fee_category_id is null then
      raise exception using errcode = 'P0002', message = 'Kategori Bunga & Biaya belum tersedia.';
    end if;
    if v_fee_transaction_id is null then
      insert into public.transactions (
        user_id, type, account_id, category_id, amount, note, date, source, transfer_id
      ) values (
        v_user_id, 'expense', p_from_account_id, v_fee_category_id,
        p_fee, 'Biaya transfer', p_date, 'system', p_transfer_id
      );
    else
      update public.transactions
      set account_id = p_from_account_id,
          category_id = v_fee_category_id,
          amount = p_fee,
          note = 'Biaya transfer',
          date = p_date,
          deleted_at = null
      where id = v_fee_transaction_id;
    end if;
  elsif v_fee_transaction_id is not null then
    update public.transactions
    set deleted_at = coalesce(deleted_at, now())
    where id = v_fee_transaction_id;
  end if;
  return p_transfer_id;
end;
$$;

create or replace function public.soft_delete_transfer(p_transfer_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted_at timestamptz := now();
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Silakan masuk kembali.';
  end if;
  update public.transfers
  set deleted_at = v_deleted_at
  where id = p_transfer_id and user_id = v_user_id and deleted_at is null;
  if not found then
    raise exception using errcode = 'P0002', message = 'Transfer tidak ditemukan.';
  end if;
  update public.transactions
  set deleted_at = v_deleted_at
  where user_id = v_user_id and transfer_id = p_transfer_id and deleted_at is null;
end;
$$;

create or replace function public.restore_transfer(p_transfer_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_fee bigint;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Silakan masuk kembali.';
  end if;
  update public.transfers
  set deleted_at = null
  where id = p_transfer_id and user_id = v_user_id and deleted_at is not null
  returning fee into v_fee;
  if not found then
    raise exception using errcode = 'P0002', message = 'Transfer terhapus tidak ditemukan.';
  end if;
  if v_fee > 0 then
    update public.transactions
    set deleted_at = null
    where user_id = v_user_id and transfer_id = p_transfer_id;
    if not found then
      raise exception using errcode = 'P0002', message = 'Transaksi biaya transfer tidak ditemukan.';
    end if;
  end if;
end;
$$;

create view public.wallet_balances with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.kind,
  a.type,
  a.name,
  a.institution,
  a.counterparty_name,
  a.opening_balance,
  a.opening_date,
  a.credit_limit,
  a.due_day,
  a.is_default,
  a.is_archived,
  a.archived_at,
  a.created_at,
  case
    when a.kind = 'asset' then
      a.opening_balance + ledger.adjustment + ledger.income - ledger.expense
      + ledger.transfers_in - ledger.transfers_out
    else
      a.opening_balance + ledger.adjustment + ledger.expense
      + ledger.transfers_out - ledger.transfers_in
  end as balance
from public.accounts a
left join lateral (
  select
    coalesce(sum(case when t.type = 'income' then t.amount else 0 end), 0)::bigint as income,
    coalesce(sum(case when t.type = 'expense' then t.amount else 0 end), 0)::bigint as expense
  from public.transactions t
  where t.user_id = a.user_id and t.account_id = a.id and t.deleted_at is null
) ledger_tx on true
left join lateral (
  select
    coalesce(sum(adj.amount_delta), 0)::bigint as adjustment
  from public.account_balance_adjustments adj
  where adj.user_id = a.user_id and adj.account_id = a.id
) ledger_adj on true
left join lateral (
  select
    coalesce(sum(case when tr.to_account_id = a.id then tr.amount else 0 end), 0)::bigint as transfers_in,
    coalesce(sum(case when tr.from_account_id = a.id then tr.amount else 0 end), 0)::bigint as transfers_out
  from public.transfers tr
  where tr.user_id = a.user_id and tr.deleted_at is null
    and (tr.from_account_id = a.id or tr.to_account_id = a.id)
) ledger_transfer on true
cross join lateral (
  select ledger_tx.income, ledger_tx.expense, ledger_adj.adjustment,
    ledger_transfer.transfers_in, ledger_transfer.transfers_out
) ledger;

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.account_balance_adjustments enable row level security;
alter table public.transfers enable row level security;
alter table public.transactions enable row level security;

revoke all on public.profiles, public.accounts, public.categories,
  public.account_balance_adjustments, public.transfers, public.transactions
  from anon, authenticated;
revoke all on public.wallet_balances from anon, authenticated;

grant select on public.profiles to authenticated;
grant select, insert on public.accounts to authenticated;
grant update (name) on public.accounts to authenticated;
grant select on public.categories to authenticated;
grant select on public.account_balance_adjustments to authenticated;
grant select on public.transfers to authenticated;
grant select, insert, update on public.transactions to authenticated;
grant select on public.wallet_balances to authenticated;

create policy "profiles_select_own" on public.profiles
for select to authenticated using (id = (select auth.uid()));

create policy "accounts_select_own" on public.accounts
for select to authenticated using (user_id = (select auth.uid()));
create policy "accounts_insert_own" on public.accounts
for insert to authenticated with check (user_id = (select auth.uid()));
create policy "accounts_update_own" on public.accounts
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "categories_select_own" on public.categories
for select to authenticated using (user_id = (select auth.uid()));

create policy "adjustments_select_own" on public.account_balance_adjustments
for select to authenticated using (user_id = (select auth.uid()));

create policy "transfers_select_own" on public.transfers
for select to authenticated using (user_id = (select auth.uid()));

create policy "transactions_select_own" on public.transactions
for select to authenticated using (user_id = (select auth.uid()));
create policy "transactions_insert_regular_own" on public.transactions
for insert to authenticated with check (
  user_id = (select auth.uid()) and transfer_id is null
);
create policy "transactions_update_regular_own" on public.transactions
for update to authenticated using (
  user_id = (select auth.uid()) and transfer_id is null
) with check (
  user_id = (select auth.uid()) and transfer_id is null
);

revoke all on function public.complete_onboarding(date, jsonb) from public, anon;
revoke all on function public.record_opening_balance_change(uuid, bigint) from public, anon;
revoke all on function public.create_transfer(uuid, uuid, bigint, bigint, date) from public, anon;
revoke all on function public.update_transfer(uuid, uuid, uuid, bigint, bigint, date) from public, anon;
revoke all on function public.soft_delete_transfer(uuid) from public, anon;
revoke all on function public.restore_transfer(uuid) from public, anon;
grant execute on function public.complete_onboarding(date, jsonb) to authenticated;
grant execute on function public.record_opening_balance_change(uuid, bigint) to authenticated;
grant execute on function public.create_transfer(uuid, uuid, bigint, bigint, date) to authenticated;
grant execute on function public.update_transfer(uuid, uuid, uuid, bigint, bigint, date) to authenticated;
grant execute on function public.soft_delete_transfer(uuid) to authenticated;
grant execute on function public.restore_transfer(uuid) to authenticated;
