import { createClient } from '@/lib/supabase/server'

export default async function FamiliaComunicadosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('familia_id, escuela_id').eq('id', user!.id).single()

  // Get active grupo_ids for alumnas in this family
  const { data: alumnas } = await supabase
    .from('alumnas')
    .select('alumna_grupo(grupo_id, activo)')
    .eq('familia_id', perfil!.familia_id)
    .eq('activa', true)

  const grupoIds = (alumnas ?? []).flatMap((a: any) =>
    (a.alumna_grupo ?? []).filter((ag: any) => ag.activo).map((ag: any) => ag.grupo_id)
  )

  // Get comunicados: global ones + ones targeted to family's groups
  const { data: comunicados } = await supabase
    .from('comunicados')
    .select('*, grupos(nombre)')
    .eq('escuela_id', perfil!.escuela_id)
    .or(grupoIds.length > 0
      ? `grupo_id.is.null,grupo_id.in.(${grupoIds.join(',')})`
      : 'grupo_id.is.null')
    .order('created_at', { ascending: false })

  const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Comunicados</h1>
        <p className="text-white/40 text-sm mt-0.5">Avisos de la escuela</p>
      </div>

      {(comunicados ?? []).length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
          <p className="text-white/30 text-sm">No hay comunicados publicados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(comunicados ?? []).map((c: any) => {
            const fecha = new Date(c.created_at)
            return (
              <div key={c.id} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-white font-medium">{c.titulo}</p>
                  {c.grupos && (
                    <span className="text-xs bg-[#e91e8c]/10 text-[#e91e8c] px-2 py-0.5 rounded-full">{c.grupos.nombre}</span>
                  )}
                </div>
                <p className="text-white/70 text-sm whitespace-pre-wrap leading-relaxed">{c.cuerpo}</p>
                <p className="text-white/30 text-xs mt-3">
                  {fecha.getDate()} de {MESES[fecha.getMonth() + 1]} de {fecha.getFullYear()}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
