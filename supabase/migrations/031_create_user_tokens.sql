-- 031: сотрудница, заведённая в Настройках, не могла войти (найдено 2026-11-13 при проверке 029).
-- GoTrue на новом сервере (v2.197) читает служебные строки auth.users в Go-строки и падает на NULL:
-- «Database error querying schema» / «converting NULL to string is unsupported» на confirmation_token.
-- admin_create_user (004) эти колонки не заполнял — на старом GoTrue это сходило с рук.
-- Шесть входов, созданных при переезде 2026-11-12, работают: им эти колонки проставлены ''.

create or replace function admin_create_user(p_name text, p_login text, p_password text)
returns uuid language plpgsql security definer set search_path = public, auth, extensions as $$
declare uid uuid := gen_random_uuid();
begin
  if not is_owner() then raise exception 'только владелец'; end if;
  if exists (select 1 from profiles where login = lower(p_login)) then raise exception 'логин занят'; end if;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
          lower(p_login) || '@crm.local', extensions.crypt(p_password, extensions.gen_salt('bf')),
          now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text, 'email',
          jsonb_build_object('sub', uid::text, 'email', lower(p_login) || '@crm.local', 'email_verified', true),
          now(), now(), now());

  insert into profiles (id, name, login, role, sort)
  values (uid, p_name, lower(p_login),'employee',
          coalesce((select max(sort) + 1 from profiles where role = 'employee'), 1));
  return uid;
end $$;

-- Уже заведённые с NULL — чиним, чтобы они тоже могли войти
update auth.users set
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change = coalesce(email_change, '')
where confirmation_token is null or recovery_token is null or email_change_token_new is null or email_change is null;
