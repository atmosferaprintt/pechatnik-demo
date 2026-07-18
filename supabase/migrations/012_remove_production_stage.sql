-- 012_remove_production_stage.sql (2026-07-18)
-- Кристи: этапов три — Новая → В работе → Готово. «Производство» убираем,
-- задачи из него переезжают «В работе». Записи истории «→ этап: Производство» не трогаем.
alter table tasks drop constraint if exists tasks_stage_check;
update tasks set stage = 'В работе' where stage = 'Производство';
alter table tasks add constraint tasks_stage_check check (stage in ('Новая', 'В работе', 'Готово'));
