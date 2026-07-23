-- 017: пересчёт разницы уже закрытой смены (просьба Кристи 2026-07-23:
-- «наличку внесла 1800, но разница не ушла» — довнесла операцию задним числом,
-- а cash_calc/diff в day_closures заморожены с момента закрытия).
-- Владелец и так может всё (dc_owner); сотрудницам разрешаем UPDATE смен за сегодня/вчера —
-- кнопка «пересчитать разницу» шлёт только cash_calc и diff.
create policy dc_employee_recalc on day_closures for update to authenticated
  using (not is_owner() and close_date between current_date - 1 and current_date)
  with check (not is_owner() and close_date between current_date - 1 and current_date);
