-- 026: поступления в депозит отдельными строками (просьба Кристи 2026-10-31).
--
-- Что было: «+ Пополнить» молча прибавляло сумму к deposits.total — ни даты, ни строки в карточке,
-- ошибку не исправить. Сумму при заведении тоже нельзя было поправить, и Кристи удаляла депозит
-- целиком, чтобы завести заново с новой суммой.
--
-- Теперь каждое поступление — строка (дата, сумма, комментарий, кто записал), её можно исправить
-- или удалить, как списание. «Внесено всего» = deposits.total + сумма поступлений.
-- deposits.total остаётся «внесено при заведении» — старые пополнения уже сидят внутри него,
-- переносить их не нужно.
--
-- В Финансы, кассу и сверку поступления НЕ попадают (решение Кристи 2026-10-31):
-- деньги от бюджетника записываются в Финансах отдельно, как и раньше.

create table if not exists deposit_topups (
  id bigint generated always as identity primary key,
  deposit_id bigint not null references deposits(id) on delete cascade,
  topup_date date not null default current_date,
  amount numeric(12,2) not null check (amount > 0),
  comment text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists deposit_topups_deposit_idx on deposit_topups (deposit_id);

comment on column deposits.total is 'внесено при заведении (и пополнения до 026); новые поступления — в deposit_topups';

-- Права как у deposits / deposit_uses (002): читают и пишут все вошедшие,
-- кто какую строку правит — решает интерфейс (автор свою, Кристи любую)
alter table deposit_topups enable row level security;
create policy deposit_topups_rw on deposit_topups for all to authenticated using (true) with check (true);

-- Живые обновления: если публикация realtime перечисляет таблицы поштучно — добавляем новую
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime' and not puballtables)
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'deposit_topups') then
    alter publication supabase_realtime add table deposit_topups;
  end if;
end $$;
