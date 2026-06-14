'use client'

import { useState } from 'react'

type Grupo = { id: string; nombre: string; es_elite: boolean }
type Actividad = { id: string; nombre: string }
type Profesor = {
  id: string; nombre: string; telefono: string | null; email: string | null; activa: boolean
  grupo_profesor: { grupo_id: string; grupos: Grupo }[]
  actividad_profesor: { actividad_id: string; actividades_extra: Actividad }[]
}

const EMPTY = { nombre: '', telefono: '', email: '' }

export default function ProfesoresClient({ profesores: inicial, grupos, actividades }: {
  profesores: Profesor[]
  grupos: Grupo[]
  actividades: Actividad[]
}) {
  const [profesores, setProfesores] = useState(inicial)
  const [modal, setModal] = useState<'crear' | 'editar' | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [seleccionado, setSeleccionado] = useState<Profesor | null>(null)
  const [asignando, setAsignando] = useState(false)

  function abrirCrear() { setForm(EMPTY); setEditId(null); setError(''); setModal('crear') }
  function abrirEditar(p: Profesor) {
    setForm({ nombre: p.nombre, telefono: p.telefono ?? '', email: p.email ?? '' })
    setEditId(p.id); setError(''); setModal('editar')
  }
  function cerrar() { setModal(null); setEditId(null); setForm(EMPTY); setError('') }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/escuela/profesores', {
      method: modal === 'crear' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, id: editId }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error'); setLoading(false); return }
    if (modal === 'crear') {
      const nuevo = { ...data.profesor, grupo_profesor: [], actividad_profesor: [] }
      setProfesores([...profesores, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    } else {
      setProfesores(profesores.map(p => p.id === editId ? { ...p, ...data.profesor } : p))
      if (seleccionado?.id === editId) setSeleccionado(prev => prev ? { ...prev, ...data.profesor } : null)
    }
    cerrar(); setLoading(false)
  }

  async function toggleActiva(p: Profesor) {
    const res = await fetch('/api/escuela/profesores', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, nombre: p.nombre, activa: !p.activa }),
    })
    const data = await res.json()
    if (res.ok) {
      setProfesores(profesores.map(x => x.id === p.id ? { ...x, activa: data.profesor.activa } : x))
      if (seleccionado?.id === p.id) setSeleccionado(prev => prev ? { ...prev, activa: data.profesor.activa } : null)
    }
  }

  async function asignarGrupo(grupoId: string, asignar: boolean) {
    if (!seleccionado) return
    setAsignando(true)
    await fetch('/api/escuela/profesores/asignar', {
      method: asignar ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profesor_id: seleccionado.id, grupo_id: grupoId }),
    })
    const grupo = grupos.find(g => g.id === grupoId)!
    const updated: Profesor = asignar
      ? { ...seleccionado, grupo_profesor: [...seleccionado.grupo_profesor, { grupo_id: grupoId, grupos: grupo }] }
      : { ...seleccionado, grupo_profesor: seleccionado.grupo_profesor.filter(gp => gp.grupo_id !== grupoId) }
    setSeleccionado(updated)
    setProfesores(profesores.map(p => p.id === seleccionado.id ? updated : p))
    setAsignando(false)
  }

  async function asignarActividad(actividadId: string, asignar: boolean) {
    if (!seleccionado) return
    setAsignando(true)
    await fetch('/api/escuela/profesores/asignar', {
      method: asignar ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profesor_id: seleccionado.id, actividad_id: actividadId }),
    })
    const actividad = actividades.find(a => a.id === actividadId)!
    const updated: Profesor = asignar
      ? { ...seleccionado, actividad_profesor: [...seleccionado.actividad_profesor, { actividad_id: actividadId, actividades_extra: actividad }] }
      : { ...seleccionado, actividad_profesor: seleccionado.actividad_profesor.filter(ap => ap.actividad_id !== actividadId) }
    setSeleccionado(updated)
    setProfesores(profesores.map(p => p.id === seleccionado.id ? updated : p))
    setAsignando(false)
  }

  const gruposAsignados = new Set(seleccionado?.grupo_profesor.map(gp => gp.grupo_id) ?? [])
  const actividadesAsignadas = new Set(seleccionado?.actividad_profesor.map(ap => ap.actividad_id) ?? [])

  return (
    <div className="flex gap-6">
      {/* Lista */}
      <div className={seleccionado ? 'w-1/2' : 'w-full'}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Profesores</h1>
            <p className="text-white/40 text-sm mt-0.5">{profesores.filter(p => p.activa).length} activos</p>
          </div>
          <button onClick={abrirCrear}
            className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Nuevo profesor
          </button>
        </div>

        {profesores.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-12 text-center text-white/30 text-sm">
            No hay profesores registrados
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Profesor</th>
                  <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Grupos / Actividades</th>
                  <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {profesores.map((p, i) => {
                  const asignaciones = p.grupo_profesor.length + p.actividad_profesor.length
                  const activo = seleccionado?.id === p.id
                  return (
                    <tr key={p.id}
                      onClick={() => setSeleccionado(activo ? null : p)}
                      className={`cursor-pointer transition-colors ${i < profesores.length - 1 ? 'border-b border-white/5' : ''} ${activo ? 'bg-[#e91e8c]/5' : 'hover:bg-white/5'}`}>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{p.nombre}</p>
                        <p className="text-white/40 text-xs">{p.email ?? p.telefono ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-white/50">{asignaciones} asignaciones</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${p.activa ? 'bg-green-500/15 text-green-400' : 'bg-white/10 text-white/30'}`}>
                          {p.activa ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <button onClick={() => abrirEditar(p)}
                          className="text-xs text-white/40 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5">
                          Editar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Panel asignaciones */}
      {seleccionado && (
        <div className="w-1/2 sticky top-8 self-start space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">{seleccionado.nombre}</h2>
                <p className="text-xs text-white/40 mt-0.5">
                  {seleccionado.telefono && `${seleccionado.telefono} · `}{seleccionado.email ?? ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleActiva(seleccionado)}
                  className={`text-xs px-2 py-1 rounded-lg transition-colors ${seleccionado.activa ? 'bg-white/5 text-white/50 hover:text-white' : 'bg-green-500/10 text-green-400'}`}>
                  {seleccionado.activa ? 'Desactivar' : 'Activar'}
                </button>
                <button onClick={() => setSeleccionado(null)}
                  className="text-white/40 hover:text-white text-xs px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">✕</button>
              </div>
            </div>

            {/* Grupos */}
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">Grupos</h3>
              {grupos.length === 0 ? (
                <p className="text-white/30 text-xs">No hay grupos</p>
              ) : (
                <div className="space-y-1.5">
                  {grupos.map(g => {
                    const asignado = gruposAsignados.has(g.id)
                    return (
                      <div key={g.id} className="flex items-center justify-between">
                        <span className="text-sm text-white/70">
                          {g.nombre}
                          {g.es_elite && <span className="ml-1.5 text-xs text-yellow-400">⭐</span>}
                        </span>
                        <button
                          onClick={() => asignarGrupo(g.id, !asignado)}
                          disabled={asignando}
                          className={`text-xs px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 ${asignado ? 'bg-[#e91e8c]/15 text-[#e91e8c]' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}>
                          {asignado ? '✓ Asignado' : 'Asignar'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Actividades */}
            <div className="px-5 py-4">
              <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">Actividades extra</h3>
              {actividades.length === 0 ? (
                <p className="text-white/30 text-xs">No hay actividades activas</p>
              ) : (
                <div className="space-y-1.5">
                  {actividades.map(a => {
                    const asignada = actividadesAsignadas.has(a.id)
                    return (
                      <div key={a.id} className="flex items-center justify-between">
                        <span className="text-sm text-white/70">{a.nombre}</span>
                        <button
                          onClick={() => asignarActividad(a.id, !asignada)}
                          disabled={asignando}
                          className={`text-xs px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 ${asignada ? 'bg-[#e91e8c]/15 text-[#e91e8c]' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}>
                          {asignada ? '✓ Asignada' : 'Asignar'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal crear/editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-4">
              {modal === 'crear' ? 'Nuevo profesor' : 'Editar profesor'}
            </h2>
            <form onSubmit={guardar} className="space-y-3">
              <div>
                <label className="block text-xs text-white/50 mb-1">Nombre *</label>
                <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Nombre completo"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Teléfono</label>
                <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })}
                  placeholder="Ej: 3001234567"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
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
    </div>
  )
}
