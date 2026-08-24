-- Clip de prueba para verificar reproductor y marca de agua.
--
-- Usa el video de la intro, que es material propio: para probar que el
-- reproductor funciona y que la marca aparece, cualquier archivo sirve.
--
-- Nota sobre la marca de agua: NO se le muestra a la propia creadora, porque no
-- tiene a quien delatar. Para verla hay que abrir el clip desde otra cuenta,
-- por eso se acredita saldo al titular: compra el clip de una creadora demo y
-- entonces si aparece.
do $$
declare
  nocturna uuid;
  yo uuid;
  cid uuid;
begin
  select id into nocturna from public.profiles where handle = 'nocturna';
  select user_id into yo from public.admins limit 1;
  if nocturna is null or yo is null then
    raise notice 'faltan perfiles; se omite'; return;
  end if;

  update public.clips
     set storage_path = nocturna::text || '/prueba.mp4',
         title = 'Clip de prueba',
         description = 'Archivo de prueba para verificar el reproductor y la marca de agua.',
         visibility = 'pago', price_coins = 40, duration_s = 4
   where id = (select id from public.clips
                where creator_id = nocturna and es_demo
                order by created_at limit 1)
   returning id into cid;

  perform set_config('request.jwt.claims',
    json_build_object('sub', yo, 'role', 'authenticated')::text, true);
  perform public.admin_ajustar_saldo(yo, 500, 'Saldo para probar el reproductor');

  raise notice 'clip listo: % — saldo acreditado', cid;
end $$;
