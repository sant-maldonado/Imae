// Cliente REST minimo contra Supabase, con fetch nativo de Node.
//
// La idea era usar @supabase/supabase-js, pero en Node 20 tira: el cliente de
// realtime exige WebSocket nativo o el paquete "ws", y para un script puntual no
// vale la pena agregar una dependencia. Contra PostgREST con fetch no hace falta
// ninguna de las dos cosas.

process.loadEnvFile('.env')

const URL = process.env.VITE_SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY

if (!URL || !ANON) throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el .env')

export const BASE = `${URL}/rest/v1`

export async function sesion(email, password) {
  const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, grant_type: 'password' }),
  })
  if (!r.ok) throw new Error(`No pude entrar como ${email}: ${r.status} ${await r.text()}`)
  const datos = await r.json()
  return { token: datos.access_token, id: datos.user.id }
}

// Sin sesion el RLS no deja escribir, y con la anon key sola no hay forma de
// entrar a la base: siempre se autentica de verdad.
export function pedir(metodo, ruta, cuerpo, token) {
  // En mayusculas a proposito: undici manda el metodo tal cual y con
  // "patch" en minuscula Cloudflare responde 400, no 405.
  return fetch(`${BASE}/${ruta}`, {
    method: metodo.toUpperCase(),
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  }).then(async (r) => {
    const texto = await r.text()
    if (!r.ok) throw new Error(`${metodo} ${ruta} -> ${r.status} ${texto}`)
    return texto ? JSON.parse(texto) : null
  })
}

export const emailAdmin = () => {
  const e = process.env.E2E_EMAIL
  const p = process.env.E2E_PASSWORD
  if (!e || !p) throw new Error('Faltan E2E_EMAIL o E2E_PASSWORD en el .env')
  return { email: e, password: p }
}

export const idTecnico = () => {
  const n = Number(process.env.E2E_TECNICO_ID)
  if (!Number.isInteger(n) || n <= 0) throw new Error('Falta E2E_TECNICO_ID en el .env')
  return n
}
