-- 011_shift_cash_taken.sql (2026-07-17)
-- Кристи при закрытии смены забирает крупную наличку («сдано»).
-- Раньше на утро переходил весь фактический остаток — наличка в кассе «копилась».
-- Теперь: cash_fact = пересчитала по факту, cash_taken = сдано (забрали),
-- на следующий день переходит cash_fact - cash_taken.
alter table day_closures add column if not exists cash_taken numeric(12,2) not null default 0;
