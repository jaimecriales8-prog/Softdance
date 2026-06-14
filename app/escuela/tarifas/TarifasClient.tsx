'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Escuela = { id: string; valor_matricula: number }
type Grupo = { id: string; nombre: string; es_elite: boolean; precio_mensual: number; activo: boolean }
type Actividad = { id: string; nombre: string; precio: number; es_recurrente: boolean; activa: boolean }

export default function TarifasClient({ escuela, grupos, actividades }: {
  escuela: Escuela; grupos: Grupo[]; actividades: Actividad[]
}) {
  const [matricula, setMatricula] = useState(escuela.valor_matricula)
  const [editingMatricula, setEditingMatricula] = useState(false)
  const [matriculaInput, setMatriculaInput] = useState(escuela.valor_matricula.toString())
  const [grupoPrices, setGrupoPrices] = useState<Record<string, string>>({})
  const [actividadPrices, setActividadPrices] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  const supabase = createClient()

  async function guardarMatricula() {
    setSaving('matricula')
    const valor = parseFloat(matriculaInput) || 0
    await supabase.from('escuelas').update({ valor_matricula: valor }).eq('id', escuela.id)
    setMatricula(valor)
    setEditingMatricula(false)
    setSaving(null)
  }

  async function guardarGrupo(id: string) {
    setSaving(id)
    const precio = parseFloat(grupoPrices[id]) || 0
    await supabase.from('grupos').update({ precio_mensual: precio }).eq('id', id)
    setGrupoPrices(prev => ({ ...prev, [id]: '' }))
    setSaving(null)
  }

  async function guardarActividad(id: string) {
    setSaving(id)
    const precio = parseFloat(actividadPrices[id]) || 0
    await supabase.from('actividades_extra').update({ precio }).eq('id', id)
    setActividadPrices(prev => ({ ...prev, [id]: '' }))
    setSaving(null)
  }

  const normales = grupos.filter(g => !g.es_elite)
  const elite = grupos.filter(g => g.es_elite)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Tarifas</h1>
        <p className="text-white/40 text-sm mt-0.5">Configura los valores de matrícula, grupos y actividades</p>
      </div>

      <div className="space-y-6">
        {/* Matrícula */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-4">Matrícula anual</h2>
          <div className="flex items-center gap-4">
            {editingMatricula ? (
              <>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                  <input
                    type="number"
                    value={matriculaInput}
                    onChange={e => setMatriculaInput(e.target.value)}
                    className="bg-white/5 border border-[#e91e8c] rounded-lg pl-7 pr-3 py-2 text-sm text-white w-48 focus:outline-none"
                    autoFocus
                  />
                </div>
                <button onClick={guardarMatricula} disabled={saving === 'matricula'}
                  className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50 transition-colors">
                  {saving === 'matricula' ? 'Guardando...' : 'Guardar'}
                </button>
                <button onClick={() => setEditingMatricula(false)}
                  className="text-sm text-white/40 hover:text-white transition-colors">
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-white">${matricula.toLocaleString('es-CO')}</p>
                <button onClick={() => { setMatriculaInput(matricula.toString()); setEditingMatricula(true) }}
                  className="text-xs text-white/40 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5">
                  Editar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Grupos por edad */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider">Grupos por edad — precio mensual</h2>
          </div>
          <TarifaTabla
            items={normales.map(g => ({ id: g.id, nombre: g.nombre, precio: g.precio_mensual, activo: g.activo }))}
            prices={grupoPrices}
            saving={saving}
            onPriceChange={(id, val) => setGrupoPrices(prev => ({ ...prev, [id]: val }))}
            onSave={guardarGrupo}
          />
        </div>

        {/* Grupos élite */}
        {elite.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h2 className="text-sm font-medium text-[#e91e8c]/70 uppercase tracking-wider">Grupos élite — precio mensual</h2>
            </div>
            <TarifaTabla
              items={elite.map(g => ({ id: g.id, nombre: g.nombre, precio: g.precio_mensual, activo: g.activo }))}
              prices={grupoPrices}
              saving={saving}
              onPriceChange={(id, val) => setGrupoPrices(prev => ({ ...prev, [id]: val }))}
              onSave={guardarGrupo}
            />
          </div>
        )}

        {/* Actividades extra */}
        {actividades.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider">Actividades extra</h2>
            </div>
            <TarifaTabla
              items={actividades.map(a => ({ id: a.id, nombre: a.nombre, precio: a.precio, activo: a.activa, tag: a.es_recurrente ? 'Mensual' : 'Único' }))}
              prices={actividadPrices}
              saving={saving}
              onPriceChange={(id, val) => setActividadPrices(prev => ({ ...prev, [id]: val }))}
              onSave={guardarActividad}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function TarifaTabla({ items, prices, saving, onPriceChange, onSave }: {
  items: { id: string; nombre: string; precio: number; activo: boolean; tag?: string }[]
  prices: Record<string, string>
  saving: string | null
  onPriceChange: (id: string, val: string) => void
  onSave: (id: string) => void
}) {
  const [editing, setEditing] = useState<string | null>(null)

  if (items.length === 0) {
    return <p className="text-center text-white/30 py-6 text-sm">No hay elementos</p>
  }

  return (
    <table className="w-full text-sm">
      <tbody>
        {items.map((item, i) => (
          <tr key={item.id} className={`${i < items.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/5 transition-colors`}>
            <td className="px-5 py-3">
              <span className="text-white">{item.nombre}</span>
              {item.tag && <span className="ml-2 text-xs text-white/30">{item.tag}</span>}
              {!item.activo && <span className="ml-2 text-xs text-white/20">inactivo</span>}
            </td>
            <td className="px-5 py-3 text-right">
              {editing === item.id ? (
                <div className="flex items-center justify-end gap-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                    <input
                      type="number"
                      value={prices[item.id] ?? item.precio}
                      onChange={e => onPriceChange(item.id, e.target.value)}
                      className="bg-white/5 border border-[#e91e8c] rounded-lg pl-7 pr-3 py-1.5 text-sm text-white w-40 focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <button onClick={() => { onSave(item.id); setEditing(null) }} disabled={saving === item.id}
                    className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
                    {saving === item.id ? '...' : 'OK'}
                  </button>
                  <button onClick={() => setEditing(null)} className="text-white/40 hover:text-white text-xs transition-colors">✕</button>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-3">
                  <span className="text-white font-medium">${item.precio.toLocaleString('es-CO')}</span>
                  <button onClick={() => { onPriceChange(item.id, item.precio.toString()); setEditing(item.id) }}
                    className="text-xs text-white/40 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5">
                    Editar
                  </button>
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
