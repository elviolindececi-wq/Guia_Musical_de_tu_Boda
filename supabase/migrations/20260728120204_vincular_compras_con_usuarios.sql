-- Vincula automaticamente compras de Hotmart con usuarios de Supabase Auth.
-- Funciona si la compra ocurre antes o despues del registro.
-- Los errores de vinculacion no bloquean compras ni registros.

create index if not exists access_entitlements_email_idx
on public.access_entitlements (lower(email));

create or replace function public.tbo_link_entitlement_to_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  if new.user_id is null
     and nullif(trim(new.email), '') is not null then

    select auth_user.id
      into new.user_id
      from auth.users as auth_user
     where lower(trim(auth_user.email)) = lower(trim(new.email))
     order by auth_user.created_at asc
     limit 1;
  end if;

  return new;

exception
  when others then
    raise warning
      'No se pudo vincular entitlement % con Auth: %',
      coalesce(new.id::text, 'sin-id'),
      sqlerrm;

    return new;
end;
$$;

revoke all
on function public.tbo_link_entitlement_to_auth_user()
from public, anon, authenticated;

drop trigger if exists tbo_link_entitlement_before_save
on public.access_entitlements;

create trigger tbo_link_entitlement_before_save
before insert or update of email, user_id
on public.access_entitlements
for each row
execute function public.tbo_link_entitlement_to_auth_user();


create or replace function public.tbo_link_entitlements_after_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  if nullif(trim(new.email), '') is not null then
    update public.access_entitlements as entitlement
       set user_id = new.id,
           updated_at = now()
     where entitlement.user_id is null
       and lower(trim(entitlement.email)) = lower(trim(new.email));
  end if;

  return new;

exception
  when others then
    raise warning
      'No se pudieron vincular compras al usuario Auth %: %',
      new.id::text,
      sqlerrm;

    return new;
end;
$$;

revoke all
on function public.tbo_link_entitlements_after_auth_user()
from public, anon, authenticated;

drop trigger if exists tbo_link_entitlements_after_auth_user
on auth.users;

create trigger tbo_link_entitlements_after_auth_user
after insert or update of email
on auth.users
for each row
execute function public.tbo_link_entitlements_after_auth_user();


-- Vincula registros antiguos que todavia tengan user_id vacio.
update public.access_entitlements as entitlement
   set user_id = auth_user.id,
       updated_at = now()
  from auth.users as auth_user
 where entitlement.user_id is null
   and lower(trim(entitlement.email)) = lower(trim(auth_user.email));