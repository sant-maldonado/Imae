// Genera la locucion de los videos y la empasta al MP4.
//
//   node e2e-demo/voz.mjs admin      arma la voz de admin.mp4
//   node e2e-demo/voz.mjs tecnico    idem para tecnico.mp4
//   node e2e-demo/voz.mjs --medir    imprime los ms que deberia tener cada escena
//
// De donde sale el texto: del .srt que escribe la corrida de Playwright. Ahi
// esta cada leyenda con el instante exacto en que aparece, asi que la frase se
// apoya en el mismo milisegundo que el texto y no hay que estimar nada.
//
// De donde sale el cuerpo del guion: de los milisegundos que cada spec le pasa
// a escena(), multiplicados por el RITMO de ayuda.js. O sea, el texto de las
// escenas y la duracion de las escenas estan en el mismo archivo, uno al lado
// del otro, y por eso un cambio de texto obliga a volver a medir (--medir) antes
// de regrabar.
//
// La voz es de edge-tts (voces neuronales de Microsoft, sin clave de API). Los
// clips quedan sueltos en videos/voz/<rol>/NN-slug.mp3: si alguno no te gusta
// lo regrabas con otro grabador, lo guardas con el mismo nombre y corres el
// script otra vez, y el audio nuevo va al video.

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'

const ROLES = ['admin', 'tecnico']

// edge-tts y no SAPI: las dos voces de SAPI que hay en esta maquina (David y
// Zira) son en ingles y leen mal el espanol. Se invoca como modulo de python
// porque el ejecutable edge-tts.exe no queda en el PATH de una sesion vieja de
// PowerShell.
const PYTHON = process.env.PYTHON_BIN || 'python'
const VOZ = 'es-AR-TomasNeural'

// 350ms de aire al final de cada frase, para que la voz no termine pegada a la
// siguiente. Es tambien el margen que absorbe el desvio de +-2% entre medir y
// generar el audio, asi que no hay que re-medir por cada tilde que se agrega.
const AIRE_MS = 350

// RITMO de ayuda.js. Tiene que coincidir o los tiempos del spec no son los
// tiempos en pantalla.
const RITMO = 1.45

// El sumidero de ffmpeg se llama distinto segun la plataforma.
const NULO = process.platform === 'win32' ? 'NUL' : '/dev/null'

const DIR = 'videos'
const FFMPEG = (() => {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH
  const raiz = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages')
  if (!fs.existsSync(raiz)) return 'ffmpeg'
  const c = fs
    .readdirSync(raiz)
    .filter((d) => d.startsWith('Gyan.FFmpeg'))
    .flatMap((d) => {
      const b = path.join(raiz, d)
      return fs.readdirSync(b).map((s) => path.join(b, s, 'bin', 'ffmpeg.exe'))
    })
    .filter((p) => fs.existsSync(p))
    .sort()
  return c.length ? c[c.length - 1] : 'ffmpeg'
})()
const FFPROBE = path.join(path.dirname(FFMPEG), 'ffprobe.exe')

// --------------------------------------------------------------- sanitizar

// Lo que se narra no es literalmente el cartel: hay que sacarle lo que en voz
// alta suena mal. Hoy son dos cosas, la URL del cierre (que se lee como una
// secuencia de letras) y el guion largo, que la voz de Microsoft se lo come
// como una pausa.
function sanear(texto) {
  return texto
    .replace(/\b[\w-]+\.[\w-]+\.[a-z]{2,}(?:\/\S*)?/gi, '')
    .replace(/[—–]/g, '.')
    .replace(/[·•]/g, ',')
    // El guion de la cartela es "IMAE — bajada", y al pasarlo a punto queda
    // "IMAE . bajada". El espacio de antes del punto hay que sacarlo aparte:
    // la regla de mas abajo que junta ". ," no lo agarra porque no hay coma
    // todavia.
    .replace(/\s+\./g, '.')
    .replace(/\s*,\s*,+/g, ',')
    .replace(/\.\s*,/g, '.')
    .replace(/^\s*[,.\s]+/, '')
    .replace(/\s+/g, ' ')
    .replace(/[.,]\s*$/, '')
    .trim()
}

const slug = (t) =>
  t
    .toLowerCase()
    .normalize('NFD')
    // Los diacriticos se van con un rango explicito: escribirlos a mano como
    // caracteres combinantes es ilegible y el editor los pisa.
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 34)

// ------------------------------------------------------------------- srt

// Acepta "0:00:01,000" y "00:00:01,000": el .srt que escribe el codigo usa los
// dos formatos segun como se arme la linea.
function aMilisegundos(s) {
  const m = s.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})[,.](\d{1,3})$/)
  if (!m) throw new Error(`timestamp raro: "${s}"`)
  const [, h, mm, ss, ms] = m
  return (Number(h || 0) * 3600 + Number(mm) * 60 + Number(ss)) * 1000 + Number(ms.padEnd(3, '0'))
}

function leerSrt(rol) {
  const srt = path.join(DIR, `${rol}.srt`)
  if (!fs.existsSync(srt)) {
    throw new Error(`falta ${srt}. Primero hay que correr el spec de ${rol}.`)
  }
  const bloques = fs.readFileSync(srt, 'utf8').trim().split(/\r?\n\r?\n/)
  return bloques.map((b, i) => {
    // La linea del SRT trae los dos tiempos juntos ("ini --> fin"), hay que
    // partirla antes de convertirlos.
    const linea = b.split(/\r?\n/).find((l) => l.includes('-->'))
    if (!linea) throw new Error(`bloque ${i + 1} de ${rol}.srt sin timestamps`)
    const [ini, fin] = linea.split('-->').map((s) => aMilisegundos(s))
    const texto = b
      .split(/\r?\n/)
      .slice(2)
      .join(' ')
      .trim()
    return { n: i + 1, ini, fin, texto }
  })
}

// ------------------------------------------------------------------- tts

function hablar(texto, destino) {
  correr(PYTHON, ['-m', 'edge_tts', '--voice', VOZ, '--text', texto, '--write-media', destino])
  if (!fs.existsSync(destino) || fs.statSync(destino).size === 0) {
    throw new Error(`edge-tts no genero audio para "${texto}"`)
  }
  return destino
}

const duracion = (archivo) =>
  Number(
    execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', archivo], {
      encoding: 'utf8',
    })
  )

const tieneAudio = (archivo) => {
  const pistas = execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', archivo], {
    encoding: 'utf8',
  })
  return pistas.includes('audio')
}

// ffmpeg escribe veinte lineas de stderr aunque el error real este al final, y
// en PowerShell eso sale como una lluvia de NativeCommandError que tapa el
// mensaje. Se captura y se tira solo el final, que es donde esta el motivo.
function correr(bin, args) {
  try {
    return execFileSync(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] })
  } catch (e) {
    const err = (e.stderr ? e.stderr.toString() : e.message).trim().split(/\r?\n/)
    throw new Error(`${path.basename(bin)} fallo:\n  ${err.slice(-6).join('\n  ')}`)
  }
}

// ---------------------------------------------------------------线路 armado

// La pista final tiene que tener el largo EXACTO del video, con la frase i
// arrancando en el milisegundo en que aparece el texto i. Se arma con un
// silencio de fondo y cada clip con "adelay", que lo corre a su instante. No se
// usan Mixing ni concatenacion a mano porque los huecos entre escenas son
// distintos en cada una (el tiempo de navegacion entre una y otra no es fijo).
function ensamblar(rol, clips, durVideoMs) {
  const pista = path.join(DIR, 'voz', `${rol}.wav`)
  const entradas = []
  const filtros = []

  // anullsrc con los mismos parametros que los clips, porque amix exige que
  // todas las entradas tengan el mismo formato.
  entradas.push('-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono')
  clips.forEach((c, i) => {
    entradas.push('-i', c.archivo)
    filtros.push(`[${i + 1}:a]aresample=24000,adelay=${Math.round(c.ini)}:all=1[a${i}]`)
  })

  const mezclas = ['[0:a]', ...clips.map((_, i) => `[a${i}]`)].join('')
  // loudnorm va adentro del filtergraph y no como -af: el audio sale de un
  // grafo complejo y ffmpeg no deja mezclar un filtro simple con uno complejo
  // sobre la misma pista.
  // -t recorta al largo del video: si un clip se pasa, no queda audio colgando
  // despues del ultimo cuadro.
  filtros.push(`${mezclas}amix=inputs=${clips.length + 1}:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[mix]`)

  correr(FFMPEG, [
    '-y',
    ...entradas,
    '-filter_complex',
    filtros.join(';'),
    '-map',
    '[mix]',
    '-t',
    (durVideoMs / 1000).toFixed(3),
    '-ar',
    '24000',
    '-ac',
    '1',
    pista,
  ])
  return pista
}

// ---------------------------------------------------------------- verificar

// No se puede escuchar el video, asi que el desvio entre la voz y el subtitulo
// se comprueba midiendo. Para cada frase se abre un segundo de la pista que
// quedo empastada, en el instante donde el .srt dice que aparece el texto: si
// hay voz ahi, la frase esta en su lugar. Si esta en silencio, el audio se
// corrio respecto del texto y hay que rehacerlo.
//
// Un segundo alcanza para distinguir voz de silencio, y se arranca 200ms despues
// del inicio porque al comienzo del clip hay unAttack de la sintesis que arranca
// desde cero.
function verificar(rol, clips, archivo) {
  const mudas = []
  clips.forEach((c) => {
    const desde = (c.ini + 200) / 1000
    const largo = Math.min(c.ms, 1200) / 1000
    // spawnSync y no execFileSync porque volumedetect escribe por stderr, y
    // execFileSync solo te devuelve stdout.
    const r = spawnSync(
      FFMPEG,
      [
        '-hide_banner',
        '-nostats',
        // -ss antes de -i es seek rápido: lo que se lee es la pista de audio.
        '-ss', desde.toFixed(3),
        '-t', largo.toFixed(3),
        '-i', archivo,
        '-map', '0:a',
        '-af', 'volumedetect',
        '-f', 'null',
        NULO,
      ],
      { encoding: 'utf8' }
    )
    const m = (r.stderr || '').match(/mean_volume:\s*(-?[\d.]+) dB/)
    if (!m) throw new Error(`no se pudo medir el nivel de la frase ${c.n}`)
    if (Number(m[1]) < -50) mudas.push(`${c.n}. "${c.limpia}"`)
  })

  if (mudas.length) {
    throw new Error(
      `${mudas.length} frase(s) quedaron en silencio donde deberia haber voz:\n  ${mudas.join('\n  ')}`
    )
  }
  console.log(`  sincronia verificada: las ${clips.length} frases tienen voz donde aparece su texto`)
}

// ------------------------------------------------------------------- roles

function armar(rol) {
  const cues = leerSrt(rol)
  const mp4 = path.join(DIR, `${rol}.mp4`)
  if (!fs.existsSync(mp4)) throw new Error(`falta ${mp4}. Primero hay que correr el spec de ${rol}.`)

  const dirClips = path.join(DIR, 'voz', rol)
  fs.mkdirSync(dirClips, { recursive: true })

  console.log(`\n${rol}: ${cues.length} frases`)

  const clips = []
  let desborde = 0

  cues.forEach((c, i) => {
    const limpio = sanear(c.texto)
    const archivo = path.join(dirClips, `${String(i + 1).padStart(2, '0')}-${slug(limpio)}.mp3`)

    // Si el archivo ya existe se reutiliza: los clips se generan una vez, se
    // pueden reescuchar y reemplazar a mano, y el script no vuelve a pegarle
    // al endpoint de Microsoft.
    if (!fs.existsSync(archivo) || fs.statSync(archivo).size === 0) {
      hablar(limpio, archivo)
      console.log(`  ${String(i + 1).padStart(2, '0')} generado  ${limpio}`)
    }

    const ms = Math.round(duracion(archivo) * 1000)
    const ventana = c.fin - c.ini
    const hastaLaProxima = i + 1 < cues.length ? cues[i + 1].ini - c.ini : Infinity
    const desbordeMs = ms - hastaLaProxima
    if (desbordeMs > 0) {
      desborde++
      console.log(
        `  ${String(i + 1).padStart(2, '0')} ENTRA en la siguiente por ${desbordeMs}ms: "${limpio}"` +
          `  (alargar la escena a ${Math.ceil((ms + AIRE_MS) / RITMO / 10) * 10}ms y regrabar)`
      )
    }
    clips.push({ ...c, archivo, ms, ventana, limpia: limpio })
  })

  if (desborde) {
    throw new Error(
      `${desborde} frase(s) se pisan con la siguiente. Alargar la escena en el spec y regrabar antes de empastar.`
    )
  }

  const durVideo = Math.round(duracion(mp4) * 1000)
  const pista = ensamblar(rol, clips, durVideo)
  console.log(`  pista armada: ${pista}  (${(duracion(pista)).toFixed(1)}s para un video de ${(durVideo / 1000).toFixed(1)}s)`)

  // Se guarda el mudo antes de pisarlo, asi queda de comparacion y de red de
  // seguridad si despues hay que rehacer la voz.
  //
  // El chequeo de si el mp4 ya tiene audio es lo que evita que una segunda
  // corrida se lleve por delante el mudo: sin eso copia el .mp4 YA con voz
  // encima de admin-sin-voz.mp4 y el original mudo se pierde para siempre.
  const mudo = path.join(DIR, `${rol}-sin-voz.mp4`)
  if (tieneAudio(mp4)) {
    if (!fs.existsSync(mudo)) {
      throw new Error(
        `${rol}.mp4 ya tiene audio pero no existe ${rol}-sin-voz.mp4. Volve a correr el spec para tener el mudo.`
      )
    }
    console.log('  el mudo ya estaba guardado de una corrida anterior')
  } else {
    fs.copyFileSync(mp4, mudo)
  }
  const final = path.join(DIR, `${rol}.mp4`)
  correr(FFMPEG, [
      '-y',
      '-i', mudo,
      '-i', pista,
      '-map', '0:v',
      '-map', '1:a',
      // El video se copia sin recodificar: ya esta en H.264 y volver a
      // codificarlo solo le agrega perdida de calidad y tiempo.
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-ac', '2',
      // Sin esto el indice queda al final del archivo y el video no se puede
      // empezar a mirar hasta que se descarga entero. El teardown lo pone en la
      // conversion webm->mp4, pero este es otro ffmpeg y no lo hereda.
      '-movflags', '+faststart',
      '-shortest',
      final,
  ])
  verificar(rol, clips, final)
  console.log(`  ${rol}.mp4 con voz  (${(fs.statSync(final).size / 1048576).toFixed(2)} MB)  mudo en ${rol}-sin-voz.mp4`)
}

// ------------------------------------------------------------------- medir

// Recorre los specs y dice que numero deberia tener cada escena. Existe para el
// caso de que se cambie una frase: el texto nuevo hay que medirlo antes de
// regrabar, o la voz se corta o la escena queda mirando al vacio.
function medir() {
  const specs = {
    admin: path.join('e2e-demo', 'admin.spec.js'),
    tecnico: path.join('e2e-demo', 'tecnico.spec.js'),
  }
  const tabla = []

  for (const [rol, archivo] of Object.entries(specs)) {
    const src = fs.readFileSync(archivo, 'utf8')
    // Se buscan las llamadas con partesis balanceadas, porque cartela() se
    // escribe partido en varias lineas cuando el texto es largo.
    const re = /await\s+(escena|cartela)\(/g
    let m
    while ((m = re.exec(src))) {
      let i = re.lastIndex
      let nivel = 1
      while (i < src.length && nivel > 0) {
        if (src[i] === '(') nivel++
        else if (src[i] === ')') nivel--
        i++
      }
      const args = src.slice(re.lastIndex, i - 1)
      const textos = [...args.matchAll(/'([^']*)'/g)].map((x) => x[1])
      const ms = Number((args.match(/(\d{3,5})\s*$/m) || [])[1])
      if (!textos.length || !ms) continue
      // cartela lleva titulo y bajada; los dos se leen en voz alta.
      const texto = m[1] === 'cartela' ? `${textos[0]}. ${textos[1]}` : textos[0]
      tabla.push({ rol, tipo: m[1], limpio: sanear(texto), ms })
    }
  }

  const dirTmp = path.join(DIR, 'voz', 'medir')
  fs.mkdirSync(dirTmp, { recursive: true })

  console.log('\nfrase'.padEnd(64) + '  ahora   audio  deberia')
  for (const t of tabla) {
    const clave = crypto.createHash('md5').update(t.limpio).digest('hex').slice(0, 8)
    const archivo = path.join(dirTmp, `${clave}.mp3`)
    if (!fs.existsSync(archivo) || fs.statSync(archivo).size === 0) hablar(t.limpio, archivo)
    const ms = Math.round(duracion(archivo) * 1000)
    const deberia = Math.ceil((ms + AIRE_MS) / RITMO / 10) * 10
    const marca = deberia > t.ms ? ' <-- agranda' : ''
    console.log(
      `${t.limpio.slice(0, 62).padEnd(64)}  ${String(t.ms).padStart(5)}  ${String(ms).padStart(5)}  ${String(deberia).padStart(8)}${marca}`
    )
  }
  console.log('')
}

// ------------------------------------------------------------------- main

const args = process.argv.slice(2)
try {
  if (args.includes('--medir')) {
    medir()
  } else {
    const roles = args.filter((a) => ROLES.includes(a))
    if (!roles.length) throw new Error(`usar: node e2e-demo/voz.mjs [${ROLES.join('|')}] | --medir`)
    roles.forEach(armar)
  }
} catch (e) {
  console.error(`\n${e.message}\n`)
  process.exit(1)
}
