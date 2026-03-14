'use client'
import { useState } from 'react'
import type { Profile, MonthlyLogEntry } from '@/lib/types'
import { fmt, stabLabel, stabColor, varLabel } from '@/lib/utils'

interface Props {
  profile: Profile
  onMarkFixed: (type: 'inc' | 'exp', idx: number, opts: { bank?: string; method?: string; partial?: number; complete?: boolean }) => Promise<void>
  onEditFixed: (updatedProfile: Profile) => Promise<void>
}

type ModalState = { type: 'inc' | 'exp'; idx: number } | null

function getEntry(ml: Record<string, MonthlyLogEntry | boolean>, key: string): MonthlyLogEntry | null {
  const e = ml[key]
  if (!e) return null
  if (typeof e === 'boolean') return e ? { paid: true } : null
  return e
}

export default function Fixed({ profile, onMarkFixed, onEditFixed }: Props) {
  const mk = new Date().toISOString().substring(0, 7)
  const ml = (profile.monthly_log?.[mk] || {}) as Record<string, MonthlyLogEntry | boolean>
  const [marking, setMarking] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [chosenBank, setChosenBank] = useState('')
  const [chosenMethod, setChosenMethod] = useState('')
  const [partialAmount, setPartialAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState<'full' | 'partial'>('full')
  const [editMode, setEditMode] = useState(false)
  const [editingItem, setEditingItem] = useState<{ type: 'inc' | 'exp'; idx: number; amount: string; name: string } | null>(null)
  const [patrimonyOpen, setPatrimonyOpen] = useState(false)

  const paymentOptions: { label: string; bank: string; method: string }[] = []
  for (const acc of (profile.bank_accounts || [])) paymentOptions.push({ label: `${acc.bank} · Débito`, bank: acc.bank, method: 'débito' })
  for (const card of (profile.credit_cards || [])) paymentOptions.push({ label: `${card.bank} · ${card.name}`, bank: card.bank, method: `crédito ${card.name}` })

  const openModal = (type: 'inc' | 'exp', idx: number) => {
    setModal({ type, idx })
    setChosenBank('')
    setChosenMethod('')
    setPartialAmount('')
    setPaymentMode('full')
  }

  const confirmMark = async () => {
    if (!modal) return
    const key = `${modal.type}_${modal.idx}`
    setMarking(key)
    setModal(null)
    const partial = paymentMode === 'partial' && partialAmount ? parseFloat(partialAmount) : undefined
    await onMarkFixed(modal.type, modal.idx, { bank: chosenBank || undefined, method: chosenMethod || undefined, partial, complete: paymentMode === 'full' })
    setMarking(null)
  }

  const saveEdit = async () => {
    if (!editingItem) return
    const updated = { ...profile }
    const amt = parseFloat(editingItem.amount)
    if (isNaN(amt) || amt <= 0) return
    if (editingItem.type === 'inc') {
      updated.incomes = updated.incomes.map((inc, i) => i === editingItem.idx ? { ...inc, amount: amt, name: editingItem.name } : inc)
    } else {
      updated.fixed_expenses = updated.fixed_expenses.map((exp, i) => i === editingItem.idx ? { ...exp, amount: amt, name: editingItem.name } : exp)
    }
    await onEditFixed(updated)
    setEditingItem(null)
  }

  // Patrimony calc
  const totalInv = (profile.investments || []).reduce((s, i) => s + i.amount, 0)
  const totalDebt = (profile.debts || []).reduce((s, d) => s + d.total_amount, 0)
  const totalCard = (profile.credit_cards || []).reduce((s, c) => s + c.used, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f0f0ed', position: 'relative' }}>

      {/* Payment modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: '#fff', width: '100%', borderRadius: '20px 20px 0 0', padding: '20px 16px 32px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              {modal.type === 'inc' ? '¿Cómo recibiste este ingreso?' : '¿Cómo pagaste este gasto?'}
            </div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>
              {modal.type === 'inc' ? profile.incomes[modal.idx]?.name : profile.fixed_expenses[modal.idx]?.name}
              {' · '}{fmt(modal.type === 'inc' ? profile.incomes[modal.idx]?.amount : profile.fixed_expenses[modal.idx]?.amount)}
            </div>

            {/* Full / Partial toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {(['full', 'partial'] as const).map(m => (
                <button key={m} onClick={() => setPaymentMode(m)}
                  style={{ flex: 1, padding: '10px', borderRadius: 12, border: `1.5px solid ${paymentMode === m ? '#1a1a1a' : '#e2e2de'}`, background: paymentMode === m ? '#1a1a1a' : '#f7f7f4', color: paymentMode === m ? '#fff' : '#444', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                  {m === 'full' ? 'Pago total' : 'Pago parcial'}
                </button>
              ))}
            </div>

            {paymentMode === 'partial' && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>¿Cuánto pagaste?</div>
                <input type="number" value={partialAmount} onChange={e => setPartialAmount(e.target.value)}
                  placeholder="Monto parcial" className="input-base" />
              </div>
            )}

            {paymentOptions.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Banco / producto</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {paymentOptions.map((opt, i) => {
                    const active = chosenBank === opt.bank && chosenMethod === opt.method
                    return (
                      <button key={i} onClick={() => { setChosenBank(opt.bank); setChosenMethod(opt.method) }}
                        style={{ padding: '11px 14px', borderRadius: 12, border: `1.5px solid ${active ? '#1a1a1a' : '#e2e2de'}`, background: active ? '#1a1a1a' : '#f7f7f4', color: active ? '#fff' : '#333', fontSize: 13, fontWeight: 500, textAlign: 'left', cursor: 'pointer' }}>
                        {opt.label}
                      </button>
                    )
                  })}
                  <button onClick={() => { setChosenBank(''); setChosenMethod('') }}
                    style={{ padding: '11px 14px', borderRadius: 12, border: `1.5px solid ${!chosenBank ? '#1a1a1a' : '#e2e2de'}`, background: !chosenBank ? '#1a1a1a' : '#f7f7f4', color: !chosenBank ? '#fff' : '#333', fontSize: 13, fontWeight: 500, textAlign: 'left', cursor: 'pointer' }}>
                    Sin especificar
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(null)} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
              <button onClick={confirmMark} className="btn-primary" style={{ flex: 1 }}>
                {paymentMode === 'partial' ? 'Registrar pago parcial' : 'Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit item modal */}
      {editingItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: '#fff', width: '100%', borderRadius: '20px 20px 0 0', padding: '20px 16px 32px' }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Editar ítem fijo</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Nombre</div>
              <input value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} className="input-base" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Monto mensual (CLP)</div>
              <input type="number" value={editingItem.amount} onChange={e => setEditingItem({ ...editingItem, amount: e.target.value })} className="input-base" />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditingItem(null)} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
              <button onClick={saveEdit} className="btn-primary" style={{ flex: 1 }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '20px 16px 12px', background: '#fff', borderBottom: '1px solid #e2e2de', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600 }}>Compromisos fijos</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Marca los que ya recibiste o pagaste</div>
        </div>
        <button onClick={() => setEditMode(e => !e)}
          style={{ padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 500, border: `1.5px solid ${editMode ? '#1a1a1a' : '#e2e2de'}`, background: editMode ? '#1a1a1a' : '#fff', color: editMode ? '#fff' : '#555', cursor: 'pointer' }}>
          {editMode ? 'Listo' : 'Editar'}
        </button>
      </div>

      <div className="flex-1 scrollable" style={{ padding: '14px 16px' }}>

        {/* Patrimony compact */}
        <button onClick={() => setPatrimonyOpen(o => !o)} style={{ width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', marginBottom: 14 }}>
          <div className="card" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Patrimonio</div>
                <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
                  <span style={{ color: '#16a34a' }}>Inv: {fmt(totalInv)}</span>
                  <span style={{ color: '#dc2626' }}>Deuda: -{fmt(totalDebt + totalCard)}</span>
                </div>
              </div>
              <div style={{ fontSize: 18, color: '#bbb', transform: patrimonyOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</div>
            </div>
            {patrimonyOpen && (
              <div style={{ marginTop: 12, borderTop: '1px solid #f0f0ed', paddingTop: 10 }}>
                {(profile.investments || []).map((inv, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                    <span style={{ color: '#555' }}>{inv.name} <span style={{ color: '#aaa' }}>{inv.type}</span></span>
                    <span style={{ fontWeight: 600 }}>{fmt(inv.amount)}</span>
                  </div>
                ))}
                {(profile.debts || []).map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                    <span style={{ color: '#555' }}>{d.name}</span>
                    <span style={{ fontWeight: 600, color: '#dc2626' }}>-{fmt(d.total_amount)}</span>
                  </div>
                ))}
                {(profile.credit_cards || []).filter(c => c.used > 0).map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                    <span style={{ color: '#555' }}>{c.bank} {c.name}</span>
                    <span style={{ fontWeight: 600, color: '#dc2626' }}>-{fmt(c.used)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </button>

        {/* Incomes */}
        {profile.incomes.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Ingresos fijos</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {profile.incomes.map((inc, i) => {
                const entry = getEntry(ml, `inc_${i}`)
                const done = !!entry?.paid
                const isPartial = !!(entry && !entry.paid && entry.partial_amount)
                const isMarking = marking === `inc_${i}`
                const sc = stabColor[inc.stability] || stabColor.media
                return (
                  <div key={i} style={{ padding: '13px 14px', borderBottom: i < profile.incomes.length - 1 ? '1px solid #f0f0ed' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{inc.name}</span>
                          <span className={`tag ${sc}`} style={{ fontSize: 10 }}>{stabLabel[inc.stability]}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#888' }}>{inc.description}{inc.day_of_month ? ` · Día ${inc.day_of_month}` : ''}</div>
                        {isPartial && entry?.partial_amount && <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>Pago parcial registrado: {fmt(entry.partial_amount)}</div>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>+{fmt(inc.amount)}</span>
                        {editMode ? (
                          <button onClick={() => setEditingItem({ type: 'inc', idx: i, amount: String(inc.amount), name: inc.name })}
                            style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 500, border: '1.5px solid #e2e2de', background: '#f7f7f4', color: '#555', cursor: 'pointer' }}>
                            Editar
                          </button>
                        ) : (
                          <button onClick={() => !done && !isMarking && openModal('inc', i)} disabled={done || isMarking}
                            style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 500, border: 'none', cursor: done ? 'default' : 'pointer', background: done ? '#dcfce7' : isPartial ? '#fef3c7' : '#f0f0ed', color: done ? '#16a34a' : isPartial ? '#92400e' : '#555' }}>
                            {isMarking ? '...' : done ? '✓ Recibido' : isPartial ? 'Completar' : 'Marcar'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Expenses */}
        {profile.fixed_expenses.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Gastos fijos</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {profile.fixed_expenses.map((exp, i) => {
                const entry = getEntry(ml, `exp_${i}`)
                const done = !!entry?.paid
                const isPartial = !!(entry && !entry.paid && entry.partial_amount)
                const isMarking = marking === `exp_${i}`
                const vl = varLabel[exp.variance] || ''
                return (
                  <div key={i} style={{ padding: '13px 14px', borderBottom: i < profile.fixed_expenses.length - 1 ? '1px solid #f0f0ed' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{exp.name}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>{exp.category}{exp.day_of_month ? ` · Día ${exp.day_of_month}` : ''}{vl ? ` · ${vl}` : ''}</div>
                        {exp.variance_notes && <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>{exp.variance_notes}</div>}
                        {isPartial && entry?.partial_amount && <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>Pagado parcialmente: {fmt(entry.partial_amount)} de {fmt(exp.amount)}</div>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>-{fmt(exp.amount)}</span>
                        {editMode ? (
                          <button onClick={() => setEditingItem({ type: 'exp', idx: i, amount: String(exp.amount), name: exp.name })}
                            style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 500, border: '1.5px solid #e2e2de', background: '#f7f7f4', color: '#555', cursor: 'pointer' }}>
                            Editar
                          </button>
                        ) : (
                          <button onClick={() => !done && !isMarking && openModal('exp', i)} disabled={done || isMarking}
                            style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 500, border: 'none', cursor: done ? 'default' : 'pointer', background: done ? '#dcfce7' : isPartial ? '#fef3c7' : '#f0f0ed', color: done ? '#16a34a' : isPartial ? '#92400e' : '#555' }}>
                            {isMarking ? '...' : done ? '✓ Pagado' : isPartial ? 'Completar' : 'Pagar'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Debts */}
        {profile.debts.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Deudas activas</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {profile.debts.map((d, i) => (
                <div key={i} style={{ padding: '13px 14px', borderBottom: i < profile.debts.length - 1 ? '1px solid #f0f0ed' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, paddingRight: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{d.institution}{d.months_remaining ? ` · ${d.months_remaining} cuotas` : ''}{d.interest_rate ? ` · ${d.interest_rate}%` : ''}</div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>Pendiente: {fmt(d.total_amount)}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', whiteSpace: 'nowrap' }}>-{fmt(d.monthly_payment)}/mes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Investments */}
        {profile.investments.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Inversiones</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {profile.investments.map((inv, i) => (
                <div key={i} style={{ padding: '13px 14px', borderBottom: i < profile.investments.length - 1 ? '1px solid #f0f0ed' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{inv.name}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{inv.type}{inv.monthly_contribution ? ` · Aporte: ${fmt(inv.monthly_contribution)}/mes` : ''}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{fmt(inv.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
