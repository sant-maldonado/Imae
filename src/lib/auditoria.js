import { estados, prioridades, tiposMantenimiento } from './constants'

// Los labels y el despliegue de valores viven ACA y no en el componente, porque
// el historial se muestra en dos lugares distintos: en la ficha y en el PDF de la
// orden. Si cada uno tuviera su copia, el papel y la pantalla podrian terminar
// diciendo cosas distintas, que es justo lo que no puede pasar en un registro.

export const accionLabels = {
  creada: 'Creada',
  actualizada: 'Actualizada',
  estado_cambiado: 'Estado cambiado',
  eliminada: 'Eliminada',
}

export const campoLabels = {
  estado: 'Estado',
  prioridad: 'Prioridad',
  titulo: 'Título',
  descripcion: 'Descripción',
  equipo: 'Equipo',
  tecnico: 'Técnico',
  tipo_mantenimiento: 'Tipo de mantenimiento',
  fecha_programada: 'Fecha programada',
}

// Que campos de la orden se editan, y con que nombre de campo queda en el log.
// La clave es la del form (camelCase) y el valor el snake_case que se guarda.
const CAMPOS_EDITABLES = {
  titulo: 'titulo',
  descripcion: 'descripcion',
  equipoId: 'equipo',
  tecnicoId: 'tecnico',
  prioridad: 'prioridad',
  tipoMantenimiento: 'tipo_mantenimiento',
  fechaProgramada: 'fecha_programada',
}

// Los enums se guardan crudos ('completada') y se muestran con su label
// ('Completada'), porque asi los logs que ya existian en la base se leen bien sin
// tener que reescribirlos.
const LABELS_ENUM = {
  estado: estados,
  prioridad: prioridades,
  tipo_mantenimiento: tiposMantenimiento,
}

const normalizar = (v) => (v === null || v === undefined ? '' : String(v))

const buscarNombre = (lista, id) => lista?.find((x) => String(x.id) === String(id))?.nombre

// Guardar. El log tiene que quedar escrito con el TEXTO que se vio en pantalla,
// no con el id: si despues se renombra o se da de baja un tecnico, el registro
// tiene que seguir diciendo como se llamaba al momento del hecho. Por eso el
// nombre se resuelve aqui y no al mostrar.
export function valorDesdeForm(campo, valor, contexto = {}) {
  const { equipos, tecnicos } = contexto
  const vacio = normalizar(valor)

  if (campo === 'equipo') return buscarNombre(equipos, vacio) || (vacio ? 'Sin asignar' : 'Sin asignar')
  if (campo === 'tecnico') return buscarNombre(tecnicos, vacio) || 'Sin asignar'

  return vacio || '—'
}

// Mostrar. Solo traduce los enums y deja pasar el resto tal cual. Acá NO se
// resuelven ids, porque lo guardado ya es texto: volver a buscar 'Marta Lopez'
// entre los tecnicos no la encontraria y el registro mostraria un guion.
export function valorDelLog(campo, valor) {
  const vacio = normalizar(valor)
  const labels = LABELS_ENUM[campo]
  if (labels) return labels[vacio] || vacio || '—'
  return vacio || '—'
}

// Compara la orden como estaba contra lo que se mando a guardar y devuelve SOLO
// lo que cambio, en el formato que consume createLog.
//
// Se miran los campos que VIENEN en el objeto, no todos los editables: al
// tecnico se le saca el tecnicoId del payload a proposito (no puede reasignarse),
// asi que comparar contra el form completo inventaria un cambio a "Sin asignar"
// que en realidad no ocurrio.
//
// Sin esto, editar una orden sin tocar nada dejaria un "Actualizada" vacio que no
// prueba que nadie rompio nada.
export function camposEditados(orden, enviados, contexto = {}) {
  const { equipos, tecnicos } = contexto
  return Object.entries(CAMPOS_EDITABLES)
    .filter(([clave]) => clave in enviados)
    .filter(([clave]) => normalizar(enviados[clave]) !== normalizar(orden[clave]))
    .map(([clave, campo]) => ({
      campo,
      valor_anterior: valorDesdeForm(campo, orden[clave], { equipos, tecnicos }),
      valor_nuevo: valorDesdeForm(campo, enviados[clave], { equipos, tecnicos }),
    }))
}