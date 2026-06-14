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
type Cuota = { numero: number; estado: 'pendiente' | 'pagado' }
type Participante = { id: string; estado: string; cuotas: Cuota[] | null; alumnas: { id: string; nombre: string; familias: { nombre: string } | null } }
type Evento = {
  id: string; nombre: string; descripcion: string | null
  precio: number; fecha: string | null; num_cuotas: number
  evento_alumna: Participante[]
}

export default function CobrosClient({ escuela, mensualidades: inicial, eventos: inicialeventos, periodoActual }: {
  escuela: { id: string; meses_activos: number[] }
  mensualidades: Mensualidad[]
  eventos: Evento[]
  periodoActual: string
}) {
  const [tab, setTab] = useState<'mensualidades' | 'eventos'>('mensualidades')

  // Mensualidades state
  const [mensualidades, setMensualidades] = useState(inicial)
  const [mesesActivos, setMesesActivos] = useState<number[]>(escuela.meses_activos)
  const [periodoFiltro, setPeriodoFiltro] = useState(periodoActual)
  const [detalle, setDetalle] = useState<Mensualidad | null>(null)
  const [generando, setGenerando] = useState(false)
  const [guardandoMeses, setGuardandoMeses] = useState(false)
  const [descuentoModal, setDescuentoModal] = useState<Mensualidad | null>(null)
  const [descuentoValor, setDescuentoValor] = useState('')
  const [guardandoDescuento, setGuardandoDescuento] = useState(false)

  // Eventos state
  const [eventos, setEventos] = useState(inicialeventos)
  const [eventoAbierto, setEventoAbierto] = useState<string | null>(null)

  const supabase = createClient()

  // ─── Mensualidades ────────────────────────────────────────────
  const periodos = [...new Set(mensualidades.map(m => m.periodo))].sort().reverse()
  const filtradas = mensualidades.filter(m => m.periodo === periodoFiltro)
  const [anio, mesNum] = periodoFiltro.split('-').map(Number)

  const stats = {
    total: filtradas.length,
    pendientes: filtradas.filter(m => m.estado === 'pendiente').length,
    pagadas: filtradas.filter(m => m.estado === 'pagado').length,
    monto: filtradas.reduce((s, m) => s + m.total, 0),
    cobrado: filtradas.filter(m => m.estado === 'pagado').reduce((s, m) => s + m.total, 0),
  }

  function toggleMes(mes: number) {
    setMesesActivos(prev => prev.includes(mes) ? prev.filter(m => m !== mes) : [...prev, mes].sort((a, b) => a - b))
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

  async function aplicarDescuento() {
    if (!descuentoModal) return
    setGuardandoDescuento(true)
    const descuento = parseInt(descuentoValor) || 0
    const total = Math.max(0, descuentoModal.subtotal - descuento)
    await supabase.from('mensualidades').update({ descuento, total }).eq('id', descuentoModal.id)
    setMensualidades(mensualidades.map(m => m.id === descuentoModal.id ? { ...m, descuento, total } : m))
    setDescuentoModal(null)
    setDescuentoValor('')
    setGuardandoDescuento(false)
  }

  // ─── Eventos ──────────────────────────────────────────────────
  async function marcarCuota(ev: Evento, p: Participante, numero: number) {
    const cuotas = p.cuotas ?? []
    const cuota = cuotas.find(c => c.numero === numero)
    const nuevoEstado = cuota?.estado === 'pagado' ? 'pendiente' : 'pagado'
    const alumna_id = p.alumnas.id
    const res = await fetch('/api/escuela/eventos/participantes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evento_id: ev.id, alumna_id, cuota_numero: numero, cuota_estado: nuevoEstado }),
    })
    const data = await res.json()
    if (res.ok) {
      setEventos(eventos.map(e => e.id === ev.id
        ? { ...e, evento_alumna: e.evento_alumna.map(x => x.id === p.id ? data.participante : x) }
        : e
      ))
    }
  }

  const eventosPendientes = eventos.filter(ev => ev.evento_alumna.some(p => {
    const cuotas = p.cuotas ?? []
    return cuotas.some(c => c.estado === 'pendiente')
  }))
  const eventosCerrados = eventos.filter(ev => !eventosPendientes.find(e => e.id === ev.id))

  function renderEvento(ev: Evento) {
    const abierto = eventoAbierto === ev.id
    const totalParticipantes = ev.evento_alumna.length
    const cuotasPagadas = ev.evento_alumna.flatMap(p => p.cuotas ?? []).filter(c => c.estado === 'pagado').length
    const cuotasTotal = ev.evento_alumna.flatMap(p => p.cuotas ?? []).length
    const montoCuota = ev.num_cuotas > 1 ? Number(ev.precio) / ev.num_cuotas : Number(ev.precio)
    const cobrado = cuotasPagadas * montoCuota
    const totalEsperado = cuotasTotal * montoCuota

    return (
      <div key={ev.id} className="border border-white/10 rounded-xl overflow-hidden">
        <button
          onClick={() => setEventoAbierto(abierto ? null : ev.id)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors text-left">
          <div>
            <p className="text-white font-medium">{ev.nombre}</p>
            <p className="text-white/40 text-xs mt-0.5">
              {ev.fecha ? new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long' }) : 'Sin fecha'}
              {' · '}${Number(ev.precio).toLocaleString('es-CO')}{ev.num_cuotas > 1 ? ` (${ev.num_cuotas} cuotas)` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-white text-sm font-medium">{totalParticipantes} alumnas</p>
            <p className="text-xs text-white/40">${cobrado.toLocaleString('es-CO')} / ${totalEsperado.toLocaleString('es-CO')}</p>
          </div>
        </button>

        {abierto && (
          <div className="border-t border-white/10">
            {ev.evento_alumna.length === 0 ? (
              <p className="text-center text-white/30 text-sm py-4">Sin participantes</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {ev.evento_alumna.map(p => {
                  const cuotas = p.cuotas ?? []
                  const pagadas = cuotas.filter(c => c.estado === 'pagado').length
                  return (
                    <li key={p.id} className="px-5 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-white">{p.alumnas.nombre}</p>
                          <p className="text-xs text-white/40">{p.alumnas.familias?.nombre}</p>
                        </div>
                        {ev.num_cuotas === 1 ? (
                          <button onClick={() => marcarCuota(ev, p, 1)}
                            className={`text-xs px-2 py-1 rounded-lg transition-colors ${cuotas[0]?.estado === 'pagado' ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                            {cuotas[0]?.estado === 'pagado' ? '✓ Pagado' : 'Pendiente'}
                          </button>
                        ) : (
                          <span className="text-xs text-white/40">{pagadas}/{ev.num_cuotas} cuotas</span>
                        )}
                      </div>
                      {ev.num_cuotas > 1 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {cuotas.map(c => (
                            <button key={c.numero} onClick={() => marcarCuota(ev, p, c.numero)}
                              className={`text-xs px-2 py-0.5 rounded transition-colors ${c.estado === 'pagado' ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}>
                              {c.estado === 'pagado' ? '✓' : ''} Cuota {c.numero} · ${montoCuota.toLocaleString('es-CO')}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Cobros</h1>
        <p className="text-white/40 text-sm mt-0.5">Estado de pagos por alumna</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 mb-6 w-fit">
        {(['mensualidades', 'eventos'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-[#e91e8c] text-white' : 'text-white/50 hover:text-white'}`}>
            {t === 'mensualidades' ? 'Mensualidades' : 'Eventos'}
          </button>
        ))}
      </div>

      {/* ── Tab Mensualidades ── */}
      {tab === 'mensualidades' && (
        <div>
          {/* Meses de cobro */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
            <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">Meses habilitados</h2>
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

          {/* Período + stats */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <select value={periodoFiltro} onChange={e => setPeriodoFiltro(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]">
                {periodos.length === 0
                  ? <option value={periodoActual}>{MESES_FULL[mesNum]} {anio}</option>
                  : periodos.map(p => {
                      const [a, m] = p.split('-').map(Number)
                      return <option key={p} value={p}>{MESES_FULL[m]} {a}</option>
                    })}
              </select>
              <p className="text-white/40 text-sm">
                {stats.total} familias · ${stats.cobrado.toLocaleString('es-CO')} de ${stats.monto.toLocaleString('es-CO')}
              </p>
            </div>
            <button onClick={generarMes} disabled={generando}
              className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
              {generando ? 'Generando...' : `Generar ${MESES_FULL[mesNum]}`}
            </button>
          </div>

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

          {filtradas.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-12 text-center text-white/30 text-sm">
              No hay mensualidades para este período.{' '}
              {mesesActivos.includes(mesNum) ? 'Usa el botón "Generar" para crearlas.' : 'Este mes no está habilitado para cobro.'}
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
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.estado === 'pagado' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                          {m.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setDetalle(m)}
                            className="text-xs text-white/40 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5">
                            Ver detalle
                          </button>
                          {m.estado === 'pendiente' && (
                            <>
                              <button onClick={() => { setDescuentoModal(m); setDescuentoValor(String(m.descuento || '')) }}
                                className="text-xs text-white/40 hover:text-yellow-400 transition-colors px-2 py-1 rounded hover:bg-white/5">
                                Descuento
                              </button>
                              <button onClick={() => marcarPagada(m)}
                                className="text-xs bg-green-500/10 text-green-400 hover:bg-green-500/20 px-2 py-1 rounded transition-colors">
                                Marcar pagada
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab Eventos ── */}
      {tab === 'eventos' && (
        <div className="space-y-6">
          {eventos.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-12 text-center text-white/30 text-sm">
              No hay eventos creados aún
            </div>
          ) : (
            <>
              {eventosPendientes.length > 0 && (
                <div>
                  <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">Con pagos pendientes</h2>
                  <div className="space-y-3">{eventosPendientes.map(renderEvento)}</div>
                </div>
              )}
              {eventosCerrados.length > 0 && (
                <div>
                  <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">Completamente pagados</h2>
                  <div className="space-y-3">{eventosCerrados.map(renderEvento)}</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal descuento */}
      {descuentoModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-white mb-1">Aplicar descuento</h2>
            <p className="text-white/40 text-xs mb-4">{descuentoModal.familias.nombre} · {MESES_FULL[parseInt(descuentoModal.periodo.split('-')[1])]} {descuentoModal.periodo.split('-')[0]}</p>
            <div className="mb-4">
              <label className="block text-xs text-white/50 mb-1">Valor del descuento ($)</label>
              <input
                type="number" min="0" max={descuentoModal.subtotal}
                value={descuentoValor}
                onChange={e => setDescuentoValor(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]"
                placeholder="0"
              />
              {descuentoValor && parseInt(descuentoValor) > 0 && (
                <p className="text-xs text-white/40 mt-1">
                  Total con descuento: ${Math.max(0, descuentoModal.subtotal - parseInt(descuentoValor)).toLocaleString('es-CO')}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setDescuentoModal(null); setDescuentoValor('') }}
                className="flex-1 border border-white/10 text-white/60 text-sm py-2 rounded-lg hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <button onClick={aplicarDescuento} disabled={guardandoDescuento}
                className="flex-1 bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm py-2 rounded-lg disabled:opacity-50 transition-colors">
                {guardandoDescuento ? 'Guardando...' : 'Aplicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle mensualidad */}
      {detalle && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{detalle.familias.nombre}</h2>
              <button onClick={() => setDetalle(null)} className="text-white/40 hover:text-white transition-colors">✕</button>
            </div>
            <p className="text-white/40 text-xs mb-4">
              {MESES_FULL[parseInt(detalle.periodo.split('-')[1])]} {detalle.periodo.split('-')[0]}
            </p>
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
