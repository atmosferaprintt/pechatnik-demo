-- 007_tasks_open_edit.sql (2026-07-17)
-- Решение Кристи: редактировать задачи могут ВСЕ («чтоб все могли» — помечать остатки
-- по заказам друг друга и т.д.). Страховка — история task_log: кто что менял.
-- Удаление задач остаётся только у владельца.

drop policy if exists tasks_update on tasks;
create policy tasks_update on tasks for update to authenticated using (true) with check (true);

drop policy if exists task_log_insert on task_log;
create policy task_log_insert on task_log for insert to authenticated with check (true);
