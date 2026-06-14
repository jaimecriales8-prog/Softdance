'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Grupo = {
  id: string
  nombre: string
  edad_min: number | null
  edad_max: number | null
  descripcion: string | null
  es_elite: boolean
  cupo_maximo: number | null
  precio_mensual: number
  activo: boolean
}

type FormData = {
  nombre: string
  edad_min: string
  edad_max: string
  descripcion: string
  es_elite: boolean
  cupo_maximo: string
  precio_mensual: string
}

const EMPTY: FormData = { nombre: '', edad_min: '', edad_max: '', descripcion: '', es_elite: false, cupo_maximo: '', precio_mensual: '' }

export default function GruposClient({ grupos: inicial, escuelaId }: { grupos: Grupo[]; escuelaId: string }) {
  const [grupos, setGrupos] = useState(inicial)
  const [modal, setModal] = useState<'crear' | 'editar' | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  function abrirCrear() { setForm(EMPTY); setEditId(null); setModal('crear') }

  function abrirEditar(g: Grupo) {
    setForm({
      nombre: g.nombre,
      edad_min: g.edad_min?.toString() ?? '',
      edad_max: g.edad_max?.toString() ?? '',
      descripcion: g.descripcion ?? '',
      es_elite: g.es_elite,
      cupo_maximo: g.cupo_maximo?.toString() ?? '',
      precio_mensual: g.precio_mensual.toString(),
    })
    setEditId(g.id)
    setModal('editar')
  }

  function cerrar() { setModal(null); setEditId(null); setForm(EMPTY) }

  function parseForm() {
    return {
      nombre: form.nombre,
      edad_min: form.edad_min ? parseInt(form.edad_min) : null,
      edad_max: form.edad_max ? parseInt(form.edad_max) : null,
      descripcion: form.descripcion || null,
      es_elite: form.es_elite,
      cupo_maximo: form.cupo_maximo ? parseInt(form.cupo_maximo) : null,
      precio_mensual: parseFloat(form.precio_mensual) || 0,
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    if (modal === 'crear') {
      const { data, error } = await supabase.from('grupos')
        .insert({ ...parseForm(), escuela_id: escuelaId, activo: true })
        .select().single()
      if (!error && data) setGrupos([...grupos, data])
    } else if (editId) {
      const { data, error } = await supabase.from('grupos')
        .update(parseForm()).eq('id', editId).select().single()
      if (!error && data) setGrupos(grupos.map(g => g.id === editId ? data : g))
    }
    cerrar()
    setLoading(false)
  }

  async function toggleActivo(g: Grupo) {
    await supabase.from('grupos').update({ activo: !g.activo }).eq('id', g.id)
    setGrupos(grupos.map(x => x.id === g.id ? { ...x, activo: !g.activo } : x))
  }

  const normales = grupos.filter(g => !g.es_elite)
  const elite = grupos.filter(g => g.es_elite)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Grupos</h1>
          <p className="text-white/40 text-sm mt-0.5">{grupos.length} grupos en total</p>
        </div>
        <button onClick={abrirCrear}
          className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Nuevo grupo
        </button>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">
              {modal === 'crear' ? 'Nuevo grupo' : 'Editar grupo'}
            </h2>
            <form onSubmit={guardar} className="space-y-3">
              <div>
                <label className="block text-xs text-white/50 mb-1">Nombre *</label>
                <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Iniciación 4-6 años"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Edad mínima</label>
                  <input type="number" value={form.edad_min} onChange={e => setForm({ ...form, edad_min: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Edad máxima</label>
                  <input type="number" value={form.edad_max} onChange={e => setForm({ ...form, edad_max: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Cupo máximo</label>
                  <input type="number" value={form.cupo_maximo} onChange={e => setForm({ ...form, cupo_maximo: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Precio mensual (COP)</label>
                  <input type="number" value={form.precio_mensual} onChange={e => setForm({ ...form, precio_mensual: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1">Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c] resize-none" />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.es_elite} onChange={e => setForm({ ...form, es_elite: e.target.checked })}
                  className="accent-[#e91e8c]" />
                <span className="text-sm text-white/70">Grupo élite</span>
              </label>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={cerrar}
                  className="flex-1 border border-white/10 text-white/60 text-sm py-2 rounded-lg hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm py-2 rounded-lg disabled:opacity-50 transition-colors">
                  {loading ? 'Guardando...' : modal === 'crear' ? 'Crear grupo' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grupos normales */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">Grupos por edad</h2>
        <GruposTabla grupos={normales} onEditar={abrirEditar} onToggle={toggleActivo} />
      </div>

      {/* Grupos élite */}
      <div>
        <h2 className="text-sm font-medium text-[#e91e8c]/70 uppercase tracking-wider mb-3">Grupos élite</h2>
        <GruposTabla grupos={elite} onEditar={abrirEditar} onToggle={toggleActivo} elite />
      </div>
    </div>
  )
}

function GruposTabla({ grupos, onEditar, onToggle, elite }: {
  grupos: Grupo[]
  onEditar: (g: Grupo) => void
  onToggle: (g: Grupo) => void
  elite?: boolean
}) {
  if (grupos.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-8 text-center text-white/30 text-sm">
        {elite ? 'No hay grupos élite creados' : 'No hay grupos creados'}
      </div>
    )
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Nombre</th>
            <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Edades</th>
            <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Cupo</th>
            <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Precio / mes</th>
            <th className="text-center text-white/40 text-xs uppercase tracking-wider px-4 py-3">Activo</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {grupos.map(g => (
            <tr key={g.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td className="px-4 py-3">
                <p className="text-white font-medium">{g.nombre}</p>
                {g.descripcion && <p className="text-white/40 text-xs">{g.descripcion}</p>}
              </td>
              <td className="px-4 py-3 text-white/60">
                {g.edad_min && g.edad_max ? `${g.edad_min} - ${g.edad_max} años` : '—'}
              </td>
              <td className="px-4 py-3 text-white/60">{g.cupo_maximo ?? '—'}</td>
              <td className="px-4 py-3 text-white/60">
                {g.precio_mensual > 0 ? `$${g.precio_mensual.toLocaleString('es-CO')}` : '—'}
              </td>
              <td className="px-4 py-3 text-center">
                <button onClick={() => onToggle(g)}
                  className={`w-10 h-5 rounded-full transition-colors ${g.activo ? 'bg-[#e91e8c]' : 'bg-white/20'}`}>
                  <span className={`block w-4 h-4 bg-white rounded-full mx-auto transition-transform ${g.activo ? 'translate-x-2.5' : '-translate-x-2.5'}`} />
                </button>
              </td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => onEditar(g)}
                  className="text-xs text-white/40 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5">
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
