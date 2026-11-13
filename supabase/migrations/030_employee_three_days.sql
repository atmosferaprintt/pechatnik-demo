-- 030: сотрудница пишет и правит свои записи за последние 3 дня: сегодня, вчера, позавчера
-- (просьба Кристи 2026-11-13, навсегда: «чтобы позавчера и вчера сами записали, а я остальное сама заполню»).
-- Было: записать — только сегодня (002), поправить — сегодня и вчера (008), удалить — только сегодня (006),
-- смена — сегодня и вчера (002, 017, 020). Смотреть по-прежнему можно неделю (016), итоги — только владелец.
-- Условия по категориям и «только свои записи» не меняются, меняется только окно дат.

drop policy if exists tx_employee_insert on transactions;
create policy tx_employee_insert on transactions for insert to authenticated
  with check (
    not is_owner()
    and created_by = auth.uid()
    and op_date between current_date - 2 and current_date
    and (
      (type = 'income')
      or (type = 'expense' and exists (select 1 from categories c where c.id = category_id and c.kind = 'expense_shared'))
    )
  );

drop policy if exists tx_employee_edit on transactions;
create policy tx_employee_edit on transactions for update to authenticated
  using (not is_owner() and created_by = auth.uid() and op_date >= current_date - 2)
  with check (created_by = auth.uid() and op_date >= current_date - 2);

drop policy if exists tx_employee_delete on transactions;
create policy tx_employee_delete on transactions for delete to authenticated
  using (not is_owner() and created_by = auth.uid() and op_date between current_date - 2 and current_date);

drop policy if exists dc_employee_read on day_closures;
create policy dc_employee_read on day_closures for select to authenticated
  using (not is_owner() and close_date between current_date - 2 and current_date);

drop policy if exists dc_employee_insert on day_closures;
create policy dc_employee_insert on day_closures for insert to authenticated
  with check (not is_owner() and closed_by = auth.uid() and close_date between current_date - 2 and current_date);

drop policy if exists dc_employee_recalc on day_closures;
create policy dc_employee_recalc on day_closures for update to authenticated
  using (not is_owner() and close_date between current_date - 2 and current_date)
  with check (not is_owner() and close_date between current_date - 2 and current_date);

drop policy if exists dc_employee_delete on day_closures;
create policy dc_employee_delete on day_closures for delete to authenticated
  using (not is_owner() and close_date between current_date - 2 and current_date);
