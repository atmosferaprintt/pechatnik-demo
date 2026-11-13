-- 029: уволенная сотрудница больше не может войти (просьба Рабии 2026-11-13).
-- Раньше «уволить» в Настройках только ставило profiles.is_active = false: колонка пропадала
-- из Задач, а логин, пароль и уже открытые вкладки продолжали работать.
-- Теперь увольнение закрывает доступ в три слоя:
--   1) вход: auth.users.banned_until на 100 лет вперёд, GoTrue отвечает user_banned.
--      'infinity' не ставим: GoTrue на Go не умеет прочитать бесконечную дату и падал бы на входе;
--   2) сессии: удаляем все её сессии (refresh-токены уходят с ними), токен больше не продлится;
--   3) запросы: PostgREST перед каждым запросом вызывает check_active_user() и отвечает 403 (PT403).
--      Это нужно на тот час, пока живёт уже выданный access-токен (JWT_EXPIRY = 3600).
-- «Вернуть» снимает запрет, пароль прежний. Владельца уволить нельзя: иначе Кристи заперла бы сама себя.

create or replace function admin_update_user(p_id uuid, p_name text, p_login text, p_password text, p_is_active boolean)
returns void language plpgsql security definer set search_path = public, auth, extensions as $$
declare old_name text;
begin
  if not is_owner() then raise exception 'только владелец'; end if;
  select name into old_name from profiles where id = p_id;
  if old_name is null then raise exception 'нет такого пользователя'; end if;

  if p_login is not null then
    if exists (select 1 from profiles where login = lower(p_login) and id <> p_id) then raise exception 'логин занят'; end if;
    update profiles set login = lower(p_login) where id = p_id;
    update auth.users set email = lower(p_login) || '@crm.local' where id = p_id;
    update auth.identities set identity_data = jsonb_set(identity_data, '{email}', to_jsonb(lower(p_login) || '@crm.local'))
      where user_id = p_id and provider = 'email';
  end if;

  if p_password is not null and length(p_password) > 0 then
    update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')) where id = p_id;
  end if;

  if p_name is not null and p_name <> old_name then
    update profiles set name = p_name where id = p_id;
    update tasks set assignee = p_name where assignee = old_name;  -- задачник переезжает вместе с именем
  end if;

  if p_is_active is not null then
    if not p_is_active and exists (select 1 from profiles where id = p_id and role = 'owner') then
      raise exception 'владельца уволить нельзя';
    end if;
    update profiles set is_active = p_is_active where id = p_id;
    update auth.users set banned_until = case when p_is_active then null else now() + interval '100 years' end
      where id = p_id;
    if not p_is_active then
      delete from auth.refresh_tokens where user_id = p_id::text;
      delete from auth.sessions where user_id = p_id;
    end if;
  end if;
end $$;

-- Проверка перед каждым запросом к API. Анонимный запрос (auth.uid() = null) проходит как раньше.
create or replace function check_active_user() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if exists (select 1 from profiles where id = auth.uid() and not is_active) then
    raise sqlstate 'PT403' using message = 'Доступ закрыт: сотрудник уволен';
  end if;
end $$;

revoke all on function check_active_user() from public;
grant execute on function check_active_user() to anon, authenticated;

-- Если проверка сломается, CRM перестанет отвечать у всех. Снять её одной командой:
--   alter role authenticator reset pgrst.db_pre_request; notify pgrst, 'reload config';
alter role authenticator set pgrst.db_pre_request = 'public.check_active_user';
notify pgrst, 'reload config';

-- Уволенные до этой миграции тоже не входят (на 2026-11-13 таких нет)
update auth.users set banned_until = now() + interval '100 years'
  where id in (select id from profiles where not is_active) and banned_until is null;
