import { createClient } from '@/lib/supabase/server'

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default async function FamiliaMensualidadesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('familia_id').eq('id', user!.id).single()

  const { data: mensualidades } = await supabase
    .from('mensualidades')
    .select('id, periodo, subtotal, descuento, total, estado, fecha_limite, detalle')
    .eq('familia_id', perfil!.familia_id)
    .order('periodo', { ascending: false })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Mensualidades</h1>
        <p className="text-white/40 text-sm mt-0.5">Historial de cobros</p>
      </div>

      {!mensualidades?.length ? (
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-12 text-center text-white/30 text-sm">
          No hay mensualidades registradas aún
        </div>
      ) : (
        <div className="space-y-3">
          {mensualidades.map(m => {
            const [anio, mesNum] = m.periodo.split('-').map(Number)
            const pagado = m.estado === 'pagado'
            return (
              <div key={m.id} className={`border rounded-xl overflow-hidden ${pagado ? 'bg-white/5 border-white/10' : 'bg-[#e91e8c]/5 border-[#e91e8c]/20'}`}>
                <div className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{MESES[mesNum]} {anio}</p>
                    <p className="text-white/40 text-xs">
                      {pagado ? 'Pagado' : m.fecha_limite
                        ? `Vence: ${new Date(m.fecha_limite + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}`
                        : 'Pendiente'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-lg">${Number(m.total).toLocaleString('es-CO')}</p>
                    <span className={`text-xs font-medium ${pagado ? 'text-green-400' : 'text-[#e91e8c]'}`}>
                      {pagado ? '✓ Pagado' : 'Pendiente'}
                    </span>
                  </div>
                </div>

                {/* Desglose */}
                {m.detalle?.length > 0 && (
                  <div className="border-t border-white/10 px-5 py-3 space-y-3">
                    {m.detalle.map((d: any, i: number) => (
                      <div key={i}>
                        <p className="text-xs font-medium text-white/60 mb-1">{d.alumna}</p>
                        <div className="space-y-0.5">
                          {d.lineas.map((l: any, j: number) => (
                            <div key={j} className="flex justify-between text-xs">
                              <span className="text-white/40">{l.concepto}</span>
                              <span className="text-white/70">${Number(l.valor).toLocaleString('es-CO')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {Number(m.descuento) > 0 && (
                      <div className="flex justify-between text-xs border-t border-white/5 pt-2">
                        <span className="text-white/40">Descuento</span>
                        <span className="text-green-400">-${Number(m.descuento).toLocaleString('es-CO')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
