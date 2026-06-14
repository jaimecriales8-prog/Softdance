import { createClient } from '@/lib/supabase/server'

export default async function FamiliaEventosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('familia_id, escuela_id').eq('id', user!.id).single()

  const { data: alumnas } = await supabase
    .from('alumnas')
    .select(`
      id, nombre,
      evento_alumna(
        id, total, estado, cuotas, lineas,
        eventos(id, nombre, fecha)
      )
    `)
    .eq('familia_id', perfil!.familia_id)
    .eq('activa', true)
    .order('nombre')

  // Group participation by evento
  const eventoMap = new Map<string, {
    id: string; nombre: string; fecha: string | null
    participantes: { alumnaId: string; alumnaNombre: string; total: number; estado: string; cuotas: any[]; lineas: any[] }[]
  }>()

  for (const alumna of alumnas ?? []) {
    for (const ea of (alumna.evento_alumna ?? []) as any[]) {
      const ev = Array.isArray(ea.eventos) ? ea.eventos[0] : ea.eventos
      if (!ev) continue
      if (!eventoMap.has(ev.id)) {
        eventoMap.set(ev.id, { id: ev.id, nombre: ev.nombre, fecha: ev.fecha, participantes: [] })
      }
      eventoMap.get(ev.id)!.participantes.push({
        alumnaId: alumna.id,
        alumnaNombre: alumna.nombre,
        total: ea.total ?? 0,
        estado: ea.estado,
        cuotas: ea.cuotas ?? [],
        lineas: ea.lineas ?? [],
      })
    }
  }

  const eventos = Array.from(eventoMap.values()).sort((a, b) =>
    (b.fecha ?? '').localeCompare(a.fecha ?? '')
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Eventos</h1>
        <p className="text-white/40 text-sm mt-0.5">Participación y pagos</p>
      </div>

      {eventos.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
          <p className="text-white/30 text-sm">Ninguna alumna está inscrita en eventos</p>
        </div>
      ) : (
        <div className="space-y-6">
          {eventos.map(ev => (
            <div key={ev.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10">
                <p className="text-white font-semibold">{ev.nombre}</p>
                {ev.fecha && (
                  <p className="text-white/40 text-xs mt-0.5">
                    {new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>

              <div className="divide-y divide-white/5">
                {ev.participantes.map(p => {
                  const cuotasPagadas = p.cuotas.filter((c: any) => c.estado === 'pagado').length
                  const totalCuotas = p.cuotas.length
                  const todosPagado = p.estado === 'pagado'

                  return (
                    <div key={p.alumnaId} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#e91e8c]/20 flex items-center justify-center text-[#e91e8c] text-sm font-bold">
                            {p.alumnaNombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{p.alumnaNombre}</p>
                            <p className="text-white/40 text-xs">Total: ${Number(p.total).toLocaleString('es-CO')}</p>
                          </div>
                        </div>
                        {todosPagado ? (
                          <span className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-full">✓ Pagado</span>
                        ) : (
                          <span className="text-xs bg-[#e91e8c]/10 text-[#e91e8c] px-3 py-1 rounded-full">
                            {cuotasPagadas}/{totalCuotas} cuotas
                          </span>
                        )}
                      </div>

                      {/* Lineas */}
                      {p.lineas.length > 0 && (
                        <div className="bg-white/5 rounded-lg p-3 mb-3 space-y-1">
                          {p.lineas.map((l: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span className="text-white/50">{l.concepto}</span>
                              <span className="text-white/70">${Number(l.valor).toLocaleString('es-CO')}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Cuotas */}
                      {p.cuotas.length > 1 && (
                        <div className="grid grid-cols-4 gap-2">
                          {p.cuotas.map((c: any) => (
                            <div key={c.numero}
                              className={`text-center text-xs py-1.5 rounded-lg ${c.estado === 'pagado' ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/30'}`}>
                              Cuota {c.numero}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
