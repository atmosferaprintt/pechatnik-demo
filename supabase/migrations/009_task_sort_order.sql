-- 009_task_sort_order.sql (2026-07-17)
-- Очередь карточек в колонке канбана (drag-and-drop): sort_order, NULL = по id.
alter table tasks add column if not exists sort_order double precision;
grant update (op_date, moved_from, amount, comment, category_id, payment_method, bank_id, task_id, client_id, is_verified)
  on transactions to authenticated;
grant update (title, description, assignee, done, client_id, contractor_id, amount, parts, deadline, stage, sort_order, updated_at)
  on tasks to authenticated;
