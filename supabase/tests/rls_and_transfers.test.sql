begin;

select plan(25);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'pocketly-a@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'pocketly-b@example.test', '', now(), now(), now());

insert into public.accounts (id, user_id, kind, type, name, opening_balance, opening_date)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'asset', 'bank', 'BCA', 1000000, '2026-01-01'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'asset', 'cash', 'Tunai', 50000, '2026-01-01'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'liability', 'loan', 'SPinjam', 0, '2026-01-01'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'liability', 'paylater', 'SPayLater', 0, '2026-01-01'),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'asset', 'bank', 'BCA-B', 500000, '2026-01-01');

select ok((select count(*) >= 13 from public.categories where user_id = '00000000-0000-0000-0000-000000000001'), 'new users receive default categories from a database trigger');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select is((select count(*) from public.accounts), 4::bigint, 'user A reads their own accounts');
select is_empty($$select id from public.accounts where user_id = '00000000-0000-0000-0000-000000000002'$$, 'user A cannot read user B accounts');
select is_empty($$select account_id from public.wallet_balances where user_id = '00000000-0000-0000-0000-000000000002'$$, 'user A cannot read user B balances through the view');
select throws_ok(
  $$insert into public.accounts (user_id, kind, type, name, opening_balance, opening_date) values ('00000000-0000-0000-0000-000000000002', 'asset', 'cash', 'Cross-owner', 0, '2026-01-01')$$,
  '42501', null, 'user A cannot create an account for user B'
);
select lives_ok($$update public.accounts set name = 'Hacked' where user_id = '00000000-0000-0000-0000-000000000002'$$, 'user A cannot change user B account rows');
select throws_ok(
  $$update public.accounts set opening_balance = 1 where id = '10000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'opening balance cannot be changed without an adjustment record'
);

select set_config(
  'pocketly.test_transfer_id',
  public.create_transfer(
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    200000,
    2500,
    '2026-11-01'
  )::text,
  true
);
select is((select balance from public.wallet_balances where account_id = '10000000-0000-0000-0000-000000000001'), 797500::bigint, 'transfer plus fee reduces source by 202500');
select is((select balance from public.wallet_balances where account_id = '10000000-0000-0000-0000-000000000002'), 250000::bigint, 'transfer adds only its nominal amount to destination');

select set_config(
  'pocketly.test_fee_before',
  (select balance::text from public.wallet_balances where account_id = '10000000-0000-0000-0000-000000000001'),
  true
);
select public.update_transfer(
  current_setting('pocketly.test_transfer_id')::uuid,
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  200000,
  3000,
  '2026-11-01'
);
select is(
  current_setting('pocketly.test_fee_before')::bigint -
    (select balance from public.wallet_balances where account_id = '10000000-0000-0000-0000-000000000001'),
  500::bigint,
  'editing fee from 2500 to 3000 changes source balance by exactly 500'
);
select is(
  (select amount from public.transactions where transfer_id = current_setting('pocketly.test_transfer_id')::uuid),
  3000::bigint,
  'transfer fee transaction mirrors the edited fee'
);
select lives_ok(
  format('update public.transactions set amount = 9999 where transfer_id = %L::uuid', current_setting('pocketly.test_transfer_id')),
  'a transfer fee transaction cannot be edited directly'
);
select is(
  (select amount from public.transactions where transfer_id = current_setting('pocketly.test_transfer_id')::uuid),
  3000::bigint,
  'direct fee edit leaves the mirrored amount unchanged'
);
select throws_ok(
  format('delete from public.transactions where transfer_id = %L::uuid', current_setting('pocketly.test_transfer_id')),
  '42501', null, 'a transfer fee transaction cannot be deleted directly'
);

select public.soft_delete_transfer(current_setting('pocketly.test_transfer_id')::uuid);
select is((select balance from public.wallet_balances where account_id = '10000000-0000-0000-0000-000000000001'), 1000000::bigint, 'soft deleting transfer restores source balance');
select is((select balance from public.wallet_balances where account_id = '10000000-0000-0000-0000-000000000002'), 50000::bigint, 'soft deleting transfer restores destination balance');
select public.restore_transfer(current_setting('pocketly.test_transfer_id')::uuid);
select is((select balance from public.wallet_balances where account_id = '10000000-0000-0000-0000-000000000001'), 797000::bigint, 'restoring transfer reapplies nominal amount and fee once');
select is((select balance from public.wallet_balances where account_id = '10000000-0000-0000-0000-000000000002'), 250000::bigint, 'restoring transfer reapplies destination amount');

select set_config(
  'pocketly.net_worth_before',
  (select sum(case when kind = 'asset' then balance else -balance end)::text from public.wallet_balances),
  true
);
select public.create_transfer(
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000001',
  1000000,
  0,
  '2026-11-02'
);
select is((select balance from public.wallet_balances where account_id = '10000000-0000-0000-0000-000000000003'), 1000000::bigint, 'loan disbursement increases the liability balance');
select is(
  (select sum(case when kind = 'asset' then balance else -balance end) from public.wallet_balances),
  current_setting('pocketly.net_worth_before')::numeric,
  'loan disbursement leaves net worth unchanged'
);

select set_config(
  'pocketly.tx_count_before_adjustment',
  (select count(*)::text from public.transactions where user_id = '00000000-0000-0000-0000-000000000001'),
  true
);
select public.record_opening_balance_change('10000000-0000-0000-0000-000000000001', 1100000);
select is((select balance from public.wallet_balances where account_id = '10000000-0000-0000-0000-000000000001'), 1897000::bigint, 'opening balance adjustment changes the calculated balance');
select is(
  (select count(*)::text from public.transactions where user_id = '00000000-0000-0000-0000-000000000001'),
  current_setting('pocketly.tx_count_before_adjustment'),
  'opening balance adjustment creates no income or expense transaction'
);
select is((select count(*) from public.account_balance_adjustments where account_id = '10000000-0000-0000-0000-000000000001' and adjustment_type = 'opening_edit'), 1::bigint, 'opening balance change has an audit record');

select throws_ok(
  $$insert into public.transactions (user_id, type, account_id, category_id, amount, date, source)
    values (
      '00000000-0000-0000-0000-000000000001',
      'income',
      '10000000-0000-0000-0000-000000000004',
      (select id from public.categories where user_id = '00000000-0000-0000-0000-000000000001' and name = 'Gaji' and type = 'income'),
      1000,
      '2026-11-02',
      'web'
    )$$,
  'P0001',
  'Pemasukan hanya dapat dicatat ke akun aset. Untuk pembayaran utang, gunakan Transfer.',
  'income on a liability account is rejected with a transfer instruction'
);

reset role;
select is((select name from public.accounts where id = '20000000-0000-0000-0000-000000000001'), 'BCA-B', 'user B account remains unchanged after user A update attempt');

select * from finish();
rollback;
