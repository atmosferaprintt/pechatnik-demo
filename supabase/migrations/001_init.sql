-- 001_init.sql — стартовая схема CRM «ПЕЧАТНИК» (2026-07-13)
-- Решения от 2026-07-13:
--   этапы канбана: Новая → В работе → Производство → Готово
--   приходы фиксируются в Финансах, менеджер связывает приход с задачей (transactions.task_id)
--   «уход» из Excel = обычный расход, отдельного типа нет
--   категории доходов И расходов добавляются владельцем в настройках
--   сверка: расчётный счёт подгружается через API банка (bank_statements), наличка вручную

-- Пользователи (создаются после регистрации в Supabase Auth)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'employee' check (role in ('owner', 'employee')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Клиенты
create table if not exists clients (
  id bigint generated always as identity primary key,
  name text not null,
  phone text,                -- как ввели
  phone_norm text,           -- нормализованный (10 цифр) для поиска/дедупа
  instagram text,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists clients_phone_norm_idx on clients (phone_norm);

-- Задачи (канбан)
create table if not exists tasks (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  stage text not null default 'Новая',       -- значения из STAGES (уточняются)
  client_id bigint references clients(id) on delete set null,
  amount numeric(12,2),
  deadline date,
  assignee uuid references profiles(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_stage_idx on tasks (stage);

-- Категории операций
create table if not exists categories (
  id bigint generated always as identity primary key,
  name text not null,
  kind text not null check (kind in (
    'income',           -- доход (видно всем при вводе)
    'expense_shared',   -- расход, доступный сотрудникам (доставка, возврат, другое)
    'expense_work',     -- рабочие расходы владельца (приватно)
    'expense_personal'  -- личные расходы владельца (приватно)
  )),
  sort int not null default 0,
  is_active boolean not null default true
);

-- Банки/карты для переводов (4-5 карт разных банков)
create table if not exists banks (
  id bigint generated always as identity primary key,
  name text not null,
  is_active boolean not null default true,
  sort int not null default 0
);

-- Операции (доходы и расходы)
create table if not exists transactions (
  id bigint generated always as identity primary key,
  op_date date not null default current_date,
  type text not null check (type in ('income', 'expense')),
  category_id bigint references categories(id),
  amount numeric(12,2) not null check (amount > 0),
  payment_method text check (payment_method in ('cash', 'sbp', 'card', 'bank', 'transfer')),
  bank_id bigint references banks(id),   -- для переводов: на какую карту
  client_id bigint references clients(id) on delete set null,
  task_id bigint references tasks(id) on delete set null,
  comment text,
  is_verified boolean not null default false,  -- отметка сверки владельцем
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists transactions_op_date_idx on transactions (op_date);
create index if not exists transactions_created_by_idx on transactions (created_by);

-- Строки выписки расчётного счёта (подгружаются через API банка, как в PrintCRM)
-- Основа подсветки «сумма пришла, но не записана»: строка без matched_transaction_id = расхождение
create table if not exists bank_statements (
  id bigint generated always as identity primary key,
  stmt_date date not null,
  amount numeric(12,2) not null,
  description text,
  source text,                      -- банк/API-источник
  external_id text unique,          -- id операции у банка, защита от дублей при повторной загрузке
  matched_transaction_id bigint references transactions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists bank_statements_date_idx on bank_statements (stmt_date);

-- Сверка дня
create table if not exists day_closures (
  id bigint generated always as identity primary key,
  close_date date not null unique,
  bank_received numeric(12,2),   -- пришло на счёт за день (вводит владелец / позже из выписки)
  cash_left numeric(12,2),       -- фактический остаток в кассе
  diff numeric(12,2),            -- рассчитанная разница ±
  note text,
  closed_by uuid references profiles(id),
  closed_at timestamptz not null default now()
);

-- Служебные настройки
create table if not exists app_settings (
  key text primary key,
  value jsonb
);

-- ВАЖНО (решение от 2026-07-13): RLS включаем как минимум на transactions,
-- day_closures и categories — сотрудники не должны видеть чужие операции,
-- итоги и приватные категории даже через прямой запрос к API.
-- Политики добавим отдельной миграцией после утверждения ролей.
