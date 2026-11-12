-- 028_realtime_all_tables.sql — живые обновления для всех таблиц CRM (2026-11-12)
--
-- Публикация supabase_realtime перечисляет таблицы поштучно (не «for all tables»). На старом сервере Beget
-- таблицы в неё добавляли руками и в миграциях этого не было. Поэтому на новом сервере (136.234.75.50)
-- после 001–027 в ней оказалась только deposit_topups (из 026), и CRM перестала бы обновляться сама.
-- Здесь — все таблицы public, кроме служебного журнала schema_migrations.
-- Что видит пользователь, по-прежнему решает RLS: realtime отдаёт только строки, доступные ему по select.
-- Новые таблицы, как и раньше, добавлять в публикацию в своей миграции (образец — 026).

do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime' and not puballtables) then
    return;
  end if;
  foreach t in array array[
    'app_settings', 'bank_statements', 'banks', 'categories', 'clients', 'contractor_tasks', 'contractors',
    'day_closures', 'deposit_topups', 'deposit_uses', 'deposits', 'manual_debt_entries', 'manual_debts',
    'notes', 'profiles', 'supply_items', 'task_log', 'tasks', 'transaction_log', 'transactions'
  ] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
