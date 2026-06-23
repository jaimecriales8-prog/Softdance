import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

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
  const anio = ahora.getFullYear()
  const mes = ahora.getMonth() + 1

  const [{ data: escuela }, { data: familia }] = await Promise.all([
    supabase.from('escuelas').select('nombre').eq('id', perfil!.escuela_id).single(),
    supabase.from('familias').select('nombre').eq('id', perfil!.familia_id).single(),
  ])

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
      .select('total, estado')
      .eq('familia_id', perfil!.familia_id)
      .eq('periodo', periodo)
      .maybeSingle(),
    supabase.from('matriculas')
      .select('valor, estado')
      .eq('familia_id', perfil!.familia_id)
      .eq('anio', anio)
      .maybeSingle(),
    supabase.from('evento_alumna')
      .select('total, cuotas, eventos(num_cuotas)')
      .in('alumna_id', alumnaIds.length > 0 ? alumnaIds : [dummyId])
      .eq('estado', 'pendiente'),
  ])

  const deudaMens = mensualidad?.estado !== 'pagado' ? (mensualidad?.total ?? 0) : 0
  const deudaMat = matricula?.estado !== 'pagado' ? (matricula?.valor ?? 0) : 0
  const deudaEv = (eventosAlumna ?? []).reduce((s: number, ev: any) => {
    const cuotas = ev.cuotas ?? []
    const pendientes = cuotas.filter((c: any) => c.estado === 'pendiente').length
    const evData = Array.isArray(ev.eventos) ? ev.eventos[0] : ev.eventos
    return s + pendientes * Math.round(ev.total / (evData?.num_cuotas || 1))
  }, 0)
  const totalDeuda = deudaMens + deudaMat + deudaEv

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-white/40 text-sm">{escuela?.nombre}</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">{familia?.nombre ?? 'Bienvenida'}</h1>
        <p className="text-white/30 text-xs mt-0.5">{MESES[mes]} {ahora.getFullYear()}</p>
      </div>

      {/* ── ALUMNAS ──────────────────────────────────── */}
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
                      {(grupos.length > 0 || actividades.length > 0) && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {grupos.map((g: any) => (
                            <span key={g.id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${g.es_elite ? 'bg-yellow-500/15 text-yellow-300' : 'bg-[#e91e8c]/15 text-[#e91e8c]'}`}>
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

      {/* ── SALDO ────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Saldo</h2>
        <Link href="/familia/mensualidades">
          {totalDeuda > 0 ? (
            <div className="bg-yellow-500/8 border border-yellow-500/25 rounded-xl px-5 py-5 flex items-center justify-between hover:bg-yellow-500/12 transition-colors">
              <div>
                <p className="text-yellow-300/70 text-xs font-semibold uppercase tracking-wider mb-1">Saldo pendiente</p>
                <p className="text-white font-bold text-3xl">${totalDeuda.toLocaleString('es-CO')}</p>
              </div>
              <span className="text-yellow-400/50 text-4xl">›</span>
            </div>
          ) : (
            <div className="bg-green-500/8 border border-green-500/20 rounded-xl px-5 py-5 flex items-center justify-between hover:bg-green-500/12 transition-colors">
              <div>
                <p className="text-green-300/70 text-xs font-semibold uppercase tracking-wider mb-1">Saldo</p>
                <p className="text-green-300 font-bold text-xl">Todo al día ✓</p>
              </div>
              <span className="text-green-400/50 text-4xl">›</span>
            </div>
          )}
        </Link>
      </section>
    </div>
  )
}
