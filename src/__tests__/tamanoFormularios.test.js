import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

// Un input, select o textarea con font-size menor a 16px hace que iOS Safari haga
// zoom al enfocarlo, y la pagina queda agrandada hasta que el usuario hace zoom
// out a mano. Eso se ve como "la app entera esta enorme".
//
// En jsdom no hay zoom, asi que el bug no se puede reproducir con un test de
// comportamiento: la unica red es auditar el codigo. Y es facilisimo de
// reintroducir, porque en escritorio se ve perfecto y solo rompe en el celular.
// import.meta.url no es file: en jsdom, asi que se parte del cwd, que vitest ya
// fija en la raiz del proyecto.
const RAIZ = join(process.cwd(), 'src')
const TAG = /<(input|select|textarea)\b/
const TEXTO_CHICO = /\btext-(?:xs|sm|\[1[0-5]px\])(?![\w-])/
// El className del control esta entre sus props, asi que se busca hacia abajo y
// se corta al aparecer el tag siguiente para no leer el de al lado.
const CORTE = /^\s*<(div|p|span|label|button|option|ul|li|img)\b/

function archivosJSX(dir) {
  const salida = []
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const camino = join(dir, entrada.name)
    if (entrada.isDirectory()) salida.push(...archivosJSX(camino))
    else if (/\.jsx?$/.test(entrada.name)) salida.push(camino)
  }
  return salida
}

function lineaDelClassName(lineas, i) {
  for (let j = i + 1; j <= Math.min(i + 8, lineas.length - 1); j++) {
    if (TAG.test(lineas[j]) || CORTE.test(lineas[j])) return null
    if (lineas[j].includes('className=')) return j
  }
  return null
}

describe('tamano de los controles de formulario en el celular', () => {
  it('ningun control queda con tipografia por debajo de 16px', () => {
    const infractores = []

    for (const archivo of archivosJSX(RAIZ)) {
      const lineas = readFileSync(archivo, 'utf8').split('\n')
      lineas.forEach((linea, i) => {
        if (!TAG.test(linea)) return
        const j = lineaDelClassName(lineas, i)
        if (j === null) return
        if (TEXTO_CHICO.test(lineas[j])) {
          infractores.push(`${relative(RAIZ, archivo)}:${j + 1}  ${lineas[j].trim()}`)
        }
      })
    }

    expect(infractores).toEqual([])
  })

  // Si los regex se rompen, el test de arriba pasa en verde sin auditar nada.
  // Este es el que avisa que la red dejo de pescar.
  it('la auditoria encuentra controles de verdad y no pasa por vacia', () => {
    let encontrados = 0
    for (const archivo of archivosJSX(RAIZ)) {
      for (const linea of readFileSync(archivo, 'utf8').split('\n')) {
        if (TAG.test(linea)) encontrados++
      }
    }
    expect(encontrados).toBeGreaterThan(20)
  })
})
