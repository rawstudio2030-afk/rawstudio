-- Alta del primer administrador.
--
-- No hay forma de hacerlo desde la app a proposito: public.admins no tiene
-- politica de escritura, asi que el primer admin solo puede nacer aqui o desde
-- el panel de Supabase. Para dar de alta a otro en el futuro:
--
--   insert into public.admins (user_id, nota)
--   select id, 'quien y por que' from auth.users where email = 'correo@ejemplo.com';
insert into public.admins (user_id, nota)
select id, 'Titular de la plataforma'
from auth.users
where email = 'rawstudio2030@gmail.com'
on conflict (user_id) do nothing;
