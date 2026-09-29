// Genera los iconos de la PWA a partir de un engranaje dibujado con geometria.
//
// Nada de tipografias ni de currentColor a proposito: el rasterizador de sharp
// (librsvg) no resuelve currentColor, y el <text> del favicon viejo dependia de
// la fuente del sistema, o sea que se veía distinto en cada maquina.
//
// sharp NO es dependencia del proyecto a proposito. Instalarlo agrega ~80 MB de
// binarios nativos que Vercel bajaria en cada build sin usarlos nunca. Para
// regenerar los iconos:
//     npm i -D sharp
//     node scripts/generar-icons.mjs
// Los PNG quedan versionados, asi que esto solo corre cuando cambia el diseno.

import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const AZUL = '#2563eb'
const BLANCO = '#ffffff'
const DIENTES = 8

// Perfil de un diente, en fracciones del paso angular. El fondo es el valle,
// el medio es la punta y los flancos interpolan.
function radioEn(fraccion, raiz, punta) {
  const t = fraccion % 1
  if (t < 0.22) return raiz
  if (t < 0.34) return raiz + ((t - 0.22) / 0.12) * (punta - raiz)
  if (t < 0.66) return punta
  if (t < 0.78) return punta - ((t - 0.66) / 0.12) * (punta - raiz)
  return raiz
}

function engranaje(cx, cy, punta) {
  const raiz = punta * 0.72
  const agujero = punta * 0.34
  const muestras = DIENTES * 18
  const puntos = []

  for (let i = 0; i < muestras; i++) {
    const fraccion = i / muestras
    const angulo = fraccion * Math.PI * 2 - Math.PI / 2
    const r = radioEn(fraccion * DIENTES, raiz, punta)
    const x = cx + Math.cos(angulo) * r
    const y = cy + Math.sin(angulo) * r
    puntos.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }

  const exterior = `M${puntos.join('L')}Z`
  const d = (2 * agujero).toFixed(2)
  const h = agujero.toFixed(2)
  const centro = `M${(cx - agujero).toFixed(2)},${cy}a${h},${h} 0 1,0 ${d},0a${h},${h} 0 1,0 ${(-Number(d)).toFixed(2)},0Z`

  return exterior + centro
}

function svg({ size, radioFondo, punta }) {
  const fondo =
    radioFondo > 0
      ? `<rect width="${size}" height="${size}" rx="${(size * radioFondo).toFixed(2)}" fill="${AZUL}"/>`
      : `<rect width="${size}" height="${size}" fill="${AZUL}"/>`

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${size} ${size}" fill-rule="evenodd">` +
    fondo +
    `<path fill="${BLANCO}" fill-rule="evenodd" d="${engranaje(size / 2, size / 2, size * punta)}"/>` +
    `</svg>`
  )
}

const iconos = [
  { archivo: 'public/icons/icon-192.png', size: 192, radioFondo: 0.22, punta: 0.36 },
  { archivo: 'public/icons/icon-512.png', size: 512, radioFondo: 0.22, punta: 0.36 },
  // Maskable: fondo a sangre y engranaje Inside de la zona segura (circulo
  // central del 80%), porque el SO le aplica su propia mascara encima.
  { archivo: 'public/icons/maskable-512.png', size: 512, radioFondo: 0, punta: 0.3 },
  // apple-touch: fondo a sangre tambien, iOS ignora las esquinas redondeadas.
  { archivo: 'public/icons/apple-touch-icon.png', size: 180, radioFondo: 0, punta: 0.34 },
]

await mkdir(join(RAIZ, 'public/icons'), { recursive: true })

for (const icono of iconos) {
  const salida = await sharp(Buffer.from(svg(icono))).png({ compressionLevel: 9 }).toBuffer()
  await writeFile(join(RAIZ, icono.archivo), salida)
  console.log(`${icono.archivo}  ${icono.size}x${icono.size}  ${salida.length} bytes`)
}

// El favicon conserva el lienzo de 32 y las esquinas de 4 del original.
const favicon = svg({ size: 32, radioFondo: 0.125, punta: 0.36 })
await writeFile(join(RAIZ, 'public/favicon.svg'), favicon)
console.log('public/favicon.svg  generado')
