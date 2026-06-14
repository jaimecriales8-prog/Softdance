import { createClient } from '@/lib/supabase/server'

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export default async function FamiliaHorariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('familia_id, escuela_id').eq('id', user!.id).single()

  // Obtener grupos activos de las alumnas de esta familia
  const { data: alumnas } = await supabase
    .from('alumnas')
    .select('id, nombre, alumna_grupo(activo, grupos(id, nombre, es_elite))')
    .eq('familia_id', perfil!.familia_id)
    .eq('activa', true)

  const grupoIds = new Set<string>()
  const grupoNombres: Record<string, { nombre: string; alumnas: string[] }> = {}

  for (const a of alumnas ?? []) {
    for (const ag of a.alumna_grupo ?? []) {
      if (!ag.activo) continue
      const g = Array.isArray(ag.grupos) ? ag.grupos[0] : ag.grupos
      if (!g) continue
      grupoIds.add(g.id)
      if (!grupoNombres[g.id]) grupoNombres[g.id] = { nombre: g.nombre, alumnas: [] }
      grupoNombres[g.id].alumnas.push(a.nombre)
    }
  }

  // Horarios de esos grupos + actividades extra de sus alumnas
  const { data: horarios } = await supabase
    .from('horarios')
    .select('*, grupos(id, nombre, es_elite), actividades_extra(id, nombre)')
    .eq('escuela_id', perfil!.escuela_id)
    .order('dia_semana').order('hora_inicio')

  const horariosVisibles = (horarios ?? []).filter(h => {
    if (h.grupo_id && grupoIds.has(h.grupo_id)) return true
    return false
  })

  const porDia = DIAS.reduce((acc, _, i) => {
    if (i === 0) return acc
    acc[i] = horariosVisibles.filter(h => h.dia_semana === i)
    return acc
  }, {} as Record<number, any[]>)

  const hayHorarios = horariosVisibles.length > 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Horarios</h1>
        <p className="text-white/40 text-sm mt-0.5">Clases de tus hijas esta semana</p>
      </div>

      {!hayHorarios ? (
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-12 text-center text-white/30 text-sm">
          No hay clases programadas aún
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(porDia).filter(([, hs]) => hs.length > 0).map(([dia, hs]) => (
            <div key={dia}>
              <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">{DIAS[parseInt(dia)]}</h2>
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {hs.map((h, i) => {
                      const g = Array.isArray(h.grupos) ? h.grupos[0] : h.grupos
                      const info = g ? grupoNombres[g.id] : null
                      return (
                        <tr key={h.id} className={`${i < hs.length - 1 ? 'border-b border-white/5' : ''}`}>
                          <td className="px-4 py-3 w-32">
                            <p className="text-white font-mono">{h.hora_inicio.slice(0, 5)} – {h.hora_fin.slice(0, 5)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-white font-medium">{g?.nombre ?? '—'}</p>
                            {info && <p className="text-white/40 text-xs">{info.alumnas.join(', ')}</p>}
                            {g?.es_elite && <span className="text-[#e91e8c] text-xs">élite</span>}
                          </td>
                          <td className="px-4 py-3 text-white/40 text-xs">{h.salon ?? ''}</td>
                          <td className="px-4 py-3 text-white/40 text-xs">{h.profesora ?? ''}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
