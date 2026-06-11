# Imae — Sistema de Control de Mantenimiento Industrial

Sistema fullstack para la gestión integral de mantenimiento fabril. Administración de órdenes de trabajo, compras, equipos y técnicos con autenticación, roles, dashboard de reportes y desarrollo completo con tests unitarios y E2E.

**Demo en vivo:** [imae-nu.vercel.app](https://imae-nu.vercel.app)

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | `admin@ejemplo.com` | `CHANGE-ME` |
| Supervisor | `supervisor@ejemplo.com` | `CHANGE-ME` |
| Técnico | `tecnico@ejemplo.com` | `CHANGE-ME` |
| Operador | `operador@ejemplo.com` | `CHANGE-ME` |

---

## Funcionalidades

### Módulos principales
- **Dashboard** — Cards de acceso rápido, resumen de órdenes, ficha de usuario con avatar y rol
- **Órdenes de Trabajo** — CRUD completo, filtros por estado/prioridad/técnico/búsqueda textual, detalle con PDF, fotos, historial de cambios, finalización
- **Compras** — CRUD completo, filtros por estado/búsqueda, detalle con PDF
- **Equipos** — Grid con cards, detalle con historial de órdenes asociadas
- **Técnicos** — Lista con avatares, especialidad, teléfono, badge activo/inactivo
- **Calendario** — Vista mensual interactiva con órdenes programadas
- **Reportes** — Gráficos de torta y barras (Recharts), filtro por fechas, exportación CSV
- **Perfil** — Foto con upload a Cloudinary, cambio de contraseña

### Características transversales
- **Autenticación** — Login/registro via Supabase Auth con 4 roles (admin, supervisor, técnico, operador) y RLS policies en todas las tablas
- **Modo oscuro** — Toggle persistente en localStorage con detección de preferencia del sistema
- **Fotos** — Upload multiarchivo a Cloudinary, galería con lightbox
- **Historial de cambios** — Timeline por orden/compra con usuario, campo, valor anterior/nuevo
- **Notificaciones en tiempo real** — Toast al crear/actualizar/eliminar órdenes via Supabase Realtime
- **Responsive** — Sidebar hamburguesa en mobile, tablas con scroll horizontal, grid adaptativo
- **Skeletons** — Estados de carga en todas las páginas (SkeletonTable, SkeletonCard, SkeletonSpinner)
- **Confirmación modal** — Diálogo promise-based reemplazando `confirm()` nativo

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, Vite, Tailwind CSS v4, React Router v7 |
| Estado/API | TanStack Query |
| Backend/Datos | Supabase (Auth, PostgreSQL, Storage, RLS, Realtime) |
| Gráficos | Recharts |
| PDF | jsPDF + jspdf-autotable |
| Imágenes | Cloudinary (upload unsigned) |
| Iconos | react-icons (Heroicons) |
| Tests unitarios | Vitest + Testing Library (95 tests, 20 files) |
| Tests E2E | Playwright (18 tests, 10 specs) |
| Deploy | Vercel (auto-deploy desde GitHub) |

---

## Tests

```bash
# Tests unitarios y de componentes
npm run test:run

# Con cobertura
npm run test:coverage

# Tests E2E (Playwright)
npm run test:e2e
```

**95 tests unitarios | 18 tests E2E | 100% pasando**

---

## Setup Local

```bash
git clone https://github.com/sant-maldonado/Imae.git
cd Imae
npm install
npm run dev
```

> La app se conecta a una instancia de Supabase ya configurada. Para usar tu propia instancia, creá un archivo `.env` con `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CLOUDINARY_CLOUD_NAME` y `VITE_CLOUDINARY_UPLOAD_PRESET`, y ejecutá `supabase/schema.sql` en el SQL Editor.

---

## Portfolio

Proyecto fullstack profesional que demuestra:

- **Arquitectura sin backend propio** — Todo el negocio via RLS directo desde el frontend
- **Testing real** — Suite completa con tests unitarios, de componentes y E2E
- **UX completa** — Modo oscuro, responsive, skeletons, toasts, confirmaciones modales
- **Integración cloud** — Supabase (Auth + DB + Realtime + Storage) + Cloudinary
- **CI/CD** — Deploy automático en Vercel desde GitHub
