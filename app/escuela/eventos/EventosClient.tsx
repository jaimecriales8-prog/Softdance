'use client'

import { useState } from 'react'

type Familia = { nombre: string }
type AlumnaBase = { id: string; nombre: string; familias: Familia | Familia[] | null }
type Participante = { id: string; estado: string; alumnas: AlumnaBase | AlumnaBase[] }
type Evento = {
  id: string; nombre: string; descripcion: string | null
  precio: number; fecha: string | null; activo: boolean
  evento_alumna: Participante[]
}

const EMPTY = { nombre: '', descripcion: '', precio: '', fecha: '' }

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
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [eventoActivo, setEventoActivo] = useState<Evento | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [agregandoId, setAgregandoId] = useState<string | null>(null)

  function abrirCrear() { setForm(EMPTY); setEditId(null); setError(''); setModal('crear') }
  function abrirEditar(e: Evento) {
    setForm({ nombre: e.nombre, descripcion: e.descripcion ?? '', precio: e.precio.toString(), fecha: e.fecha ?? '' })
    setEditId(e.id); setError(''); setModal('editar')
  }
  function cerrar() { setModal(null); setEditId(null); setForm(EMPTY); setError('') }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const payload = { nombre: form.nombre, descripcion: form.descripcion, precio: parseFloat(form.precio) || 0, fecha: form.fecha || null }
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

  async function agregarParticipante(alumna: AlumnaBase) {
    if (!eventoActivo) return
    setAgregandoId(alumna.id)
    const res = await fetch('/api/escuela/eventos/participantes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evento_id: eventoActivo.id, alumna_id: alumna.id }),
    })
    const data = await res.json()
    if (res.ok) {
      const updated = { ...eventoActivo, evento_alumna: [...eventoActivo.evento_alumna, data.participante] }
      setEventoActivo(updated)
      setEventos(eventos.map(ev => ev.id === eventoActivo.id ? updated : ev))
    }
    setAgregandoId(null)
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

  async function marcarPagado(p: Participante) {
    if (!eventoActivo) return
    const nuevoEstado = p.estado === 'pagado' ? 'pendiente' : 'pagado'
    const res = await fetch('/api/escuela/eventos/participantes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evento_id: eventoActivo.id, alumna_id: getAlumna(p).id, estado: nuevoEstado }),
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
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold text-white mb-4">
                {modal === 'crear' ? 'Nuevo evento' : 'Editar evento'}
              </h2>
              <form onSubmit={guardar} className="space-y-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Nombre *</label>
                  <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej: Competencia Regional, Carnavales..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Descripción</label>
                  <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c] resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Precio (COP) *</label>
                    <input type="number" required value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })}
                      placeholder="0"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Fecha</label>
                    <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]" />
                  </div>
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
              const pagados = ev.evento_alumna.filter(p => p.estado === 'pagado').length
              const total = ev.evento_alumna.length
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
                        {' · '}${Number(ev.precio).toLocaleString('es-CO')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm font-medium">{total} alumnas</p>
                      <p className="text-xs text-green-400">{pagados} pagadas</p>
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
                  {eventoActivo.evento_alumna.length} participantes · ${Number(eventoActivo.precio).toLocaleString('es-CO')} c/u
                  {' · '}Total: ${(eventoActivo.evento_alumna.length * Number(eventoActivo.precio)).toLocaleString('es-CO')}
                </p>
              </div>
              <button onClick={() => { setEventoActivo(null); setBusqueda('') }}
                className="text-white/40 hover:text-white text-xs px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">✕</button>
            </div>

            {/* Participantes actuales */}
            {eventoActivo.evento_alumna.length > 0 && (
              <div className="border-b border-white/10">
                <ul className="divide-y divide-white/5 max-h-52 overflow-y-auto">
                  {eventoActivo.evento_alumna.map(p => {
                    const a = getAlumna(p)
                    return (
                      <li key={p.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-white/5 group transition-colors">
                        <div>
                          <p className="text-sm text-white">{a.nombre}</p>
                          <p className="text-xs text-white/40">{getFamilia(a)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => marcarPagado(p)}
                            className={`text-xs px-2 py-1 rounded-lg transition-colors ${p.estado === 'pagado' ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                            {p.estado === 'pagado' ? '✓ Pagado' : 'Pendiente'}
                          </button>
                          <button onClick={() => quitarParticipante(p)}
                            className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 text-xs px-1.5 py-1 rounded transition-all">
                            ✕
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* Agregar alumnas */}
            <div className="px-4 py-3 border-b border-white/10">
              <input type="text" placeholder="Buscar alumna para agregar..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
            </div>

            {busqueda && (
              <ul className="divide-y divide-white/5 max-h-56 overflow-y-auto">
                {disponibles.length === 0 ? (
                  <li className="px-5 py-4 text-center text-white/30 text-sm">No se encontraron resultados</li>
                ) : disponibles.map(a => (
                  <li key={a.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-white/5 transition-colors">
                    <div>
                      <p className="text-sm text-white">{a.nombre}</p>
                      <p className="text-xs text-white/40">{getFamilia(a)}</p>
                    </div>
                    <button onClick={() => agregarParticipante(a)} disabled={agregandoId === a.id}
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
    </div>
  )
}
