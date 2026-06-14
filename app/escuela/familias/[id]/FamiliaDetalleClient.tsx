'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Grupo = { id: string; nombre: string; es_elite: boolean; precio_mensual: number }
type AlumnaGrupo = { id: string; fecha_inicio: string; fecha_fin: string | null; activo: boolean; grupos: Grupo }
type Alumna = {
  id: string; nombre: string; fecha_nacimiento: string | null
  foto_url: string | null; activa: boolean; notas: string | null
  alumna_grupo: AlumnaGrupo[]
}
type Familia = { id: string; nombre: string; email: string; telefono: string | null }

const EMPTY_ALUMNA = { nombre: '', fecha_nacimiento: '', notas: '', grupo_id: '' }

function calcularEdad(fecha: string) {
  const hoy = new Date()
  const nac = new Date(fecha)
  let edad = hoy.getFullYear() - nac.getFullYear()
  if (hoy < new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate())) edad--
  return edad
}

function grupoActivo(alumna: Alumna) {
  return alumna.alumna_grupo?.find(ag => ag.activo)
}

export default function FamiliaDetalleClient({
  familia, alumnas: inicialesAlumnas, grupos, escuelaId
}: {
  familia: Familia; alumnas: Alumna[]; grupos: Grupo[]; escuelaId: string
}) {
  const [alumnas, setAlumnas] = useState(inicialesAlumnas)
  const [modal, setModal] = useState<'crear' | 'editar' | 'cambiar_grupo' | null>(null)
  const [form, setForm] = useState(EMPTY_ALUMNA)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  function abrirCrear() { setForm(EMPTY_ALUMNA); setEditId(null); setError(''); setModal('crear') }

  function abrirEditar(a: Alumna) {
    setForm({
      nombre: a.nombre,
      fecha_nacimiento: a.fecha_nacimiento ?? '',
      notas: a.notas ?? '',
      grupo_id: grupoActivo(a)?.grupos.id ?? '',
    })
    setEditId(a.id); setError(''); setModal('editar')
  }

  function abrirCambiarGrupo(a: Alumna) {
    setForm({ ...EMPTY_ALUMNA, grupo_id: grupoActivo(a)?.grupos.id ?? '' })
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
        fecha_nacimiento: form.fecha_nacimiento || null,
        notas: form.notas || null,
        grupo_id: form.grupo_id || null,
        familia_id: familia.id,
        escuela_id: escuelaId,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error al crear'); setLoading(false); return }
    setAlumnas([...alumnas, data.alumna])
    cerrar()
    setLoading(false)
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
        fecha_nacimiento: form.fecha_nacimiento || null,
        notas: form.notas || null,
        escuela_id: escuelaId,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error al editar'); setLoading(false); return }
    setAlumnas(alumnas.map(a => a.id === editId ? { ...a, ...data.alumna } : a))
    cerrar()
    setLoading(false)
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
    cerrar()
    setLoading(false)
  }

  const normales = grupos.filter(g => !g.es_elite)
  const elite = grupos.filter(g => g.es_elite)

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/escuela/familias" className="text-white/40 hover:text-white text-sm transition-colors">
          ← Familias
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-white text-sm">{familia.nombre}</span>
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
            <h2 className="text-lg font-semibold text-white mb-1">Cambiar de grupo</h2>
            <p className="text-white/40 text-xs mb-4">El grupo anterior quedará en el historial de la alumna.</p>
            <form onSubmit={cambiarGrupo} className="space-y-3">
              <div>
                <label className="block text-xs text-white/50 mb-1">Nuevo grupo *</label>
                <select required value={form.grupo_id} onChange={e => setForm({ ...form, grupo_id: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]">
                  <option value="">Seleccionar grupo</option>
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
        <div className="grid gap-3">
          {alumnas.map(a => {
            const ga = grupoActivo(a)
            return (
              <div key={a.id} className="bg-white/5 border border-white/10 rounded-xl px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm">
                      {a.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium">{a.nombre}</p>
                      <p className="text-white/40 text-xs">
                        {a.fecha_nacimiento ? `${calcularEdad(a.fecha_nacimiento)} años` : 'Sin edad'}
                        {ga ? ` · ${ga.grupos.nombre}${ga.grupos.es_elite ? ' ⭐' : ''}` : ' · Sin grupo'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => abrirCambiarGrupo(a)}
                      className="text-xs text-[#e91e8c]/70 hover:text-[#e91e8c] transition-colors px-2 py-1 rounded hover:bg-[#e91e8c]/10">
                      Cambiar grupo
                    </button>
                    <button onClick={() => abrirEditar(a)}
                      className="text-xs text-white/40 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5">
                      Editar
                    </button>
                  </div>
                </div>
                {a.notas && <p className="text-white/30 text-xs mt-2 ml-12">{a.notas}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
