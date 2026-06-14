import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import PagarButton from './mensualidades/PagarButton'
import InfoPagoButton from './InfoPagoButton'

function calcularEdad(fecha: string) {
  const hoy = new Date()
  const nac = new Date(fecha)
  let edad = hoy.getFullYear() - nac.getFullYear()
  if (hoy < new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate())) edad--
  return edad
}

export default async function FamiliaHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('familia_id, escuela_id').eq('id', user!.id).single()

  const ahora = new Date()
  const periodo = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`

  const service = createServiceClient()
  const { data: configPagos } = await service
    .from('config_pagos')
    .select('wompi_pub_key')
    .eq('escuela_id', perfil!.escuela_id)
    .maybeSingle()

  const { data: escuela } = await supabase
    .from('escuelas')
    .select('info_pago')
    .eq('id', perfil!.escuela_id)
    .single()

  const tieneWompi = !!configPagos?.wompi_pub_key

  const [{ data: alumnas }, { data: mensualidad }] = await Promise.all([
    supabase.from('alumnas')
      .select(`id, nombre, fecha_nacimiento, congelada,
        alumna_grupo(activo, grupos(id, nombre, es_elite)),
        alumna_actividad(actividades_extra(id, nombre, precio, es_recurrente))`)
      .eq('familia_id', perfil!.familia_id)
      .eq('activa', true)
      .order('nombre'),
    supabase.from('mensualidades')
      .select('id, periodo, total, estado, fecha_limite, detalle')
      .eq('familia_id', perfil!.familia_id)
      .eq('periodo', periodo)
      .maybeSingle(),
  ])

  const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const mes = ahora.getMonth() + 1

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Inicio</h1>
        <p className="text-white/40 text-sm mt-0.5">{MESES[mes]} {ahora.getFullYear()}</p>
      </div>

      {/* Mensualidad del mes */}
      {mensualidad ? (
        <div className={`border rounded-xl p-5 mb-6 ${mensualidad.estado === 'pagado' ? 'bg-green-500/5 border-green-500/20' : 'bg-[#e91e8c]/5 border-[#e91e8c]/20'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Mensualidad {MESES[mes]}</p>
              <p className="text-3xl font-bold text-white">${Number(mensualidad.total).toLocaleString('es-CO')}</p>
              {mensualidad.fecha_limite && (
                <p className="text-xs text-white/40 mt-1">
                  Vence: {new Date(mensualidad.fecha_limite + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}
                </p>
              )}
            </div>
            {mensualidad.estado === 'pagado' ? (
              <span className="bg-green-500/20 text-green-400 text-sm font-medium px-4 py-2 rounded-lg">✓ Pagado</span>
            ) : (
              <div className="flex flex-col gap-2 items-end">
                {tieneWompi && <PagarButton mensualidadId={mensualidad.id} />}
                {escuela?.info_pago && (
                  <InfoPagoButton info={escuela.info_pago} />
                )}
                {!tieneWompi && !escuela?.info_pago && (
                  <Link href="/familia/mensualidades"
                    className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                    Ver detalle
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
          <p className="text-white/40 text-sm">No hay mensualidad generada para {MESES[mes]}.</p>
        </div>
      )}

      {/* Alumnas */}
      <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">Mis hijas</h2>
      <div className="grid gap-3">
        {(alumnas ?? []).map(a => {
          const gasActivos = (a.alumna_grupo ?? [])
            .filter((ag: any) => ag.activo)
            .map((ag: any) => Array.isArray(ag.grupos) ? ag.grupos[0] : ag.grupos)
            .filter(Boolean)

          const actsAlumna = (a.alumna_actividad ?? [])
            .map((aa: any) => Array.isArray(aa.actividades_extra) ? aa.actividades_extra[0] : aa.actividades_extra)
            .filter(Boolean)

          return (
            <div key={a.id} className={`border rounded-xl p-5 ${a.congelada ? 'bg-blue-900/10 border-blue-500/20' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#e91e8c]/20 flex items-center justify-center text-[#e91e8c] font-bold">
                  {a.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">{a.nombre}</p>
                    {a.congelada && <span className="text-xs text-blue-400">❄ Congelada</span>}
                  </div>
                  <p className="text-white/40 text-xs">
                    {a.fecha_nacimiento ? `${calcularEdad(a.fecha_nacimiento)} años` : 'Sin edad'}
                    {gasActivos.length > 0 && ` · ${gasActivos.map((g: any) => `${g.nombre}${g.es_elite ? ' ⭐' : ''}`).join(' + ')}`}
                  </p>
                  {actsAlumna.length > 0 && (
                    <p className="text-white/30 text-xs mt-0.5">
                      {actsAlumna.map((a: any) => a.nombre).join(' · ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 gap-3 mt-6">
        <Link href="/familia/horarios"
          className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
          <p className="text-white font-medium text-sm">Ver horarios</p>
          <p className="text-white/40 text-xs mt-0.5">Clases de tus hijas</p>
        </Link>
        <Link href="/familia/mensualidades"
          className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
          <p className="text-white font-medium text-sm">Historial pagos</p>
          <p className="text-white/40 text-xs mt-0.5">Mensualidades anteriores</p>
        </Link>
      </div>
    </div>
  )
}
