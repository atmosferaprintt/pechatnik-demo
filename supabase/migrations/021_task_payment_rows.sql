-- 021: оплаты по задаче — построчно (просьба Кристи 2026-08-03: «можно чтобы в карточке
-- расписывались оплаты, что куда было записано из предоплаты» — вместо «+ N оплат»).
-- Расширение 018: та же выборка невидимых вызывающему доходных операций (окно зеркалит
-- tx_employee_read из 016, у владельца пусто — он видит всё сам), но вместо итога по задаче —
-- каждая строка: дата, сумма, способ (включая deposit = из предоплаты), банк, кто записал.
-- Решение Кристи отменяет прежнее «чужие оплаты — счётчиком без деталей» (2026-07-17):
-- в карточке задачи оплаты теперь видны построчно всем. При изменении окна в 016 менять и здесь.
create or replace function task_payment_rows()
returns table(task_id bigint, op_date date, amount numeric, payment_method text, bank text, who text)
language sql stable security definer set search_path = public as $$
  select tx.task_id, tx.op_date, tx.amount, tx.payment_method, b.name, p.name
  from transactions tx
  left join banks b on b.id = tx.bank_id
  left join profiles p on p.id = tx.created_by
  where tx.type = 'income' and tx.task_id is not null
    and not is_owner()
    and tx.op_date < current_date - 6
  order by tx.op_date
$$;

revoke all on function task_payment_rows() from public;
grant execute on function task_payment_rows() to authenticated;
