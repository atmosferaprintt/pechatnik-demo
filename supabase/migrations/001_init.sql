-- 001_init.sql — боевая схема CRM «ПЕЧАТНИК» (переписана 2026-07-16 под утверждённое демо)
-- Применять на self-hosted Supabase. Далее: 002_rls.sql (политики), 003_seed.sql (справочники).
--
-- Ключевые решения (история — в CLAUDE.md):
--   канбан задач ПО ЛЮДЯМ (assignee = имя), без этапов и без «Сборки»
--   завершение задачи: tasks.done; долг = amount - оплаты; долги/завершённые — фильтры
--   расходы: shared (операционка девочек) / work (крупные, вне дня) / personal (личные Кристи)
--   оплата с депозита: transactions.payment_method='deposit', в доходы дня и сверку не входит
--   разбивка оплаты на статьи: несколько transactions с одним batch_id
--   смены закрывают сотрудницы: day_closures
--   доступ сотрудниц: операционка за сегодня+вчера, перенос вчерашних доходов на сегодня

-- ---------- Пользователи ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null unique,          -- имя = колонка задачника
  login text not null unique,         -- вход: login + пароль (auth-почта = login@crm.local)
  role text not null default 'employee' check (role in ('owner', 'employee')),
  sort int not null default 0,        -- порядок колонок в задачах (Кристи — последняя)
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Клиенты ----------
create table if not exists clients (
  id bigint generated always as identity primary key,
  name text not null,
  phone text,
  phone_norm text,                    -- 10 цифр для поиска/дедупа
  instagram text,
  note text,
  prices jsonb not null default '[]', -- индивидуальные цены: [{what, price}]
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists clients_phone_norm_idx on clients (phone_norm);

-- ---------- Контрагенты (подрядчики) ----------
create table if not exists contractors (
  id bigint generated always as identity primary key,
  name text not null,
  service text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Задачи (канбан по людям) ----------
create table if not exists tasks (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  assignee text not null,             -- у кого сейчас (profiles.name); колонка канбана
  done boolean not null default false,
  client_id bigint references clients(id) on delete set null,
  contractor_id bigint references contractors(id) on delete set null,
  amount numeric(12,2),
  parts jsonb not null default '[]',  -- состав заказа: [{name, amount}]
  deadline date,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_assignee_idx on tasks (assignee) where not done;

-- История действий и передач по задаче (бейджи: приняла / подготовила / → передала …)
create table if not exists task_log (
  id bigint generated always as identity primary key,
  task_id bigint not null references tasks(id) on delete cascade,
  who text not null,
  action text not null,
  created_at timestamptz not null default now()
);
create index if not exists task_log_task_idx on task_log (task_id);

-- ---------- Задачи контрагентам (отдельный канбан) ----------
create table if not exists contractor_tasks (
  id bigint generated always as identity primary key,
  title text not null,
  contractor_id bigint not null references contractors(id) on delete cascade,
  stage text not null default 'Новая' check (stage in ('Новая', 'Отдано', 'Готово', 'Забрали')),
  amount numeric(12,2),
  deadline date,
  task_id bigint references tasks(id) on delete set null,  -- связь с клиентской задачей
  comment text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- Категории операций ----------
create table if not exists categories (
  id bigint generated always as identity primary key,
  name text not null,
  kind text not null check (kind in (
    'income',            -- доход
    'expense_shared',    -- расход операционный (вносят и видят сотрудницы; участвует в дне/кассе)
    'expense_work',      -- крупный рабочий (только владелец; вне дня, в месяце)
    'expense_personal'   -- личный владельца (только владелец; вне бизнеса)
  )),
  sort int not null default 0,
  is_active boolean not null default true
);

-- ---------- Банки/карты для переводов ----------
create table if not exists banks (
  id bigint generated always as identity primary key,
  name text not null,
  is_active boolean not null default true,
  sort int not null default 0
);

-- ---------- Операции ----------
create table if not exists transactions (
  id bigint generated always as identity primary key,
  op_date date not null default current_date,
  type text not null check (type in ('income', 'expense')),
  category_id bigint references categories(id),         -- null допустим только для оплат с депозита
  amount numeric(12,2) not null check (amount > 0),
  payment_method text check (payment_method in ('cash', 'sbp', 'card', 'bank', 'transfer', 'deposit')),
  bank_id bigint references banks(id),                  -- для переводов: на какую карту
  batch_id uuid,                                        -- разбивка одной оплаты на статьи: общий чек
  client_id bigint references clients(id) on delete set null,
  task_id bigint references tasks(id) on delete set null,
  deposit_id bigint,                                    -- fk добавляется ниже, после deposits
  moved_from date,                                      -- перенесена со вчера (кнопка «↪ на сегодня»)
  comment text,
  is_verified boolean not null default false,           -- отметка сверки владельцем
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  constraint deposit_needs_no_category check (payment_method <> 'deposit' or category_id is null)
);
create index if not exists transactions_op_date_idx on transactions (op_date);
create index if not exists transactions_task_idx on transactions (task_id);

-- ---------- Депозиты (бюджетники) ----------
create table if not exists deposits (
  id bigint generated always as identity primary key,
  name text not null,
  total numeric(12,2) not null default 0,   -- внесено всего (пополнения прибавляются)
  client_id bigint references clients(id) on delete set null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists deposit_uses (
  id bigint generated always as identity primary key,
  deposit_id bigint not null references deposits(id) on delete cascade,
  use_date date not null default current_date,
  what text not null,
  amount numeric(12,2) not null check (amount > 0),
  task_id bigint references tasks(id) on delete set null,
  created_by uuid references profiles(id)
);

alter table transactions
  add constraint transactions_deposit_fk foreign key (deposit_id) references deposits(id) on delete set null;

-- ---------- Ручные должники («по мелочи») ----------
create table if not exists manual_debts (
  id bigint generated always as identity primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists manual_debt_entries (
  id bigint generated always as identity primary key,
  debt_id bigint not null references manual_debts(id) on delete cascade,
  entry_date date not null default current_date,
  what text,
  amount numeric(12,2) not null,      -- минус = взяла, плюс = оплатила
  created_by uuid references profiles(id)
);

-- ---------- Поставка (список закупок без остатков) ----------
create table if not exists supply_items (
  id bigint generated always as identity primary key,
  text text not null,
  bought boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- Выписка расчётного счёта (API банка, для сверки) ----------
create table if not exists bank_statements (
  id bigint generated always as identity primary key,
  stmt_date date not null,
  amount numeric(12,2) not null,
  description text,
  source text,
  external_id text unique,
  matched_transaction_id bigint references transactions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists bank_statements_date_idx on bank_statements (stmt_date);

-- ---------- Закрытия смен и дней ----------
create table if not exists day_closures (
  id bigint generated always as identity primary key,
  close_date date not null unique,
  cash_calc numeric(12,2),            -- наличных расчётно (операционка)
  cash_fact numeric(12,2),            -- фактический остаток в кассе
  diff numeric(12,2),                 -- разница ±
  bank_received numeric(12,2),        -- владелец: пришло на счёт (пока вручную, потом из выписки)
  note text,
  closed_by uuid references profiles(id),
  closed_at timestamptz not null default now()
);

-- ---------- Служебное ----------
create table if not exists app_settings (
  key text primary key,
  value jsonb
);
