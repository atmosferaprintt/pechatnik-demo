-- 010_tx_audit.sql (2026-07-17)
-- Полный журнал изменений кассы для Кристи: правки уже пишутся (008),
-- добавляем неубиваемую историю удалений и закрываем журнал от лишних глаз.

-- 1. История переживает удаление операции: cascade → set null
alter table transaction_log alter column transaction_id drop not null;
alter table transaction_log drop constraint transaction_log_transaction_id_fkey;
alter table transaction_log add constraint transaction_log_transaction_id_fkey
  foreign key (transaction_id) references transactions(id) on delete set null;

-- 2. Удаление логируется САМОЙ БАЗОЙ (триггер): не обойти прямым API-запросом.
--    В журнал падает снимок операции — что удалили, кто внёс, кто удалил.
create or replace function log_tx_delete() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_who text; v_cat text; v_bank text; v_author text; v_method text; v_amount text;
begin
  select name into v_who from profiles where id = auth.uid();
  select name into v_cat from categories where id = old.category_id;
  select name into v_bank from banks where id = old.bank_id;
  select name into v_author from profiles where id = old.created_by;
  v_method := case old.payment_method
    when 'cash' then 'Наличные' when 'sbp' then 'СБП' when 'card' then 'Карта'
    when 'bank' then 'Безнал' when 'transfer' then 'Перевод' when 'deposit' then 'Депозит'
    else old.payment_method end;
  v_amount := rtrim(rtrim(to_char(old.amount, 'FM99999999990.99'), '0'), '.');
  insert into transaction_log (transaction_id, who, action) values (old.id, coalesce(v_who, 'система'),
    'удалила: ' || case when old.type = 'income' then 'приход' else 'расход' end
    || ' ' || v_amount || ' ₽'
    || ' · ' || coalesce(v_cat, 'Оплата с депозита')
    || ' · ' || v_method || coalesce(' (' || v_bank || ')', '')
    || ' · за ' || to_char(old.op_date, 'DD.MM')
    || ' · внесла ' || coalesce(v_author, '—')
    || coalesce(' · «' || nullif(old.comment, '') || '»', ''));
  return old;
end $$;

drop trigger if exists tx_delete_log on transactions;
create trigger tx_delete_log before delete on transactions
  for each row execute function log_tx_delete();

-- 3. Журнал читает владелец (весь) и сотрудница (только свои записи в нём) —
--    раньше select был открыт всем: чужие суммы доставались прямым API-запросом
drop policy if exists txlog_select on transaction_log;
create policy txlog_select on transaction_log for select to authenticated
  using (is_owner() or who = (select name from profiles where id = auth.uid()));
