import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Zap, Sparkles } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { TIER_COLORS, type LootTier } from '../../lib/science/rewards'
import { cn } from '../../lib/utils'
import { format } from 'date-fns'

interface LootItem {
  id: string
  type: string
  tier: LootTier
  payload: string
  earned_at: number
  used_at: number | null
}

interface ParsedPayload {
  name?: string
  description?: string
  type?: string
  value?: number
}

const TIER_LABELS: Record<LootTier, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary'
}

const TIER_ICONS: Record<LootTier, string> = {
  common: '⚪',
  uncommon: '🟢',
  rare: '🔵',
  epic: '🟣',
  legendary: '🟡'
}

const TYPE_ICONS: Record<string, string> = {
  xp_boost: '⚡',
  power_up: '🔮',
  theme: '🎨',
  title: '📜',
  cosmetic: '✨'
}

export function InventoryPage() {
  const [items, setItems] = useState<LootItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'available' | 'used'>('all')

  useEffect(() => {
    loadInventory()
  }, [])

  async function loadInventory() {
    try {
      const data = await window.api.loot.list()
      setItems(data as LootItem[])
    } catch {}
    setLoading(false)
  }

  async function handleActivate(item: LootItem) {
    setActivating(item.id)
    try {
      await window.api.loot.activate(item.id)
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, used_at: Date.now() } : i))
    } catch {}
    setActivating(null)
  }

  function parsePayload(raw: string): ParsedPayload {
    try { return JSON.parse(raw) } catch { return {} }
  }

  const filtered = items.filter((i) => {
    if (filter === 'available') return !i.used_at
    if (filter === 'used') return !!i.used_at
    return true
  })

  const availableCount = items.filter((i) => !i.used_at).length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package size={22} className="text-amber-400" />
            Loot Inventory
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            {availableCount} item{availableCount !== 1 ? 's' : ''} available · {items.length} total earned
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'available', 'used'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize',
              filter === f
                ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30'
                : 'text-surface-400 hover:text-white hover:bg-surface-700'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-surface-400">Loading inventory...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-5xl mb-3">📦</div>
            <p className="text-white font-semibold mb-1">
              {filter === 'all' ? 'No Loot Yet' : filter === 'available' ? 'Nothing Available' : 'Nothing Used Yet'}
            </p>
            <p className="text-surface-400 text-sm">
              {filter === 'all'
                ? 'Complete habits, Pomodoros, and daily quests to earn loot drops.'
                : filter === 'available'
                  ? 'All your loot has been activated.'
                  : 'Activate items from your available loot.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          <AnimatePresence initial={false}>
            {filtered.map((item) => {
              const payload = parsePayload(item.payload)
              const colors = TIER_COLORS[item.tier] || TIER_COLORS.common
              const isUsed = !!item.used_at

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card
                    className={cn(
                      'border transition-all',
                      colors.border,
                      colors.bg,
                      isUsed && 'opacity-40',
                      !isUsed && colors.glow && `shadow-lg ${colors.glow}`
                    )}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      {/* Tier icon */}
                      <div className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border',
                        colors.border, colors.bg
                      )}>
                        {TYPE_ICONS[item.type] || '📦'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white text-sm">
                            {payload.name || item.type}
                          </span>
                          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md border', colors.text, colors.border, colors.bg)}>
                            {TIER_ICONS[item.tier]} {TIER_LABELS[item.tier]}
                          </span>
                          {isUsed && (
                            <span className="text-[10px] text-surface-500 bg-surface-700 px-1.5 py-0.5 rounded-md">
                              Used
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-surface-400 mt-0.5">
                          {payload.description || 'A mysterious reward'}
                        </p>
                        <p className="text-[10px] text-surface-600 mt-0.5">
                          Earned {format(new Date(item.earned_at), 'MMM d, yyyy')}
                          {isUsed && item.used_at && ` · Used ${format(new Date(item.used_at), 'MMM d')}`}
                        </p>
                      </div>

                      {/* Action */}
                      {!isUsed && (
                        <Button
                          size="sm"
                          variant={item.tier === 'legendary' ? 'amber' : 'secondary'}
                          loading={activating === item.id}
                          onClick={() => handleActivate(item)}
                          className="shrink-0"
                        >
                          {item.type === 'xp_boost' ? (
                            <><Zap size={12} /> Claim</>
                          ) : (
                            <><Sparkles size={12} /> Activate</>
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
