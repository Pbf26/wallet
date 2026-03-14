'use client'
import { useState, useRef, useEffect } from 'react'
import type { Transaction, Profile } from '@/lib/types'
import { fmt } from '@/lib/utils'

const TXN_SYS = `Clasifica transacciones en español para finanzas personales en Chile (CLP pesos chilenos).
Si es una transacción responde SOLO JSON: {"action":"transaction","type":"expense","amount":NUMBER,"category":"string","description":"string"}
type="income" para ingresos.
Categorías gasto: Alimentación, Transporte, Vivienda, Salud, Entretenimiento, Ropa, Educación, Servicios básicos, Tecnología, Restaurantes, Seguros, Deudas, Otros
Categorías ingreso: Sueldo, Freelance, Inversión, Arriendo, Regalo, Otros ingresos
Si NO es transacción: {"action":"message","text":"respuesta breve en español"}
SOLO JSON PURO sin texto ni backticks.`

interface Msg { role: 'user' | 'ai' | 'err'; text: string; txn?: Transaction }
interface PaymentOption { label: string; bank: string; method: string }

interface Props {
  profile: Profile
  onAdd: (t: Omit<Transaction, 'id' | 'user_id'>) => Promise<Transaction>
}

export default function Register({ profile, onAdd }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'ai', text: '¡Listo! Primero selecciona con qué pagaste abajo, luego cuéntame el movimiento.\n\n"Gasté $15.000 en almuerzo"\n"Llegó el sueldo"\n"Pagué la cuenta de luz"' }
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedOption, setSelectedOption] = useState<PaymentOption | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Build payment options from profile
  const paymentOptions: PaymentOption[] = []
  for (const acc of (profile.bank_accounts || [])) {
    paymentOptions.push({ label: `${acc.bank} · Débito`, bank: acc.bank, method: 'débito' })
  }
  for (const card of (profile.credit_cards || [])) {
    paymentOptions.push({ label: `${card.bank} · ${card.name}`, bank: card.bank, method: `crédito ${card.name}` })
  }
  const hasOptions = paymentOptions.length > 0

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const send = async () => {
    if (!input.trim() || sending) return
    if (hasOptions && !selectedOption) {
      setShowWarning(true)
      setTimeout(() => setShowWarning(false), 2500)
      return
    }
    const txt = input.trim()
    setInput('')
    setSending(true)
    setShowWarning(false)
    const newMsgs: Msg[] = [...msgs, { role: 'user', text: txt }]
    setMsgs(newMsgs)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: TXN_SYS, messages: [{ role: 'user', content: txt }], max_tokens: 300 }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const raw = data.text.replace(/```json|```/g, '').trim()
      let p: { action: string; type?: string; amount?: number; category?: string; description?: string; text?: string }
      try { p = JSON.parse(raw) }
      catch { const m = raw.match(/\{[\s\S]*\}/); p = m ? JSON.parse(m[0]) : { action: 'message', text: 'No pude interpretar eso. ¿Puedes reformularlo?' } }

      if (p.action === 'transaction') {
        const txn = await onAdd({
          type: p.type as 'income' | 'expense',
          amount: Math.abs(p.amount!),
          category: p.category!,
          description: p.description!,
          date: new Date().toISOString().split('T')[0],
          bank: selectedOption?.bank,
          payment_method: selectedOption?.method,
        })
        const metodoPago = selectedOption ? ` · ${selectedOption.label}` : ''
        setMsgs([...newMsgs, { role: 'ai', text: `Registrado ✓${metodoPago}`, txn }])
      } else {
        setMsgs([...newMsgs, { role: 'ai', text: p.text || 'No pude interpretar eso.' }])
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error'
      setMsgs([...newMsgs, { role: 'err', text: 'Error: ' + msg.substring(0, 100) }])
    }
    setSending(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f0f0ed' }}>

      {/* Header + bank selector */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e2de', padding: '16px 16px 14px' }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>Registrar</div>

        {hasOptions && (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              ¿Con qué pagaste? <span style={{ color: '#dc2626' }}>*</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {paymentOptions.map((opt, i) => {
                const active = selectedOption?.bank === opt.bank && selectedOption?.method === opt.method
                return (
                  <button key={i} onClick={() => setSelectedOption(active ? null : opt)}
                    style={{
                      padding: '7px 14px', borderRadius: 100, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      border: `1.5px solid ${active ? '#1a1a1a' : '#e2e2de'}`,
                      background: active ? '#1a1a1a' : '#f7f7f4',
                      color: active ? '#fff' : '#444',
                      transition: 'all 0.15s',
                    }}>
                    {opt.label}
                  </button>
                )
              })}
            </div>
            {showWarning && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626', fontWeight: 500 }}>
                ⚠ Selecciona primero con qué pagaste
              </div>
            )}
            {selectedOption && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#16a34a', fontWeight: 500 }}>
                ✓ {selectedOption.label} seleccionado
              </div>
            )}
          </>
        )}
      </div>

      {/* Chat */}
      <div className="flex-1 scrollable" style={{ padding: '12px 16px' }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', marginBottom: 10, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div className={m.role === 'user' ? 'bubble-user' : m.role === 'err' ? 'bubble-err' : 'bubble-ai'}
              style={{ maxWidth: '82%', padding: '10px 14px', fontSize: 14, lineHeight: 1.55 }}>
              {m.text.split('\n').map((line, j) => <span key={j}>{line}{j < m.text.split('\n').length - 1 && <br />}</span>)}
              {m.txn && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #d1fae5', fontSize: 12, color: '#16a34a', fontWeight: 500 }}>
                  {m.txn.type === 'income' ? '+' : '-'}{fmt(m.txn.amount)} · {m.txn.category}
                  {m.txn.bank && <span> · {m.txn.bank}</span>}
                  {m.txn.payment_method && <span> · {m.txn.payment_method}</span>}
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display: 'flex', marginBottom: 10 }}>
            <div className="bubble-ai" style={{ padding: '10px 14px', fontSize: 14, color: '#888' }}>Procesando...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: '1px solid #e2e2de', padding: '10px 12px', display: 'flex', gap: 8, background: '#fff' }} className="safe-bottom">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={selectedOption ? `${selectedOption.label} — ¿Qué compraste?` : hasOptions ? 'Selecciona un método de pago arriba' : '"Gasté $12.000 en café"'}
          className="input-base" style={{ flex: 1 }} />
        <button onClick={send} disabled={sending || !input.trim()} className="btn-primary"
          style={{ width: 44, height: 44, padding: 0, borderRadius: 12, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
      </div>
    </div>
  )
}
