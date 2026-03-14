'use client'
import { useState } from 'react'
import type { Goal } from '@/lib/types'
import { fmt } from '@/lib/utils'

interface Props {
  goals: Goal[]
  onAdd: (name: string, target: number, current: number) => Promise<void>
  onContribute: (id: string, amount: number) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function Goals({ goals, onAdd, onContribute, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [current, setCurrent] = useState('0')
  const [saving, setSaving] = useState(false)
  const [contrib, setContrib] = useState<Record<string, string>>({})
  const [contributing, setContributing] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!name.trim() || !target || parseFloat(target) <= 0) return
    setSaving(true)
    await onAdd(name.trim(), parseFloat(target), parseFloat(current) || 0)
    setName(''); setTarget(''); setCurrent('0'); setShowForm(false); setSaving(false)
  }

  const handleContribute = async (id: string) => {
    const amt = parseFloat(contrib[id] || '0')
    if (!amt || amt <= 0) return
    setContributing(id)
    await onContribute(id, amt)
    setContrib((prev) => ({ ...prev, [id]: '' }))
    setContributing(null)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-5 pb-2">
        <div>
          <div className="text-lg font-semibold">Metas</div>
          <div className="text-xs text-gray-400 mt-0.5">Ahorro e inversión</div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center text-xl"
        >
          {showForm ? '×' : '+'}
        </button>
      </div>

      <div className="flex-1 scrollable px-4 pb-4">

        {/* Add form */}
        {showForm && (
          <div className="border border-gray-200 rounded-2xl p-4 mb-5">
            <div className="text-sm font-medium mb-3">Nueva meta</div>
            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Fondo de emergencia"
                className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Objetivo (CLP)</label>
                <input
                  type="number"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="1000000"
                  className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Ya ahorrado</label>
                <input
                  type="number"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm">
                Cancelar
              </button>
              <button onClick={handleAdd} disabled={saving} className="flex-1 py-2.5 bg-black text-white rounded-xl text-sm disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar meta'}
              </button>
            </div>
          </div>
        )}

        {/* Goals list */}
        {goals.length === 0 && !showForm ? (
          <div className="text-center py-16">
            <div className="text-3xl mb-3">◎</div>
            <div className="text-sm text-gray-400">Agrega tu primera meta de ahorro</div>
          </div>
        ) : (
          goals.map((g) => {
            const pct = Math.min(100, Math.round(g.current / g.target * 100))
            const remaining = Math.max(0, g.target - g.current)
            return (
              <div key={g.id} className="border border-gray-100 rounded-2xl p-4 mb-3">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-sm font-semibold">{g.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {fmt(g.current)} de {fmt(g.target)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pct >= 100 ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Completada</span>
                    ) : (
                      <span className="text-sm font-semibold">{pct}%</span>
                    )}
                  </div>
                </div>

                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-400' : 'bg-black'}`}
                    style={{ width: pct + '%' }}
                  />
                </div>

                {remaining > 0 && (
                  <div className="text-xs text-gray-400 mb-3">Faltan {fmt(remaining)}</div>
                )}

                <div className="flex gap-2">
                  <input
                    type="number"
                    value={contrib[g.id!] || ''}
                    onChange={(e) => setContrib((prev) => ({ ...prev, [g.id!]: e.target.value }))}
                    placeholder="Monto a aportar"
                    className="flex-1 px-3 py-2 bg-gray-50 rounded-xl text-sm outline-none"
                  />
                  <button
                    onClick={() => handleContribute(g.id!)}
                    disabled={contributing === g.id}
                    className="px-4 py-2 bg-black text-white rounded-xl text-sm disabled:opacity-50"
                  >
                    {contributing === g.id ? '...' : 'Aportar'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('¿Eliminar esta meta?')) onDelete(g.id!)
                    }}
                    className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-xl text-gray-400 text-sm"
                  >
                    ×
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
