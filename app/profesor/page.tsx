import { createClient } from '@/lib/supabase/server'

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export default async function ProfesorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profesor } = await supabase
    .from('profesores')
    .select('id, nombre, grupo_profesor(grupo_id), actividad_profesor(actividad_id)')
    .eq('user_id', user!.id)
    .single()

  if (!profesor) {
    return <p className="text-white/40">No se encontró información del profesor.</p>
  }

  const grupoIds = (profesor.grupo_profesor as any[]).map((gp: any) => gp.grupo_id)
  const actividadIds = (profesor.actividad_profesor as any[]).map((ap: any) => ap.actividad_id)

  let horarios: any[] = []

  if (grupoIds.length > 0 || actividadIds.length > 0) {
    const q = supabase
      .from('horarios')
      .select('id, dia, hora_inicio, hora_fin, salon, grupos(nombre, es_elite), actividades_extra(nombre)')
      .order('dia').order('hora_inicio')

    if (grupoIds.length > 0 && actividadIds.length > 0) {
      q.or(`grupo_id.in.(${grupoIds.map((id: string) => `"${id}"`).join(',')}),actividad_id.in.(${actividadIds.map((id: string) => `"${id}"`).join(',')})`)
    } else if (grupoIds.length > 0) {
      q.in('grupo_id', grupoIds)
    } else {
      q.in('actividad_id', actividadIds)
    }

    const { data } = await q
    horarios = data ?? []
  }

  const porDia = DIAS.slice(1).map((dia, i) => ({
    dia,
    clases: horarios.filter(h => h.dia === i + 1),
  })).filter(d => d.clases.length > 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Mis horarios</h1>
          <p className="text-white/40 text-sm mt-0.5">{profesor.nombre}</p>
        </div>
        {porDia.length > 0 && (
          <div className="flex gap-2">
            <a href="webcal://softdance.grialtech.co/api/profesor/horarios/ics"
              className="flex items-center gap-2 bg-[#e91e8c]/10 text-[#e91e8c] hover:bg-[#e91e8c]/20 text-xs px-3 py-2 rounded-lg transition-colors">
              <span>📅</span> Suscribirse al calendario
            </a>
            <a href="/api/profesor/horarios/ics" download="mis-clases.ics"
              className="flex items-center gap-2 border border-white/10 text-white/40 hover:text-white hover:border-white/20 text-xs px-3 py-2 rounded-lg transition-colors">
              Descargar .ics
            </a>
          </div>
        )}
      </div>

      {porDia.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-12 text-center text-white/30 text-sm">
          No tienes clases asignadas todavía
        </div>
      ) : (
        <div className="space-y-6">
          {porDia.map(({ dia, clases }) => (
            <div key={dia}>
              <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">{dia}</h2>
              <div className="space-y-2">
                {clases.map((h: any) => {
                  const nombre = h.grupos?.nombre ?? h.actividades_extra?.nombre ?? '—'
                  const esElite = h.grupos?.es_elite
                  return (
                    <div key={h.id} className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">
                          {nombre}
                          {esElite && <span className="ml-2 text-xs text-yellow-400">⭐ Élite</span>}
                        </p>
                        {h.salon && <p className="text-white/40 text-xs mt-0.5">Salón {h.salon}</p>}
                      </div>
                      <p className="text-white/60 text-sm">{h.hora_inicio} – {h.hora_fin}</p>
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
