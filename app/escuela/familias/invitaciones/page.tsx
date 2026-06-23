import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export default async function InvitacionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('escuela_id').eq('id', user!.id).single()

  const service = createServiceClient()
  const [{ data: escuela }, { data: alumnas }] = await Promise.all([
    supabase.from('escuelas').select('nombre').eq('id', perfil!.escuela_id).single(),
    service.from('alumnas')
      .select('id, nombre, codigo_vinculacion, familia_id, alumna_grupo(activo, grupos(nombre))')
      .eq('escuela_id', perfil!.escuela_id)
      .eq('activa', true)
      .is('familia_id', null) // Solo las sin cuenta aún
      .order('nombre'),
  ])

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://softdance.grialtech.co'
  const registroUrl = `${appUrl}/registro`

  return (
    <>
      {/* Controles — solo pantalla */}
      <div className="print:hidden mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Invitaciones para familias</h1>
          <p className="text-white/50 text-sm mt-0.5">
            {alumnas?.length ?? 0} alumna{(alumnas?.length ?? 0) !== 1 ? 's' : ''} sin cuenta — imprime y entrega a cada familia
          </p>
        </div>
        <button
          onClick={() => typeof window !== 'undefined' && window.print()}
          className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm"
        >
          🖨 Imprimir todo
        </button>
      </div>

      {(alumnas?.length ?? 0) === 0 ? (
        <div className="print:hidden bg-white/5 border border-white/10 rounded-xl p-12 text-center">
          <p className="text-white/50 text-sm">Todas las alumnas activas ya tienen cuenta vinculada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
          {alumnas!.map((a) => {
            const grupos = (a.alumna_grupo ?? [])
              .filter((ag: any) => ag.activo)
              .map((ag: any) => (Array.isArray(ag.grupos) ? ag.grupos[0] : ag.grupos)?.nombre)
              .filter(Boolean)
            const codigo = a.codigo_vinculacion ?? ''
            const qrData = encodeURIComponent(`${registroUrl}?codigo=${codigo}`)
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${qrData}&bgcolor=ffffff&color=1a1a2e&qzone=2`

            return (
              <div
                key={a.id}
                className="bg-white rounded-2xl p-6 flex gap-5 items-start shadow-sm print:break-inside-avoid print:shadow-none print:border print:border-gray-200"
              >
                {/* QR */}
                <div className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} alt={`QR ${a.nombre}`} width={120} height={120} className="rounded-lg" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">{escuela?.nombre}</p>
                  <p className="text-gray-900 font-bold text-lg leading-tight">{a.nombre}</p>
                  {grupos.length > 0 && (
                    <p className="text-gray-500 text-xs mt-0.5">{grupos.join(', ')}</p>
                  )}

                  <div className="mt-4">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Código de vinculación</p>
                    <p className="text-2xl font-mono font-bold text-[#e91e8c] tracking-widest">{codigo}</p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 leading-snug">
                      Escanea el QR o ingresa a <span className="font-medium text-gray-600">{appUrl}/registro</span> y usa este código para crear tu cuenta.
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  )
}
