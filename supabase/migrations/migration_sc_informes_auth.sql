-- SaniCheck — login por usuario/contraseña para Registro de informes.
-- Aplicar después de migration_sc_informes_tables.sql.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.sc_usuarios ADD COLUMN IF NOT EXISTS usuario text;
ALTER TABLE public.sc_usuarios ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE public.sc_usuarios ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS sc_usuarios_usuario_unique_idx
  ON public.sc_usuarios (lower(usuario)) WHERE usuario IS NOT NULL;

-- La baja es lógica: los informes conservan su tecnico_id y su historial.
-- También evita que un código de un usuario inactivo siga autorizando RPCs.
CREATE OR REPLACE FUNCTION public.sc_resolver_actor(p_codigo text)
RETURNS public.sc_usuarios
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor sc_usuarios;
BEGIN
  SELECT * INTO v_actor
    FROM sc_usuarios
   WHERE codigo_acceso = trim(p_codigo)
     AND activo = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Código de acceso inválido'; END IF;
  RETURN v_actor;
END; $$;

CREATE OR REPLACE FUNCTION public.sc_login_usuario(p_usuario text, p_password text)
RETURNS TABLE(id uuid, nombre text, rol text, usuario text, codigo_acceso text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_password IS NULL OR p_password !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'Usuario o contraseña incorrectos';
  END IF;
  RETURN QUERY
    SELECT u.id, u.nombre, u.rol, u.usuario, u.codigo_acceso
    FROM public.sc_usuarios u
    WHERE lower(u.usuario) = lower(trim(p_usuario))
      AND u.activo = true
      AND u.password_hash IS NOT NULL
      AND extensions.crypt(p_password, u.password_hash) = u.password_hash;
  IF NOT FOUND THEN RAISE EXCEPTION 'Usuario o contraseña incorrectos'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.sc_generar_codigo()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 6));
$$;
REVOKE ALL ON FUNCTION public.sc_generar_codigo() FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.sc_configurar_password_inicial(text,text,text);
CREATE OR REPLACE FUNCTION public.sc_configurar_password_inicial(
  p_usuario text, p_codigo text, p_password text
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_password IS NULL OR p_password !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'La contraseña debe tener exactamente 4 dígitos';
  END IF;

  UPDATE sc_usuarios
     SET password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'))
   WHERE lower(usuario) = lower(trim(p_usuario))
     AND codigo_acceso = upper(trim(p_codigo))
     AND activo = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario, código inválido o contraseña no actualizada';
  END IF;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.sc_cambiar_password(p_codigo text, p_password text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a sc_usuarios;
BEGIN
  IF p_password IS NULL OR p_password !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'La contraseña debe tener exactamente 4 dígitos';
  END IF;
  a := sc_resolver_actor(p_codigo);
  UPDATE sc_usuarios
     SET password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'))
   WHERE id = a.id AND activo = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Usuario no encontrado'; END IF;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.sc_list_usuarios(p_codigo_admin text)
RETURNS TABLE(id uuid, nombre text, usuario text, rol text, codigo_acceso text, activo boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a sc_usuarios;
BEGIN
  a := sc_resolver_actor(p_codigo_admin);
  IF a.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
  RETURN QUERY SELECT u.id,u.nombre,u.usuario,u.rol,u.codigo_acceso,u.activo
    FROM sc_usuarios u WHERE u.activo = true ORDER BY u.nombre;
END; $$;

CREATE OR REPLACE FUNCTION public.sc_crear_usuario(
  p_codigo_admin text, p_nombre text, p_usuario text, p_rol text, p_password text
)
RETURNS TABLE(id uuid, nombre text, usuario text, rol text, codigo_acceso text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a sc_usuarios; c text;
BEGIN
  a := sc_resolver_actor(p_codigo_admin);
  IF a.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
  IF array_length(regexp_split_to_array(trim(p_nombre), '\s+'), 1) < 2 THEN RAISE EXCEPTION 'Escribe nombre y apellido'; END IF;
  IF nullif(trim(p_usuario), '') IS NULL
     OR p_rol NOT IN ('tecnico','admin')
     OR p_password IS NULL
     OR p_password !~ '^[0-9]{4}$'
  THEN RAISE EXCEPTION 'Usuario, rol o contraseña inválidos'; END IF;
  LOOP
    c := sc_generar_codigo();
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.sc_usuarios u WHERE u.codigo_acceso = c
    );
  END LOOP;
  RETURN QUERY INSERT INTO sc_usuarios(nombre,usuario,rol,codigo_acceso,password_hash)
    VALUES(trim(p_nombre),lower(trim(p_usuario)),p_rol,c,extensions.crypt(p_password,extensions.gen_salt('bf')))
    RETURNING sc_usuarios.id,sc_usuarios.nombre,sc_usuarios.usuario,sc_usuarios.rol,sc_usuarios.codigo_acceso;
END; $$;

CREATE OR REPLACE FUNCTION public.sc_eliminar_usuario(p_codigo_admin text, p_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a sc_usuarios;
BEGIN
  a := sc_resolver_actor(p_codigo_admin);
  IF a.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
  IF p_id = a.id THEN RAISE EXCEPTION 'No puedes eliminar tu propio usuario'; END IF;

  UPDATE sc_usuarios
     SET activo = false,
         password_hash = NULL
   WHERE id = p_id AND activo = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Usuario no encontrado o ya inactivo'; END IF;
  RETURN true;
END; $$;

GRANT EXECUTE ON FUNCTION public.sc_login_usuario(text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_configurar_password_inicial(text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_cambiar_password(text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_list_usuarios(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_crear_usuario(text,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_eliminar_usuario(text,uuid) TO anon, authenticated;
