-- 008_tx_edit_history.sql (2026-07-17)
-- Редактирование операций с обязательной историей (просьба Кристи):
--   владелец правит любые операции целиком (дата, категория, сумма, способ, комментарий)
--   сотрудница правит СВОИ операции за сегодня/вчера (в т.ч. переносит сегодня↔вчера)
--   каждая правка пишется в transaction_log: кто и что поменял

create table if not exists transaction_log (
  id bigint generated always as identity primary key,
  transaction_id bigint not null references transactions(id) on delete cascade,
  who text not null,
  action text not null,
  created_at timestamptz not null default now()
);
create index if not exists transaction_log_tx_idx on transaction_log (transaction_id);

alter table transaction_log enable row level security;
create policy txlog_select on transaction_log for select to authenticated using (true);
create policy txlog_insert on transaction_log for insert to authenticated with check (true);

-- Сотрудница: полная правка своих свежих операций (сегодня и вчера) вместо узкого «переноса»
drop policy if exists tx_employee_move on transactions;
create policy tx_employee_edit on transactions for update to authenticated
  using (not is_owner() and created_by = auth.uid() and op_date >= current_date - 1)
  with check (created_by = auth.uid() and op_date >= current_date - 1);

-- Колонки, которые можно править (created_by/batch_id/created_at — нельзя никому)
revoke update on transactions from authenticated;
grant update (op_date, moved_from, amount, comment, category_id, payment_method, bank_id, task_id, client_id, is_verified)
  on transactions to authenticated;
