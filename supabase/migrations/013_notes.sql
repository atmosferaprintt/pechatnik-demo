-- 013_notes.sql (2026-07-19)
-- «Заметки» — рабочие шпаргалки команды (идея Кристи): настройки фольгирования,
-- полосы на плашках, размеры/вылеты. Читают и пишут все, удаляет владелец.
create table if not exists notes (
  id bigint generated always as identity primary key,
  title text not null,
  body text not null default '',
  pinned boolean not null default false,
  created_by uuid references profiles(id),
  updated_by text,          -- имя последнего редактора (для «кто обновил»)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table notes enable row level security;
create policy notes_select on notes for select to authenticated using (true);
create policy notes_insert on notes for insert to authenticated with check (true);
create policy notes_update on notes for update to authenticated using (true) with check (true);
create policy notes_delete on notes for delete to authenticated using (is_owner());
