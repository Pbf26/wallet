'use client'
import { useState } from 'react'
import type { Profile, Transaction } from '@/lib/types'
import { fmt } from '@/lib/utils'

interface Props {
  profile: Profile
  transactions: Transaction[]
}

export default function PatrimonyWidget({ profile, transactions }: Props) {
  const [open, setOpen] = useState(false)

  const totalCash = transactions.reduce((s, t) => t.type === 'income' ? s + t.amount : s - t.amount, 0)
  const totalInvestments = (profile.investments || []).reduce((s, i) => s + i.amount, 0)
  const totalDebt = (profile.debts || []).reduce((s, d) => s + d.total_amount, 0)
  const totalCardUsed = (profile.credit_cards || []).reduce((s, c) => s + c.used, 0)
  const totalOwed = totalDebt + totalCardUsed
  const patrimony = totalCash + totalInvestments - totalOwed

  // Per-bank breakdown
  const bankBalances: Record<string, number> = {}
  for (const acc of (profile.bank_accounts || [])) bankBalances[acc.bank] = 0
  for (const txn of transactions) {
    if (txn.bank) {
      if (!(txn.bank in bankBalances)) bankBalances[txn.bank] = 0
      bankBalances[txn.bank] += txn.type === 'income' ? txn.amount : -txn.amount
    }
  }
  const unassigned = transactions.filter(t => !t.bank).reduce((s, t) => t.type === 'income' ? s + t.amount : s - t.amount, 0)

  return (
    <div style={{ marginBottom: 14 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
        <div className="card" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Patrimonio total</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: patrimony >= 0 ? '#1a1a1a' : '#dc2626' }}>{fmt(patrimony)}</div>
            </div>
            <div style={{ fontSize: 18, color: '#bbb', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</div>
          </div>

          {open && (
            <div style={{ marginTop: 14, borderTop: '1px solid #f0f0ed', paddingTop: 12 }}>
              {/* Cash by bank */}
              <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Efectivo</div>
              {(profile.bank_accounts || []).map((acc, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: '#555' }}>{acc.bank} <span style={{ fontSize: 11, color: '#aaa' }}>{acc.account_type}</span></span>
                  <span style={{ fontWeight: 600, color: (bankBalances[acc.bank] ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(bankBalances[acc.bank] ?? 0)}</span>
                </div>
              ))}
              {unassigned !== 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: '#aaa' }}>Sin banco asignado</span>
                  <span style={{ fontWeight: 600, color: unassigned >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(unassigned)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 12, paddingTop: 6, borderTop: '1px solid #f0f0ed' }}>
                <span>Total cash</span><span style={{ color: totalCash >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(totalCash)}</span>
              </div>

              {/* Investments */}
              {(profile.investments || []).length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Inversiones</div>
                  {(profile.investments || []).map((inv, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: '#555' }}>{inv.name} <span style={{ fontSize: 11, color: '#aaa' }}>{inv.type}</span></span>
                      <span style={{ fontWeight: 600 }}>{fmt(inv.amount)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 12, paddingTop: 6, borderTop: '1px solid #f0f0ed' }}>
                    <span>Total inversiones</span><span>{fmt(totalInvestments)}</span>
                  </div>
                </>
              )}

              {/* Debts */}
              {totalOwed > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Deudas</div>
                  {(profile.credit_cards || []).filter(c => c.used > 0).map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: '#555' }}>{c.bank} {c.name} <span style={{ fontSize: 11, color: '#aaa' }}>crédito</span></span>
                      <span style={{ fontWeight: 600, color: '#dc2626' }}>-{fmt(c.used)}</span>
                    </div>
                  ))}
                  {(profile.debts || []).map((d, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: '#555' }}>{d.name} <span style={{ fontSize: 11, color: '#aaa' }}>{d.institution}</span></span>
                      <span style={{ fontWeight: 600, color: '#dc2626' }}>-{fmt(d.total_amount)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 12, paddingTop: 6, borderTop: '1px solid #f0f0ed' }}>
                    <span>Total deudas</span><span style={{ color: '#dc2626' }}>-{fmt(totalOwed)}</span>
                  </div>
                </>
              )}

              {/* Net */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, paddingTop: 8, borderTop: '2px solid #e2e2de' }}>
                <span>Patrimonio neto</span>
                <span style={{ color: patrimony >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(patrimony)}</span>
              </div>
            </div>
          )}
        </div>
      </button>
    </div>
  )
}
