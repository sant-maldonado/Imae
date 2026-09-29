// jspdf arrastra ~780 kB. Con el import estatico en las cuatro paginas su
// chunk entraba al grafo de imports de la app y se pedia en el arranque,
// aunque nadie.exportara un PDF. El import dinamico lo saca de ahi: la primera
// visita no lo baja y recien se pide cuando alguien exporta de verdad.
let promesa = null

export function cargarPdf() {
  if (!promesa) {
    promesa = Promise.all([import('jspdf'), import('jspdf-autotable')])
      .then(([jspdf, autotable]) => ({
        jsPDF: jspdf.jsPDF,
        autoTable: autotable.default,
      }))
      .catch((err) => {
        // Si se cachea la promesa rechazada, un fallo transitorio de red deja
        // los PDF rotos para siempre en la sesion.
        promesa = null
        throw err
      })
  }
  return promesa
}
