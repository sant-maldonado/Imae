import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function toCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

export function camelize(val) {
  if (Array.isArray(val)) return val.map(camelize)
  if (val && typeof val === 'object' && val.constructor === Object) {
    return Object.fromEntries(
      Object.entries(val).map(([k, v]) => [toCamel(k), camelize(v)])
    )
  }
  return val
}

export function toSnake(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
}

export function snakeize(val) {
  if (Array.isArray(val)) return val.map(snakeize)
  if (val && typeof val === 'object' && val.constructor === Object) {
    return Object.fromEntries(
      Object.entries(val).map(([k, v]) => [toSnake(k), snakeize(v)])
    )
  }
  return val
}
