-- 016: сотрудницы видят операционку за последние 7 дней (просьба Кристи 2026-07-21
-- «настройка чтобы неделю видели свои оплаты»). Была неточность ожиданий: раньше
-- политика давала только сегодня+вчера. Правка/вставка/переносы НЕ расширяются —
-- tx_employee_insert и tx_employee_edit (008) остаются про сегодня/вчера.
drop policy if exists tx_employee_read on transactions;
create policy tx_employee_read on transactions for select to authenticated
  using (
    not is_owner()
    and op_date between current_date - 6 and current_date
    and (
      category_id is null  -- оплаты с депозита
      or exists (select 1 from categories c where c.id = category_id and c.kind in ('income', 'expense_shared'))
    )
  );
