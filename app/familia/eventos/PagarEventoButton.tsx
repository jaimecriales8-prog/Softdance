'use client'

import { useState } from 'react'

export default function PagarEventoButton({
  eventoAlumnaId, cuotaNumero, monto,
}: {
  eventoAlumnaId: string; cuotaNumero: number; monto: number
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function pagar() {
    setLoading(true); setError('')
    const res = await fetch('/api/familia/pagar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evento_alumna_id: eventoAlumnaId, cuota_numero: cuotaNumero }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error'); setLoading(false); return }
    window.location.href = data.url
  }

  return (
    <div>
      <button onClick={pagar} disabled={loading}
        className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
        {loading ? 'Redirigiendo...' : `Pagar $${monto.toLocaleString('es-CO')}`}
      </button>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}
