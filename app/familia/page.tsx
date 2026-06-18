import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import InfoPagoButton from './InfoPagoButton'
import PagarButton from './mensualidades/PagarButton'

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function calcularEdad(fecha: string) {
  const hoy = new Date()
  const nac = new Date(fecha)
  let edad = hoy.getFullYear() - nac.getFullYear()
  if (hoy < new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate())) edad--
  return edad
}

function fmtFecha(f: string) {
  return new Date(f + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
}

export default async function FamiliaHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('familia_id, escuela_id').eq('id', user!.id).single()

  const ahora = new Date()
  const periodo = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`
  const anio = ahora.getFullYear()
  const mes = ahora.getMonth() + 1

  const service = createServiceClient()
  const { data: configPagos } = await service.from('config_pagos').select('wompi_pub_key').eq('escuela_id', perfil!.escuela_id).maybeSingle()

  const [{ data: escuela }, { data: familia }] = await Promise.all([
    supabase.from('escuelas').select('nombre, info_pago, cobro_activo').eq('id', perfil!.escuela_id).single(),
    supabase.from('familias').select('nombre').eq('id', perfil!.familia_id).single(),
  ])

  const tieneWompi = !!configPagos?.wompi_pub_key && escuela?.cobro_activo

  const { data: alumnas } = await supabase.from('alumnas')
    .select(`id, nombre, fecha_nacimiento, congelada,
      alumna_grupo(activo, grupos(id, nombre, es_elite)),
      alumna_actividad(actividades_extra(id, nombre))`)
    .eq('familia_id', perfil!.familia_id)
    .eq('activa', true)
    .order('nombre')

  const alumnaIds = (alumnas ?? []).map((a: any) => a.id)
  const dummyId = '00000000-0000-0000-0000-000000000000'

  const [{ data: mensualidad }, { data: matricula }, { data: eventosAlumna }] = await Promise.all([
    supabase.from('mensualidades')
      .select('id, total, estado, fecha_limite')
      .eq('familia_id', perfil!.familia_id)
      .eq('periodo', periodo)
      .maybeSingle(),
    supabase.from('matriculas')
      .select('id, anio, valor, estado')
      .eq('familia_id', perfil!.familia_id)
      .eq('anio', anio)
      .maybeSingle(),
    supabase.from('evento_alumna')
      .select('id, total, estado, eventos(nombre), alumnas(nombre)')
      .in('alumna_id', alumnaIds.length > 0 ? alumnaIds : [dummyId])
      .eq('estado', 'pendiente'),
  ])

  const hayPendiente =
    (mensualidad && mensualidad.estado !== 'pagado') ||
    (matricula && matricula.estado !== 'pagado') ||
    (eventosAlumna ?? []).length > 0

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p className="text-white/50 text-sm">{escuela?.nombre}</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">{familia?.nombre ?? 'Bienvenida'}</h1>
        <p className="text-white/40 text-xs mt-0.5">{MESES[mes]} {ahora.getFullYear()}</p>
      </div>

      {/* ── ALUMNAS (primero) ──────────────────────── */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Mis hijas</h2>
        {(alumnas ?? []).length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-5 rounded-xl border border-dashed border-white/10">
            <p className="text-white/30 text-sm">No hay alumnas activas registradas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(alumnas ?? []).map((a: any) => {
              const grupos = (a.alumna_grupo ?? [])
                .filter((ag: any) => ag.activo)
                .map((ag: any) => Array.isArray(ag.grupos) ? ag.grupos[0] : ag.grupos)
                .filter(Boolean)
              const actividades = (a.alumna_actividad ?? [])
                .map((aa: any) => Array.isArray(aa.actividades_extra) ? aa.actividades_extra[0] : aa.actividades_extra)
                .filter(Boolean)
              return (
                <div key={a.id} className={`border rounded-xl p-4 ${a.congelada ? 'bg-blue-900/10 border-blue-500/20' : 'bg-white/5 border-white/10'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#e91e8c]/15 flex items-center justify-center text-[#e91e8c] font-bold text-lg shrink-0">
                      {a.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-semibold">{a.nombre}</p>
                        {a.congelada && <span className="text-xs text-blue-400 font-medium">❄ Congelada</span>}
                      </div>
                      {a.fecha_nacimiento && (
                        <p className="text-white/50 text-xs mt-0.5">{calcularEdad(a.fecha_nacimiento)} años</p>
                      )}
                      {grupos.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {grupos.map((g: any) => (
                            <span key={g.id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              g.es_elite
                                ? 'bg-yellow-500/15 text-yellow-300'
                                : 'bg-[#e91e8c]/15 text-[#e91e8c]'
                            }`}>
                              {g.nombre}{g.es_elite ? ' ⭐' : ''}
                            </span>
                          ))}
                          {actividades.map((ac: any) => (
                            <span key={ac.id} className="text-xs px-2 py-0.5 rounded-full font-medium bg-white/8 text-white/60">
                              {ac.nombre}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── PAGOS PENDIENTES (segundo) ─────────────── */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Pagos este mes</h2>

        {!hayPendiente ? (
          <div className="flex items-center gap-3 px-4 py-5 rounded-xl border border-green-500/20 bg-green-500/5">
            <span className="text-green-400 font-bold">✓</span>
            <p className="text-green-300/80 text-sm">Todo al día — sin pagos pendientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Mensualidad */}
            {mensualidad && mensualidad.estado !== 'pagado' && (
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-yellow-300/70 font-semibold uppercase tracking-wider mb-0.5">Mensualidad {MESES[mes]}</p>
                  <p className="text-white font-bold text-xl">${Number(mensualidad.total).toLocaleString('es-CO')}</p>
                  {mensualidad.fecha_limite && (
                    <p className="text-white/50 text-xs mt-0.5">Vence {fmtFecha(mensualidad.fecha_limite)}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 items-end shrink-0">
                  {tieneWompi && <PagarButton mensualidadId={mensualidad.id} />}
                  {!tieneWompi && escuela?.info_pago && <InfoPagoButton info={escuela.info_pago} />}
                </div>
              </div>
            )}
            {mensualidad && mensualidad.estado === 'pagado' && (
              <div className="bg-green-500/5 border border-green-500/15 rounded-xl px-5 py-3 flex items-center justify-between">
                <p className="text-white/60 text-sm">Mensualidad {MESES[mes]}</p>
                <span className="text-green-400 text-sm font-medium">✓ Pagado</span>
              </div>
            )}

            {/* Matrícula */}
            {matricula && matricula.estado !== 'pagado' && (
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-yellow-300/70 font-semibold uppercase tracking-wider mb-0.5">Matrícula {anio}</p>
                  <p className="text-white font-bold text-xl">${Number(matricula.valor).toLocaleString('es-CO')}</p>
                </div>
                <Link href="/familia/mensualidades"
                  className="text-xs text-yellow-400 border border-yellow-400/30 hover:bg-yellow-400/10 px-3 py-1.5 rounded-lg transition-colors shrink-0">
                  Ver detalle
                </Link>
              </div>
            )}

            {/* Eventos pendientes */}
            {(eventosAlumna ?? []).length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-4">
                <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-3">
                  Eventos ({(eventosAlumna ?? []).length})
                </p>
                <div className="space-y-2">
                  {(eventosAlumna ?? []).map((ev: any) => {
                    const evData = Array.isArray(ev.eventos) ? ev.eventos[0] : ev.eventos
                    const alumna = Array.isArray(ev.alumnas) ? ev.alumnas[0] : ev.alumnas
                    return (
                      <div key={ev.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-white font-medium">{evData?.nombre}</p>
                          <p className="text-xs text-white/50">{alumna?.nombre}</p>
                        </div>
                        <p className="text-yellow-400 text-sm font-semibold">${Number(ev.total).toLocaleString('es-CO')}</p>
                      </div>
                    )
                  })}
                </div>
                <Link href="/familia/mensualidades"
                  className="block text-center text-xs text-white/40 hover:text-white mt-3 transition-colors">
                  Ver detalle de pagos →
                </Link>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/familia/horarios"
          className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors">
          <p className="text-white font-medium text-sm">Horarios</p>
          <p className="text-white/50 text-xs mt-0.5">Clases de tus hijas</p>
        </Link>
        <Link href="/familia/mensualidades"
          className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors">
          <p className="text-white font-medium text-sm">Historial pagos</p>
          <p className="text-white/50 text-xs mt-0.5">Mensualidades y más</p>
        </Link>
      </div>
    </div>
  )
}
