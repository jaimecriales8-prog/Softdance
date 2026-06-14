'use client'

import { useState } from 'react'

type Grupo = { id: string; nombre: string }
type Comunicado = {
  id: string; titulo: string; cuerpo: string; created_at: string
  grupo_id: string | null; grupos: { nombre: string } | null
}

export default function ComunicadosClient({ comunicadosIniciales, grupos }: {
  comunicadosIniciales: Comunicado[]; grupos: Grupo[]
}) {
  const [comunicados, setComunicados] = useState(comunicadosIniciales)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titulo: '', cuerpo: '', grupo_id: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/escuela/comunicados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, grupo_id: form.grupo_id || null }),
    })
    const data = await res.json()
    if (res.ok) {
      setComunicados([data.comunicado, ...comunicados])
      setForm({ titulo: '', cuerpo: '', grupo_id: '' })
      setShowForm(false)
    }
    setSaving(false)
  }

  async function eliminar(id: string) {
    setDeleting(id)
    await fetch('/api/escuela/comunicados', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setComunicados(comunicados.filter(c => c.id !== id))
    setDeleting(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Comunicados</h1>
          <p className="text-white/40 text-sm mt-0.5">Avisos para familias</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Nuevo comunicado
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Nuevo comunicado</h2>
            <form onSubmit={crear} className="space-y-4">
              <div>
                <label className="block text-xs text-white/50 mb-1">Título</label>
                <input
                  required value={form.titulo}
                  onChange={e => setForm({ ...form, titulo: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Mensaje</label>
                <textarea
                  required rows={5} value={form.cuerpo}
                  onChange={e => setForm({ ...form, cuerpo: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c] resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Dirigido a</label>
                <select
                  value={form.grupo_id}
                  onChange={e => setForm({ ...form, grupo_id: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]">
                  <option value="">Todas las familias</option>
                  {grupos.map(g => (
                    <option key={g.id} value={g.id}>{g.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-white/10 text-white/60 text-sm py-2 rounded-lg hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm py-2 rounded-lg disabled:opacity-50 transition-colors">
                  {saving ? 'Publicando...' : 'Publicar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {comunicados.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
          <p className="text-white/30 text-sm">No hay comunicados publicados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comunicados.map(c => (
            <div key={c.id} className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-medium">{c.titulo}</p>
                    {c.grupos ? (
                      <span className="text-xs bg-[#e91e8c]/10 text-[#e91e8c] px-2 py-0.5 rounded-full">{c.grupos.nombre}</span>
                    ) : (
                      <span className="text-xs bg-white/10 text-white/40 px-2 py-0.5 rounded-full">Todas las familias</span>
                    )}
                  </div>
                  <p className="text-white/60 text-sm whitespace-pre-wrap">{c.cuerpo}</p>
                  <p className="text-white/30 text-xs mt-2">
                    {new Date(c.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => eliminar(c.id)}
                  disabled={deleting === c.id}
                  className="text-white/20 hover:text-red-400 text-sm transition-colors disabled:opacity-50 shrink-0">
                  {deleting === c.id ? '...' : '✕'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
