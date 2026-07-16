-- 004_admin_users.sql — управление сотрудниками из CRM (2026-07-16)
-- Владелец создаёт/редактирует сотрудниц прямо в Настройках: RPC с security definer,
-- внутри — проверка is_owner(). Client service-ключ не нужен.

create extension if not exists pgcrypto with schema extensions;

-- Создать сотрудницу: auth-пользователь (login@crm.local) + профиль. Возвращает id.
create or replace function admin_create_user(p_name text, p_login text, p_password text)
returns uuid language plpgsql security definer set search_path = public, auth, extensions as $$
declare uid uuid := gen_random_uuid();
begin
  if not is_owner() then raise exception 'только владелец'; end if;
  if exists (select 1 from profiles where login = lower(p_login)) then raise exception 'логин занят'; end if;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
          lower(p_login) || '@crm.local', extensions.crypt(p_password, extensions.gen_salt('bf')),
          now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text, 'email',
          jsonb_build_object('sub', uid::text, 'email', lower(p_login) || '@crm.local', 'email_verified', true),
          now(), now(), now());

  insert into profiles (id, name, login, role, sort)
  values (uid, p_name, lower(p_login),'employee',
          coalesce((select max(sort) + 1 from profiles where role = 'employee'), 1));
  return uid;
end $$;

-- Редактировать сотрудницу: имя (переименовывает и колонку в задачах), логин, пароль, активность.
-- null = не менять.
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
    update profiles set is_active = p_is_active where id = p_id;
  end if;
end $$;

grant execute on function admin_create_user(text, text, text) to authenticated;
grant execute on function admin_update_user(uuid, text, text, text, boolean) to authenticated;
