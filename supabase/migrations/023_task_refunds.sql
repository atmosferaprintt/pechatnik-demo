-- 023: возврат клиенту привязывается к задаче (случай Кристи 2026-08-13: заказ «кепки» 14 000 ₽,
-- клиент внёс 7 000 ₽ и отказался — вернули ему все 7 000 наличными).
-- Раньше возврат был обычным расходом без связи с задачей: по задаче так и висел долг 7 000,
-- она уезжала в «Долги», и закрыть её с нулём было нечем.
--
-- Два изменения:
--  1) tasks.cancelled — «Отказ клиента»: заказ отменён, к оплате 0, задача закрывается
--     с нулевым балансом и в «Долги» не падает. Сумму заказа при этом НЕ трогаем
--     (решение Кристи 2026-08-13: «сумму заказа оставляем прежней») — она остаётся
--     в истории как то, от чего клиент отказался;
--  2) task_payment_rows отдаёт ещё и возвраты — иначе через неделю возврат выпадал бы
--     из RLS-окна сотрудницы (016) и долг по задаче у неё «возвращался», ровно как это
--     было с оплатами до 018/021.
--
-- Возвратом считается ЛЮБОЙ расход с task_id: других расходов к задаче не привязывают
-- (закупка под заказ живёт в contractor_tasks). Категория «Возврат» нужна только интерфейсу —
-- по ней он решает, показывать ли в форме расхода селектор задачи.
-- Оплачено по задаче = приходы − возвраты (считает клиент, src/taskMoney.js).

alter table tasks add column if not exists cancelled boolean not null default false;

-- Сигнатура функции меняется (добавилась колонка tx_type) — create or replace её не переживёт
drop function if exists task_payment_rows();
create function task_payment_rows()
returns table(task_id bigint, tx_type text, op_date date, amount numeric, payment_method text, bank text, who text)
language sql stable security definer set search_path = public as $$
  select tx.task_id, tx.type, tx.op_date, tx.amount, tx.payment_method, b.name, p.name
  from transactions tx
  left join banks b on b.id = tx.bank_id
  left join profiles p on p.id = tx.created_by
  where tx.task_id is not null
    and not is_owner()
    and tx.op_date < current_date - 6
    -- расходы — только операционные (expense_shared), как в tx_employee_read (016):
    -- приватные и личные категории Кристи наружу не отдаём даже привязанными к задаче
    and (tx.type = 'income'
         or exists (select 1 from categories c where c.id = tx.category_id and c.kind = 'expense_shared'))
  order by tx.op_date
$$;

revoke all on function task_payment_rows() from public;
grant execute on function task_payment_rows() to authenticated;
