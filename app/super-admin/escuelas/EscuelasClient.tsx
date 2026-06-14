'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Escuela = {
  id: string
  nombre: string
  ciudad: string | null
  email: string | null
  telefono: string | null
  activa: boolean
  cobro_activo: boolean
  plan: string
  created_at: string
}

type FormData = { nombre: string; ciudad: string; email: string; telefono: string }

const FIELDS = [
  { key: 'nombre', label: 'Nombre', required: true },
  { key: 'ciudad', label: 'Ciudad', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'telefono', label: 'Teléfono', required: false },
]

const EMPTY_FORM: FormData = { nombre: '', ciudad: '', email: '', telefono: '' }

export default function EscuelasClient({ escuelas: inicial }: { escuelas: Escuela[] }) {
  const [escuelas, setEscuelas] = useState(inicial)
  const [modal, setModal] = useState<'crear' | 'editar' | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  function abrirCrear() {
    setForm(EMPTY_FORM)
    setEditId(null)
    setModal('crear')
  }

  function abrirEditar(e: Escuela) {
    setForm({ nombre: e.nombre, ciudad: e.ciudad ?? '', email: e.email ?? '', telefono: e.telefono ?? '' })
    setEditId(e.id)
    setModal('editar')
  }

  function cerrar() { setModal(null); setEditId(null); setForm(EMPTY_FORM) }

  async function crearEscuela(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase
      .from('escuelas')
      .insert({ ...form, activa: true, cobro_activo: false, plan: 'free' })
      .select().single()
    if (!error && data) {
      setEscuelas([data, ...escuelas])
      cerrar()
    }
    setLoading(false)
  }

  async function editarEscuela(e: React.FormEvent) {
    e.preventDefault()
    if (!editId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('escuelas')
      .update(form)
      .eq('id', editId)
      .select().single()
    if (!error && data) {
      setEscuelas(escuelas.map(esc => esc.id === editId ? { ...esc, ...data } : esc))
      cerrar()
    }
    setLoading(false)
  }

  async function toggleField(id: string, field: 'activa' | 'cobro_activo', value: boolean) {
    await supabase.from('escuelas').update({ [field]: !value }).eq('id', id)
    setEscuelas(escuelas.map(e => e.id === id ? { ...e, [field]: !value } : e))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Escuelas</h1>
          <p className="text-white/40 text-sm mt-0.5">{escuelas.length} registradas</p>
        </div>
        <button onClick={abrirCrear}
          className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Nueva escuela
        </button>
      </div>

      {/* Modal crear / editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-4">
              {modal === 'crear' ? 'Nueva escuela' : 'Editar escuela'}
            </h2>
            <form onSubmit={modal === 'crear' ? crearEscuela : editarEscuela} className="space-y-3">
              {FIELDS.map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-white/50 mb-1">{f.label}</label>
                  <input
                    required={f.required}
                    value={(form as any)[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]"
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={cerrar}
                  className="flex-1 border border-white/10 text-white/60 text-sm py-2 rounded-lg hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm py-2 rounded-lg disabled:opacity-50 transition-colors">
                  {loading ? 'Guardando...' : modal === 'crear' ? 'Crear escuela' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Escuela</th>
              <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Ciudad</th>
              <th className="text-center text-white/40 text-xs uppercase tracking-wider px-4 py-3">Activa</th>
              <th className="text-center text-white/40 text-xs uppercase tracking-wider px-4 py-3">Cobro</th>
              <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Plan</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {escuelas.length === 0 && (
              <tr><td colSpan={6} className="text-center text-white/30 py-8">No hay escuelas registradas</td></tr>
            )}
            {escuelas.map(e => (
              <tr key={e.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-white font-medium">{e.nombre}</p>
                  <p className="text-white/40 text-xs">{e.email}</p>
                </td>
                <td className="px-4 py-3 text-white/60">{e.ciudad ?? '—'}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleField(e.id, 'activa', e.activa)}
                    className={`w-10 h-5 rounded-full transition-colors ${e.activa ? 'bg-[#e91e8c]' : 'bg-white/20'}`}>
                    <span className={`block w-4 h-4 bg-white rounded-full mx-auto transition-transform ${e.activa ? 'translate-x-2.5' : '-translate-x-2.5'}`} />
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleField(e.id, 'cobro_activo', e.cobro_activo)}
                    className={`w-10 h-5 rounded-full transition-colors ${e.cobro_activo ? 'bg-[#e91e8c]' : 'bg-white/20'}`}>
                    <span className={`block w-4 h-4 bg-white rounded-full mx-auto transition-transform ${e.cobro_activo ? 'translate-x-2.5' : '-translate-x-2.5'}`} />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${e.plan === 'pro' ? 'bg-[#e91e8c]/20 text-[#e91e8c]' : 'bg-white/10 text-white/50'}`}>
                    {e.plan}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => abrirEditar(e)}
                    className="text-xs text-white/40 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5">
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
