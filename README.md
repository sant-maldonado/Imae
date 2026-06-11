# 🏭 IMAE — Control de Mantenimiento Fabril

Sistema fullstack para la gestión de mantenimiento industrial. Administrá órdenes de trabajo, compras, equipos y técnicos con autenticación por roles, calendario, reportes y exportación de datos.

## 🚀 Demo en vivo
(https://imaemantenimiento.vercel.app)

Usuario de prueba:

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | `admin@ejemplo.com` | `CHANGE-ME` |
| Técnico | `tecnico@ejemplo.com` | `CHANGE-ME` |

---

## ✨ Funcionalidades
- Dashboard con cards de acceso rápido y ficha de usuario
- Órdenes de Trabajo — CRUD completo con filtros por estado, prioridad y técnico. Exportación a PDF
- Compras — CRUD con filtro por estado y PDF de pendientes
- Equipos — Grid con cards y detalle con historial de órdenes
- Técnicos — Lista con avatar, especialidad y badge activo/inactivo
- Calendario — Vista mensual de órdenes programadas
- Reportes — Gráficos de barras y torta + exportación CSV
- Perfil — Upload y redimensión de foto, cambio de contraseña

---

## 🛠 Stack

**Frontend:** React 19, Vite, Tailwind CSS v4, React Router v7, TanStack Query
**Backend/Datos:** Supabase (Auth, PostgreSQL, Storage, RLS)
**Extras:** Recharts, jsPDF, Cloudinary
**Tests:** Vitest + Testing Library, Playwright E2E
**Deploy:** Vercel (auto desde GitHub)

---

## ⚙️ Correr localmente

```bash
git clone https://github.com/sant-maldonado/Imae.git
cd Imae
npm install
npm run dev
```

---

## 📄 Variables de entorno

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

---

## 🧪 Tests

```bash
npm run test:run        # tests unitarios
npm run test:coverage   # con cobertura
npm run test:e2e        # E2E con Playwright
```

✅ 52 tests unitarios · ✅ 10 specs E2E

---

## 📸 Capturas
<img width="1365" height="628" alt="Screenshot 2026-06-10 214442" src="https://github.com/user-attachments/assets/a71123b7-10fb-42fa-97ca-9cc724205083" />
<img width="1348" height="624" alt="Screenshot 2026-06-10 214511" src="https://github.com/user-attachments/assets/61e10da4-4473-439a-94a0-3ad6c45c767a" />
<img width="1350" height="628" alt="Screenshot 2026-06-10 214539" src="https://github.com/user-attachments/assets/fbf30666-be81-4154-8a66-8d05287a3f7d" />
<img width="1350" height="628" alt="Screenshot 2026-06-10 214606" src="https://github.com/user-attachments/assets/6e66cb91-a639-46ec-865b-fbfe6d3d2bd2" />





