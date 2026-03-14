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
  { id: 'goals', label: 'Metas', icon: '◎' },
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
    } else {
      const { data } = await supabase.from('profiles').insert(payload).select().single()
      if (data) setProfile(data as Profile)
    }
    setProfile(payload as Profile)
  }

  const addTransaction = async (txn: Omit<Transaction, 'id' | 'user_id'>) => {
    const { data } = await supabase
      .from('transactions')
      .insert({ ...txn, user_id: userId })
      .select()
      .single()
    if (data) setTransactions((prev) => [data as Transaction, ...prev])
    return data as Transaction
  }

  const addGoal = async (name: string, target: number, current: number) => {
    const { data } = await supabase
      .from('goals')
      .insert({ name, target, current, user_id: userId })
      .select()
      .single()
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <Onboarding
        onComplete={async (p) => {
          await saveProfile(p)
          if (p.current_balance > 0) {
            await addTransaction({
              type: 'income',
              amount: p.current_balance,
              category: 'Balance inicial',
              description: 'Balance inicial de cuentas',
              date: new Date().toISOString().split('T')[0],
            })
          }
        }}
      />
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'dashboard' && (
          <Dashboard
            profile={profile}
            transactions={transactions}
            goals={goals}
            onSignOut={handleSignOut}
          />
        )}
        {tab === 'register' && (
          <Register onAdd={addTransaction} />
        )}
        {tab === 'fixed' && (
          <Fixed
            profile={profile}
            onMarkFixed={async (type, idx) => {
              const item = type === 'inc' ? profile.incomes[idx] : profile.fixed_expenses[idx]
              const mk = new Date().toISOString().substring(0, 7)
              const log = { ...profile.monthly_log }
              if (!log[mk]) log[mk] = {}
              log[mk][`${type}_${idx}`] = true
              const updated = { ...profile, monthly_log: log }
              await saveProfile(updated)
              const catMap: Record<string, string> = {}
              if (type === 'inc') {
                const n = item.name.toLowerCase()
                catMap.cat = n.includes('sueldo') || n.includes('salario') ? 'Sueldo'
                  : n.includes('freelance') || n.includes('honorario') ? 'Freelance'
                  : n.includes('arriendo') ? 'Arriendo' : 'Otros ingresos'
              } else {
                catMap.cat = (item as { category: string }).category
              }
              await addTransaction({
                type: type === 'inc' ? 'income' : 'expense',
                amount: item.amount,
                category: catMap.cat,
                description: item.name,
                date: new Date().toISOString().split('T')[0],
              })
            }}
          />
        )}
        {tab === 'goals' && (
          <Goals
            goals={goals}
            onAdd={addGoal}
            onContribute={async (id, amount) => {
              const goal = goals.find((g) => g.id === id)
              if (!goal) return
              await updateGoal(id, goal.current + amount)
              await addTransaction({
                type: 'expense',
                amount,
                category: 'Ahorro',
                description: 'Aporte: ' + goal.name,
                date: new Date().toISOString().split('T')[0],
              })
            }}
            onDelete={deleteGoal}
          />
        )}
      </div>

      {/* Bottom nav */}
      <nav className="border-t border-gray-100 bg-white safe-bottom">
        <div className="flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center py-3 gap-0.5 text-xs transition-colors ${
                tab === t.id ? 'text-black' : 'text-gray-400'
              }`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
