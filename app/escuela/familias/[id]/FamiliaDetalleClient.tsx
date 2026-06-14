'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Grupo = { id: string; nombre: string; es_elite: boolean; precio_mensual: number }
type GrupoBase = { id: string; nombre: string; es_elite: boolean }
type AlumnaGrupo = { id: string; fecha_inicio: string; fecha_fin: string | null; activo: boolean; grupos: GrupoBase | GrupoBase[] }
type ActividadExtra = { id: string; nombre: string; precio: number; es_recurrente: boolean }
type AlumnaActividad = { id: string; actividades_extra: ActividadExtra | ActividadExtra[] }
type Alumna = {
  id: string; nombre: string; documento: string | null; fecha_nacimiento: string | null
  foto_url: string | null; activa: boolean; congelada: boolean; notas: string | null
  alumna_grupo: AlumnaGrupo[]
  alumna_actividad?: AlumnaActividad[]
}
type Familia = { id: string; nombre: string; email: string; telefono: string | null }

const EMPTY_ALUMNA = { nombre: '', documento: '', fecha_nacimiento: '', notas: '', grupo_id: '' }

function calcularEdad(fecha: string) {
  const hoy = new Date()
  const nac = new Date(fecha)
  let edad = hoy.getFullYear() - nac.getFullYear()
  if (hoy < new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate())) edad--
  return edad
}

function grupoActivo(alumna: Alumna) {
  const ag = alumna.alumna_grupo?.find(ag => ag.activo)
  if (!ag) return null
  const g = Array.isArray(ag.grupos) ? ag.grupos[0] : ag.grupos
  return { ...ag, grupos: g as GrupoBase }
}

function gruposActivos(alumna: Alumna) {
  return alumna.alumna_grupo
    ?.filter(ag => ag.activo)
    .map(ag => ({ ...ag, grupos: (Array.isArray(ag.grupos) ? ag.grupos[0] : ag.grupos) as GrupoBase }))
    ?? []
}

function actividadesAlumna(alumna: Alumna): ActividadExtra[] {
  return (alumna.alumna_actividad ?? []).map(aa => {
    const a = Array.isArray(aa.actividades_extra) ? aa.actividades_extra[0] : aa.actividades_extra
    return a as ActividadExtra
  }).filter(Boolean)
}

export default function FamiliaDetalleClient({
  familia, alumnas: inicialesAlumnas, grupos, actividades, escuelaId
}: {
  familia: Familia; alumnas: Alumna[]; grupos: Grupo[]; actividades: ActividadExtra[]; escuelaId: string
}) {
  const [alumnas, setAlumnas] = useState(inicialesAlumnas)
  const [modal, setModal] = useState<'crear' | 'editar' | 'cambiar_grupo' | null>(null)
  const [form, setForm] = useState(EMPTY_ALUMNA)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cambiarTipoElite, setCambiarTipoElite] = useState(false)

  // Panel actividades
  const [alumnaActividadId, setAlumnaActividadId] = useState<string | null>(null)
  const [actividadLoading, setActividadLoading] = useState<string | null>(null)

  const supabase = createClient()

  function abrirCrear() { setForm(EMPTY_ALUMNA); setEditId(null); setError(''); setModal('crear') }

  function abrirEditar(a: Alumna) {
    setForm({
      nombre: a.nombre,
      documento: a.documento ?? '',
      fecha_nacimiento: a.fecha_nacimiento ?? '',
      notas: a.notas ?? '',
      grupo_id: grupoActivo(a)?.grupos.id ?? '',
    })
    setEditId(a.id); setError(''); setModal('editar')
  }

  function abrirCambiarGrupo(a: Alumna, esElite: boolean) {
    const ga = gruposActivos(a).find(ag => ag.grupos.es_elite === esElite)
    setForm({ ...EMPTY_ALUMNA, grupo_id: ga?.grupos.id ?? '' })
    setCambiarTipoElite(esElite)
    setEditId(a.id); setError(''); setModal('cambiar_grupo')
  }

  function cerrar() { setModal(null); setEditId(null); setForm(EMPTY_ALUMNA); setError('') }

  async function crearAlumna(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/escuela/alumnas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: form.nombre,
        documento: form.documento || null,
        fecha_nacimiento: form.fecha_nacimiento || null,
        notas: form.notas || null,
        grupo_id: form.grupo_id || null,
        familia_id: familia.id,
        escuela_id: escuelaId,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error al crear'); setLoading(false); return }
    setAlumnas([...alumnas, { ...data.alumna, alumna_actividad: [] }])
    cerrar(); setLoading(false)
  }

  async function editarAlumna(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/escuela/alumnas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editId,
        nombre: form.nombre,
        documento: form.documento || null,
        fecha_nacimiento: form.fecha_nacimiento || null,
        notas: form.notas || null,
        escuela_id: escuelaId,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error al editar'); setLoading(false); return }
    setAlumnas(alumnas.map(a => a.id === editId ? { ...a, ...data.alumna } : a))
    cerrar(); setLoading(false)
  }

  async function cambiarGrupo(e: React.FormEvent) {
    e.preventDefault()
    if (!editId || !form.grupo_id) return
    setLoading(true); setError('')
    const res = await fetch('/api/escuela/alumnas/cambiar-grupo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alumna_id: editId, nuevo_grupo_id: form.grupo_id, escuela_id: escuelaId }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error al cambiar grupo'); setLoading(false); return }
    setAlumnas(alumnas.map(a => {
      if (a.id !== editId) return a
      const updatedGrupos = a.alumna_grupo.map(ag => ag.activo ? { ...ag, activo: false, fecha_fin: new Date().toISOString() } : ag)
      return { ...a, alumna_grupo: [...updatedGrupos, data.alumna_grupo] }
    }))
    cerrar(); setLoading(false)
  }

  async function toggleCongelar(a: Alumna) {
    await supabase.from('alumnas').update({ congelada: !a.congelada }).eq('id', a.id)
    setAlumnas(alumnas.map(x => x.id === a.id ? { ...x, congelada: !a.congelada } : x))
  }

  async function toggleActividad(alumna: Alumna, actividad: ActividadExtra) {
    const tieneActividad = actividadesAlumna(alumna).some(a => a.id === actividad.id)
    setActividadLoading(alumna.id + actividad.id)

    if (tieneActividad) {
      await fetch('/api/escuela/alumnas/actividades', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumna_id: alumna.id, actividad_id: actividad.id }),
      })
      setAlumnas(alumnas.map(a => a.id === alumna.id
        ? { ...a, alumna_actividad: (a.alumna_actividad ?? []).filter(aa => {
            const act = Array.isArray(aa.actividades_extra) ? aa.actividades_extra[0] : aa.actividades_extra
            return act?.id !== actividad.id
          })}
        : a
      ))
    } else {
      const res = await fetch('/api/escuela/alumnas/actividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumna_id: alumna.id, actividad_id: actividad.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setAlumnas(alumnas.map(a => a.id === alumna.id
          ? { ...a, alumna_actividad: [...(a.alumna_actividad ?? []), data.alumna_actividad] }
          : a
        ))
      }
    }
    setActividadLoading(null)
  }

  const normales = grupos.filter(g => !g.es_elite)
  const elite = grupos.filter(g => g.es_elite)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/escuela/familias" className="text-white/40 hover:text-white text-sm transition-colors">
            ← Familias
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white text-sm">{familia.nombre}</span>
        </div>
        <Link href={`/escuela/familias/${familia.id}/recibo`}
          className="text-xs border border-white/10 text-white/50 hover:text-white hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors">
          Ver recibo
        </Link>
      </div>

      {/* Info familia */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#e91e8c]/20 flex items-center justify-center text-[#e91e8c] font-bold">
            {familia.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{familia.nombre}</h1>
            <p className="text-white/40 text-sm">{familia.email} {familia.telefono ? `· ${familia.telefono}` : ''}</p>
          </div>
        </div>
      </div>

      {/* Alumnas */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Alumnas</h2>
        <button onClick={abrirCrear}
          className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Agregar alumna
        </button>
      </div>

      {/* Modal crear / editar alumna */}
      {(modal === 'crear' || modal === 'editar') && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-4">
              {modal === 'crear' ? 'Nueva alumna' : 'Editar alumna'}
            </h2>
            <form onSubmit={modal === 'crear' ? crearAlumna : editarAlumna} className="space-y-3">
              <div>
                <label className="block text-xs text-white/50 mb-1">Nombre completo *</label>
                <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Número de documento</label>
                <input value={form.documento} onChange={e => setForm({ ...form, documento: e.target.value })}
                  placeholder="CC, TI..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Fecha de nacimiento</label>
                <input type="date" value={form.fecha_nacimiento} onChange={e => setForm({ ...form, fecha_nacimiento: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]" />
              </div>
              {modal === 'crear' && grupos.length > 0 && (
                <div>
                  <label className="block text-xs text-white/50 mb-1">Grupo inicial</label>
                  <select value={form.grupo_id} onChange={e => setForm({ ...form, grupo_id: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]">
                    <option value="">Sin grupo</option>
                    {normales.length > 0 && (
                      <optgroup label="Grupos por edad">
                        {normales.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                      </optgroup>
                    )}
                    {elite.length > 0 && (
                      <optgroup label="Grupos élite">
                        {elite.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                      </optgroup>
                    )}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs text-white/50 mb-1">Notas</label>
                <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c] resize-none" />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={cerrar}
                  className="flex-1 border border-white/10 text-white/60 text-sm py-2 rounded-lg hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm py-2 rounded-lg disabled:opacity-50 transition-colors">
                  {loading ? 'Guardando...' : modal === 'crear' ? 'Agregar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal cambiar grupo */}
      {modal === 'cambiar_grupo' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-1">
              Cambiar {cambiarTipoElite ? 'grupo élite' : 'grupo'}
            </h2>
            <p className="text-white/40 text-xs mb-4">El grupo anterior quedará en el historial de la alumna.</p>
            <form onSubmit={cambiarGrupo} className="space-y-3">
              <div>
                <label className="block text-xs text-white/50 mb-1">Nuevo grupo *</label>
                <select required value={form.grupo_id} onChange={e => setForm({ ...form, grupo_id: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]">
                  <option value="">Seleccionar grupo</option>
                  {(cambiarTipoElite ? elite : normales).map(g => (
                    <option key={g.id} value={g.id}>{g.nombre}</option>
                  ))}
                </select>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={cerrar}
                  className="flex-1 border border-white/10 text-white/60 text-sm py-2 rounded-lg hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm py-2 rounded-lg disabled:opacity-50 transition-colors">
                  {loading ? 'Cambiando...' : 'Confirmar cambio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista alumnas */}
      {alumnas.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-12 text-center text-white/30 text-sm">
          Esta familia no tiene alumnas registradas aún
        </div>
      ) : (
        <div className="grid gap-4">
          {alumnas.map(a => {
            const gasActivos = gruposActivos(a)
            const actsAlumna = actividadesAlumna(a)
            const mostrandoActividades = alumnaActividadId === a.id

            const valorMensual = (() => {
                const porGrupos = gasActivos.reduce((sum, ag) => {
                  const g = grupos.find(g => g.id === ag.grupos.id)
                  return sum + (g?.precio_mensual ?? 0)
                }, 0)
                const porActividades = actsAlumna
                  .filter(act => act.es_recurrente)
                  .reduce((sum, act) => sum + act.precio, 0)
                return porGrupos + porActividades
              })()

            return (
              <div key={a.id} className={`border rounded-xl overflow-hidden transition-colors ${a.congelada ? 'bg-blue-900/10 border-blue-500/20' : 'bg-white/5 border-white/10'}`}>
                {/* Header alumna */}
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm">
                      {a.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium">{a.nombre}</p>
                      <p className="text-white/40 text-xs">
                        {a.fecha_nacimiento ? `${calcularEdad(a.fecha_nacimiento)} años` : 'Sin edad'}
                        {a.documento ? ` · ${a.documento}` : ''}
                        {' · '}
                        {gasActivos.length === 0
                          ? 'Sin grupo'
                          : gasActivos.map(ag => `${ag.grupos.nombre}${ag.grupos.es_elite ? ' ⭐' : ''}`).join(' + ')
                        }
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {valorMensual > 0 && (
                          <p className="text-[#e91e8c] text-xs font-medium">
                            ${valorMensual.toLocaleString('es-CO')}/mes
                          </p>
                        )}
                        {a.congelada && (
                          <span className="text-xs text-blue-400 font-medium">❄ Congelada</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {normales.length > 0 && (
                      <button onClick={() => abrirCambiarGrupo(a, false)}
                        className="text-xs text-[#e91e8c]/70 hover:text-[#e91e8c] transition-colors px-2 py-1 rounded hover:bg-[#e91e8c]/10">
                        Cambiar grupo
                      </button>
                    )}
                    {elite.length > 0 && (
                      <button onClick={() => abrirCambiarGrupo(a, true)}
                        className="text-xs text-white/30 hover:text-[#e91e8c] transition-colors px-2 py-1 rounded hover:bg-[#e91e8c]/10">
                        ⭐ Élite
                      </button>
                    )}
                    {actividades.length > 0 && (
                      <button onClick={() => setAlumnaActividadId(mostrandoActividades ? null : a.id)}
                        className={`text-xs transition-colors px-2 py-1 rounded ${mostrandoActividades ? 'text-white bg-white/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                        Actividades {actsAlumna.length > 0 ? `(${actsAlumna.length})` : ''}
                      </button>
                    )}
                    <button onClick={() => toggleCongelar(a)}
                      className={`text-xs transition-colors px-2 py-1 rounded ${a.congelada ? 'text-blue-400 hover:text-white hover:bg-white/5' : 'text-white/40 hover:text-blue-400 hover:bg-blue-500/10'}`}>
                      {a.congelada ? '❄ Descongelar' : 'Congelar'}
                    </button>
                    <button onClick={() => abrirEditar(a)}
                      className="text-xs text-white/40 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5">
                      Editar
                    </button>
                  </div>
                </div>

                {/* Notas */}
                {a.notas && <p className="text-white/30 text-xs px-5 pb-3 ml-12">{a.notas}</p>}

                {/* Panel actividades */}
                {mostrandoActividades && (
                  <div className="border-t border-white/10 px-5 py-3">
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Actividades extra</p>
                    <div className="flex flex-wrap gap-2">
                      {actividades.map(act => {
                        const asignada = actsAlumna.some(aa => aa.id === act.id)
                        const cargando = actividadLoading === a.id + act.id
                        return (
                          <button
                            key={act.id}
                            onClick={() => toggleActividad(a, act)}
                            disabled={cargando}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
                              asignada
                                ? 'bg-[#e91e8c]/20 border-[#e91e8c]/50 text-[#e91e8c]'
                                : 'bg-white/5 border-white/10 text-white/50 hover:border-white/30 hover:text-white'
                            }`}
                          >
                            {cargando ? '...' : `${asignada ? '✓ ' : ''}${act.nombre}`}
                            <span className="ml-1 text-white/30">${act.precio.toLocaleString('es-CO')}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
