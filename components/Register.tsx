'use client'
import { useState, useRef, useEffect } from 'react'
import type { Transaction } from '@/lib/types'
import { fmt } from '@/lib/utils'

const TXN_SYS = `Clasifica transacciones en español para finanzas personales en Chile (CLP pesos chilenos).
Si es una transacción responde SOLO JSON: {"action":"transaction","type":"expense","amount":NUMBER,"category":"string","description":"string"}
type="income" para ingresos.
Categorías gasto: Alimentación, Transporte, Vivienda, Salud, Entretenimiento, Ropa, Educación, Servicios básicos, Tecnología, Restaurantes, Seguros, Deudas, Otros
Categorías ingreso: Sueldo, Freelance, Inversión, Arriendo, Regalo, Otros ingresos
Si NO es transacción: {"action":"message","text":"respuesta breve en español"}
SOLO JSON PURO sin texto ni backticks.`

interface Msg { role: 'user' | 'ai' | 'err'; text: string; txn?: Transaction }
interface Props { onAdd: (t: Omit<Transaction, 'id' | 'user_id'>) => Promise<Transaction> }

export default function Register({ onAdd }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'ai', text: '¡Listo! Cuéntame tus movimientos de forma natural.\n\n"Gasté $15.000 en almuerzo"\n"Llegó el sueldo, $1.350.000"\n"Pagué la cuenta de luz, $34.000"' }
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

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
        })
        setMsgs([...newMsgs, { role: 'ai', text: `Listo, registré tu ${p.type === 'income' ? 'ingreso' : 'gasto'} en ${p.category}.`, txn }])
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
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-2">
        <div className="text-lg font-semibold">Registrar</div>
        <div className="text-xs text-gray-400 mt-0.5">Escribe tus movimientos en lenguaje natural</div>
      </div>

      <div className="flex-1 scrollable px-4 py-2">
        {msgs.map((m, i) => (
          <div key={i} className={`flex mb-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${m.role === 'user' ? 'bubble-user' : m.role === 'err' ? 'bubble-err' : 'bubble-ai'} px-4 py-3 text-sm leading-relaxed`}>
              {m.text.split('\n').map((line, j) => <span key={j}>{line}{j < m.text.split('\n').length - 1 && <br />}</span>)}
              {m.txn && (
                <div className="mt-2 pt-2 border-t border-green-200 text-xs text-green-700">
                  {m.txn.type === 'income' ? '+' : '-'}{fmt(m.txn.amount)} · {m.txn.category}
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start mb-3">
            <div className="bubble-ai px-4 py-3 text-sm text-gray-400">Procesando...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-100 p-3 safe-bottom flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder='"Gasté $12.000 en café"'
          className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none"
        />
        <button onClick={send} disabled={sending || !input.trim()} className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center disabled:opacity-40 text-lg">
          ↑
        </button>
      </div>
    </div>
  )
}
