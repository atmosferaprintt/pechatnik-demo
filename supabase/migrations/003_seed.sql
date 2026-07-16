-- 003_seed.sql — стартовые справочники CRM «ПЕЧАТНИК» (2026-07-16)
-- Категории — из Excel и тетради Кристи. Перед запуском показать ей список на подтверждение.

-- Доходы (порядок = порядок в её тетради)
insert into categories (name, kind, sort) values
  ('Ксерокс',            'income', 1),
  ('Ламинация',          'income', 2),
  ('ДТФ / УФ ДТФ',       'income', 3),
  ('Фото на документы',  'income', 4),
  ('Фотопечать',         'income', 5),
  ('Полиграфия',         'income', 6),
  ('Сувениры',           'income', 7),
  ('Товар',              'income', 8),
  ('Реклама',            'income', 9),
  ('Контурная резка',    'income', 10),
  ('Широкоформатка',     'income', 11),
  ('Ленты, бирки',       'income', 12),
  ('Другое (доход)',     'income', 13);

-- Операционные расходы — вносят и видят сотрудницы, участвуют в дне и кассе
insert into categories (name, kind, sort) values
  ('Доставка', 'expense_shared', 1),
  ('Возврат',  'expense_shared', 2),
  ('Другое',   'expense_shared', 3);

-- Крупные рабочие — только владелец, вне дня, учитываются в месяце
insert into categories (name, kind, sort) values
  ('Налоги',            'expense_work', 1),
  ('Коммуналка',        'expense_work', 2),
  ('Сборка (подрядчики)','expense_work', 3),
  ('Широкоформатка (закуп)', 'expense_work', 4),
  ('Сувенирка / фото (закуп)','expense_work', 5),
  ('Континент / Зенон', 'expense_work', 6),
  ('Бумага / ламинация','expense_work', 7),
  ('Тонер',             'expense_work', 8),
  ('Ленты (закуп)',     'expense_work', 9),
  ('Зарплата',          'expense_work', 10),
  ('Прочее (крупное)',  'expense_work', 11);

-- Личные Кристи — только владелец, вне бизнеса
insert into categories (name, kind, sort) values
  ('Еда / аптека / бензин', 'expense_personal', 1),
  ('Кафе / отдых',          'expense_personal', 2),
  ('Мои радости',           'expense_personal', 3),
  ('Образование',           'expense_personal', 4),
  ('Красота / здоровье',    'expense_personal', 5),
  ('Подарки',               'expense_personal', 6),
  ('Связь / подписки',      'expense_personal', 7);

-- Карты для переводов (из тетради: Альфа, Т-Банк, ВТБ, ОТП, Сбер) — сверить с Кристи
insert into banks (name, sort) values
  ('Сбер', 1), ('Т-Банк', 2), ('Альфа', 3), ('ВТБ', 4), ('ОТП', 5);

-- ПОЛЬЗОВАТЕЛИ здесь не сидятся: аккаунты создаются через Supabase Auth Admin
-- (почта = login@crm.local), после чего строка profiles появляется триггером или руками:
--   insert into profiles (id, name, login, role, sort) values ('<uuid из auth.users>', 'Алена', 'alena', 'employee', 1);
-- Порядок sort: Алена 1, Настя 2, Влада 3, Марьян 4, Людмила 5, Кристи 99 (owner, всегда последняя колонка).
