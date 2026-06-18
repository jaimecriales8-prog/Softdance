import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import PagarButton from './PagarButton'
import PagarMatriculaButton from './PagarMatriculaButton'
import InfoPagoButton from '../InfoPagoButton'

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default async function FamiliaMensualidadesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('familia_id, escuela_id').eq('id', user!.id).single()

  const service = createServiceClient()

  const [{ data: mensualidades }, { data: matriculas }, { data: configPagos }, { data: escuela }] = await Promise.all([
    supabase.from('mensualidades')
      .select('id, periodo, subtotal, descuento, total, estado, fecha_limite, detalle')
      .eq('familia_id', perfil!.familia_id)
      .order('periodo', { ascending: false }),
    supabase.from('matriculas')
      .select('id, anio, valor, estado')
      .eq('familia_id', perfil!.familia_id)
      .order('anio', { ascending: false }),
    service.from('config_pagos').select('wompi_pub_key').eq('escuela_id', perfil!.escuela_id).maybeSingle(),
    supabase.from('escuelas').select('info_pago, cobro_activo').eq('id', perfil!.escuela_id).single(),
  ])

  const tieneWompi = !!configPagos?.wompi_pub_key && escuela?.cobro_activo

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Mensualidades</h1>
        <p className="text-white/60 text-sm mt-0.5">Historial de cobros</p>
      </div>

      {/* Matrículas */}
      {(matriculas ?? []).length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-white/70 uppercase tracking-wider mb-3">Matrículas</h2>
          <div className="space-y-2">
            {(matriculas ?? []).map(m => (
              <div key={m.id} className={`border rounded-xl px-5 py-3 flex items-center justify-between ${m.estado === 'pagado' ? 'bg-white/5 border-white/10' : 'bg-[#e91e8c]/5 border-[#e91e8c]/20'}`}>
                <div>
                  <p className="text-white font-medium">Matrícula {m.anio}</p>
                  <p className={`text-xs ${m.estado === 'pagado' ? 'text-green-400' : 'text-[#e91e8c]'}`}>
                    {m.estado === 'pagado' ? '✓ Pagada' : 'Pendiente'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-white font-bold">${Number(m.valor).toLocaleString('es-CO')}</p>
                  {m.estado !== 'pagado' && tieneWompi && <PagarMatriculaButton matriculaId={m.id} />}
                  {m.estado !== 'pagado' && !tieneWompi && escuela?.info_pago && <InfoPagoButton info={escuela.info_pago} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-sm font-medium text-white/70 uppercase tracking-wider mb-3">Mensualidades</h2>
      {!mensualidades?.length ? (
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-12 text-center text-white/50 text-sm">
          No hay mensualidades registradas aún
        </div>
      ) : (
        <div className="space-y-3">
          {mensualidades.map(m => {
            const [anio, mesNum] = m.periodo.split('-').map(Number)
            const pagado = m.estado === 'pagado'
            return (
              <div key={m.id} className={`border rounded-xl overflow-hidden ${pagado ? 'bg-white/5 border-white/10' : 'bg-[#e91e8c]/5 border-[#e91e8c]/20'}`}>
                <div className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-white font-medium">{MESES[mesNum]} {anio}</p>
                    <p className="text-white/60 text-xs">
                      {pagado ? 'Pagado' : m.fecha_limite
                        ? `Vence: ${new Date(m.fecha_limite + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}`
                        : 'Pendiente'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-lg">${Number(m.total).toLocaleString('es-CO')}</p>
                    {pagado ? (
                      <span className="text-xs font-medium text-green-400">✓ Pagado</span>
                    ) : (
                      <div className="flex flex-col gap-1.5 items-end mt-1">
                        {tieneWompi && <PagarButton mensualidadId={m.id} />}
                        {escuela?.info_pago && <InfoPagoButton info={escuela.info_pago} />}
                        {!tieneWompi && !escuela?.info_pago && (
                          <span className="text-xs text-[#e91e8c]">Pendiente</span>
                        )}
                      </div>
                    )}
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
                              <span className="text-white/60">{l.concepto}</span>
                              <span className="text-white/70">${Number(l.valor).toLocaleString('es-CO')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {Number(m.descuento) > 0 && (
                      <div className="flex justify-between text-xs border-t border-white/5 pt-2">
                        <span className="text-white/60">Descuento</span>
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
