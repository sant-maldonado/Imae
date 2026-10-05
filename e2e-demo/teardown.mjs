// globalTeardown del playwright.demo.config.js.
//
// Existe por una razon puntual: Playwright borra outputDir al empezar cada
// corrida, asi que el .webm del video anterior no sobrevive. Con dos videos que
// se graban en corridas separadas, el segundo se lleva puesto el archivo del
// primero. Y el .webm no se puede editar, solo convertir.
//
// globalTeardown corre cuando el contexto del navegador ya cerro y el video ya
// quedo escrito en disco, que es el unico momento en que se puede copiar.
//
// Ademas saca el .srt/.guion.md: no tiene sentido que el guion quede pegado a un
// video que despues se regenera con otros tiempos.

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'

const ORIGEN = 'test-results-demo'
const DESTINO = 'videos'

// ffmpeg instalado con winget queda en una carpeta con la version en el nombre y
// ademas puede haber varias, asi que se busca la mas alta. Se cae al PATH
// normal si no se encuentra, por si alguien lo instalo de otra forma.
function resolverFfmpeg() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH
  }
  const raiz = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages')
  if (fs.existsSync(raiz)) {
    const candidatas = fs
      .readdirSync(raiz)
      .filter((d) => d.startsWith('Gyan.FFmpeg'))
      .flatMap((d) => {
        const base = path.join(raiz, d)
        return fs.readdirSync(base).map((sub) => path.join(base, sub, 'bin', 'ffmpeg.exe'))
      })
      .filter((p) => fs.existsSync(p))
      .sort()
    if (candidatas.length) return candidatas[candidatas.length - 1]
  }
  return null
}

const FFMPEG = resolverFfmpeg()

// ffprobe va en el mismo bin que ffmpeg, asi que sale de cambiar el nombre.
const FFPROBE = FFMPEG ? path.join(path.dirname(FFMPEG), 'ffprobe.exe') : ''

function webms(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return webms(p)
    return e.name === 'video.webm' ? [p] : []
  })
}

// El directorio de salida de Playwright se llama
// "admin-video-de-presentacion-admin", asi que el nombre del video se saca
// cortando el sufijo que pone Playwright.
const nombreDe = (webm) => {
  const dir = path.basename(path.dirname(webm))
  return dir.replace(/-video-de-presentacion-.+$/, '')
}

// Durante cuantos segundos arranca el video con la pantalla en blanco.
//
// Playwright empieza a grabar cuando se crea el contexto del navegador, antes
// de que el test haga nada, asi que entra todo el tiempo que tarda la app en
// pintar la primera vez. Calentar el server NO lo arregla: con la instancia
// despierta responde en 211 ms y el blanco sigue siendo de 3,4 s, porque lo
// que tarda es el navegador bajando y ejecutando el bundle de 545 KB con la
// cache fria. Y no hay forma de empezar a grabar despues: la camara se prende
// sola.
//
// La unica forma es recortar, y para que el audio no se desfaste el .srt tiene
// que correr el mismo numero de segundos. La escena 1 arranca 3,0 s despues del
// inicio, que es el momento en que se inyecta la cartela; el blanco dura un
// poco mas porque la cartela entra con una transicion de opacidad. Por eso se
// recorta hasta el primer frame con contraste, que es la cartela ya dibujada,
// y la escena 1 queda con su arranque un pelo mas adelante: la voz arranca
// cuando la cartela ya esta en pantalla, que es lo unico que importa.
const UMBRAL = 0.6
const MAXIMO = 10

// Devuelve el instante del primer frame que no es una pantalla uniforme. Sale
// de signalstats: en un frame plano, YMAX - YMIN es casi cero, y en uno con
// textos y formas es de decenas.
function primerFrameConImagen(archivo) {
  const r = spawnSync(
    FFMPEG,
    ['-hide_banner', '-i', archivo, '-vf', 'signalstats,metadata=print', '-f', 'null', 'NUL'],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }
  )
  const stderr = r.stderr || ''
  if (!stderr.includes('pts_time:')) {
    throw new Error('ffmpeg no devolvio los datos de signalstats')
  }
  const bloques = stderr.split('pts_time:')
  for (let i = 1; i < bloques.length; i++) {
    const t = Number(/^([0-9.]+)/.exec(bloques[i])?.[1])
    const ymin = Number(/YMIN=([0-9.]+)/.exec(bloques[i])?.[1])
    const ymax = Number(/YMAX=([0-9.]+)/.exec(bloques[i])?.[1])
    if ([t, ymin, ymax].every(Number.isFinite) && ymax - ymin >= 20) return t
  }
  return 0
}

// Resta los mismos segundos a los timecodes de un .srt o de un .guion.md. Un
// timecode que queda en negativo se pega a cero: es el caso de la escena 1,
// que arranca casi al mismo tiempo que el recorte, y arranque un poquito
// despues de verse la cartela no se nota.
//
// Un solo regex para los dos archivos porque el separador " --> " del .srt no
// se parece a un timecode y queda intacto, y porque el .guion.md escribe los
// arranques sin milisegundos y el Total con milisegundos.
function correrTimecodes(archivo, segundos) {
  const offset = Math.round(segundos * 1000)
  const p2 = (n) => String(n).padStart(2, '0')
  const antes = fs.readFileSync(archivo, 'utf8')
  const despues = antes.replace(/\d{2}:\d{2}:\d{2}(?:,\d{3})?/g, (v) => {
    const conMs = v.includes(',')
    const [h, m, s] = v.split(':')
    const [seg, mil] = s.split(',')
    const bruto = ((+h * 60 + +m) * 60 + +seg) * 1000 + Number(mil || 0) - offset
    const total = Math.max(0, bruto)
    const reloj =
      `${p2(Math.floor(total / 3600000))}:` +
      `${p2(Math.floor(total / 60000) % 60)}:` +
      `${p2(Math.floor(total / 1000) % 60)}`
    return conMs ? `${reloj},${String(total % 1000).padStart(3, '0')}` : reloj
  })
  fs.writeFileSync(archivo, despues)
}

export default async function globalTeardown() {
  if (!FFMPEG) {
    console.error(
      '\n  No encuentro ffmpeg. Instalalo con "winget install --id Gyan.FFmpeg -e" o definí FFMPEG_PATH en .env.'
    )
    return
  }

  const encontrados = webms(ORIGEN)
  if (!encontrados.length) {
    console.log('  no hay .webm para convertir')
    return
  }

  fs.mkdirSync(DESTINO, { recursive: true })

  for (const webm of encontrados) {
    const nombre = nombreDe(webm)
    const crudo = path.join(DESTINO, `${nombre}.webm`)
    const mp4 = path.join(DESTINO, `${nombre}.mp4`)

    fs.copyFileSync(webm, crudo)
    console.log(`\n  ${nombre}.webm -> ${nombre}.mp4`)

    let corte = 0
    try {
      const blanco = primerFrameConImagen(crudo)
      if (blanco > UMBRAL) {
        if (blanco > MAXIMO) {
          console.log(
            `  el blanco mide ${blanco.toFixed(1)}s, mas que el tope de ${MAXIMO}s: no recorto, revisar a mano`
          )
        } else {
          // Un pelo antes del primer frame con contraste: si se recorta un
          // frame mas adelante, se come el arranque de la cartela.
          corte = Math.round((blanco - 0.08) * 1000) / 1000
          for (const ext of ['srt', 'guion.md']) {
            const p = path.join(DESTINO, `${nombre}.${ext}`)
            if (fs.existsSync(p)) correrTimecodes(p, corte)
          }
          console.log(
            `  recortados ${corte.toFixed(2)}s de pantalla en blanco (el .srt y el .guion.md corrieron lo mismo)`
          )
        }
      }
    } catch (e) {
      console.log(`  no pude medir el blanco (${e.message}): el video queda como esta`)
    }

    execFileSync(
      FFMPEG,
      [
        '-y',
        '-i', crudo,
        // El -ss va aca, despues del -i, que es el que corta en el frame
        // exacto. Adelante del -i agarra el keyframe anterior y deja un
        // congelo de las imagenes del medio.
        ...(corte ? ['-ss', String(corte)] : []),
        // yuv420p no es opcional: sin esto muchos reproductores (y varios
        // players de WhatsApp) rechazan el archivo.
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-crf', '20',
        '-preset', 'slow',
        '-vf', 'scale=1280:720',
        // faststart mueve el indice al principio: sin esto el video no se puede
        // mirar en streaming hasta que se descarga entero.
        '-movflags', '+faststart',
        // El video es mudo, asi que nada de audio: en un .mp4 de WhatsApp una
        // pista vacia confunde a algunos players.
        '-an',
        mp4,
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] }
    )

    const seg = Number(
      execFileSync(
        FFPROBE,
        ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', mp4],
        { encoding: 'utf8' }
      )
    )

    console.log(`  listo: ${nombre}.mp4  ${seg.toFixed(1)}s  ${(fs.statSync(mp4).size / 1048576).toFixed(1)} MB`)
  }
}
