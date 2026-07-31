-- 018: «фантомный долг» у сотрудниц (жалобы 2026-07-31: «оплаты слетают, долг вернулся»).
-- Сотрудницы видят transactions только за последние 7 дней (016), а «оплачено/долг»
-- по задаче считается на клиенте из видимых строк → оплаты старше недели «исчезали»
-- и долг возвращался, хотя в базе всё цело. Решение Кристи 2026-07-17: агрегаты
-- «оплачено/долг по задаче» сотрудницам можно — наружу выходит только итог по задаче,
-- без отдельных сумм, имён и дат.
--
-- Функция отдаёт по задачам сумму и число доходных операций, НЕВИДИМЫХ вызывающему:
-- окно зеркалит tx_employee_read (016), для владельца результат пуст (он видит всё).
-- Клиент прибавляет это к видимым строкам — свежие оплаты обновляются мгновенно,
-- двойного счёта нет. При изменении окна в 016 менять и здесь.
create or replace function task_paid_hidden()
returns table(task_id bigint, paid numeric, cnt integer)
language sql stable security definer set search_path = public as $$
  select tx.task_id, sum(tx.amount) as paid, count(*)::integer as cnt
  from transactions tx
  where tx.type = 'income' and tx.task_id is not null
    and not is_owner()
    and tx.op_date < current_date - 6
  group by tx.task_id
$$;

revoke all on function task_paid_hidden() from public;
grant execute on function task_paid_hidden() to authenticated;
