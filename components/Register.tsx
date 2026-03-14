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
interface Props {
  profile: Profile
  onAdd: (t: Omit<Transaction, 'id' | 'user_id'>) => Promise<Transaction>
}

export default function Register({ profile, onAdd }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'ai', text: '¡Listo! Cuéntame tus movimientos de forma natural.\n\n"Gasté $15.000 en almuerzo"\n"Llegó el sueldo, $1.350.000"\n"Pagué la cuenta de luz, $34.000"' }
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedBank, setSelectedBank] = useState<string>('')
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Build payment options from profile
  const paymentOptions: { label: string; bank: string; method: string }[] = []
  for (const acc of (profile.bank_accounts || [])) {
    paymentOptions.push({ label: `${acc.bank} — Débito`, bank: acc.bank, method: 'débito' })
  }
  for (const card of (profile.credit_cards || [])) {
    paymentOptions.push({ label: `${card.bank} — ${card.name} (crédito)`, bank: card.bank, method: `crédito ${card.name}` })
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const send = async () => {
    if (!input.trim() || sending) return
    const txt = input.trim()
    setInput('')
    setSending(true)
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
          bank: selectedBank || undefined,
          payment_method: selectedMethod || undefined,
        })
        setMsgs([...newMsgs, { role: 'ai', text: `Listo, registré tu ${p.type === 'income' ? 'ingreso' : 'gasto'} en ${p.category}${selectedBank ? ` (${selectedBank}${selectedMethod ? ' · ' + selectedMethod : ''})` : ''}.`, txn }])
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
      <div style={{ padding: '20px 16px 12px', background: '#fff', borderBottom: '1px solid #e2e2de' }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 2 }}>Registrar</div>
        <div style={{ fontSize: 12, color: '#888' }}>Escribe tus movimientos en lenguaje natural</div>

        {/* Payment method selector */}
        {paymentOptions.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>¿Con qué pagaste?</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={() => { setSelectedBank(''); setSelectedMethod('') }}
                style={{
                  padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1.5px solid',
                  background: !selectedBank ? '#1a1a1a' : '#fff',
                  color: !selectedBank ? '#fff' : '#555',
                  borderColor: !selectedBank ? '#1a1a1a' : '#e2e2de',
                }}
              >Sin especificar</button>
              {paymentOptions.map((opt, i) => {
                const active = selectedBank === opt.bank && selectedMethod === opt.method
                return (
                  <button key={i}
                    onClick={() => { setSelectedBank(opt.bank); setSelectedMethod(opt.method) }}
                    style={{
                      padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1.5px solid',
                      background: active ? '#1a1a1a' : '#fff',
                      color: active ? '#fff' : '#555',
                      borderColor: active ? '#1a1a1a' : '#e2e2de',
                    }}
                  >{opt.label}</button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 scrollable" style={{ padding: '12px 16px' }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', marginBottom: 10, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div className={m.role === 'user' ? 'bubble-user' : m.role === 'err' ? 'bubble-err' : 'bubble-ai'}
              style={{ maxWidth: '82%', padding: '10px 14px', fontSize: 14, lineHeight: 1.55 }}>
              {m.text.split('\n').map((line, j) => <span key={j}>{line}{j < m.text.split('\n').length - 1 && <br />}</span>)}
              {m.txn && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #d1fae5', fontSize: 12, color: '#16a34a' }}>
                  {m.txn.type === 'income' ? '+' : '-'}{fmt(m.txn.amount)} · {m.txn.category}
                  {m.txn.bank && <span> · {m.txn.bank}</span>}
                  {m.txn.payment_method && <span> {m.txn.payment_method}</span>}
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

      <div style={{ borderTop: '1px solid #e2e2de', padding: '10px 12px', display: 'flex', gap: 8, background: '#fff' }} className="safe-bottom">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={selectedBank ? `Pagar con ${selectedBank}...` : '"Gasté $12.000 en café"'}
          className="input-base" style={{ flex: 1 }} />
        <button onClick={send} disabled={sending || !input.trim()} className="btn-primary"
          style={{ width: 44, height: 44, padding: 0, borderRadius: 12, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
      </div>
    </div>
  )
}
