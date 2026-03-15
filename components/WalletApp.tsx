'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile, Transaction, Goal, Tab } from '@/lib/types'
import Onboarding from './Onboarding'
import Dashboard from './Dashboard'
import Register from './Register'
import Fixed from './Fixed'
import Goals from './Goals'
import { sanitizeProfile } from '@/lib/sanitize'
import Adjust from './Adjust'

interface Props { userId: string }

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Resumen', icon: '◎' },
  { id: 'register', label: 'Registrar', icon: '＋' },
  { id: 'fixed', label: 'Fijos', icon: '↻' },
  { id: 'goals', label: 'Metas', icon: '◈' },
  { id: 'adjust', label: 'Ajustar', icon: '✎' },
]

export default function WalletApp({ userId }: Props) {
  const [tab, setTab] = useState<Tab>('register')
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
    if (prof) setProfile(sanitizeProfile(prof as Profile))
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
    if (data) setTransactions(prev => [data as Transaction, ...prev])
    return data as Transaction
  }

  const updateTransaction = async (t: Transaction) => {
    await supabase.from('transactions').update({
      description: t.description, amount: t.amount, category: t.category,
      bank: t.bank || null, payment_method: t.payment_method || null,
    }).eq('id', t.id)
    setTransactions(prev => prev.map(x => x.id === t.id ? t : x))
  }

  const deleteTransaction = async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions(prev => prev.filter(x => x.id !== id))
  }

  const addGoal = async (name: string, target: number, current: number) => {
    const { data } = await supabase.from('goals').insert({ name, target, current, user_id: userId }).select().single()
    if (data) setGoals(prev => [...prev, data as Goal])
  }

  const updateGoal = async (id: string, current: number) => {
    await supabase.from('goals').update({ current }).eq('id', id)
    setGoals(prev => prev.map(g => g.id === id ? { ...g, current } : g))
  }

  const deleteGoal = async (id: string) => {
    await supabase.from('goals').delete().eq('id', id)
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  const handleMarkFixed = async (type: 'inc' | 'exp', idx: number, opts: { bank?: string; method?: string; partial?: number; complete?: boolean }) => {
    if (!profile) return
    const item = type === 'inc' ? profile.incomes[idx] : profile.fixed_expenses[idx]
    const mk = new Date().toISOString().substring(0, 7)
    const log = { ...(profile.monthly_log || {}) }
    if (!log[mk]) log[mk] = {}
    const existing = log[mk][`${type}_${idx}`]
    const existingEntry = existing && typeof existing !== 'boolean' ? existing : null
    const isCompletingPartial = !!(existingEntry?.partial_amount)

    if (opts.partial && !opts.complete) {
      log[mk][`${type}_${idx}`] = { paid: false, partial_amount: (existingEntry?.partial_amount || 0) + opts.partial, bank: opts.bank, payment_method: opts.method }
      await addTransaction({
        type: type === 'inc' ? 'income' : 'expense',
        amount: opts.partial, category: type === 'inc' ? 'Otros ingresos' : (item as { category: string }).category,
        description: `(Parcial) ${item.name}`,
        date: new Date().toISOString().split('T')[0],
        bank: opts.bank, payment_method: opts.method,
      })
    } else {
      log[mk][`${type}_${idx}`] = { paid: true, bank: opts.bank, payment_method: opts.method }
      const remaining = isCompletingPartial ? item.amount - (existingEntry?.partial_amount || 0) : item.amount
      const n = item.name.toLowerCase()
      const cat = type === 'inc'
        ? (n.includes('sueldo') || n.includes('salario') ? 'Sueldo' : n.includes('freelance') || n.includes('honorario') ? 'Freelance' : n.includes('arriendo') ? 'Arriendo' : 'Otros ingresos')
        : (item as { category: string }).category
      await addTransaction({
        type: type === 'inc' ? 'income' : 'expense',
        amount: remaining > 0 ? remaining : item.amount, category: cat,
        description: isCompletingPartial ? `(Completado) ${item.name}` : item.name,
        date: new Date().toISOString().split('T')[0],
        bank: opts.bank, payment_method: opts.method,
      })
    }
    await saveProfile({ ...profile, monthly_log: log })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f0f0ed' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #e2e2de', borderTopColor: '#1a6ef5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!profile) {
    return (
      <Onboarding onComplete={async (p) => {
        await saveProfile(p)
        for (const acc of (p.bank_accounts || [])) {
          if (acc.balance > 0) {
            await addTransaction({ type: 'income', amount: acc.balance, category: 'Balance inicial', description: `Saldo inicial ${acc.bank}`, date: new Date().toISOString().split('T')[0], bank: acc.bank, payment_method: acc.account_type })
          }
        }
        if ((p.bank_accounts || []).length === 0 && p.current_balance > 0) {
          await addTransaction({ type: 'income', amount: p.current_balance, category: 'Balance inicial', description: 'Balance inicial', date: new Date().toISOString().split('T')[0] })
        }
      }} />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f0f0ed', position: 'relative' }}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'dashboard' && (
          <Dashboard profile={profile} transactions={transactions} goals={goals}
            onSignOut={async () => { await supabase.auth.signOut() }}
            onUpdateTransaction={updateTransaction}
            onDeleteTransaction={deleteTransaction} />
        )}
        {tab === 'register' && <Register profile={profile} onAdd={addTransaction} />}
        {tab === 'fixed' && (
          <Fixed profile={profile} onMarkFixed={handleMarkFixed} onEditFixed={saveProfile} />
        )}
        {tab === 'goals' && (
          <Goals goals={goals} onAdd={addGoal}
            onContribute={async (id, amount) => {
              const goal = goals.find(g => g.id === id)
              if (!goal) return
              await updateGoal(id, goal.current + amount)
              await addTransaction({ type: 'expense', amount, category: 'Ahorro', description: 'Aporte: ' + goal.name, date: new Date().toISOString().split('T')[0] })
            }}
            onDelete={deleteGoal} />
        )}
        {tab === 'adjust' && (
          <Adjust profile={profile} onSave={saveProfile} />
        )}
      </div>

      {/* Bottom nav — 5 tabs */}
      <nav style={{ borderTop: '1px solid #e2e2de', background: '#fff', paddingBottom: 'env(safe-area-inset-bottom)', flexShrink: 0 }}>
        <div style={{ display: 'flex' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 2px', gap: 2, fontSize: 10, cursor: 'pointer', background: 'none', border: 'none', color: tab === t.id ? '#1a6ef5' : '#bbb', fontWeight: tab === t.id ? 700 : 400 }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
