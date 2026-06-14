'use client'

import { useState } from 'react'

export default function InfoPagoButton({ info }: { info: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}
        className="border border-white/20 text-white/70 hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
        Ver cómo pagar
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setOpen(false)}>
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Instrucciones de pago</h2>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white transition-colors">✕</button>
            </div>
            <p className="text-sm text-white/70 whitespace-pre-line leading-relaxed">{info}</p>
          </div>
        </div>
      )}
    </>
  )
}
