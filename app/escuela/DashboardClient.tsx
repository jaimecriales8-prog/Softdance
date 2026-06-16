'use client'

import { useState } from 'react'

export default function DashboardClient({ stats, escuela, tieneWompi }: {
  stats: { grupos: number; familias: number; alumnas: number; profesores: number; clases: number; eventos: number }
  escuela: { id: string; nombre: string; info_pago: string | null }
  tieneWompi: boolean
}) {
  const [infoPago, setInfoPago] = useState(escuela?.info_pago ?? '')
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  async function guardarInfoPago() {
    setGuardando(true); setGuardado(false)
    await fetch('/api/escuela/config-pagos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ info_pago: infoPago }),
    })
    setGuardando(false); setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  const statItems = [
    { label: 'Grupos', value: stats.grupos },
    { label: 'Familias', value: stats.familias },
    { label: 'Alumnas', value: stats.alumnas },
    { label: 'Profesores', value: stats.profesores },
    { label: 'Clases', value: stats.clases },
    { label: 'Eventos activos', value: stats.eventos },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
      <p className="text-white/40 text-sm mb-8">Resumen de tu escuela</p>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mb-8">
        {statItems.map(s => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-white/50 text-xs uppercase tracking-wider mb-2">{s.label}</p>
            <p className="text-3xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Configuración de pagos */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-1">Configuración de pagos</h2>
        <p className="text-white/40 text-xs mb-4">Esta información la ven los padres cuando tienen un pago pendiente.</p>

        <div className="flex items-center gap-3 mb-5">
          <div className={`w-2 h-2 rounded-full ${tieneWompi ? 'bg-green-400' : 'bg-white/20'}`} />
          <span className="text-sm text-white/60">
            {tieneWompi ? 'Wompi configurado — los padres pueden pagar en línea' : 'Wompi no configurado — contacta al soporte para activarlo'}
          </span>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">
            Instrucciones de pago manual (transferencia, Nequi, etc.)
          </label>
          <textarea
            value={infoPago}
            onChange={e => { setInfoPago(e.target.value); setGuardado(false) }}
            rows={4}
            placeholder={`Ej:\nBanco: Bancolombia\nCuenta ahorros: 123-456789-00\nNIT: 900.123.456-7\nNequi: 3001234567\n\nEnviar comprobante al WhatsApp 300...`}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c] resize-none"
          />
          <button
            onClick={guardarInfoPago}
            disabled={guardando}
            className="mt-2 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
            {guardando ? 'Guardando...' : guardado ? '✓ Guardado' : 'Guardar instrucciones'}
          </button>
        </div>
      </div>
    </div>
  )
}
