-- =====================================================
-- SCHEMA: Sistema de Control de Mantenimiento
-- Ejecutar en Supabase SQL Editor
--
-- Este script es IDEMPOTENTE: se puede ejecutar las veces
-- que haga falta sin duplicar tablas, policies ni seeds.
-- =====================================================

-- 1. TABLAS

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'tecnico' CHECK (rol IN ('admin', 'supervisor', 'tecnico', 'operador')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.equipos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  ubicacion TEXT,
  estado TEXT DEFAULT 'operativo' CHECK (estado IN ('operativo', 'averiado', 'mantenimiento')),
  ultimo_mantenimiento DATE,
  proximo_mantenimiento DATE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tecnicos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  especialidad TEXT,
  telefono TEXT,
  email TEXT,
  activo BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ordenes (
  id SERIAL PRIMARY KEY,
  equipo_id INTEGER REFERENCES public.equipos(id),
  tecnico_id INTEGER REFERENCES public.tecnicos(id),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  prioridad TEXT DEFAULT 'media' CHECK (prioridad IN ('urgente', 'alta', 'media', 'baja')),
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completada')),
  fecha_creacion DATE DEFAULT CURRENT_DATE,
  fecha_programada DATE,
  fecha_completada DATE,
  tipo_mantenimiento TEXT DEFAULT 'preventivo' CHECK (tipo_mantenimiento IN ('preventivo', 'correctivo', 'predictivo')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.compras (
  id SERIAL PRIMARY KEY,
  proveedor TEXT NOT NULL,
  articulo TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  unidad TEXT DEFAULT 'unidades',
  fecha_solicitud DATE DEFAULT CURRENT_DATE,
  fecha_entrega DATE,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_curso', 'recibido')),
  orden_id INTEGER REFERENCES public.ordenes(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fotos_orden (
  id          SERIAL PRIMARY KEY,
  orden_id    INTEGER NOT NULL REFERENCES public.ordenes(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  nombre      TEXT,
  descripcion TEXT,
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.logs_orden (
  id SERIAL PRIMARY KEY,
  orden_id INTEGER NOT NULL REFERENCES public.ordenes(id) ON DELETE CASCADE,
  accion TEXT NOT NULL,
  campo TEXT,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  usuario_nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.logs_compra (
  id SERIAL PRIMARY KEY,
  compra_id INTEGER NOT NULL REFERENCES public.compras(id) ON DELETE CASCADE,
  accion TEXT NOT NULL,
  campo TEXT,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  usuario_nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. MIGRACIONES INCREMENTALES

-- Avatar de perfil (columna agregada despues de crear la tabla)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 3. TRIGGER: crear perfil automáticamente al registrarse

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.perfiles (id, email, nombre, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nombre', split_part(NEW.email, '@', 1)),
    'tecnico'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3b. FUNCIONES DE PERMISOS
--
-- Todo lo que el tecnico puede escribir pasa por estas funciones y no por un
-- UPDATE directo, porque las politicas de RLS filtran por FILA y no por
-- COLUMNA: con una politica USING (id = auth.uid()) alcanza para que un tecnico
-- se cambie su propio rol a 'admin'. Para vetar columnas hay que hacerlo en el
-- codigo, listando campo por campo. Ver seccion 6.

CREATE OR REPLACE FUNCTION public.mi_rol() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rol FROM public.perfiles WHERE id = auth.uid();
$$;

-- Fila del usuario en la tabla tecnicos, o NULL si su cuenta no es un tecnico.
-- Devolver NULL es lo seguro: el tecnico ve cero ordenes, no todas.
CREATE OR REPLACE FUNCTION public.mi_tecnico_id() RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id
  FROM public.tecnicos t
  JOIN public.perfiles p ON lower(p.email) = lower(t.email)
  WHERE p.id = auth.uid();
$$;

-- El usuario actual puede ver esta orden?
-- OJO con el NULL: comparar con IS NOT DISTINCT FROM daria TRUE cuando las dos
-- partes son NULL, y eso le abriria al tecnico todas las ordenes sin tecnico
-- asignado. Por eso el IS NOT NULL explicito.
CREATE OR REPLACE FUNCTION public.puede_ver_orden(p_orden_id int) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ordenes o
    WHERE o.id = p_orden_id
      AND (
        public.mi_rol() IN ('admin', 'supervisor', 'operador')
        OR (public.mi_tecnico_id() IS NOT NULL AND o.tecnico_id = public.mi_tecnico_id())
        OR o.created_by = auth.uid()
      )
  );
$$;

-- Espejo de puede_ver_orden para compras: la usan las politicas de
-- logs_compra, que si no dejarian leer el historial de gastos de un companero.
CREATE OR REPLACE FUNCTION public.puede_ver_compra(p_compra_id int) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.compras c
    WHERE c.id = p_compra_id
      AND (
        public.mi_rol() IN ('admin', 'supervisor', 'operador')
        OR c.created_by = auth.uid()
      )
  );
$$;

-- Completar una orden. Supervision sobre cualquiera, tecnico solo sobre las suyas.
CREATE OR REPLACE FUNCTION public.completar_orden(p_id int)
RETURNS public.ordenes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_orden public.ordenes;
BEGIN
  IF public.mi_rol() IN ('admin', 'supervisor') THEN
    NULL;
  ELSIF public.mi_rol() = 'tecnico' AND public.puede_ver_orden(p_id) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Sin permiso para completar esta orden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.ordenes o
  SET estado = 'completada', fecha_completada = CURRENT_DATE
  WHERE o.id = p_id AND o.estado <> 'completada'
  RETURNING o.* INTO v_orden;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La orden % no existe o ya estaba completada', p_id
      USING ERRCODE = 'P0002';
  END IF;

  RETURN v_orden;
END;
$$;

-- Editar campos de una orden.
-- Supervision sobre cualquiera. El TECNICO edita las suyas (asignadas o creadas
-- por el) pero con dos limites: no toca tecnico_id ni estado, y no edita una
-- orden ya completada.
-- Los dos campos vetados no son capricho: reasignarse la orden es como se
-- saca el trabajo de encima, y el estado lo mueve el boton Completar, no un
-- select. Ignora a proposito cualquier id o created_by que venga en el jsonb: el
-- payload se lista campo por campo.
CREATE OR REPLACE FUNCTION public.actualizar_orden(p_id int, p_datos jsonb)
RETURNS public.ordenes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_orden public.ordenes;
  v_actual public.ordenes;
  v_es_tecnico boolean;
BEGIN
  v_es_tecnico := public.mi_rol() = 'tecnico';

  IF public.mi_rol() NOT IN ('admin', 'supervisor', 'tecnico') THEN
    RAISE EXCEPTION 'Sin permiso para editar ordenes' USING ERRCODE = '42501';
  END IF;

  SELECT o.* INTO v_actual FROM public.ordenes o WHERE o.id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La orden % no existe', p_id USING ERRCODE = 'P0002';
  END IF;

  IF v_es_tecnico THEN
    -- puede_ver_orden ya cubre "asignada o creada por el", asi que no repetimos
    -- la comparacion con tecnico_id aca.
    IF NOT public.puede_ver_orden(p_id) THEN
      RAISE EXCEPTION 'Solo podes editar tus propias ordenes' USING ERRCODE = '42501';
    END IF;
    IF v_actual.estado = 'completada' THEN
      RAISE EXCEPTION 'La orden esta completada y ya no se edita'
        USING ERRCODE = '42501';
    END IF;
    IF p_datos ? 'tecnico_id' OR p_datos ? 'estado' THEN
      RAISE EXCEPTION 'No podes cambiar el tecnico ni el estado'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- El `?` de jsonb es "esta clave viene en el payload". Con COALESCE no se
  -- podria desasignar un tecnico: un null explicito y un campo ausente dan el
  -- mismo resultado y los dos caen al valor viejo. Con `?` se distingue.
  UPDATE public.ordenes o SET
    titulo             = CASE WHEN p_datos ? 'titulo'             THEN p_datos->>'titulo'             ELSE o.titulo             END,
    descripcion        = CASE WHEN p_datos ? 'descripcion'        THEN p_datos->>'descripcion'        ELSE o.descripcion        END,
    equipo_id          = CASE WHEN p_datos ? 'equipo_id'          THEN (p_datos->>'equipo_id')::int    ELSE o.equipo_id          END,
    tecnico_id         = CASE WHEN p_datos ? 'tecnico_id'         THEN (p_datos->>'tecnico_id')::int   ELSE o.tecnico_id         END,
    prioridad          = CASE WHEN p_datos ? 'prioridad'          THEN p_datos->>'prioridad'          ELSE o.prioridad          END,
    tipo_mantenimiento = CASE WHEN p_datos ? 'tipo_mantenimiento' THEN p_datos->>'tipo_mantenimiento' ELSE o.tipo_mantenimiento END,
    fecha_programada   = CASE WHEN p_datos ? 'fecha_programada'   THEN (p_datos->>'fecha_programada')::date ELSE o.fecha_programada END,
    estado             = CASE WHEN p_datos ? 'estado'             THEN p_datos->>'estado'             ELSE o.estado             END
  WHERE o.id = p_id
  RETURNING o.* INTO v_orden;

  RETURN v_orden;
END;
$$;

GRANT EXECUTE ON FUNCTION public.completar_orden(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actualizar_orden(int, jsonb) TO authenticated;

-- 4. STORAGE

-- Nota: las imagenes (avatares y fotos) se suben a Cloudinary, no a Supabase
-- Storage. El bucket 'avatares' queda por compatibilidad hacia atras.

INSERT INTO storage.buckets (id, name, public) VALUES ('avatares', 'avatares', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS avatares_select ON storage.objects;
CREATE POLICY avatares_select ON storage.objects FOR SELECT
  USING (bucket_id = 'avatares' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS avatares_insert ON storage.objects;
CREATE POLICY avatares_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatares' AND auth.role() = 'authenticated' AND split_part(name, '.', 1) = auth.uid()::text);

DROP POLICY IF EXISTS avatares_update ON storage.objects;
CREATE POLICY avatares_update ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatares' AND auth.role() = 'authenticated' AND split_part(name, '.', 1) = auth.uid()::text);

DROP POLICY IF EXISTS avatares_delete ON storage.objects;
CREATE POLICY avatares_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'avatares' AND auth.role() = 'authenticated' AND split_part(name, '.', 1) = auth.uid()::text);

INSERT INTO storage.buckets (id, name, public) VALUES ('fotos_orden', 'fotos_orden', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS fotos_orden_select ON storage.objects;
CREATE POLICY fotos_orden_select ON storage.objects FOR SELECT
  USING (bucket_id = 'fotos_orden' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS fotos_orden_insert ON storage.objects;
CREATE POLICY fotos_orden_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'fotos_orden' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS fotos_orden_update ON storage.objects;
CREATE POLICY fotos_orden_update ON storage.objects FOR UPDATE
  USING (bucket_id = 'fotos_orden' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS fotos_orden_delete ON storage.objects;
CREATE POLICY fotos_orden_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'fotos_orden' AND auth.role() = 'authenticated');

-- 5. RLS - ENABLE

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos_orden ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_orden ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_compra ENABLE ROW LEVEL SECURITY;

-- 6. RLS - POLICIES

-- PERFILES
DROP POLICY IF EXISTS perfiles_select ON public.profiles;
CREATE POLICY perfiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.mi_rol() IN ('admin', 'supervisor'));

-- INSERT y DELETE no llevan politica: la app no escribe en perfiles, la fila la
-- crea el trigger de la seccion 3, que corre como postgres e ignora el RLS.
-- Se dropean igual porque venian del bootstrap original.
DROP POLICY IF EXISTS perfiles_insert ON public.profiles;
DROP POLICY IF EXISTS perfiles_delete ON public.profiles;

-- El UPDATE se revoca entero y se reda solo para avatar_url. Las politicas de
-- RLS filtran por fila, no por columna: aunque la politica de arriba deje
-- editar la propia fila, sin este revoke un tecnico se podria poner rol
-- 'admin' a si mismo. La politica sola no alcanza.
REVOKE UPDATE, INSERT, DELETE ON public.profiles FROM authenticated;
GRANT UPDATE (avatar_url) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS perfiles_update ON public.profiles;
CREATE POLICY perfiles_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- EQUIPOS
-- No hay formulario de alta ni de edicion, asi que solo se leen.
-- Ojo: esta tabla NO lleva la regla de puede_ver_orden, es un catalogo
-- compartido. Lo que no se puede es escribirla.
DROP POLICY IF EXISTS equipos_insert ON public.equipos;
DROP POLICY IF EXISTS equipos_update ON public.equipos;
DROP POLICY IF EXISTS equipos_delete ON public.equipos;

DROP POLICY IF EXISTS equipos_select ON public.equipos;
CREATE POLICY equipos_select ON public.equipos
  FOR SELECT TO authenticated
  USING (true);

REVOKE INSERT, UPDATE, DELETE ON public.equipos FROM authenticated;

-- TECNICOS
-- Catalogo legible por todos (lo necesita el select de "asignar a"), pero solo
-- se puede dar de alta la propia fila, y solo desde el REGISTRO
-- (AuthContext.register manda created_by = su propio id).
-- Editar o borrar un tecnico es solo de administracion, y como no hay pantalla
-- para eso, la app no lo hace: se revoca entero.
DROP POLICY IF EXISTS tecnicos_update ON public.tecnicos;
DROP POLICY IF EXISTS tecnicos_delete ON public.tecnicos;

DROP POLICY IF EXISTS tecnicos_select ON public.tecnicos;
CREATE POLICY tecnicos_select ON public.tecnicos
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS tecnicos_insert ON public.tecnicos;
CREATE POLICY tecnicos_insert ON public.tecnicos
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

REVOKE UPDATE, DELETE ON public.tecnicos FROM authenticated;

-- ORDENES
-- Lectura: administracion y operador ven todo; el tecnico solo las suyas
-- (asignadas o creadas por el).
-- El IS NOT NULL explicito es obligatorio: con IS NOT DISTINCT FROM, un
-- tecnico sin fila en tecnicos compararia NULL con NULL y veria TODAS las
-- ordenes sin tecnico asignado.
DROP POLICY IF EXISTS ordenes_select ON public.ordenes;
CREATE POLICY ordenes_select ON public.ordenes
  FOR SELECT TO authenticated
  USING (
    public.mi_rol() IN ('admin', 'supervisor', 'operador')
    OR (public.mi_tecnico_id() IS NOT NULL AND tecnico_id = public.mi_tecnico_id())
    OR created_by = auth.uid()
  );

-- Alta: el operador no crea nada. El tecnico solo puede dejar la orden sin
-- asignar o cargarsela a si mismo: si pudiera elegir cualquier tecnico_id
-- estarias leyendo los nombres de todos y repartiendo trabajo.
DROP POLICY IF EXISTS ordenes_insert ON public.ordenes;
CREATE POLICY ordenes_insert ON public.ordenes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.mi_rol() IN ('admin', 'supervisor')
    OR (
      public.mi_rol() = 'tecnico'
      AND created_by = auth.uid()
      AND (tecnico_id IS NULL OR tecnico_id = public.mi_tecnico_id())
    )
  );

-- UPDATE no lleva politica a proposito: va por completar_orden y
-- actualizar_orden (seccion 3b), que pueden restringir COLUMNAS. Con una
-- politica de RLS sola, un tecnico podria cambiarse el tecnico_id o el estado
-- de su propia orden. La vieja ordenes_update del bootstrap permitia justamente
-- eso con created_by = auth.uid(), asi que se dropea.
DROP POLICY IF EXISTS ordenes_update ON public.ordenes;

-- Y el permiso de UPDATE se revoca a nivel de TABLA. Sin esto, la app podria
-- escribir por la API sin pasar por la funcion y saltarse el veto de columnas.
REVOKE UPDATE ON public.ordenes FROM authenticated;

-- DELETE en cambio SI va por politica, porque la app borra con un DELETE
-- directo (api.js, deleteOrden) y no por funcion. El revoke de columna de arriba
-- es solo para UPDATE; revocar DELETE cortaria el borrado del admin.
DROP POLICY IF EXISTS ordenes_delete ON public.ordenes;
CREATE POLICY ordenes_delete ON public.ordenes
  FOR DELETE TO authenticated
  USING (public.mi_rol() IN ('admin', 'supervisor'));

-- COMPRAS
-- El tecnico entra y genera listas de compra, asi que puede leer y dar de alta.
-- PERO solo ve las que el mismo genero: si lee todas, la pagina le muestra el
-- gasto de la empresa entera y las listas de sus companeros.
-- Cambiar estado y borrar, solo administracion.
DROP POLICY IF EXISTS compras_select ON public.compras;
CREATE POLICY compras_select ON public.compras
  FOR SELECT TO authenticated
  USING (
    public.mi_rol() IN ('admin', 'supervisor', 'operador')
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS compras_insert ON public.compras;
CREATE POLICY compras_insert ON public.compras
  FOR INSERT TO authenticated
  WITH CHECK (
    public.mi_rol() IN ('admin', 'supervisor')
    OR (public.mi_rol() = 'tecnico' AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS compras_update ON public.compras;
CREATE POLICY compras_update ON public.compras
  FOR UPDATE TO authenticated
  USING (public.mi_rol() IN ('admin', 'supervisor'))
  WITH CHECK (public.mi_rol() IN ('admin', 'supervisor'));

DROP POLICY IF EXISTS compras_delete ON public.compras;
CREATE POLICY compras_delete ON public.compras
  FOR DELETE TO authenticated
  USING (public.mi_rol() IN ('admin', 'supervisor'));

-- FOTOS_ORDEN
-- Solo se ven las fotos de ordenes que el usuario puede ver. Y se borran las
-- propias o, si sos admin, cualquiera: es la misma regla que ya aplica la UI
-- en PhotoGallery.jsx. No hay edicion de foto, solo alta y baja.
DROP POLICY IF EXISTS fotos_orden_update ON public.fotos_orden;

DROP POLICY IF EXISTS fotos_orden_select ON public.fotos_orden;
CREATE POLICY fotos_orden_select ON public.fotos_orden
  FOR SELECT TO authenticated
  USING (public.puede_ver_orden(orden_id));

DROP POLICY IF EXISTS fotos_orden_insert ON public.fotos_orden;
CREATE POLICY fotos_orden_insert ON public.fotos_orden
  FOR INSERT TO authenticated
  -- created_by tambien: sin esto un tecnico podria colgar su foto de otra
  -- orden y queda registrada a nombre de otro.
  WITH CHECK (public.puede_ver_orden(orden_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS fotos_orden_delete ON public.fotos_orden;
CREATE POLICY fotos_orden_delete ON public.fotos_orden
  FOR DELETE TO authenticated
  USING (public.mi_rol() = 'admin' OR created_by = auth.uid());

-- LOGS_ORDEN (append-only)
-- Es el historial de cambios de cada orden y la app lo lee en el detalle
-- (api.js, fetchLogs). Sin RLS cualquier tecnico lee la bitacora de ordenes
-- ajenas. Ahora solo se ve la de lo que el usuario puede ver, y se puede
-- agregar pero no reescribir el historial.
DROP POLICY IF EXISTS logs_orden_select ON public.logs_orden;
CREATE POLICY logs_orden_select ON public.logs_orden
  FOR SELECT TO authenticated
  USING (public.puede_ver_orden(orden_id));

DROP POLICY IF EXISTS logs_orden_insert ON public.logs_orden;
CREATE POLICY logs_orden_insert ON public.logs_orden
  FOR INSERT TO authenticated
  WITH CHECK (public.puede_ver_orden(orden_id));

REVOKE UPDATE, DELETE ON public.logs_orden FROM authenticated;

-- LOGS_COMPRA (append-only)
-- Mismo criterio que logs_orden, con puede_ver_compra.
DROP POLICY IF EXISTS logs_compra_select ON public.logs_compra;
CREATE POLICY logs_compra_select ON public.logs_compra
  FOR SELECT TO authenticated
  USING (public.puede_ver_compra(compra_id));

DROP POLICY IF EXISTS logs_compra_insert ON public.logs_compra;
CREATE POLICY logs_compra_insert ON public.logs_compra
  FOR INSERT TO authenticated
  WITH CHECK (public.puede_ver_compra(compra_id));

REVOKE UPDATE, DELETE ON public.logs_compra FROM authenticated;

-- 7. REALTIME
-- useRealtime.js (src/hooks) se suscribe a postgres_changes en public.ordenes.
-- Sin esto, las notificaciones en vivo no llegan.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ordenes'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.ordenes';
  END IF;
END $$;

-- 8. SEED DATA
-- Solo se inserta si la tabla correspondiente esta vacia, para que el script
-- pueda re-ejecutarse sin duplicar registros.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.equipos) THEN
    INSERT INTO public.equipos (nombre, codigo, ubicacion, estado, ultimo_mantenimiento, proximo_mantenimiento) VALUES
    ('Torno CNC', 'TNC-001', 'Nave A - Sección 1', 'operativo', '2026-04-15', '2026-07-15'),
    ('Fresadora Universal', 'FRU-002', 'Nave A - Sección 2', 'operativo', '2026-05-10', '2026-08-10'),
    ('Prensa Hidráulica', 'PRH-003', 'Nave B', 'averiado', '2026-03-20', '2026-06-20'),
    ('Compresor Industrial', 'CIN-004', 'Planta Baja', 'operativo', '2026-05-01', '2026-08-01'),
    ('Caldera Vapor', 'CAV-005', 'Planta Alta', 'mantenimiento', '2026-02-10', '2026-05-10'),
    ('Robot Soldador', 'RSO-006', 'Nave C', 'operativo', '2026-04-28', '2026-07-28'),
    ('Cinta Transportadora', 'CTR-007', 'Nave A - Sección 3', 'operativo', '2026-05-05', '2026-08-05'),
    ('Sistema HVAC', 'SHV-008', 'Edificio Central', 'operativo', '2026-03-01', '2026-06-01'),
    ('Taladro Radial', 'TRA-009', 'Nave A - Sección 1', 'operativo', '2026-05-20', '2026-08-20'),
    ('Esmeril Angular', 'EAN-010', 'Taller', 'averiado', '2026-01-15', '2026-04-15'),
    ('Inyectora Plástica', 'IPL-011', 'Nave D', 'operativo', '2026-04-01', '2026-07-01'),
    ('Grua Puente', 'GPU-012', 'Nave A', 'operativo', '2026-05-15', '2026-08-15');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tecnicos) THEN
    INSERT INTO public.tecnicos (nombre, especialidad, telefono, email, activo) VALUES
    ('Carlos López', 'Mecánico Industrial', '555-0101', 'carlos@fabrica.com', true),
    ('María García', 'Eléctrica', '555-0102', 'maria@fabrica.com', true),
    ('Juan Pérez', 'Soldador', '555-0103', 'juan@fabrica.com', true),
    ('Ana Martínez', 'Instrumentista', '555-0104', 'ana@fabrica.com', true),
    ('Roberto Sánchez', 'Mecánico de Precisión', '555-0105', 'roberto@fabrica.com', false),
    ('Laura Fernández', 'Electrónica', '555-0106', 'laura@fabrica.com', true),
    ('Diego Ramírez', 'Hidráulica', '555-0107', 'diego@fabrica.com', true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.ordenes) THEN
    INSERT INTO public.ordenes (equipo_id, tecnico_id, titulo, descripcion, prioridad, estado, fecha_creacion, fecha_programada, tipo_mantenimiento) VALUES
    (1, 1, 'Cambio de aceite hidráulico', 'Realizar cambio de aceite hidráulico del Torno CNC.', 'media', 'pendiente', '2026-05-20', '2026-05-28', 'preventivo'),
    (3, 3, 'Reparación de fuga en prensa', 'Fuga de aceite en el cilindro principal.', 'urgente', 'en_progreso', '2026-05-22', '2026-05-25', 'correctivo'),
    (5, 4, 'Revisión de caldera', 'Inspección anual de la caldera de vapor.', 'alta', 'pendiente', '2026-05-23', '2026-06-01', 'predictivo'),
    (7, 5, 'Lubricación cinta transportadora', 'Lubricación a rodamientos y cadena.', 'baja', 'completada', '2026-05-15', '2026-05-17', 'preventivo'),
    (2, 2, 'Mantenimiento fresadora', 'Revisión general de la fresadora universal.', 'media', 'pendiente', '2026-05-24', '2026-05-30', 'preventivo'),
    (6, 6, 'Calibración robot soldador', 'Calibrar parámetros de soldadura.', 'alta', 'en_progreso', '2026-05-21', '2026-05-26', 'predictivo'),
    (4, 7, 'Cambio filtros compresor', 'Reemplazar filtros de aire y aceite.', 'media', 'completada', '2026-05-18', '2026-05-19', 'correctivo'),
    (10, 1, 'Reparación esmeril angular', 'Reemplazar rodamientos del eje principal.', 'urgente', 'pendiente', '2026-05-25', '2026-05-27', 'correctivo'),
    (12, 7, 'Inspección grúa puente', 'Revisión trimestral de cables y frenos.', 'media', 'pendiente', '2026-05-26', '2026-06-05', 'preventivo'),
    (8, 4, 'Mantenimiento HVAC', 'Limpieza de conductos y revisión de compresor.', 'baja', 'completada', '2026-05-10', '2026-05-12', 'preventivo'),
    (2, 2, 'Revisión eléctrica de fresadora', 'Verificar conexiones eléctricas y tablero de control.', 'media', 'en_progreso', '2026-05-18', '2026-05-22', 'correctivo'),
    (4, 2, 'Cambio de filtros de aire', 'Reemplazar filtros de aire del compresor industrial.', 'baja', 'pendiente', '2026-05-15', '2026-05-30', 'preventivo'),
    (7, 6, 'Reemplazo de rodamientos', 'Cambiar rodamientos desgastados de la cinta transportadora.', 'alta', 'completada', '2026-05-19', '2026-05-21', 'correctivo'),
    (11, 5, 'Cambio de molde', 'Reemplazar molde de la inyectora de plástico.', 'media', 'en_progreso', '2026-05-20', '2026-05-25', 'preventivo'),
    (9, 7, 'Lubricación general', 'Lubricación de ejes y engranajes del taladro radial.', 'baja', 'pendiente', '2026-05-22', '2026-06-01', 'preventivo');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.compras) THEN
    INSERT INTO public.compras (proveedor, articulo, cantidad, unidad, fecha_solicitud, fecha_entrega, estado, orden_id) VALUES
    ('Repuestos García', 'Sellos hidráulicos kit', 3, 'unidades', '2026-05-22', '2026-05-28', 'en_curso', 2),
    ('Suministros Industriales SA', 'Aceite hidráulico ISO 46', 20, 'litros', '2026-05-20', '2026-05-26', 'recibido', 1),
    ('Herramientas Paz', 'Rodamientos SKF 6205', 6, 'unidades', '2026-05-24', '2026-05-30', 'pendiente', 8),
    ('Filtros del Norte', 'Filtro de aire compresor', 4, 'unidades', '2026-05-18', '2026-05-23', 'recibido', 7),
    ('Sensores y Control', 'Sensor de posición inductivo', 2, 'unidades', '2026-05-21', '2026-06-02', 'pendiente', 6),
    ('Eléctrica Central', 'Cable THW 10 AWG', 100, 'metros', '2026-05-22', '2026-06-05', 'pendiente', 2),
    ('Aceros del Norte', 'Plancha de acero 3/8"', 2, 'planchas', '2026-05-23', '2026-05-30', 'en_curso', NULL),
    ('Herramientas Pro', 'Juego de llaves allen', 5, 'juegos', '2026-05-24', NULL, 'pendiente', NULL),
    ('Lubricantes Premium', 'Grasa multipropósito', 10, 'kgs', '2026-05-10', '2026-05-14', 'recibido', NULL);
  END IF;
END $$;
