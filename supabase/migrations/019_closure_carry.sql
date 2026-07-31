-- 019: касса «не сходится» при закрытии смены наутро (жалоба 2026-07-31, смена 30.07:
-- CRM показала +2029 вместо честной недостачи ~2001). Перенос «утро» берётся из последнего
-- закрытия ДО дня смены, но сотрудницы видят day_closures только за сегодня+вчера (002) —
-- при закрытии вчерашней смены сегодня позавчерашнее закрытие уже невидимо, перенос = 0.
--
-- Функция отдаёт по каждому закрытию только дату и переходящий остаток (cash_fact − cash_taken) —
-- без расчётов, факта и расхождений прошлых дней. «Должно быть в кассе» — разрешённый
-- сотрудницам агрегат (решение Кристи 2026-07-17). Работает на любую глубину истории.
create or replace function closure_carry()
returns table(close_date date, carry numeric)
language sql stable security definer set search_path = public as $$
  select dc.close_date, dc.cash_fact - dc.cash_taken as carry
  from day_closures dc
$$;

revoke all on function closure_carry() from public;
grant execute on function closure_carry() to authenticated;
