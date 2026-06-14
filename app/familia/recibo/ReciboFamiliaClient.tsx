'use client'

const MESES_FULL = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

type Mensualidad = {
  id: string; periodo: string; subtotal: number; descuento: number; total: number
  estado: string; fecha_limite: string | null; detalle: any[]
}
type Cuota = { numero: number; estado: string }
type EventoAlumna = {
  id: string; estado: string; total: number; cuotas: Cuota[] | null; lineas: any[] | null
  eventos: { nombre: string; fecha: string | null; num_cuotas: number }
  alumnas: { nombre: string }
}
type Familia = { id: string; nombre: string; email: string; telefono: string | null; alumnas: { id: string; nombre: string }[] }
type Escuela = { nombre: string }

function fmtPeriodo(p: string) {
  const [a, m] = p.split('-').map(Number)
  return `${MESES_FULL[m]} ${a}`
}

function fmtFecha(f: string) {
  return new Date(f + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ReciboFamiliaClient({ familia, escuela, mensualidades, eventos }: {
  familia: Familia; escuela: Escuela; mensualidades: Mensualidad[]; eventos: EventoAlumna[]
}) {
  const totalPendienteMens = mensualidades.filter(m => m.estado === 'pendiente').reduce((s, m) => s + m.total, 0)
  const totalPagadoMens = mensualidades.filter(m => m.estado === 'pagado').reduce((s, m) => s + m.total, 0)

  const totalPendienteEv = eventos.reduce((s, ev) => {
    const cuotas = ev.cuotas ?? []
    const pendientes = cuotas.filter(c => c.estado === 'pendiente').length
    const montoCuota = ev.total / (ev.eventos.num_cuotas || 1)
    return s + pendientes * montoCuota
  }, 0)

  const totalPagadoEv = eventos.reduce((s, ev) => {
    const cuotas = ev.cuotas ?? []
    const pagadas = cuotas.filter(c => c.estado === 'pagado').length
    const montoCuota = ev.total / (ev.eventos.num_cuotas || 1)
    return s + pagadas * montoCuota
  }, 0)

  return (
    <div>
      {/* Controles */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-white">Mi estado de cuenta</h1>
          <p className="text-white/40 text-sm mt-0.5">{escuela.nombre}</p>
        </div>
        <button onClick={() => window.print()}
          className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          Imprimir / PDF
        </button>
      </div>

      <div className="max-w-3xl mx-auto print:max-w-none print:mx-0">
        {/* Encabezado imprimible */}
        <div className="hidden print:block mb-8 border-b border-black/20 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-black">{escuela.nombre}</h1>
              <p className="text-sm text-gray-500 mt-0.5">Estado de cuenta</p>
            </div>
            <p className="text-sm text-gray-500">{new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="mt-4">
            <p className="text-lg font-semibold text-black">{familia.nombre}</p>
            <p className="text-sm text-gray-500">{familia.email}{familia.telefono ? ` · ${familia.telefono}` : ''}</p>
            <p className="text-sm text-gray-500">Alumnas: {familia.alumnas.map(a => a.nombre).join(', ')}</p>
          </div>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-2 gap-3 mb-6 print:grid-cols-4 print:gap-2">
          {[
            { label: 'Mensualidades pendientes', value: totalPendienteMens, color: 'text-yellow-400' },
            { label: 'Mensualidades pagadas', value: totalPagadoMens, color: 'text-green-400' },
            { label: 'Eventos pendientes', value: totalPendienteEv, color: 'text-yellow-400' },
            { label: 'Eventos pagados', value: totalPagadoEv, color: 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 print:bg-gray-50 print:border-gray-200 print:rounded print:p-3">
              <p className="text-white/40 text-xs mb-1 print:text-gray-500">{s.label}</p>
              <p className={`text-lg font-bold ${s.color} print:text-black`}>${s.value.toLocaleString('es-CO')}</p>
            </div>
          ))}
        </div>

        {/* Mensualidades */}
        <section className="mb-8">
          <h2 className="text-base font-semibold text-white mb-3 print:text-black print:text-lg">Mensualidades</h2>
          {mensualidades.length === 0 ? (
            <p className="text-white/30 text-sm">Sin mensualidades registradas</p>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden print:bg-white print:border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 print:border-gray-200 print:bg-gray-50">
                    <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-2.5 print:text-gray-500">Período</th>
                    <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-2.5 print:text-gray-500">Detalle</th>
                    <th className="text-right text-white/40 text-xs uppercase tracking-wider px-4 py-2.5 print:text-gray-500">Total</th>
                    <th className="text-right text-white/40 text-xs uppercase tracking-wider px-4 py-2.5 print:text-gray-500">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {mensualidades.map((m, i) => (
                    <tr key={m.id} className={i < mensualidades.length - 1 ? 'border-b border-white/5 print:border-gray-100' : ''}>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium print:text-black">{fmtPeriodo(m.periodo)}</p>
                        {m.fecha_limite && <p className="text-white/40 text-xs print:text-gray-400">Vence {fmtFecha(m.fecha_limite)}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {(m.detalle ?? []).map((d: any, di: number) => (
                          <div key={di} className="mb-1">
                            <p className="text-white/60 text-xs font-medium print:text-gray-600">{d.alumna}</p>
                            {d.lineas?.map((l: any, li: number) => (
                              <p key={li} className="text-white/40 text-xs print:text-gray-400">{l.concepto} — ${Number(l.valor).toLocaleString('es-CO')}</p>
                            ))}
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-white font-medium print:text-black">${m.total.toLocaleString('es-CO')}</p>
                        {m.descuento > 0 && <p className="text-xs text-green-400 print:text-green-700">Desc. ${m.descuento.toLocaleString('es-CO')}</p>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.estado === 'pagado' ? 'bg-green-500/15 text-green-400 print:bg-green-100 print:text-green-700' : 'bg-yellow-500/15 text-yellow-400 print:bg-yellow-100 print:text-yellow-700'}`}>
                          {m.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Eventos */}
        {eventos.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-white mb-3 print:text-black print:text-lg">Eventos</h2>
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden print:bg-white print:border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 print:border-gray-200 print:bg-gray-50">
                    <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-2.5 print:text-gray-500">Evento</th>
                    <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-2.5 print:text-gray-500">Alumna</th>
                    <th className="text-right text-white/40 text-xs uppercase tracking-wider px-4 py-2.5 print:text-gray-500">Total</th>
                    <th className="text-right text-white/40 text-xs uppercase tracking-wider px-4 py-2.5 print:text-gray-500">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {eventos.map((ev, i) => {
                    const cuotas = ev.cuotas ?? []
                    const pagadas = cuotas.filter(c => c.estado === 'pagado').length
                    return (
                      <tr key={ev.id} className={i < eventos.length - 1 ? 'border-b border-white/5 print:border-gray-100' : ''}>
                        <td className="px-4 py-3">
                          <p className="text-white font-medium print:text-black">{ev.eventos.nombre}</p>
                          {ev.eventos.fecha && <p className="text-white/40 text-xs print:text-gray-400">{fmtFecha(ev.eventos.fecha)}</p>}
                        </td>
                        <td className="px-4 py-3 text-white/60 print:text-gray-600 text-sm">{ev.alumnas.nombre}</td>
                        <td className="px-4 py-3 text-right text-white font-medium print:text-black">${ev.total.toLocaleString('es-CO')}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ev.estado === 'pagado' ? 'bg-green-500/15 text-green-400 print:bg-green-100 print:text-green-700' : 'bg-yellow-500/15 text-yellow-400 print:bg-yellow-100 print:text-yellow-700'}`}>
                            {ev.estado === 'pagado' ? 'Pagado' : pagadas > 0 ? `${pagadas}/${ev.eventos.num_cuotas} cuotas` : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className="hidden print:block mt-8 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center">
          {escuela.nombre} · Generado el {new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </div>
  )
}
