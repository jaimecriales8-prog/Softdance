'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash; just being on this page
    // after clicking the email link means the session is already set via PKCE.
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 6) { setError('Mínimo 6 caracteres'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Soft<span className="text-[#e91e8c]">dance</span>
          </h1>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-white mb-6">Nueva contraseña</h2>

          {!ready ? (
            <p className="text-white/40 text-sm text-center py-4">Verificando enlace...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Nueva contraseña</label>
                <input
                  type="password" required minLength={6} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Confirmar contraseña</label>
                <input
                  type="password" required value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c] transition-colors"
                />
              </div>
              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
              )}
              <button type="submit" disabled={loading}
                className="w-full bg-[#e91e8c] hover:bg-[#ff3da8] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 transition-colors">
                {loading ? 'Guardando...' : 'Guardar contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
