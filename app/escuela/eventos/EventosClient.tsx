'use client'

import { useState } from 'react'

type Concepto = { nombre: string; valor: number }
type Linea = { concepto: string; valor: number }
type Familia = { nombre: string }
type AlumnaBase = { id: string; nombre: string; familias: Familia | Familia[] | null }
type Cuota = { numero: number; estado: 'pendiente' | 'pagado' }
type Participante = {
  id: string; estado: string; total: number
  cuotas: Cuota[] | null; lineas: Linea[] | null
  alumnas: AlumnaBase | AlumnaBase[]
}
type Evento = {
  id: string; nombre: string; descripcion: string | null
  fecha: string | null; activo: boolean; num_cuotas: number
  conceptos: Concepto[]
  evento_alumna: Participante[]
}

const EMPTY_FORM = { nombre: '', descripcion: '', fecha: '', num_cuotas: '1' }

function getFamilia(a: AlumnaBase): string {
  if (!a.familias) return ''
  const f = Array.isArray(a.familias) ? a.familias[0] : a.familias
  return f?.nombre ?? ''
}
function getAlumna(p: Participante): AlumnaBase {
  return Array.isArray(p.alumnas) ? p.alumnas[0] : p.alumnas
}

export default function EventosClient({ eventos: inicial, alumnas, escuelaId }: {
  eventos: Evento[]; alumnas: AlumnaBase[]; escuelaId: string
}) {
  const [eventos, setEventos] = useState(inicial)
  const [modal, setModal] = useState<'crear' | 'editar' | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [conceptosForm, setConceptosForm] = useState<Concepto[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [eventoActivo, setEventoActivo] = useState<Evento | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [agregandoId, setAgregandoId] = useState<string | null>(null)

  // Modal para configurar lineas de alumna al agregar
  const [modalAlumna, setModalAlumna] = useState<AlumnaBase | null>(null)
  const [lineasAlumna, setLineasAlumna] = useState<Linea[]>([])

  function abrirCrear() {
    setForm(EMPTY_FORM); setConceptosForm([]); setEditId(null); setError(''); setModal('crear')
  }
  function abrirEditar(e: Evento) {
    setForm({ nombre: e.nombre, descripcion: e.descripcion ?? '', fecha: e.fecha ?? '', num_cuotas: e.num_cuotas.toString() })
    setConceptosForm(e.conceptos ?? [])
    setEditId(e.id); setError(''); setModal('editar')
  }
  function cerrar() { setModal(null); setEditId(null); setForm(EMPTY_FORM); setConceptosForm([]); setError('') }

  function addConcepto() { setConceptosForm([...conceptosForm, { nombre: '', valor: 0 }]) }
  function removeConcepto(i: number) { setConceptosForm(conceptosForm.filter((_, idx) => idx !== i)) }
  function updateConcepto(i: number, field: 'nombre' | 'valor', val: string) {
    setConceptosForm(conceptosForm.map((c, idx) => idx === i ? { ...c, [field]: field === 'valor' ? (parseFloat(val) || 0) : val } : c))
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const payload = {
      nombre: form.nombre, descripcion: form.descripcion,
      fecha: form.fecha || null, num_cuotas: parseInt(form.num_cuotas) || 1,
      conceptos: conceptosForm.filter(c => c.nombre.trim()),
    }
    const res = await fetch('/api/escuela/eventos', {
      method: modal === 'crear' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, id: editId }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error'); setLoading(false); return }
    if (modal === 'crear') {
      setEventos([data.evento, ...eventos])
    } else {
      setEventos(eventos.map(ev => ev.id === editId ? { ...ev, ...data.evento } : ev))
      if (eventoActivo?.id === editId) setEventoActivo({ ...eventoActivo, ...data.evento })
    }
    cerrar(); setLoading(false)
  }

  // Abrir modal de líneas al seleccionar alumna para agregar
  function seleccionarAlumna(a: AlumnaBase) {
    if (!eventoActivo) return
    const lineas = (eventoActivo.conceptos ?? []).map(c => ({ concepto: c.nombre, valor: c.valor }))
    setLineasAlumna(lineas)
    setModalAlumna(a)
  }

  const totalLineas = lineasAlumna.reduce((s, l) => s + (l.valor || 0), 0)

  async function confirmarAgregarAlumna() {
    if (!eventoActivo || !modalAlumna) return
    setAgregandoId(modalAlumna.id)
    const res = await fetch('/api/escuela/eventos/participantes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evento_id: eventoActivo.id, alumna_id: modalAlumna.id, lineas: lineasAlumna }),
    })
    const data = await res.json()
    if (res.ok) {
      const updated = { ...eventoActivo, evento_alumna: [...eventoActivo.evento_alumna, data.participante] }
      setEventoActivo(updated)
      setEventos(eventos.map(ev => ev.id === eventoActivo.id ? updated : ev))
    }
    setModalAlumna(null); setLineasAlumna([]); setAgregandoId(null)
  }

  async function quitarParticipante(p: Participante) {
    if (!eventoActivo) return
    await fetch('/api/escuela/eventos/participantes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evento_id: eventoActivo.id, alumna_id: getAlumna(p).id }),
    })
    const updated = { ...eventoActivo, evento_alumna: eventoActivo.evento_alumna.filter(x => x.id !== p.id) }
    setEventoActivo(updated)
    setEventos(eventos.map(ev => ev.id === eventoActivo.id ? updated : ev))
  }

  async function marcarCuota(p: Participante, numero: number) {
    if (!eventoActivo) return
    const cuotas = p.cuotas ?? []
    const nuevoEstado = cuotas.find(c => c.numero === numero)?.estado === 'pagado' ? 'pendiente' : 'pagado'
    const res = await fetch('/api/escuela/eventos/participantes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evento_id: eventoActivo.id, alumna_id: getAlumna(p).id, cuota_numero: numero, cuota_estado: nuevoEstado }),
    })
    const data = await res.json()
    if (res.ok) {
      const updated = { ...eventoActivo, evento_alumna: eventoActivo.evento_alumna.map(x => x.id === p.id ? data.participante : x) }
      setEventoActivo(updated)
      setEventos(eventos.map(ev => ev.id === eventoActivo.id ? updated : ev))
    }
  }

  const participantesIds = new Set(eventoActivo?.evento_alumna.map(p => getAlumna(p).id) ?? [])
  const disponibles = alumnas.filter(a =>
    !participantesIds.has(a.id) &&
    (a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
     getFamilia(a).toLowerCase().includes(busqueda.toLowerCase()))
  )

  return (
    <div className="flex gap-6">
      {/* Lista eventos */}
      <div className={eventoActivo ? 'w-1/2' : 'w-full'}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Eventos</h1>
            <p className="text-white/40 text-sm mt-0.5">Cobros únicos por evento</p>
          </div>
          <button onClick={abrirCrear}
            className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Nuevo evento
          </button>
        </div>

        {/* Modal crear/editar */}
        {modal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold text-white mb-4">
                {modal === 'crear' ? 'Nuevo evento' : 'Editar evento'}
              </h2>
              <form onSubmit={guardar} className="space-y-4">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Nombre *</label>
                  <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej: Addicted2Dance Barranquilla 2026"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Descripción</label>
                  <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c] resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Fecha</label>
                    <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Cuotas</label>
                    <input type="number" min="1" max="12" value={form.num_cuotas} onChange={e => setForm({ ...form, num_cuotas: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]" />
                  </div>
                </div>

                {/* Conceptos */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-white/50">Conceptos de cobro</label>
                    <button type="button" onClick={addConcepto}
                      className="text-xs text-[#e91e8c] hover:text-[#ff3da8] transition-colors">+ Agregar</button>
                  </div>
                  {conceptosForm.length === 0 && (
                    <p className="text-xs text-white/30 py-2">Agrega los conceptos que aplican a este evento (ej: Solista, Feet, Uniforme...)</p>
                  )}
                  <div className="space-y-2">
                    {conceptosForm.map((c, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input value={c.nombre} onChange={e => updateConcepto(i, 'nombre', e.target.value)}
                          placeholder="Concepto"
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
                        <input type="number" value={c.valor || ''} onChange={e => updateConcepto(i, 'valor', e.target.value)}
                          placeholder="$0"
                          className="w-28 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
                        <button type="button" onClick={() => removeConcepto(i)}
                          className="text-white/30 hover:text-red-400 transition-colors text-sm px-1">✕</button>
                      </div>
                    ))}
                  </div>
                  {conceptosForm.length > 0 && (
                    <p className="text-xs text-white/30 mt-2">
                      Total base: ${conceptosForm.reduce((s, c) => s + (c.valor || 0), 0).toLocaleString('es-CO')}
                      {parseInt(form.num_cuotas) > 1 && ` · ${form.num_cuotas} cuotas de $${Math.round(conceptosForm.reduce((s, c) => s + (c.valor || 0), 0) / parseInt(form.num_cuotas)).toLocaleString('es-CO')}`}
                    </p>
                  )}
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={cerrar}
                    className="flex-1 border border-white/10 text-white/60 text-sm py-2 rounded-lg hover:bg-white/5 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm py-2 rounded-lg disabled:opacity-50 transition-colors">
                    {loading ? 'Guardando...' : modal === 'crear' ? 'Crear' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {eventos.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-12 text-center text-white/30 text-sm">
            No hay eventos creados aún
          </div>
        ) : (
          <div className="space-y-3">
            {eventos.map(ev => {
              const total = ev.evento_alumna.length
              const pagados = ev.evento_alumna.filter(p => p.estado === 'pagado').length
              const totalEsperado = ev.evento_alumna.reduce((s, p) => s + (p.total || 0), 0)
              const seleccionado = eventoActivo?.id === ev.id
              return (
                <div key={ev.id}
                  onClick={() => setEventoActivo(seleccionado ? null : ev)}
                  className={`border rounded-xl px-5 py-4 cursor-pointer transition-colors ${seleccionado ? 'bg-[#e91e8c]/5 border-[#e91e8c]/30' : 'bg-white/5 border-white/10 hover:bg-white/[0.07]'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{ev.nombre}</p>
                      <p className="text-white/40 text-xs mt-0.5">
                        {ev.fecha ? new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin fecha'}
                        {ev.num_cuotas > 1 && ` · ${ev.num_cuotas} cuotas`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm font-medium">{total} alumnas</p>
                      <p className="text-xs text-green-400">${totalEsperado.toLocaleString('es-CO')} total</p>
                    </div>
                  </div>
                  {ev.descripcion && <p className="text-white/30 text-xs mt-1">{ev.descripcion}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Panel participantes */}
      {eventoActivo && (
        <div className="w-1/2 sticky top-8 self-start">
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">{eventoActivo.nombre}</h2>
                <p className="text-xs text-white/40 mt-0.5">
                  {eventoActivo.evento_alumna.length} participantes
                  {eventoActivo.num_cuotas > 1 && ` · ${eventoActivo.num_cuotas} cuotas`}
                </p>
              </div>
              <button onClick={() => { setEventoActivo(null); setBusqueda('') }}
                className="text-white/40 hover:text-white text-xs px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">✕</button>
            </div>

            {/* Participantes actuales */}
            {eventoActivo.evento_alumna.length > 0 && (
              <div className="border-b border-white/10">
                <ul className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                  {eventoActivo.evento_alumna.map(p => {
                    const a = getAlumna(p)
                    const cuotas = p.cuotas ?? []
                    const montoCuota = eventoActivo.num_cuotas > 1 ? Math.round((p.total || 0) / eventoActivo.num_cuotas) : (p.total || 0)
                    return (
                      <li key={p.id} className="px-5 py-3 hover:bg-white/5 group transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-white">{a.nombre}</p>
                            <p className="text-xs text-white/40">{getFamilia(a)} · ${(p.total || 0).toLocaleString('es-CO')}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {eventoActivo.num_cuotas === 1 ? (
                              <button onClick={() => marcarCuota(p, 1)}
                                className={`text-xs px-2 py-1 rounded-lg transition-colors ${cuotas[0]?.estado === 'pagado' ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                                {cuotas[0]?.estado === 'pagado' ? '✓ Pagado' : 'Pendiente'}
                              </button>
                            ) : (
                              <span className="text-xs text-white/40">
                                {cuotas.filter(c => c.estado === 'pagado').length}/{eventoActivo.num_cuotas}
                              </span>
                            )}
                            <button onClick={() => quitarParticipante(p)}
                              className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 text-xs px-1.5 py-1 rounded transition-all">✕</button>
                          </div>
                        </div>
                        {eventoActivo.num_cuotas > 1 && (
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {cuotas.map(c => (
                              <button key={c.numero} onClick={() => marcarCuota(p, c.numero)}
                                className={`text-xs px-2 py-0.5 rounded transition-colors ${c.estado === 'pagado' ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}>
                                {c.estado === 'pagado' ? '✓' : ''} Cuota {c.numero} · ${montoCuota.toLocaleString('es-CO')}
                              </button>
                            ))}
                          </div>
                        )}
                        {/* Detalle conceptos */}
                        {(p.lineas ?? []).length > 0 && (
                          <div className="mt-2 space-y-0.5">
                            {(p.lineas ?? []).filter(l => l.valor > 0).map((l, i) => (
                              <div key={i} className="flex justify-between text-xs text-white/30">
                                <span>{l.concepto}</span>
                                <span>${l.valor.toLocaleString('es-CO')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* Buscar alumna */}
            <div className="px-4 py-3 border-b border-white/10">
              <input type="text" placeholder="Buscar alumna para agregar..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
            </div>

            {busqueda && (
              <ul className="divide-y divide-white/5 max-h-48 overflow-y-auto">
                {disponibles.length === 0 ? (
                  <li className="px-5 py-4 text-center text-white/30 text-sm">No se encontraron resultados</li>
                ) : disponibles.map(a => (
                  <li key={a.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-white/5 transition-colors">
                    <div>
                      <p className="text-sm text-white">{a.nombre}</p>
                      <p className="text-xs text-white/40">{getFamilia(a)}</p>
                    </div>
                    <button onClick={() => seleccionarAlumna(a)} disabled={agregandoId === a.id}
                      className="text-xs bg-[#e91e8c]/10 text-[#e91e8c] hover:bg-[#e91e8c]/20 px-3 py-1 rounded-lg transition-colors disabled:opacity-50">
                      {agregandoId === a.id ? '...' : 'Agregar'}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!busqueda && eventoActivo.evento_alumna.length === 0 && (
              <p className="text-center text-white/30 text-sm py-6">Busca alumnas para agregar al evento</p>
            )}
          </div>

          <button onClick={() => abrirEditar(eventoActivo)}
            className="mt-3 w-full text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/20 py-2 rounded-lg transition-colors">
            Editar evento
          </button>
        </div>
      )}

      {/* Modal configurar líneas por alumna */}
      {modalAlumna && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-white mb-1">Agregar a {modalAlumna.nombre}</h2>
            <p className="text-xs text-white/40 mb-4">Define los valores que aplican para esta alumna. Pon $0 en los que no aplican.</p>

            {lineasAlumna.length === 0 ? (
              <p className="text-white/30 text-sm py-4 text-center">Este evento no tiene conceptos definidos.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {lineasAlumna.map((l, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-white/70 flex-1">{l.concepto}</span>
                    <input
                      type="number"
                      value={l.valor || ''}
                      onChange={e => setLineasAlumna(lineasAlumna.map((x, idx) => idx === i ? { ...x, valor: parseFloat(e.target.value) || 0 } : x))}
                      placeholder="0"
                      className="w-32 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white text-right focus:outline-none focus:border-[#e91e8c]"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-white/10 pt-3 mb-4">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-white/60">Total</span>
                <span className="text-white">${totalLineas.toLocaleString('es-CO')}</span>
              </div>
              {eventoActivo && eventoActivo.num_cuotas > 1 && totalLineas > 0 && (
                <p className="text-xs text-white/30 mt-1 text-right">
                  {eventoActivo.num_cuotas} cuotas de ${Math.round(totalLineas / eventoActivo.num_cuotas).toLocaleString('es-CO')}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setModalAlumna(null); setLineasAlumna([]) }}
                className="flex-1 border border-white/10 text-white/60 text-sm py-2 rounded-lg hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmarAgregarAlumna} disabled={!!agregandoId}
                className="flex-1 bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm py-2 rounded-lg disabled:opacity-50 transition-colors">
                {agregandoId ? 'Agregando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
