-- 024: «списать долг» по задаче — только у владельца (просьба Кристи 2026-09-07).
--
-- Случай: заказ выдан, оплата фактически была, но её забыли записать (или записали без
-- привязки к задаче). По задаче висит долг, и чтобы его закрыть, Кристи приходится искать
-- ту оплату среди сотен записей. Просьба дословно: «я вижу что висит долг, но знаю что
-- оплата была и не ищу, а просто кнопка списать, и долг не висит; эта функция чтобы
-- только у меня была».
--
-- Что делаем: пометка на задаче. Деньги НЕ трогаем — никаких «технических» приходов
-- не создаём: касса дня, сверка и выручка месяца остаются такими, какие есть на самом деле.
-- Долг по задаче просто перестаёт считаться (src/taskMoney.js: списан → долг 0), задача
-- уходит из «Долгов» и из долгов клиента. Отменить списание можно той же кнопкой.
--
-- Права. Табличный грант Supabase (authenticated=arwdDxtm) перекрывает колоночные гранты
-- из 002/009 — на деле сотрудница может писать ЛЮБУЮ колонку tasks напрямую через API.
-- Поэтому здесь: забираем табличный UPDATE и выдаём его поимённо по рабочим колонкам,
-- а debt_written_off в этот список НЕ входит — менять её можно только функцией ниже,
-- которая проверяет is_owner(). Так «только у меня» держится не интерфейсом, а базой.

alter table tasks add column if not exists debt_written_off boolean not null default false;

revoke update on tasks from authenticated, anon;
grant update (title, description, assignee, done, client_id, contractor_id,
              amount, parts, deadline, stage, sort_order, updated_at, cancelled)
  on tasks to authenticated;

create or replace function write_off_task_debt(p_task_id bigint, p_off boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_title text;
begin
  if not is_owner() then
    raise exception 'списывать долг может только владелец';
  end if;

  update tasks set debt_written_off = p_off where id = p_task_id returning title into v_title;
  if v_title is null then
    raise exception 'задача не найдена';
  end if;

  -- В историю задачи — как обычное действие, чтобы было видно, кто и когда списал
  insert into task_log (task_id, who, action)
  values (p_task_id, coalesce(my_name(), 'владелец'),
          case when p_off then '✎ списала долг (оплата была)' else '↩ вернула долг' end);
end $$;

revoke all on function write_off_task_debt(bigint, boolean) from public, anon;
grant execute on function write_off_task_debt(bigint, boolean) to authenticated;
