-- =====================================================
-- SCHEMA: Sistema de Control de Mantenimiento
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. TRIGGER: crear perfil automáticamente al registrarse
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

-- Avatar de perfil
ALTER TABLE public.perfiles ADD COLUMN avatar_url TEXT;

-- Bucket para avatares (ejecutar una vez)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatares', 'avatares', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY avatares_select ON storage.objects FOR SELECT
  USING (bucket_id = 'avatares' AND auth.role() = 'authenticated');

CREATE POLICY avatares_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatares' AND auth.role() = 'authenticated' AND split_part(name, '.', 1) = auth.uid()::text);

CREATE POLICY avatares_update ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatares' AND auth.role() = 'authenticated' AND split_part(name, '.', 1) = auth.uid()::text);

CREATE POLICY avatares_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'avatares' AND auth.role() = 'authenticated' AND split_part(name, '.', 1) = auth.uid()::text);

-- 2. TABLAS

CREATE TABLE IF NOT EXISTS public.perfiles (
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
  created_by UUID REFERENCES public.perfiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tecnicos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  especialidad TEXT,
  telefono TEXT,
  email TEXT,
  activo BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.perfiles(id),
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
  created_by UUID REFERENCES public.perfiles(id),
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
  created_by UUID REFERENCES public.perfiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fotos_orden (
  id          SERIAL PRIMARY KEY,
  orden_id    INTEGER NOT NULL REFERENCES public.ordenes(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  nombre      TEXT,
  descripcion TEXT,
  created_by  UUID REFERENCES public.perfiles(id),
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

-- Bucket para fotos de orden
INSERT INTO storage.buckets (id, name, public) VALUES ('fotos_orden', 'fotos_orden', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY fotos_orden_select ON storage.objects FOR SELECT
  USING (bucket_id = 'fotos_orden' AND auth.role() = 'authenticated');

CREATE POLICY fotos_orden_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'fotos_orden' AND auth.role() = 'authenticated');

CREATE POLICY fotos_orden_update ON storage.objects FOR UPDATE
  USING (bucket_id = 'fotos_orden' AND auth.role() = 'authenticated');

CREATE POLICY fotos_orden_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'fotos_orden' AND auth.role() = 'authenticated');

-- 3. RLS - ENABLE

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos_orden ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_orden ENABLE ROW LEVEL SECURITY;

-- 4. RLS - POLICIES

-- PERFILES
CREATE POLICY perfiles_select ON public.perfiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY perfiles_insert ON public.perfiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY perfiles_update ON public.perfiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'supervisor'))
  OR id = auth.uid()
);
CREATE POLICY perfiles_delete ON public.perfiles FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
);

-- EQUIPOS
CREATE POLICY equipos_select ON public.equipos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY equipos_insert ON public.equipos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'supervisor'))
);
CREATE POLICY equipos_update ON public.equipos FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'supervisor'))
);
CREATE POLICY equipos_delete ON public.equipos FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
);

-- TECNICOS
CREATE POLICY tecnicos_select ON public.tecnicos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY tecnicos_insert ON public.tecnicos FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND created_by = auth.uid()
);
CREATE POLICY tecnicos_update ON public.tecnicos FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'supervisor'))
);
CREATE POLICY tecnicos_delete ON public.tecnicos FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
);

-- ORDENES
CREATE POLICY ordenes_select ON public.ordenes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY ordenes_insert ON public.ordenes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'supervisor', 'tecnico'))
);
CREATE POLICY ordenes_update ON public.ordenes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'supervisor'))
  OR created_by = auth.uid()
);
CREATE POLICY ordenes_delete ON public.ordenes FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
);

-- COMPRAS
CREATE POLICY compras_select ON public.compras FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY compras_insert ON public.compras FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'supervisor', 'tecnico'))
);
CREATE POLICY compras_update ON public.compras FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'supervisor'))
);
CREATE POLICY compras_delete ON public.compras FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
);

-- FOTOS_ORDEN
CREATE POLICY fotos_orden_select ON public.fotos_orden FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY fotos_orden_insert ON public.fotos_orden FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'supervisor', 'tecnico'))
);
CREATE POLICY fotos_orden_update ON public.fotos_orden FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'supervisor'))
  OR created_by = auth.uid()
);
CREATE POLICY logs_orden_select ON public.logs_orden FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY logs_orden_insert ON public.logs_orden FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY fotos_orden_delete ON public.fotos_orden FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
  OR created_by = auth.uid()
);

-- 5. SEED DATA

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
('Inyectora Plástico', 'IPL-011', 'Nave D', 'operativo', '2026-04-01', '2026-07-01'),
('Grua Puente', 'GPU-012', 'Nave A', 'operativo', '2026-05-15', '2026-08-15');

INSERT INTO public.tecnicos (nombre, especialidad, telefono, email, activo) VALUES
('Carlos López', 'Mecánico Industrial', '555-0101', 'carlos@fabrica.com', true),
('María García', 'Eléctrica', '555-0102', 'maria@fabrica.com', true),
('Juan Pérez', 'Soldador', '555-0103', 'juan@fabrica.com', true),
('Ana Martínez', 'Instrumentista', '555-0104', 'ana@fabrica.com', true),
('Roberto Sánchez', 'Mecánico de Precisión', '555-0105', 'roberto@fabrica.com', false),
('Laura Fernández', 'Electrónica', '555-0106', 'laura@fabrica.com', true),
('Diego Ramírez', 'Hidráulica', '555-0107', 'diego@fabrica.com', true);

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
