import { createClient } from '@/lib/supabase/server'

export default async function SuperAdminPage() {
  const supabase = await createClient()

  const [{ count: totalEscuelas }, { count: escuelasActivas }, { count: escuelasCobro }] = await Promise.all([
    supabase.from('escuelas').select('*', { count: 'exact', head: true }),
    supabase.from('escuelas').select('*', { count: 'exact', head: true }).eq('activa', true),
    supabase.from('escuelas').select('*', { count: 'exact', head: true }).eq('cobro_activo', true),
  ])

  const stats = [
    { label: 'Total escuelas', value: totalEscuelas ?? 0 },
    { label: 'Activas', value: escuelasActivas ?? 0 },
    { label: 'Con cobro activo', value: escuelasCobro ?? 0 },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
      <p className="text-white/40 text-sm mb-8">Resumen general de la plataforma</p>

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
