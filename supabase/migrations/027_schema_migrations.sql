-- 027: журнал накатанных миграций (2026-11-01).
--
-- Что было: деплой 2026-10-31 выложил код коммита 6ce301e, а его миграцию 025 на прод не накатили.
-- 01.11 с 9:51 до 10:36 не записывалась ни одна операция в Финансах («нет колонки client_op_id»).
--
-- Теперь scripts/deploy.sh сверяет файлы supabase/migrations/ с этим журналом. Недостающие он
-- накатывает по порядку, каждую в своей транзакции вместе с записью в журнал, и только потом
-- выкладывает фронт. Упала миграция — деплой останавливается, сайт остаётся прежним.
--
-- Таблица служебная: RLS включён без политик, права у anon/authenticated отозваны —
-- через API её не видно, читает и пишет только postgres.

create table if not exists schema_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);
alter table schema_migrations enable row level security;
revoke all on schema_migrations from anon, authenticated;

-- 001–026 уже на проде (проверено 2026-11-01), 027 — эта самая
insert into schema_migrations (name) values
  ('001_init.sql'),
  ('002_rls.sql'),
  ('003_seed.sql'),
  ('004_admin_users.sql'),
  ('005_stages_and_task_rights.sql'),
  ('006_batch_fixes.sql'),
  ('007_tasks_open_edit.sql'),
  ('008_tx_edit_history.sql'),
  ('009_task_sort_order.sql'),
  ('010_tx_audit.sql'),
  ('011_shift_cash_taken.sql'),
  ('012_remove_production_stage.sql'),
  ('013_notes.sql'),
  ('014_notes_sort_order.sql'),
  ('015_contractor_paid.sql'),
  ('016_employee_week_view.sql'),
  ('017_closure_recalc.sql'),
  ('018_task_paid_hidden.sql'),
  ('019_closure_carry.sql'),
  ('020_closure_cancel.sql'),
  ('021_task_payment_rows.sql'),
  ('022_contractor_stage_time.sql'),
  ('023_task_refunds.sql'),
  ('024_task_debt_write_off.sql'),
  ('025_tx_idempotency.sql'),
  ('026_deposit_topups.sql'),
  ('027_schema_migrations.sql')
on conflict do nothing;
