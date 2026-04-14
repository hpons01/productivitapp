import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Egg, ChevronRight, Check, Pencil } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { cn } from '../../lib/utils'
import { TIER_COLORS, type LootTier } from '../../lib/science/rewards'
import { petLevelProgress, petXpToNextLevel, getPetBonusDescription } from '../../lib/science/pets'
import { usePetsStore, type PetInstance, type EggInstance } from '../../stores/pets.store'
import { format } from 'date-fns'

const RARITY_LABELS: Record<string, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary'
}

const MYSTERY_EGG_DESCRIPTION = 'A sealed companion egg. Rarity is rolled when you hatch it.'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } }
}
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

export function PetsPage() {
  const { pets, eggs, equippedPet, loading, hatchingEggId, load, equipPet, unequipPet, hatchEgg, renamePet } = usePetsStore()
  const [tab, setTab] = useState<'roster' | 'eggs'>('eggs')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  useEffect(() => {
    void load()
  }, [])

  // Auto-switch to roster if no eggs
  useEffect(() => {
    if (!loading && eggs.length === 0 && pets.length > 0) setTab('roster')
  }, [loading, eggs.length, pets.length])

  function startRename(pet: PetInstance) {
    setRenamingId(pet.id)
    setRenameValue(pet.name)
  }

  async function submitRename(pet: PetInstance) {
    if (renameValue.trim()) {
      await renamePet(pet.id, renameValue.trim())
    }
    setRenamingId(null)
  }

  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Companions</h1>
        <p className="text-surface-400 text-sm mt-1">
          Complete daily quests to earn eggs. Hatch them to discover your companions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('eggs')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            tab === 'eggs'
              ? 'bg-primary-600 text-white shadow'
              : 'text-surface-400 hover:text-white'
          )}
        >
          Eggs {eggs.length > 0 && <span className="ml-1.5 bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">{eggs.length}</span>}
        </button>
        <button
          onClick={() => setTab('roster')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            tab === 'roster'
              ? 'bg-primary-600 text-white shadow'
              : 'text-surface-400 hover:text-white'
          )}
        >
          My Pets {pets.length > 0 && <span className="ml-1.5 text-surface-500 text-[10px]">({pets.length})</span>}
        </button>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-surface-500 text-sm">Loading companions...</div>
        </div>
      )}

      {!loading && (
        <AnimatePresence mode="wait">
          {/* ── Eggs tab ────────────────────────────────────────────────────── */}
          {tab === 'eggs' && (
            <motion.div
              key="eggs"
              variants={container}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {eggs.length === 0 ? (
                <EmptyEggs />
              ) : (
                eggs.map((egg) => (
                  <motion.div key={egg.id} variants={item}>
                    <EggCard
                      egg={egg}
                      isHatching={hatchingEggId === egg.id}
                      onHatch={() => hatchEgg(egg.id)}
                    />
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {/* ── Roster tab ──────────────────────────────────────────────────── */}
          {tab === 'roster' && (
            <motion.div
              key="roster"
              variants={container}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {pets.length === 0 ? (
                <EmptyRoster />
              ) : (
                pets.map((pet) => (
                  <motion.div key={pet.id} variants={item}>
                    <PetCard
                      pet={pet}
                      isEquipped={equippedPet?.id === pet.id}
                      isRenaming={renamingId === pet.id}
                      renameValue={renameValue}
                      onRenameChange={setRenameValue}
                      onStartRename={() => startRename(pet)}
                      onSubmitRename={() => submitRename(pet)}
                      onEquip={() => equipPet(pet.id)}
                      onUnequip={unequipPet}
                    />
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}

// ── Egg Card ──────────────────────────────────────────────────────────────────

function EggCard({
  egg,
  isHatching,
  onHatch
}: {
  egg: EggInstance
  isHatching: boolean
  onHatch: () => void
}) {
  const colors = TIER_COLORS.uncommon
  const label = 'Mystery'
  const desc = MYSTERY_EGG_DESCRIPTION

  return (
    <Card className={cn('border transition-all duration-300', colors.border, colors.bg,
      'shadow-md shadow-emerald-500/10'
    )}>
      <CardContent className="p-4 flex items-center gap-4">
        {/* Egg icon */}
        <motion.div
          className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border-2 flex-shrink-0',
            colors.border, colors.bg
          )}
          animate={isHatching ? { rotate: [-5, 5, -4, 4, -2, 2, 0] } : { scale: [1, 1.04, 1] }}
          transition={isHatching
            ? { duration: 0.5, repeat: Infinity }
            : { duration: 2, repeat: Infinity, ease: 'easeInOut' }
          }
        >
          🥚
        </motion.div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('font-bold text-sm', colors.text)}>{label} Egg</span>
            <span className={cn(
              'text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full border',
              colors.text, colors.border, colors.bg
            )}>{label}</span>
          </div>
          <p className="text-xs text-surface-400 mt-0.5 line-clamp-1">{desc}</p>
          <p className="text-[10px] text-surface-600 mt-1">
            Earned {format(egg.earned_at, 'MMM d, yyyy')}
          </p>
        </div>

        {/* Hatch button */}
        <Button
          size="sm"
          onClick={onHatch}
          disabled={isHatching}
          className="flex-shrink-0"
        >
          {isHatching ? 'Hatching...' : 'Hatch! 🥚'}
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Pet Card ──────────────────────────────────────────────────────────────────

function PetCard({
  pet,
  isEquipped,
  isRenaming,
  renameValue,
  onRenameChange,
  onStartRename,
  onSubmitRename,
  onEquip,
  onUnequip
}: {
  pet: PetInstance
  isEquipped: boolean
  isRenaming: boolean
  renameValue: string
  onRenameChange: (v: string) => void
  onStartRename: () => void
  onSubmitRename: () => void
  onEquip: () => void
  onUnequip: () => void
}) {
  const colors = TIER_COLORS[pet.rarity as LootTier] ?? TIER_COLORS.common
  const progress = petLevelProgress(pet.total_xp) * 100
  const xpToNext = petXpToNextLevel(pet.total_xp)
  const bonusDesc = getPetBonusDescription(
    pet.rarity as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary',
    pet.level,
    pet.boosted_source
  )

  return (
    <Card className={cn(
      'border transition-all duration-300',
      isEquipped
        ? 'border-amber-500/60 bg-amber-500/5 shadow-lg shadow-amber-500/10'
        : cn(colors.border, colors.bg)
    )}>
      <CardContent className="p-4 flex items-start gap-4">
        {/* Pet icon */}
        <div className={cn(
          'w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border-2 flex-shrink-0 relative',
          isEquipped ? 'border-amber-500/60 bg-amber-500/10' : cn(colors.border, colors.bg)
        )}>
          {pet.icon}
          {isEquipped && (
            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
              <Check size={10} className="text-black" strokeWidth={3} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-center gap-2">
            {isRenaming ? (
              <input
                className="bg-surface-700 border border-surface-500 rounded-lg px-2 py-0.5 text-sm text-white font-bold w-32 outline-none focus:border-primary-400"
                value={renameValue}
                onChange={(e) => onRenameChange(e.target.value)}
                onBlur={onSubmitRename}
                onKeyDown={(e) => e.key === 'Enter' && onSubmitRename()}
                autoFocus
              />
            ) : (
              <span className="font-bold text-sm text-white">{pet.name}</span>
            )}
            <button
              onClick={onStartRename}
              className="text-surface-500 hover:text-surface-300 transition-colors"
              title="Rename"
            >
              <Pencil size={11} />
            </button>
            <span className={cn(
              'text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full border',
              colors.text, colors.border, colors.bg
            )}>
              {RARITY_LABELS[pet.rarity] ?? pet.rarity}
            </span>
          </div>

          {/* Level + XP */}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-bold text-amber-400">Lv.{pet.level}</span>
            <div className="flex-1 h-1.5 bg-surface-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-[10px] text-surface-500">{xpToNext} XP to next</span>
          </div>

          {/* Bonus */}
          <p className={cn('text-xs font-semibold mt-1', colors.text)}>{bonusDesc}</p>

          {/* Source tag */}
          {pet.boosted_source && (
            <p className="text-[10px] text-surface-500 mt-0.5 capitalize">
              Boosts: {pet.boosted_source}
            </p>
          )}
          {!pet.boosted_source && (
            <p className="text-[10px] text-surface-500 mt-0.5">Boosts: all XP sources</p>
          )}
        </div>

        {/* Equip / Unequip */}
        <div className="flex-shrink-0">
          {isEquipped ? (
            <Button size="sm" variant="secondary" onClick={onUnequip} className="text-amber-400 border-amber-500/40">
              Equipped ✓
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={onEquip}>
              Equip <ChevronRight size={12} className="ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Empty states ──────────────────────────────────────────────────────────────

function EmptyEggs() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="text-5xl">🥚</div>
      <h3 className="text-lg font-bold text-white">No eggs yet</h3>
      <p className="text-surface-400 text-sm max-w-xs">
        Complete daily quests to earn companion eggs. Look for the <span className="text-amber-400">🥚</span> icon on quests that reward eggs.
      </p>
    </div>
  )
}

function EmptyRoster() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="text-5xl">🐾</div>
      <h3 className="text-lg font-bold text-white">No companions yet</h3>
      <p className="text-surface-400 text-sm max-w-xs">
        Hatch an egg to meet your first companion. They'll level up as you stay productive!
      </p>
    </div>
  )
}
