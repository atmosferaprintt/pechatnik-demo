-- 014_notes_sort_order.sql (2026-07-19)
-- Перетаскивание заметок «по смыслу», как карточки задач (просьба Кристи).
-- NULL = по порядку создания; при броске пишется середина между соседями.
alter table notes add column if not exists sort_order double precision;
