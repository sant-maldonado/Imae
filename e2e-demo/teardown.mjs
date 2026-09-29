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
import { execFileSync } from 'node:child_process'

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

    execFileSync(
      FFMPEG,
      [
        '-y',
        '-i', crudo,
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
