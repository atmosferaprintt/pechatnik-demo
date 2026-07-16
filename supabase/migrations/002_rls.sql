-- 002_rls.sql — политики доступа CRM «ПЕЧАТНИК» (2026-07-16)
-- Главное отличие от PrintCRM: права проверяются НЕ только в интерфейсе, но и в БД.
-- Сотрудница даже прямым запросом к API не достанет: итоги по месяцу, приватные категории
-- и расходы Кристи, банковскую выписку, операции старше вчерашнего дня.
--
-- Модель доступа (утверждена по просьбам Кристи 14–16.07.2026):
--   сотрудница: операционка за сегодня и вчера (видит все записи этих дней, не только свои),
--               запись операций, закрытие смены, перенос вчерашних доходов на сегодня
--   владелец (Кристи): всё

-- Хелпер: роль текущего пользователя (security definer, чтобы не упереться в RLS profiles)
create or replace function is_owner() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'owner' and is_active) $$;

create or replace function my_name() returns text
language sql stable security definer set search_path = public as
$$ select name from profiles where id = auth.uid() $$;

-- ---------- profiles: имена нужны всем (колонки задачников), правит только владелец ----------
alter table profiles enable row level security;
create policy profiles_read on profiles for select to authenticated using (true);
create policy profiles_write on profiles for all to authenticated using (is_owner()) with check (is_owner());

-- ---------- categories: сотрудницы видят только доходные и операционные ----------
alter table categories enable row level security;
create policy categories_read on categories for select to authenticated
  using (is_owner() or kind in ('income', 'expense_shared'));
create policy categories_write on categories for all to authenticated using (is_owner()) with check (is_owner());

-- ---------- banks: читают все (нужны в форме перевода), правит владелец ----------
alter table banks enable row level security;
create policy banks_read on banks for select to authenticated using (true);
create policy banks_write on banks for all to authenticated using (is_owner()) with check (is_owner());

-- ---------- transactions ----------
alter table transactions enable row level security;

-- владелец видит и правит всё
create policy tx_owner on transactions for all to authenticated using (is_owner()) with check (is_owner());

-- сотрудница ЧИТАЕТ операционку за сегодня и вчера (для ленты дня и закрытия смены):
-- без личных/крупных категорий владельца
create policy tx_employee_read on transactions for select to authenticated
  using (
    not is_owner()
    and op_date between current_date - 1 and current_date
    and (
      category_id is null  -- оплаты с депозита
      or exists (select 1 from categories c where c.id = category_id and c.kind in ('income', 'expense_shared'))
    )
  );

-- сотрудница ЗАПИСЫВАЕТ доход/операционный расход только сегодняшним днём и от своего имени
create policy tx_employee_insert on transactions for insert to authenticated
  with check (
    not is_owner()
    and created_by = auth.uid()
    and op_date = current_date
    and (
      (type = 'income')
      or (type = 'expense' and exists (select 1 from categories c where c.id = category_id and c.kind = 'expense_shared'))
    )
  );

-- сотрудница ПЕРЕНОСИТ вчерашний доход на сегодня (только это изменение)
create policy tx_employee_move on transactions for update to authenticated
  using (not is_owner() and type = 'income' and op_date = current_date - 1)
  with check (not is_owner() and type = 'income' and op_date = current_date and moved_from = current_date - 1);

-- страховка от изменения других колонок при переносе: сотруднице доступны только op_date и moved_from
revoke update on transactions from authenticated;
grant update (op_date, moved_from) on transactions to authenticated;

-- ---------- day_closures: смену закрывает любая, читают сегодня+вчера; владелец — всё ----------
alter table day_closures enable row level security;
create policy dc_owner on day_closures for all to authenticated using (is_owner()) with check (is_owner());
create policy dc_employee_read on day_closures for select to authenticated
  using (not is_owner() and close_date between current_date - 1 and current_date);
create policy dc_employee_insert on day_closures for insert to authenticated
  with check (not is_owner() and closed_by = auth.uid() and close_date between current_date - 1 and current_date);

-- ---------- bank_statements: только владелец ----------
alter table bank_statements enable row level security;
create policy bs_owner on bank_statements for all to authenticated using (is_owner()) with check (is_owner());

-- ---------- app_settings: только владелец ----------
alter table app_settings enable row level security;
create policy settings_owner on app_settings for all to authenticated using (is_owner()) with check (is_owner());

-- ---------- Общие рабочие таблицы: доступны всем авторизованным ----------
-- (задачи, история, клиенты, контрагенты и их задачи, депозиты, должники, поставка)
do $$
declare t text;
begin
  foreach t in array array['tasks','task_log','clients','contractors','contractor_tasks',
                           'deposits','deposit_uses','manual_debts','manual_debt_entries','supply_items']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I_rw on %I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;
