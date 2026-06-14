'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MESES_FULL = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

type Mensualidad = {
  id: string; familia_id: string; periodo: string
  subtotal: number; descuento: number; total: number
  estado: string; fecha_limite: string | null; detalle: any
  familias: { nombre: string; email: string; telefono: string | null }
}

type Escuela = { id: string; meses_activos: number[] }

export default function MensualidadesClient({ escuela, mensualidades: inicial, periodoActual }: {
  escuela: Escuela; mensualidades: Mensualidad[]; periodoActual: string
}) {
  const [mensualidades, setMensualidades] = useState(inicial)
  const [mesesActivos, setMesesActivos] = useState<number[]>(escuela.meses_activos)
  const [periodoFiltro, setPeriodoFiltro] = useState(periodoActual)
  const [detalle, setDetalle] = useState<Mensualidad | null>(null)
  const [generando, setGenerando] = useState(false)
  const [guardandoMeses, setGuardandoMeses] = useState(false)

  const supabase = createClient()

  const periodos = [...new Set(mensualidades.map(m => m.periodo))].sort().reverse()
  const filtradas = mensualidades.filter(m => m.periodo === periodoFiltro)

  const stats = {
    total: filtradas.length,
    pendientes: filtradas.filter(m => m.estado === 'pendiente').length,
    pagadas: filtradas.filter(m => m.estado === 'pagado').length,
    monto: filtradas.reduce((s, m) => s + m.total, 0),
    cobrado: filtradas.filter(m => m.estado === 'pagado').reduce((s, m) => s + m.total, 0),
  }

  function toggleMes(mes: number) {
    setMesesActivos(prev =>
      prev.includes(mes) ? prev.filter(m => m !== mes) : [...prev, mes].sort((a, b) => a - b)
    )
  }

  async function guardarMeses() {
    setGuardandoMeses(true)
    await supabase.from('escuelas').update({ meses_activos: mesesActivos }).eq('id', escuela.id)
    setGuardandoMeses(false)
  }

  async function generarMes() {
    setGenerando(true)
    const res = await fetch('/api/escuela/mensualidades/generar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ periodo: periodoFiltro }),
    })
    const data = await res.json()
    if (res.ok && data.mensualidades?.length) {
      setMensualidades(prev => [...data.mensualidades, ...prev])
    }
    setGenerando(false)
  }

  async function marcarPagada(m: Mensualidad) {
    await supabase.from('mensualidades').update({ estado: 'pagado' }).eq('id', m.id)
    setMensualidades(mensualidades.map(x => x.id === m.id ? { ...x, estado: 'pagado' } : x))
  }

  const [anio, mes] = periodoFiltro.split('-').map(Number)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Mensualidades</h1>
        <p className="text-white/40 text-sm mt-0.5">Gestión de cobros mensuales</p>
      </div>

      {/* Configuración de meses */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">Meses de cobro</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {MESES.slice(1).map((m, i) => {
            const num = i + 1
            const activo = mesesActivos.includes(num)
            return (
              <button key={num} onClick={() => toggleMes(num)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activo ? 'bg-[#e91e8c] text-white' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}>
                {m}
              </button>
            )
          })}
        </div>
        <button onClick={guardarMeses} disabled={guardandoMeses}
          className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
          {guardandoMeses ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>

      {/* Header período */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <select value={periodoFiltro} onChange={e => setPeriodoFiltro(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]">
            {periodos.length === 0
              ? <option value={periodoActual}>{MESES_FULL[mes]} {anio}</option>
              : periodos.map(p => {
                  const [a, m] = p.split('-').map(Number)
                  return <option key={p} value={p}>{MESES_FULL[m]} {a}</option>
                })
            }
          </select>
          <p className="text-white/40 text-sm">
            {stats.total} familias · ${stats.cobrado.toLocaleString('es-CO')} cobrado de ${stats.monto.toLocaleString('es-CO')}
          </p>
        </div>
        <button onClick={generarMes} disabled={generando}
          className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
          {generando ? 'Generando...' : `Generar ${MESES_FULL[mes]}`}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Pendientes', value: stats.pendientes, color: 'text-yellow-400' },
          { label: 'Pagadas', value: stats.pagadas, color: 'text-green-400' },
          { label: 'Total mes', value: `$${stats.monto.toLocaleString('es-CO')}`, color: 'text-white' },
        ].map(s => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-white/40 text-xs mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      {filtradas.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-12 text-center text-white/30 text-sm">
          No hay mensualidades para este período.{' '}
          {mesesActivos.includes(mes)
            ? 'Usa el botón "Generar" para crearlas.'
            : 'Este mes no está habilitado para cobro.'}
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Familia</th>
                <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Total</th>
                <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Vence</th>
                <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((m, i) => (
                <tr key={m.id} className={`${i < filtradas.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/5 transition-colors`}>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{m.familias.nombre}</p>
                    <p className="text-white/40 text-xs">{m.familias.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">${m.total.toLocaleString('es-CO')}</p>
                    {m.descuento > 0 && <p className="text-white/40 text-xs">Desc: ${m.descuento.toLocaleString('es-CO')}</p>}
                  </td>
                  <td className="px-4 py-3 text-white/50 text-sm">
                    {m.fecha_limite ? new Date(m.fecha_limite + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      m.estado === 'pagado' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'
                    }`}>
                      {m.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                    <button onClick={() => setDetalle(m)}
                      className="text-xs text-white/40 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5">
                      Ver detalle
                    </button>
                    {m.estado === 'pendiente' && (
                      <button onClick={() => marcarPagada(m)}
                        className="text-xs bg-green-500/10 text-green-400 hover:bg-green-500/20 px-2 py-1 rounded transition-colors">
                        Marcar pagada
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal detalle */}
      {detalle && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{detalle.familias.nombre}</h2>
              <button onClick={() => setDetalle(null)} className="text-white/40 hover:text-white transition-colors">✕</button>
            </div>
            <p className="text-white/40 text-xs mb-4">{MESES_FULL[parseInt(detalle.periodo.split('-')[1])]} {detalle.periodo.split('-')[0]}</p>

            <div className="space-y-4">
              {(detalle.detalle ?? []).map((d: any, i: number) => (
                <div key={i}>
                  <p className="text-sm font-medium text-white mb-1">{d.alumna}</p>
                  <div className="space-y-1">
                    {d.lineas.map((l: any, j: number) => (
                      <div key={j} className="flex justify-between text-sm">
                        <span className="text-white/60">{l.concepto}</span>
                        <span className="text-white">${Number(l.valor).toLocaleString('es-CO')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 mt-4 pt-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Subtotal</span>
                <span className="text-white">${Number(detalle.subtotal).toLocaleString('es-CO')}</span>
              </div>
              {detalle.descuento > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Descuento</span>
                  <span className="text-green-400">-${Number(detalle.descuento).toLocaleString('es-CO')}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold">
                <span className="text-white">Total</span>
                <span className="text-[#e91e8c]">${Number(detalle.total).toLocaleString('es-CO')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
