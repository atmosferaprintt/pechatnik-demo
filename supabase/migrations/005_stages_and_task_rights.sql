-- 005_stages_and_task_rights.sql (2026-07-16)
-- Возврат канбана по этапам (просьба Кристи) + права на задачи:
-- редактировать можно ТОЛЬКО свои задачи (assignee = я), чужие — только просмотр. Владелец — всё.

alter table tasks add column if not exists stage text not null default 'Новая'
  check (stage in ('Новая', 'В работе', 'Производство', 'Готово'));

-- Пересобираем политику задач: раньше было общее rw
drop policy if exists tasks_rw on tasks;

create policy tasks_select on tasks for select to authenticated using (true);
create policy tasks_insert on tasks for insert to authenticated with check (true); -- создать можно и себе, и коллеге
create policy tasks_update on tasks for update to authenticated
  using (is_owner() or assignee = my_name())
  with check (true); -- передача: своя задача уходит другому (assignee меняется)
create policy tasks_delete on tasks for delete to authenticated using (is_owner());

-- История: писать может владелец задачи (и Кристи), читать все
drop policy if exists task_log_rw on task_log;
create policy task_log_select on task_log for select to authenticated using (true);
create policy task_log_insert on task_log for insert to authenticated
  with check (is_owner() or exists (select 1 from tasks t where t.id = task_id and t.assignee = my_name()));
