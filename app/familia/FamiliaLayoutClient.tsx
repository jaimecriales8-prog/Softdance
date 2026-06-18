'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ReactNode } from 'react'
import { Home, Clock, CreditCard, Bell, Calendar, Receipt, LogOut } from 'lucide-react'

const NAV = [
  { href: '/familia', label: 'Inicio', icon: Home, exact: true },
  { href: '/familia/horarios', label: 'Horarios', icon: Clock },
  { href: '/familia/mensualidades', label: 'Pagos', icon: CreditCard },
  { href: '/familia/eventos', label: 'Eventos', icon: Calendar },
  { href: '/familia/comunicados', label: 'Avisos', icon: Bell },
  { href: '/familia/recibo', label: 'Estado de cuenta', icon: Receipt },
]

const NAV_BOTTOM = NAV.slice(0, 5)

export default function FamiliaLayoutClient({ children, nombreFamilia }: { children: ReactNode; nombreFamilia: string }) {
  const pathname = usePathname()
  const router = useRouter()

  function isActive(href: string, exact = false) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  async function logout() {
    await fetch('/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">

      {/* Sidebar — solo desktop */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-white/10 bg-black fixed top-0 left-0 h-full z-30">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#e91e8c] flex items-center justify-center shrink-0 text-white font-bold text-sm">
              S
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">Softdance</p>
              <p className="text-xs text-white/40 mt-0.5 truncate">{nombreFamilia || 'Portal familias'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact)
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-[#e91e8c] text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
                }`}>
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <button onClick={logout}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-colors">
            <LogOut className="h-4 w-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col md:ml-60">

        {/* Top bar — solo móvil */}
        <header className="md:hidden sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0a0a0f]/95 backdrop-blur px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-[#e91e8c] flex items-center justify-center shrink-0 text-white font-bold text-sm">
              S
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-none">Softdance</p>
              <p className="text-[11px] text-white/40 mt-0.5 truncate">{nombreFamilia || 'Portal familias'}</p>
            </div>
          </div>
          <button onClick={logout} aria-label="Cerrar sesión"
            className="h-9 w-9 rounded-lg flex items-center justify-center text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-colors shrink-0">
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        <main className="flex-1 min-w-0 p-4 md:p-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Bottom nav — solo móvil */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 grid grid-cols-5 border-t border-white/10 bg-[#0a0a0f]/95 backdrop-blur px-1 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {NAV_BOTTOM.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-1 py-1 rounded-xl transition-colors ${
                active ? 'text-[#e91e8c]' : 'text-white/30 hover:text-white/60'
              }`}>
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>

    </div>
  )
}
