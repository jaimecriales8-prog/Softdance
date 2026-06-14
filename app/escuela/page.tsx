import { createClient } from '@/lib/supabase/server'

export default async function EscuelaDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('escuela_id')
    .eq('id', user!.id)
    .single()

  const escuelaId = perfil?.escuela_id

  const [
    { count: totalGrupos },
    { count: totalFamilias },
    { count: totalAlumnas },
  ] = await Promise.all([
    supabase.from('grupos').select('*', { count: 'exact', head: true }).eq('escuela_id', escuelaId),
    supabase.from('familias').select('*', { count: 'exact', head: true }).eq('escuela_id', escuelaId),
    supabase.from('alumnas').select('*', { count: 'exact', head: true }).eq('escuela_id', escuelaId),
  ])

  const stats = [
    { label: 'Grupos', value: totalGrupos ?? 0 },
    { label: 'Familias', value: totalFamilias ?? 0 },
    { label: 'Alumnas', value: totalAlumnas ?? 0 },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
      <p className="text-white/40 text-sm mb-8">Resumen de tu escuela</p>

      <div className="grid grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-white/50 text-xs uppercase tracking-wider mb-2">{s.label}</p>
            <p className="text-3xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
