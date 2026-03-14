'use client'
import { useState } from 'react'
import type { Transaction, Profile } from '@/lib/types'
import { fmt } from '@/lib/utils'

const CATEGORIES_EXPENSE = ['Alimentación','Transporte','Vivienda','Salud','Entretenimiento','Ropa','Educación','Servicios básicos','Tecnología','Restaurantes','Seguros','Deudas','Ahorro','Otros']
const CATEGORIES_INCOME = ['Sueldo','Freelance','Inversión','Arriendo','Regalo','Balance inicial','Otros ingresos']

interface Props {
  txn: Transaction
  profile: Profile
  onSave: (updated: Transaction) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}

export default function EditTransactionModal({ txn, profile, onSave, onDelete, onClose }: Props) {
  const [description, setDescription] = useState(txn.description)
  const [amount, setAmount] = useState(String(txn.amount))
  const [category, setCategory] = useState(txn.category)
  const [bank, setBank] = useState(txn.bank || '')
  const [method, setMethod] = useState(txn.payment_method || '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const paymentOptions: { label: string; bank: string; method: string }[] = []
  for (const acc of (profile.bank_accounts || [])) paymentOptions.push({ label: `${acc.bank} · Débito`, bank: acc.bank, method: 'débito' })
  for (const card of (profile.credit_cards || [])) paymentOptions.push({ label: `${card.bank} · ${card.name}`, bank: card.bank, method: `crédito ${card.name}` })

  const cats = txn.type === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE

  const handleSave = async () => {
    if (!description.trim() || !amount || parseFloat(amount) <= 0) return
    setSaving(true)
    await onSave({ ...txn, description: description.trim(), amount: parseFloat(amount), category, bank: bank || undefined, payment_method: method || undefined })
    onClose()
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setSaving(true)
    await onDelete(txn.id!)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: '#fff', width: '100%', borderRadius: '20px 20px 0 0', padding: '20px 16px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Editar movimiento</div>
          <button onClick={onClose} style={{ fontSize: 20, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Descripción</div>
          <input value={description} onChange={e => setDescription(e.target.value)} className="input-base" />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Monto (CLP)</div>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="input-base" />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Categoría</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {cats.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                style={{ padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: `1.5px solid ${category === c ? '#1a1a1a' : '#e2e2de'}`, background: category === c ? '#1a1a1a' : '#f7f7f4', color: category === c ? '#fff' : '#444' }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {paymentOptions.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Banco / Método de pago</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button onClick={() => { setBank(''); setMethod('') }}
                style={{ padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: `1.5px solid ${!bank ? '#1a1a1a' : '#e2e2de'}`, background: !bank ? '#1a1a1a' : '#f7f7f4', color: !bank ? '#fff' : '#444' }}>
                Sin especificar
              </button>
              {paymentOptions.map((opt, i) => {
                const active = bank === opt.bank && method === opt.method
                return (
                  <button key={i} onClick={() => { setBank(opt.bank); setMethod(opt.method) }}
                    style={{ padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: `1.5px solid ${active ? '#1a1a1a' : '#e2e2de'}`, background: active ? '#1a1a1a' : '#f7f7f4', color: active ? '#fff' : '#444' }}>
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleDelete} disabled={saving}
            style={{ padding: '12px 16px', borderRadius: 12, border: `1.5px solid ${confirmDelete ? '#dc2626' : '#e2e2de'}`, background: confirmDelete ? '#dc2626' : '#fff', color: confirmDelete ? '#fff' : '#dc2626', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            {confirmDelete ? '¿Confirmar?' : 'Eliminar'}
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ flex: 1 }}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
