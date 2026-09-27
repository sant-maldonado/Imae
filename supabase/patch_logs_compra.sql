-- =====================================================
-- PATCH: tabla de historial de cambios para compras
-- =====================================================
-- Para instancias que YA tienen el schema instalado.
-- Es idempotente: se puede ejecutar las veces que haga falta.
--
-- Queja original: PurchaseDetail.jsx guardaba los cambios de
-- estado de una compra en public.logs_orden pasando un
-- compras.id en logs_orden.orden_id, que es FK a public.ordenes
-- -> fallaba por constraint o ensuciaba el historial de otra
-- orden. Este patch crea la tabla destino correcta.
-- =====================================================

-- 1. TABLA

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

CREATE INDEX IF NOT EXISTS logs_compra_compra_id_idx ON public.logs_compra(compra_id);

-- 2. RLS

ALTER TABLE public.logs_compra ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS logs_compra_select ON public.logs_compra;
CREATE POLICY logs_compra_select ON public.logs_compra
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS logs_compra_insert ON public.logs_compra;
CREATE POLICY logs_compra_insert ON public.logs_compra
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Sin policy de UPDATE ni DELETE: el log es append-only,
-- igual que logs_orden.

-- 3. REALTIME
-- useRealtime.js (src/hooks/useRealtime.js) se suscribe a
-- postgres_changes en public.ordenes. Sin esto, los toasts en
-- vivo nunca llegan y hay que habilitarlo a mano en el dashboard.

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

-- 4. VERIFICACION
-- Debe devolver 1 fila. Si devuelve 0, la tabla no se creo.
SELECT count(*) AS logs_compra_ok FROM public.logs_compra;
