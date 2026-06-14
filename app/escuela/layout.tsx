import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ReactNode } from 'react'

const navItems = [
  { href: '/escuela', label: 'Dashboard', icon: '▦' },
  { href: '/escuela/grupos', label: 'Grupos', icon: '◈' },
  { href: '/escuela/familias', label: 'Familias', icon: '◉' },
  { href: '/escuela/horarios', label: 'Horarios', icon: '◷' },
  { href: '/escuela/actividades', label: 'Actividades extra', icon: '◆' },
  { href: '/escuela/mensualidades', label: 'Mensualidades', icon: '◎' },
  { href: '/escuela/comunicados', label: 'Comunicados', icon: '◈' },
]

export default async function EscuelaLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, rol, escuela_id')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'admin_escuela') redirect('/login')

  const { data: escuela } = await supabase
    .from('escuelas')
    .select('nombre')
    .eq('id', perfil.escuela_id)
    .single()

  return (
    <div className="min-h-screen flex bg-black text-white">
      <aside className="w-60 flex flex-col border-r border-white/10 bg-black fixed top-0 left-0 h-full">
        <div className="px-6 py-5 border-b border-white/10">
          <span className="text-xl font-bold tracking-tight text-white">Soft<span className="text-[#e91e8c]">dance</span></span>
          <p className="text-xs text-white/40 mt-0.5 truncate">{escuela?.nombre ?? 'Mi escuela'}</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-xs text-white/40 truncate">{perfil?.nombre}</p>
          <form action="/auth/logout" method="post">
            <button className="text-xs text-[#e91e8c] hover:text-[#ff3da8] mt-1 transition-colors">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 ml-60 p-8">
        {children}
      </main>
    </div>
  )
}
