import Link from 'next/link'

const features = [
  {
    icon: '◉',
    title: 'Gestión de familias y alumnas',
    desc: 'Registra familias, alumnas, grupos y actividades extra. Congela alumnas sin perder el historial.',
  },
  {
    icon: '◎',
    title: 'Cobros automáticos',
    desc: 'Genera mensualidades con un clic. Pagos en línea con Wompi o registro manual. Descuentos y matrículas incluidos.',
  },
  {
    icon: '◷',
    title: 'Horarios y calendario',
    desc: 'Administra horarios por grupo o actividad. Las familias y profesores los exportan directo a Google Calendar o iPhone.',
  },
  {
    icon: '◈',
    title: 'Portal para familias',
    desc: 'Cada familia tiene su acceso para ver alumnas, horarios, mensualidades, eventos y comunicados.',
  },
  {
    icon: '◆',
    title: 'Eventos y competencias',
    desc: 'Crea eventos con conceptos de cobro individuales por alumna. Maneja cuotas y registra pagos fácilmente.',
  },
  {
    icon: '▦',
    title: 'Comunicados',
    desc: 'Envía avisos a todas las familias o a un grupo específico. Aparecen en el portal y llegan por email.',
  },
]

const planes = [
  {
    nombre: 'Básico',
    precio: '$149.000',
    periodo: '/mes',
    desc: 'Para escuelas pequeñas que quieren organizar su gestión.',
    items: [
      'Hasta 3 grupos',
      'Familias y alumnas ilimitadas',
      'Mensualidades y cobros',
      'Portal de familias',
      'Soporte por email',
    ],
    cta: 'Solicitar acceso',
    destacado: false,
  },
  {
    nombre: 'Pro',
    precio: '$299.000',
    periodo: '/mes',
    desc: 'Para escuelas en crecimiento con múltiples grupos y profesores.',
    items: [
      'Grupos ilimitados',
      'Profesores con portal propio',
      'Eventos y competencias',
      'Pagos en línea con Wompi',
      'Exportación a calendario',
      'Comunicados con email',
      'Soporte prioritario',
    ],
    cta: 'Comenzar ahora',
    destacado: true,
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight">
            Soft<span className="text-[#e91e8c]">dance</span>
          </span>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm text-white/60 hover:text-white transition-colors hidden sm:block">
              Funciones
            </a>
            <a href="#precios" className="text-sm text-white/60 hover:text-white transition-colors hidden sm:block">
              Precios
            </a>
            <Link href="/login"
              className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-28 px-6 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#e91e8c]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/60 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e91e8c]" />
            Diseñado para escuelas de danza en Colombia
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-none mb-6">
            Gestiona tu escuela<br />
            <span className="text-[#e91e8c]">sin complicaciones</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            Softdance reemplaza las hojas de cálculo y los grupos de WhatsApp.
            Cobros, horarios, comunicados y portal para familias — todo en un solo lugar.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#precios"
              className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white font-medium px-8 py-3.5 rounded-xl text-sm transition-colors">
              Ver planes
            </a>
            <Link href="/login"
              className="border border-white/10 hover:bg-white/5 text-white/70 hover:text-white font-medium px-8 py-3.5 rounded-xl text-sm transition-colors">
              Ingresar a mi cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14 border-y border-white/10 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-8 text-center">
          {[
            { valor: 'Multi-tenant', label: 'Cada escuela aislada' },
            { valor: 'Wompi', label: 'Pagos en línea' },
            { valor: 'iOS & Google', label: 'Exporta tu calendario' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-xl sm:text-2xl font-bold text-white mb-1">{s.valor}</p>
              <p className="text-white/40 text-xs sm:text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Todo lo que necesitas</h2>
            <p className="text-white/50 max-w-xl mx-auto">
              Desde el registro de alumnas hasta los pagos en línea, Softdance cubre cada parte de la operación de tu escuela.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => (
              <div key={f.title}
                className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.06] hover:border-white/20 transition-all">
                <span className="text-[#e91e8c] text-2xl mb-4 block">{f.icon}</span>
                <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Precios */}
      <section id="precios" className="py-24 px-6 bg-white/[0.02] border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Precios simples</h2>
            <p className="text-white/50">Sin costos ocultos. Cancela cuando quieras.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {planes.map(p => (
              <div key={p.nombre}
                className={`rounded-2xl p-7 border relative ${p.destacado
                  ? 'bg-[#e91e8c]/5 border-[#e91e8c]/30'
                  : 'bg-white/[0.03] border-white/10'}`}>
                {p.destacado && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#e91e8c] text-white text-xs font-medium px-3 py-1 rounded-full">
                      Recomendado
                    </span>
                  </div>
                )}
                <p className="text-white/60 text-sm mb-1">{p.nombre}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold text-white">{p.precio}</span>
                  <span className="text-white/40 text-sm mb-1">{p.periodo}</span>
                </div>
                <p className="text-white/40 text-xs mb-6">{p.desc}</p>
                <ul className="space-y-2.5 mb-8">
                  {p.items.map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-white/70">
                      <span className="text-[#e91e8c] text-xs">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <a href="mailto:hola@softdance.co"
                  className={`block text-center py-2.5 rounded-lg text-sm font-medium transition-colors ${p.destacado
                    ? 'bg-[#e91e8c] hover:bg-[#ff3da8] text-white'
                    : 'border border-white/10 hover:bg-white/5 text-white/70 hover:text-white'}`}>
                  {p.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            ¿Lista para ordenar tu escuela?
          </h2>
          <p className="text-white/50 mb-8">
            Empieza hoy. Sin tarjeta de crédito, sin contratos largos.
          </p>
          <a href="mailto:hola@softdance.co"
            className="inline-block bg-[#e91e8c] hover:bg-[#ff3da8] text-white font-medium px-10 py-3.5 rounded-xl text-sm transition-colors">
            Solicitar acceso
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-white/40 text-sm font-medium">
            Soft<span className="text-[#e91e8c]">dance</span>
          </span>
          <p className="text-white/20 text-xs">© {new Date().getFullYear()} Softdance · Hecho en Colombia</p>
          <Link href="/login" className="text-white/40 hover:text-white text-sm transition-colors">
            Iniciar sesión →
          </Link>
        </div>
      </footer>
    </div>
  )
}
