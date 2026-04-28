import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { startOfTomorrow } from 'date-fns'
import { ShoppingBag } from 'lucide-react'
import { useShopStore, ShopItemClient } from '../../stores/shop.store'
import { useSettingsStore } from '../../stores/settings.store'
import { TIER_COLORS } from '../../lib/science/rewards'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/button'
import { Shopkeeper } from '../../assets/Shopkeeper'

const SHOPKEEPER_GREETINGS = [
  "Ah, a fine traveler! Today's wares are freshly stocked.",
  'Welcome back, adventurer. I saved the best for you.',
  'The Shopkeeper smiles knowingly. Something caught your eye?',
  "Rest your boots. The rarest items don't stay long.",
  'Every great hero needs proper equipment. Browse freely.',
  "The stars aligned for today's selection. Choose wisely.",
  'Another day, another chance to grow stronger. Shop away.'
]

function getGreeting(): string {
  const day = new Date().getDay()
  return SHOPKEEPER_GREETINGS[day]
}

function useCountdown(): string {
  const [label, setLabel] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const midnight = startOfTomorrow(new Date()).getTime()
      const diff = Math.max(0, midnight - now)
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setLabel(`${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return label
}

interface ShopItemCardProps {
  item: ShopItemClient
  focusBalance: number
  isPurchased: boolean
  isPurchasing: boolean
  onBuy: (item: ShopItemClient) => void
}

function ShopItemCard({ item, focusBalance, isPurchased, isPurchasing, onBuy }: ShopItemCardProps) {
  const [confirming, setConfirming] = useState(false)
  const colors = TIER_COLORS[item.rarity as keyof typeof TIER_COLORS] ?? TIER_COLORS.common
  const canAfford = focusBalance >= item.focusCost

  function handleClick() {
    if (isPurchased || isPurchasing || !canAfford) return

    const requiresConfirmation = item.focusCost >= 200

    if (requiresConfirmation && !confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
      return
    }

    setConfirming(false)
    onBuy(item)
  }

  function getButtonLabel() {
    if (isPurchased) return 'Owned'
    if (isPurchasing) return '...'
    if (confirming) return 'Confirm?'
    return `${item.focusCost} 💎`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col gap-3 p-4 rounded-2xl border bg-surface-800/60 backdrop-blur-sm transition-all duration-200',
        colors.border,
        colors.bg,
        isPurchased ? 'opacity-60' : 'ui-bg-hover'
      )}
    >
      {/* Icon + rarity badge */}
      <div className="flex items-start justify-between">
        <span className="text-3xl">{item.icon}</span>
        <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border', colors.text, colors.border, colors.bg)}>
          {item.rarity}
        </span>
      </div>

      {/* Name + description */}
      <div className="flex flex-col gap-1 flex-1">
        <p className="text-sm font-bold text-[color:var(--app-interactive-fg-default)] leading-tight">{item.name}</p>
        <p className="text-xs text-surface-400 leading-snug">{item.description}</p>
        {item.type === 'potion' && item.effectDuration && (
          <p className="text-[10px] text-surface-500 mt-0.5">Duration: {item.effectDuration}m</p>
        )}
        {item.type === 'egg' && item.eggTier && (
          <p className="text-[10px] text-surface-500 mt-0.5 capitalize">Tier: {item.eggTier}</p>
        )}
      </div>

      {/* Buy button */}
      <Button
        size="sm"
        variant={isPurchased ? 'secondary' : confirming ? 'amber' : canAfford ? 'primary' : 'secondary'}
        className="w-full"
        onClick={handleClick}
        disabled={isPurchased || isPurchasing || !canAfford}
        loading={isPurchasing}
      >
        {getButtonLabel()}
      </Button>

      {!canAfford && !isPurchased && (
        <p className="text-[10px] text-surface-500 text-center -mt-1">Need {(item.focusCost - focusBalance)} more 💎</p>
      )}
    </motion.div>
  )
}

export function ShopPage() {
  const { focusBalance, dailyItems, purchasedItemIds, purchasing, loading, load, purchase } = useShopStore()
  const { loadSettings } = useSettingsStore()
  const countdown = useCountdown()
  const greeting = getGreeting()

  useEffect(() => {
    void load()
  }, [])

  async function handleBuy(item: ShopItemClient) {
    const result = await purchase(item.id)
    if (!result.success) return

    if (item.type === 'cosmetic') {
      await loadSettings()
    }

    if (item.id === 'potion_boss_bait') {
      await window.api.shop.activateBossBait()
    }

    if (item.id === 'potion_habit_shield') {
      await window.api.shop.activateHabitShield()
    }
  }

  const potions = dailyItems.filter((i) => i.type === 'potion')
  const cosmetics = dailyItems.filter((i) => i.type === 'cosmetic')
  const pets = dailyItems.filter((i) => i.type === 'egg')

  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start gap-5">
        {/* Shopkeeper portrait */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex-shrink-0 w-28 h-36 rounded-2xl bg-gradient-to-b from-primary-900/40 to-surface-800/60 border border-primary-700/30 flex items-end justify-center overflow-hidden shadow-xl"
        >
          <Shopkeeper className="w-full h-full" />
        </motion.div>

        {/* Title + greeting + balance */}
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-cyan-400" />
            <h1 className="text-2xl font-black text-[color:var(--app-interactive-fg-default)]">The Shop</h1>
          </div>
          <p className="text-sm text-surface-400 italic leading-snug">&ldquo;{greeting}&rdquo;</p>

          {/* Focus balance + countdown */}
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
              <span className="text-xl font-black text-cyan-400">{focusBalance.toLocaleString()}</span>
              <span className="text-sm text-cyan-500/70">💎 Focus</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-surface-400">
              <span className="text-[10px] uppercase tracking-wide font-medium">Refreshes in</span>
              <span className="font-mono text-[color:var(--app-interactive-fg-default)] font-bold text-xs">{countdown}</span>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-surface-400 text-sm">
          Loading today's wares...
        </div>
      )}

      {!loading && dailyItems.length > 0 && (
        <div className="flex flex-col gap-6">
          {/* Potions */}
          {potions.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs uppercase tracking-widest text-surface-400 font-semibold">🧪 Potions</h2>
              <div className="grid grid-cols-2 gap-3">
                {potions.map((item) => (
                  <ShopItemCard
                    key={item.id}
                    item={item}
                    focusBalance={focusBalance}
                    isPurchased={purchasedItemIds.has(item.id)}
                    isPurchasing={purchasing === item.id}
                    onBuy={handleBuy}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Cosmetics */}
          {cosmetics.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs uppercase tracking-widest text-surface-400 font-semibold">✨ Cosmetics</h2>
              <div className="grid grid-cols-2 gap-3">
                {cosmetics.map((item) => (
                  <ShopItemCard
                    key={item.id}
                    item={item}
                    focusBalance={focusBalance}
                    isPurchased={purchasedItemIds.has(item.id)}
                    isPurchasing={purchasing === item.id}
                    onBuy={handleBuy}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Eggs */}
          {pets.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs uppercase tracking-widest text-surface-400 font-semibold">🥚 Eggs</h2>
              <div className="grid grid-cols-2 gap-3">
                {pets.map((item) => (
                  <ShopItemCard
                    key={item.id}
                    item={item}
                    focusBalance={focusBalance}
                    isPurchased={purchasedItemIds.has(item.id)}
                    isPurchasing={purchasing === item.id}
                    onBuy={handleBuy}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {!loading && dailyItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <span className="text-4xl">🏪</span>
          <p className="text-surface-400 text-sm">The Shopkeeper is preparing today's stock…</p>
        </div>
      )}

      {/* Earn Focus hint */}
      <div className="mt-auto pt-4 border-t border-surface-700">
        <p className="text-[11px] text-surface-500 text-center">
          Earn 💎 Focus by completing quests, unlocking badges, and hatching duplicate pets
        </p>
      </div>
    </div>
  )
}
