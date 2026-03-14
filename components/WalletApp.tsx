'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile, Transaction, Goal, Tab } from '@/lib/types'
import Onboarding from './Onboarding'
import Dashboard from './Dashboard'
import Register from './Register'
import Fixed from './Fixed'
import Goals from './Goals'

interface Props { userId: string }

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Resumen', icon: '◎' },
  { id: 'register', label: 'Registrar', icon: '＋' },
  { id: 'fixed', label: 'Fijos', icon: '↻' },
  { id: 'goals', label: 'Metas', icon: '◈' },
]

export default function WalletApp({ userId }: Props) {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const [{ data: prof }, { data: txns }, { data: gls }] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('goals').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    ])
    if (prof) setProfile(prof as Profile)
    if (txns) setTransactions(txns as Transaction[])
    if (gls) setGoals(gls as Goal[])
    setLoading(false)
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  const saveProfile = async (p: Profile) => {
    const payload = { ...p, user_id: userId }
    if (p.id) {
      await supabase.from('profiles').update(payload).eq('id', p.id)
      setProfile({ ...payload, id: p.id } as Profile)
    } else {
      const { data } = await supabase.from('profiles').insert(payload).select().single()
      if (data) setProfile(data as Profile)
    }
  }

  const addTransaction = async (txn: Omit<Transaction, 'id' | 'user_id'>) => {
    const { data } = await supabase.from('transactions').insert({ ...txn, user_id: userId }).select().single()
    if (data) setTransactions((prev) => [data as Transaction, ...prev])
    return data as Transaction
  }

  const addGoal = async (name: string, target: number, current: number) => {
    const { data } = await supabase.from('goals').insert({ name, target, current, user_id: userId }).select().single()
    if (data) setGoals((prev) => [...prev, data as Goal])
  }

  const updateGoal = async (id: string, current: number) => {
    await supabase.from('goals').update({ current }).eq('id', id)
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, current } : g)))
  }

  const deleteGoal = async (id: string) => {
    await supabase.from('goals').delete().eq('id', id)
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f0f0ed' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #e2e2de', borderTopColor: '#1a1a1a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!profile) {
    return (
      <Onboarding
        onComplete={async (p) => {
          await saveProfile(p)
          // Register initial balances as income transactions per bank
          for (const acc of (p.bank_accounts || [])) {
            if (acc.balance > 0) {
              await addTransaction({
                type: 'income', amount: acc.balance,
                category: 'Balance inicial',
                description: `Saldo inicial ${acc.bank}`,
                date: new Date().toISOString().split('T')[0],
                bank: acc.bank,
                payment_method: acc.account_type,
              })
            }
          }
          // If no bank accounts but has a balance, register it anyway
          if ((p.bank_accounts || []).length === 0 && p.current_balance > 0) {
            await addTransaction({
              type: 'income', amount: p.current_balance,
              category: 'Balance inicial', description: 'Balance inicial de cuentas',
              date: new Date().toISOString().split('T')[0],
            })
          }
        }}
      />
    )
  }

  const handleMarkFixed = async (type: 'inc' | 'exp', idx: number, bank?: string, method?: string) => {
    if (!profile) return
    const item = type === 'inc' ? profile.incomes[idx] : profile.fixed_expenses[idx]
    const mk = new Date().toISOString().substring(0, 7)
    const log = { ...(profile.monthly_log || {}) }
    if (!log[mk]) log[mk] = {}
    log[mk][`${type}_${idx}`] = true
    const updated = { ...profile, monthly_log: log }
    await saveProfile(updated)
    const n = item.name.toLowerCase()
    const cat = type === 'inc'
      ? (n.includes('sueldo') || n.includes('salario') ? 'Sueldo'
        : n.includes('freelance') || n.includes('honorario') ? 'Freelance'
        : n.includes('arriendo') ? 'Arriendo' : 'Otros ingresos')
      : (item as { category: string }).category
    await addTransaction({
      type: type === 'inc' ? 'income' : 'expense',
      amount: item.amount, category: cat,
      description: item.name,
      date: new Date().toISOString().split('T')[0],
      bank, payment_method: method,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f0f0ed', position: 'relative' }}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'dashboard' && <Dashboard profile={profile} transactions={transactions} goals={goals} onSignOut={async () => { await supabase.auth.signOut() }} />}
        {tab === 'register' && <Register profile={profile} onAdd={addTransaction} />}
        {tab === 'fixed' && <Fixed profile={profile} onMarkFixed={handleMarkFixed} />}
        {tab === 'goals' && (
          <Goals goals={goals} onAdd={addGoal}
            onContribute={async (id, amount) => {
              const goal = goals.find((g) => g.id === id)
              if (!goal) return
              await updateGoal(id, goal.current + amount)
              await addTransaction({ type: 'expense', amount, category: 'Ahorro', description: 'Aporte: ' + goal.name, date: new Date().toISOString().split('T')[0] })
            }}
            onDelete={deleteGoal}
          />
        )}
      </div>
      <nav style={{ borderTop: '1px solid #e2e2de', background: '#fff', paddingBottom: 'env(safe-area-inset-bottom)', flexShrink: 0 }}>
        <div style={{ display: 'flex' }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px', gap: 2, fontSize: 11, cursor: 'pointer', background: 'none', border: 'none', color: tab === t.id ? '#1a1a1a' : '#bbb', fontWeight: tab === t.id ? 700 : 400 }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
