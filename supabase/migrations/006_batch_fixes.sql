-- 006_batch_fixes.sql (2026-07-16, вечерняя пачка правок Кристи)
-- 1) app_settings читают все (там настраиваемые кнопки «мелочь одним тапом»), пишет владелец
-- 2) сотрудница может удалить СВОЮ СЕГОДНЯШНЮЮ операцию (ошиблась — удалила и внесла заново)
-- 3) канбан подрядчиков: два этапа — «В работе» и «Готово»

drop policy if exists settings_owner on app_settings;
create policy settings_read on app_settings for select to authenticated using (true);
create policy settings_write on app_settings for insert to authenticated with check (is_owner());
create policy settings_update on app_settings for update to authenticated using (is_owner()) with check (is_owner());
create policy settings_delete on app_settings for delete to authenticated using (is_owner());

create policy tx_employee_delete on transactions for delete to authenticated
  using (not is_owner() and created_by = auth.uid() and op_date = current_date);

alter table contractor_tasks drop constraint if exists contractor_tasks_stage_check;
update contractor_tasks set stage = 'В работе' where stage in ('Новая', 'Отдано');
update contractor_tasks set stage = 'Готово' where stage = 'Забрали';
alter table contractor_tasks add constraint contractor_tasks_stage_check check (stage in ('В работе', 'Готово'));
alter table contractor_tasks alter column stage set default 'В работе';

-- Кнопки мелочи: пустой список, Кристи задаст свои в Настройках
insert into app_settings (key, value) values ('quick_ops', '[]') on conflict (key) do nothing;
