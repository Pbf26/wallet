'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !email.includes('@')) {
      setError('Ingresa un email válido')
      return
    }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (err) setError(err.message)
    else setSent(true)
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen px-6 bg-white">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="text-4xl font-semibold mb-2">Wallet</div>
          <div className="text-gray-500 text-sm">Tu asistente financiero personal</div>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="text-2xl mb-3">📬</div>
            <div className="font-medium mb-2">Revisa tu email</div>
            <div className="text-sm text-gray-500">
              Te enviamos un link a <strong>{email}</strong>.<br />
              Haz clic en él para entrar a Wallet.
            </div>
            <button
              onClick={() => setSent(false)}
              className="mt-6 text-sm text-gray-400 underline"
            >
              Usar otro email
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm text-gray-500 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base outline-none focus:border-black transition-colors"
              />
            </div>
            {error && <div className="text-red-500 text-sm mb-3">{error}</div>}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-3 bg-black text-white rounded-xl font-medium disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Entrar con email'}
            </button>
            <div className="mt-4 text-center text-xs text-gray-400">
              Te enviamos un link mágico, sin contraseña
            </div>
          </>
        )}
      </div>
    </div>
  )
}
