-- El administrador puede escribir en la carpeta de una creadora.
--
-- BUG QUE ARREGLA
-- Las politicas de escritura exigian que la primera carpeta fuera la de quien
-- sube. Correcto para una creadora subiendo lo suyo; imposible para un
-- administrador publicando POR ella, que es justo lo que hace la pantalla de
-- alta.
--
-- El sintoma era engañoso: el archivo se transferia entero —minutos, con
-- archivos de 17 MB— y el rechazo llegaba hasta el final. Parecia lentitud y
-- despues "no guardo", cuando en realidad nunca tuvo permiso.
--
-- Se limita a creadoras CON EXPEDIENTE: un admin no puede escribir en la
-- carpeta de cualquier persona, solo de aquellas que el mismo dio de alta con
-- su documentacion.

create policy clips_archivo_admin_sube on storage.objects for insert to authenticated
  with check (
    bucket_id = 'clips'
    and public.es_admin()
    and exists (select 1 from public.expedientes e
                where e.user_id::text = (storage.foldername(name))[1])
  );

create policy clips_archivo_admin_actualiza on storage.objects for update to authenticated
  using (
    bucket_id = 'clips' and public.es_admin()
    and exists (select 1 from public.expedientes e
                where e.user_id::text = (storage.foldername(name))[1])
  );

create policy covers_admin_sube on storage.objects for insert to authenticated
  with check (
    bucket_id = 'clip-covers'
    and public.es_admin()
    and exists (select 1 from public.expedientes e
                where e.user_id::text = (storage.foldername(name))[1])
  );

create policy covers_admin_actualiza on storage.objects for update to authenticated
  using (
    bucket_id = 'clip-covers' and public.es_admin()
    and exists (select 1 from public.expedientes e
                where e.user_id::text = (storage.foldername(name))[1])
  );

-- Limpieza: si un intento fallido dejo archivos sueltos, el admin puede
-- borrarlos. Sin esto, un reintento choca contra restos del intento anterior.
create policy clips_archivo_admin_borra on storage.objects for delete to authenticated
  using (
    bucket_id in ('clips', 'clip-covers') and public.es_admin()
    and exists (select 1 from public.expedientes e
                where e.user_id::text = (storage.foldername(name))[1])
  );
