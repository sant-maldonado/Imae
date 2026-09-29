# AGENTS.md

Instrucciones operativas para trabajar en IMAE. Leer antes de tocar código.

## Regla principal

**Al terminar cualquier tarea, siempre pasar el link de la app**, aunque el cambio no sea visible en la UI. Es un requisito del usuario, no opcional.

- Producción: https://imae-nu.vercel.app
- Local: http://localhost:5173

Aclarar cuál de los dos tiene el cambio: Vercel solo lo muestra si el cambio fue commiteado y pusheado a `main`. Si no se commiteó, decirlo explícitamente para que el usuario no revise la URL equivocada.

## Comandos

```bash
npm run dev          # Vite en http://localhost:5173
npm run test:run     # unitarios (vitest, una corrida)
npm run lint         # eslint
npm run build        # vite build
npm run test:e2e     # Playwright, levanta su propio server
```

## Videos de presentación

Dos videos para mostrarle al cliente: `admin.mp4` y `tecnico.mp4`. Se graban
contra producción, no contra un build local, y salen en `videos/` (ignorado por
Git, no se commitean).

```bash
node e2e-demo/preparar.mjs                                    # datos limpios
npx playwright test --config=playwright.demo.config.js admin
npx playwright test --config=playwright.demo.config.js tecnico
node e2e-demo/limpiar.mjs --si                                # chequear (no borra)
node e2e-demo/limpiar.mjs                                     # borrar de verdad
```

- Un spec por corrida. Playwright limpia `outputDir` al empezar, así que el
  teardown copia el `.webm` y lo convierte antes de que el video anterior se
  pierda. Por eso no se pueden pasar los dos specs en la misma corrida.
- Sale `.mp4` (H.264/yuv420p, lo que WhatsApp reproduce), `.webm` crudo,
  `.srt` y `.guion.md` con los tiempos reales, más `orden-muestra.pdf`.
- Los videos son mudos a propósito: la voz la graba el usuario. El `.guion.md` y
  el `.srt` están para eso.
- `preparar.mjs` borra y recrea las dos órdenes de demo, porque el video del
  técnico completa la suya y una segunda corrida la encontraría ya cerrada.
- No se puede verificar el video mirando: el autcheck de `escena()` comprueba que
  la leyenda se ve, tiene el texto del guion y no desborda, pero el resultado
  final lo tiene que mirar una persona.
- `limpiar.mjs` sin argumentos **borra**; con `--si` solo lista. Solo toca
  registros con prefijo `Presentacion IMAE - `.
- Los datos que toca `preparar.mjs` son reales. Antes de correrlo otra vez,
  revisar qué borra: en una corrida anterior desvinculó la compra #144
  (Rosarpin) porque apuntaba a una orden de prueba que el usuario autorizó
  borrar.

## Orden de verificación

1. `npm run test:run`
2. `npm run lint`
3. `npm run build`
4. `npm run test:e2e`

No declarar un trabajo terminado con solo una parte verde. Si un E2E falla, leer el `error-context.md` de `test-results/`: trae el snapshot del árbol de accesibilidad, que casi siempre muestra la causa real.

## Contexto

- Stack: React 19, Vite 8, Tailwind 4, React Router 7, TanStack Query 5, Supabase JS, Recharts, Playwright.
- Supabase ref: `grrcsarbbvexwdlocnqr`. El schema y las migraciones viven fuera de la app; los E2E corren contra la DB real, no contra mocks.
- `interno/` está en `.gitignore` (credenciales, SQL de limpieza, notas). No commitear nada de ahí.
- Credenciales de los E2E: `E2E_EMAIL` / `E2E_PASSWORD` en `.env`. No llevan prefijo `VITE_` a propósito, para que Vite no las meta en el bundle. Copiar de `.env.example` si falta alguna.
- Las 4 cuentas demo comparten la misma contraseña débil y conocida (valor en `interno/CREDENCIALES.md` y `.env`, ambos gitignorados). Si la app queda pública, rotarla.

## Trampas conocidas

- **PowerShell**: el shell es Windows PowerShell 5.1. No usar `&&`; encadenar con `;` o con `if ($?) { ... }`.
- **`NativeCommandError` es ruido, no un fallo.** Vite y npm escriben warnings por stderr y PowerShell lo reporta como error aunque el comando haya terminado bien. Verificar el código de salida real antes de asumir un fallo. En este repo es el caso del warning de chunks >500 kB en `npm run build`.
- **`vi.mock` se hoistea.** Si el factory necesita datos, definilos con `vi.hoisted(() => ({...}))` o referenciá constantes externas y el test no compila.
- **Los skeletons son un estado real del componente.** Al testear condicionalmente contra la UI, esperá una señal de "cargó" (por ejemplo un heading que solo existe cuando `isLoading === false`) antes de contar elementos. `count() === 0` sobre una vista aún cargando produce falsos positivos.
- **Al cambiar copy o estructura de una página, buscar todos los tests que la tocan.** Los E2E se acoplan por texto y se rompen en silencio. Un grep por el texto viejo antes de cerrar.
- `fullyParallel: false`, `workers: 1`, `retries: 0` en Playwright: los E2E comparten la DB real, no paralelizar.

## Tareas pendientes conocidas

- `interno/cleanup_datos_prueba.sql` está escrito pero **no ejecutado**. El `COMMIT;` está comentado a propósito: hay que correr el pre-vuelo, revisar los conteos y recién ahí habilitarlo. Resultado esperado: `perfiles=8`, `tecnicos=12`, `ordenes=16`, `compras=10`, `equipos=12`, `fotos_orden=1`, `logs_orden=0`, `logs_compra=0`. Requiere que el usuario lo ejecute en el SQL Editor de Supabase: no hay acceso privilegiado a `auth.users`.
- PAT de Supabase expuesto en la conversación, pendiente de revocar en https://supabase.com/dashboard/account/tokens.
- El commit pre-reescritura `e2224a7` sigue accesible por SHA por la caché de GitHub. La contraseña vieja ya fue rotada, así que no es urgente.

## Estilo

- Tailwind con paleta `slate` + acentos por estado, siguiendo `src/lib/constants.js` (`estadoColors`, `priorityColors`, `formatDate`).
- Reutilizar los componentes de `src/components/Skeleton.jsx` para estados de carga.
- Comentar solo lo que no se explica a simple vista. Sin comentarios de relleno.
- Los datos de la API pasan por `camelize()` en `src/services/api.js`: en los componentes ya llegan en camelCase.
