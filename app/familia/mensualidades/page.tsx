import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import PagarButton from './PagarButton'
import PagarMatriculaButton from './PagarMatriculaButton'
import InfoPagoButton from '../InfoPagoButton'

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function fmtFechaCorta(f: string) {
  return new Date(f + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
}

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
    supabase.from('escuelas').select('info_pago, cobro_activo, nombre').eq('id', perfil!.escuela_id).single(),
  ])

  const tieneWompi = !!configPagos?.wompi_pub_key && escuela?.cobro_activo

  const totalPendienteMens = (mensualidades ?? []).filter(m => m.estado === 'pendiente').reduce((s, m) => s + m.total, 0)
  const totalPendienteMat = (matriculas ?? []).filter(m => m.estado === 'pendiente').reduce((s, m) => s + m.valor, 0)
  const totalPendiente = totalPendienteMens + totalPendienteMat

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Pagos</h1>
        <p className="text-white/50 text-sm mt-0.5">{escuela?.nombre}</p>
      </div>

      {/* Banner pendiente */}
      {totalPendiente > 0 && (
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/25 rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-yellow-300/80 text-xs font-medium uppercase tracking-wider mb-0.5">Saldo pendiente</p>
            <p className="text-yellow-300 text-2xl font-bold">${totalPendiente.toLocaleString('es-CO')}</p>
          </div>
          <div className="text-yellow-500/40 text-4xl">!</div>
        </div>
      )}
      {totalPendiente === 0 && ((mensualidades ?? []).length + (matriculas ?? []).length) > 0 && (
        <div className="mb-6 bg-green-500/10 border border-green-500/25 rounded-xl px-5 py-4 flex items-center gap-3">
          <span className="text-green-400 text-xl font-bold">✓</span>
          <p className="text-green-300 text-sm font-medium">Todo al día — sin saldos pendientes</p>
        </div>
      )}

      {/* ── MATRÍCULA ─────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Matrícula</h2>
        {(matriculas ?? []).length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-5 rounded-xl border border-dashed border-white/10">
            <span className="text-white/20 text-lg">—</span>
            <p className="text-white/30 text-sm">No hay matrículas registradas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(matriculas ?? []).map(m => (
              <div key={m.id} className={`border rounded-xl px-5 py-4 flex items-center justify-between gap-4 ${
                m.estado === 'pagado' ? 'bg-white/4 border-white/8' : 'bg-yellow-500/5 border-yellow-500/20'
              }`}>
                <div>
                  <p className="text-white font-semibold">Matrícula {m.anio}</p>
                  <p className={`text-xs mt-0.5 font-medium ${m.estado === 'pagado' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {m.estado === 'pagado' ? '✓ Pagada' : 'Pendiente de pago'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-white font-bold text-lg">${Number(m.valor).toLocaleString('es-CO')}</p>
                  {m.estado !== 'pagado' && tieneWompi && <PagarMatriculaButton matriculaId={m.id} />}
                  {m.estado !== 'pagado' && !tieneWompi && escuela?.info_pago && <InfoPagoButton info={escuela.info_pago} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── MENSUALIDADES ─────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Mensualidades</h2>
        {!(mensualidades ?? []).length ? (
          <div className="flex items-center gap-3 px-4 py-5 rounded-xl border border-dashed border-white/10">
            <span className="text-white/20 text-lg">—</span>
            <p className="text-white/30 text-sm">No hay mensualidades registradas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(mensualidades ?? []).map(m => {
              const [anio, mesNum] = m.periodo.split('-').map(Number)
              const pagado = m.estado === 'pagado'
              return (
                <div key={m.id} className={`border rounded-xl overflow-hidden ${
                  pagado ? 'bg-white/4 border-white/8' : 'bg-yellow-500/5 border-yellow-500/20'
                }`}>
                  {/* Fila principal */}
                  <div className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-base">{MESES[mesNum]} {anio}</p>
                      <p className={`text-xs mt-0.5 font-medium ${pagado ? 'text-green-400' : 'text-yellow-400'}`}>
                        {pagado
                          ? '✓ Pagado'
                          : m.fecha_limite
                            ? `Vence ${fmtFechaCorta(m.fecha_limite)}`
                            : 'Pendiente de pago'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <p className="text-white font-bold text-xl">${Number(m.total).toLocaleString('es-CO')}</p>
                      {!pagado && tieneWompi && <PagarButton mensualidadId={m.id} />}
                      {!pagado && !tieneWompi && escuela?.info_pago && <InfoPagoButton info={escuela.info_pago} />}
                    </div>
                  </div>

                  {/* Desglose por alumna */}
                  {(m.detalle ?? []).length > 0 && (
                    <div className="border-t border-white/8 px-5 py-3 space-y-3">
                      {(m.detalle ?? []).map((d: any, i: number) => (
                        <div key={i}>
                          <p className="text-xs font-semibold text-white/70 mb-1.5">{d.alumna}</p>
                          <div className="space-y-1">
                            {(d.lineas ?? []).map((l: any, j: number) => (
                              <div key={j} className="flex justify-between items-center">
                                <span className="text-white/50 text-xs">{l.concepto}</span>
                                <span className="text-white/70 text-xs font-medium">${Number(l.valor).toLocaleString('es-CO')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {Number(m.descuento) > 0 && (
                        <div className="flex justify-between items-center border-t border-white/8 pt-2">
                          <span className="text-white/50 text-xs">Descuento aplicado</span>
                          <span className="text-green-400 text-xs font-medium">-${Number(m.descuento).toLocaleString('es-CO')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
