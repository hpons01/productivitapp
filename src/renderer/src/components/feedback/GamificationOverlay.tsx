import { AnimatePresence, motion } from 'framer-motion'
import { useGamificationStore, PendingReward } from '../../stores/gamification.store'
import { TIER_COLORS, LootTier, LootItem } from '../../lib/science/rewards'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { useEffect, useRef } from 'react'
import { EggHatchScreen } from './EggHatchScreen'

/** Master overlay that renders all queued gamification events */
export function GamificationOverlay() {
  const { pendingRewards, dismissReward } = useGamificationStore()

  // Take highest priority reward to show full-screen
  const fullScreenReward = pendingRewards.find(
    (r) => r.type === 'level_up' || r.type === 'badge_unlock' || r.type === 'loot_box' || r.type === 'boss_defeated' || r.type === 'egg_hatch'
  )

  // XP popups can stack
  const xpPopups = pendingRewards.filter((r) => r.type === 'xp_popup')
  const classToasts = pendingRewards.filter((r) => r.type === 'class_changed')
  const evolutionToasts = pendingRewards.filter((r) => r.type === 'evolution_unlocked')
  const focusPopups = pendingRewards.filter((r) => r.type === 'focus_earned')
  const questCompletedToasts = pendingRewards.filter((r) => r.type === 'quest_completed')
  const taskDoneToasts = pendingRewards.filter((r) => r.type === 'task_done')

  return (
    <>
      {/* XP floating popups */}
      {xpPopups.map((r, i) => (
        <XPPopup key={r.id} reward={r} index={i} />
      ))}
      {classToasts.map((r) => (
        <ClassChangedToast key={r.id} reward={r} />
      ))}
      {evolutionToasts.map((r) => (
        <EvolutionUnlockedToast key={r.id} reward={r} />
      ))}
      {focusPopups.map((r) => (
        <FocusEarnedPopup key={r.id} reward={r} />
      ))}
      {questCompletedToasts.map((r) => (
        <QuestCompletedToast key={r.id} reward={r} />
      ))}
      <AnimatePresence>
        {taskDoneToasts.map((r, i) => (
          <TaskDoneToast key={r.id} reward={r} index={i} />
        ))}
      </AnimatePresence>

      {/* Full-screen events */}
      <AnimatePresence>
        {fullScreenReward && (
          <FullScreenEvent
            key={fullScreenReward.id}
            reward={fullScreenReward}
            onDismiss={() => dismissReward(fullScreenReward.id)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function EvolutionUnlockedToast({ reward }: { reward: PendingReward }) {
  const { dismissReward } = useGamificationStore()
  const className = reward.data.className as string
  const evolutionTitle = reward.data.evolutionTitle as string
  const identityCue = reward.data.identityCue as string | undefined

  useEffect(() => {
    const t = setTimeout(() => dismissReward(reward.id), 4000)
    return () => clearTimeout(t)
  }, [])

  return (
    <motion.div
      className="fixed top-32 right-8 z-50 pointer-events-none"
      initial={{ opacity: 0, y: -14, x: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="bg-emerald-500/15 border border-emerald-400/50 rounded-sm px-4 py-2.5 backdrop-blur-sm min-w-[260px] shadow-2xl">
        <div className="text-[10px] uppercase tracking-wider text-emerald-200 font-semibold">Evolution Unlocked</div>
        <div className="text-sm font-bold text-[color:var(--app-interactive-fg-default)] mt-1">{className} → {evolutionTitle}</div>
        {identityCue && <div className="text-[11px] text-emerald-100/90 mt-1">{identityCue}</div>}
      </div>
    </motion.div>
  )
}

function ClassChangedToast({ reward }: { reward: PendingReward }) {
  const { dismissReward } = useGamificationStore()
  const className = reward.data.className as string
  const classIcon = reward.data.classIcon as string
  const evolutionTitle = reward.data.evolutionTitle as string

  useEffect(() => {
    const t = setTimeout(() => dismissReward(reward.id), 4000)
    return () => clearTimeout(t)
  }, [])

  return (
    <motion.div
      className="fixed top-16 right-8 z-50 pointer-events-none"
      initial={{ opacity: 0, y: -16, x: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="bg-primary-500/20 border border-primary-400/50 rounded-sm px-4 py-2.5 backdrop-blur-sm min-w-[260px] shadow-2xl">
        <div className="text-[10px] uppercase tracking-wider text-primary-200 font-semibold">Class Equipped</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xl">{classIcon}</span>
          <div>
            <div className="text-sm font-bold text-[color:var(--app-interactive-fg-default)]">{className}</div>
            <div className="text-[11px] text-primary-200">Evolution: {evolutionTitle}</div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function XPPopup({ reward, index }: { reward: PendingReward; index: number }) {
  const amount = reward.data.amount as number

  return (
    <motion.div
      className="fixed right-8 z-50 pointer-events-none"
      style={{ bottom: `${96 + index * 48}px` }}
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -60, scale: 1.2 }}
      transition={{ duration: 1.8, ease: 'easeOut' }}
    >
      <div className="bg-amber-500/20 border border-amber-500/40 rounded-sm px-4 py-2 font-bold text-amber-400 text-sm backdrop-blur-sm">
        +{amount} XP ⚡
      </div>
    </motion.div>
  )
}

function FullScreenEvent({ reward, onDismiss }: { reward: PendingReward; onDismiss: () => void }) {
  if (reward.type === 'level_up') return <LevelUpScreen reward={reward} onDismiss={onDismiss} />
  if (reward.type === 'badge_unlock') return <BadgeUnlockScreen reward={reward} onDismiss={onDismiss} />
  if (reward.type === 'loot_box') return <LootBoxScreen reward={reward} onDismiss={onDismiss} />
  if (reward.type === 'boss_defeated') return <BossDefeatedScreen onDismiss={onDismiss} />
  if (reward.type === 'egg_hatch') return <EggHatchScreen reward={reward} onDismiss={onDismiss} />
  return null
}

function LevelUpScreen({ reward, onDismiss }: { reward: PendingReward; onDismiss: () => void }) {
  const { newLevel, characterClass, identityCue } = reward.data as {
    newLevel: number
    characterClass: string
    identityCue?: string
  }
  const CLASS_ICONS: Record<string, string> = {
    'Time Mage': '⚡', 'Iron Warrior': '⚔️', 'Zen Master': '🌿',
    'Arcane Scholar': '🧙', 'Grand Tactician': '🎯', 'Apprentice': '🌱'
  }

  useEffect(() => {
    playSound('levelup')
  }, [])

  return (
    <Backdrop onClick={onDismiss}>
      <motion.div
        className="text-center max-w-sm mx-auto px-6"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated ring */}
        <motion.div
          className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400 to-primary-600 flex items-center justify-center text-5xl shadow-2xl"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
          style={{ background: 'conic-gradient(from 0deg, #c8972a, #0d9488, #c8972a)' }}
        >
          <div className="w-28 h-28 rounded-full bg-surface-800 flex items-center justify-center text-5xl">
            {CLASS_ICONS[characterClass] || '⚔️'}
          </div>
        </motion.div>

        <motion.h1
          className="text-4xl font-black text-[color:var(--app-interactive-fg-default)] mb-2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          LEVEL UP!
        </motion.h1>
        <motion.p
          className="text-6xl font-black text-amber-400 mb-2"
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: 'spring' }}
        >
          {newLevel}
        </motion.p>
        <p className="text-surface-300 mb-6">{characterClass}</p>
        {identityCue && <p className="text-xs text-primary-200 mb-4 max-w-xs mx-auto">{identityCue}</p>}
        <Button onClick={onDismiss} size="lg" className="w-full">Continue ⚔️</Button>
      </motion.div>
    </Backdrop>
  )
}

function BadgeUnlockScreen({ reward, onDismiss }: { reward: PendingReward; onDismiss: () => void }) {
  const badge = reward.data.badge as { name: string; icon: string; rarity: string; xp_value: number }
  const colors = TIER_COLORS[badge.rarity as LootTier] || TIER_COLORS.common

  useEffect(() => { playSound('badge') }, [])

  return (
    <Backdrop onClick={onDismiss}>
      <motion.div
        className="text-center max-w-xs mx-auto px-6"
        initial={{ scale: 0.3, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 14, stiffness: 180 }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-surface-400 uppercase tracking-widest text-xs mb-4 font-bold">Achievement Unlocked</p>

        <motion.div
          className={cn('w-24 h-24 mx-auto mb-4 rounded-sm border-2 flex items-center justify-center text-5xl', colors.bg, colors.border)}
          style={{ boxShadow: `0 0 40px ${badge.rarity === 'legendary' ? '#f59e0b' : badge.rarity === 'epic' ? '#a855f7' : '#3b82f6'}44` }}
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          {badge.icon}
        </motion.div>

        <h2 className={cn('text-2xl font-black mb-1', colors.text)}>{badge.name}</h2>
        <p className="text-xs text-surface-400 mb-1 capitalize font-semibold">{badge.rarity}</p>
        <p className="text-amber-400 font-bold text-sm mb-6">+{badge.xp_value} XP</p>
        <Button onClick={onDismiss} className="w-full">Awesome! 🏆</Button>
      </motion.div>
    </Backdrop>
  )
}

function LootBoxScreen({ reward, onDismiss }: { reward: PendingReward; onDismiss: () => void }) {
  const loot = reward.data.loot as LootItem
  const colors = TIER_COLORS[loot.tier]
  const opened = useRef(false)

  useEffect(() => { playSound('badge') }, [])

  async function handleClaim() {
    if (opened.current) return
    opened.current = true
    try {
      const result = await window.api.loot.save({
        id: reward.id,
        type: loot.type,
        tier: loot.tier,
        payload: JSON.stringify({
          name: loot.name,
          description: loot.description,
          icon: loot.icon,
          value: loot.value,
          levelFraction: loot.levelFraction,
          effectType: loot.effectType,
          effectDuration: loot.effectDuration,
          effectMagnitude: loot.effectMagnitude
        })
      }) as { success?: boolean; error?: string }

      if (!result?.success) {
        throw new Error(result?.error ?? 'Failed to persist loot reward')
      }

      onDismiss()
    } catch (error) {
      opened.current = false
      console.error('Failed to save claimed loot reward', error)
    }
  }

  return (
    <Backdrop>
      <motion.div
        className="text-center max-w-xs mx-auto px-6"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 12 }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-surface-400 uppercase tracking-widest text-xs mb-4 font-bold">Surprise Reward!</p>

        {/* Loot item icon */}
        <motion.div
          className={cn('w-24 h-24 mx-auto mb-4 rounded-sm border-2 flex items-center justify-center text-5xl', colors.bg, colors.border)}
          initial={{ rotate: 0 }}
          animate={{ rotate: [0, -5, 5, -3, 3, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 0.6 }}
          style={{ boxShadow: `0 0 40px ${loot.tier === 'legendary' ? '#f59e0b' : loot.tier === 'epic' ? '#a855f7' : '#3b82f6'}44` }}
        >
          {loot.icon || '📦'}
        </motion.div>

        <div className={cn('text-xs uppercase tracking-widest font-bold mb-1', colors.text)}>
          {loot.tier} drop
        </div>
        <h2 className="text-xl font-black text-[color:var(--app-interactive-fg-default)] mb-1">{loot.name}</h2>
        <p className="text-surface-400 text-sm mb-6">{loot.description}</p>
        <Button onClick={handleClaim} className="w-full">Claim! 🎁</Button>
      </motion.div>
    </Backdrop>
  )
}

function BossDefeatedScreen({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Backdrop onClick={onDismiss}>
      <motion.div
        className="text-center max-w-xs mx-auto px-6"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 12 }}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          className="text-7xl mb-4"
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: 3 }}
        >💀</motion.div>
        <h1 className="text-3xl font-black text-red-400 mb-2">BOSS DEFEATED!</h1>
        <p className="text-surface-300 mb-6">You destroyed this week's boss! Epic loot awaits.</p>
        <Button onClick={onDismiss} className="w-full">Collect Loot! ⚔️</Button>
      </motion.div>
    </Backdrop>
  )
}

function Backdrop({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at center, rgba(8,12,11,0.96) 0%, rgba(8,12,11,0.99) 100%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
    >
      {/* Particle effects */}
      <Particles />
      {children}
    </motion.div>
  )
}

function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{
            background: ['#0d9488', '#c8972a', '#16a34a', '#4a9fd4', '#9b59b6'][i % 5],
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`
          }}
          animate={{
            y: [0, -Math.random() * 300 - 100],
            x: [(Math.random() - 0.5) * 200],
            opacity: [1, 0],
            scale: [1, 0]
          }}
          transition={{ duration: Math.random() * 1.5 + 1, delay: Math.random() * 0.5 }}
        />
      ))}
    </div>
  )
}

function TaskDoneToast({ reward, index }: { reward: PendingReward; index: number }) {
  const { dismissReward } = useGamificationStore()
  const taskTitle = reward.data.taskTitle as string
  const xpAwarded = reward.data.xpAwarded as number

  useEffect(() => {
    playSound('task')
    const t = setTimeout(() => dismissReward(reward.id), 3200)
    return () => clearTimeout(t)
  }, [])

  return (
    <motion.div
      className="fixed z-50 pointer-events-none"
      style={{ bottom: `${24 + index * 88}px`, right: '24px' }}
      initial={{ opacity: 0, x: 60, scale: 0.88 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.88 }}
      transition={{ type: 'spring', damping: 18, stiffness: 280 }}
    >
      <div
        className="relative overflow-hidden rounded-sm backdrop-blur-md shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(16,28,22,0.97) 0%, rgba(10,22,18,0.97) 100%)',
          border: '1px solid rgba(52,211,153,0.35)',
          minWidth: '220px',
          maxWidth: '280px',
          boxShadow: '0 0 24px rgba(52,211,153,0.12), 0 8px 32px rgba(0,0,0,0.5)'
        }}
      >
        {/* Shimmer bar */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(52,211,153,0.8), transparent)' }}
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
        />

        <div className="px-4 py-3 flex items-start gap-3">
          {/* Check icon with pulse ring */}
          <div className="relative shrink-0 mt-0.5">
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: 'rgba(52,211,153,0.2)' }}
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
            <motion.div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(52,211,153,0.15)', border: '1.5px solid rgba(52,211,153,0.6)' }}
              initial={{ scale: 0.5, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 12, stiffness: 300, delay: 0.05 }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <motion.path
                  d="M2.5 7L5.5 10L11.5 4"
                  stroke="rgba(52,211,153,0.95)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.35, delay: 0.15, ease: 'easeOut' }}
                />
              </svg>
            </motion.div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest font-bold mb-0.5" style={{ color: 'rgba(52,211,153,0.7)' }}>
              Done!
            </div>
            <div
              className="text-sm font-semibold leading-snug truncate"
              style={{ color: 'rgba(240,250,245,0.95)' }}
              title={taskTitle}
            >
              {taskTitle}
            </div>
            <motion.div
              className="flex items-center gap-1 mt-1"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span className="text-xs font-bold" style={{ color: '#f59e0b' }}>+{xpAwarded} XP</span>
              <span className="text-[10px]" style={{ color: 'rgba(245,158,11,0.6)' }}>⚡</span>
            </motion.div>
          </div>
        </div>

        {/* Progress drain bar */}
        <div className="h-0.5 w-full" style={{ background: 'rgba(52,211,153,0.08)' }}>
          <motion.div
            className="h-full"
            style={{ background: 'rgba(52,211,153,0.5)', transformOrigin: 'left' }}
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 3.2, ease: 'linear' }}
          />
        </div>
      </div>
    </motion.div>
  )
}

function QuestCompletedToast({ reward }: { reward: PendingReward }) {
  const { dismissReward } = useGamificationStore()
  const title = reward.data.title as string
  const xpAwarded = reward.data.xpAwarded as number
  const focusAwarded = reward.data.focusAwarded as number

  useEffect(() => {
    playSound('quest')
    const t = setTimeout(() => dismissReward(reward.id), 4000)
    return () => clearTimeout(t)
  }, [])

  return (
    <motion.div
      className="fixed top-20 right-8 z-50 pointer-events-none"
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="bg-emerald-500/15 border border-emerald-400/50 rounded-sm px-4 py-3 backdrop-blur-sm min-w-[260px] shadow-2xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">✅</span>
          <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold">Quest Complete!</div>
        </div>
        <div className="text-sm font-bold text-[color:var(--app-interactive-fg-default)] leading-snug">{title}</div>
        <div className="flex items-center gap-3 mt-1">
          {xpAwarded > 0 && (
            <span className="text-xs text-amber-300 font-semibold">+{xpAwarded} XP</span>
          )}
          {focusAwarded > 0 && (
            <span className="text-xs text-cyan-300 font-semibold">+{focusAwarded} Focus 💎</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function playSound(type: 'levelup' | 'badge' | 'quest' | 'task'): void {
  // Gate on user preference
  if (localStorage.getItem('soundEnabled') === 'false') return

  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'

    if (type === 'levelup') {
      // Rising arpeggio: C4 → E4 → G4 → C5
      const notes = [261.63, 329.63, 392.0, 523.25]
      notes.forEach((freq, i) => {
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15)
      })
      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.8)
    } else if (type === 'quest') {
      // Victory fanfare: ascending triad C5 → E5 → G5 → C6
      const notes = [523.25, 659.25, 783.99, 1046.5]
      notes.forEach((freq, i) => {
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1)
      })
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.55)
    } else if (type === 'task') {
      // Crisp two-note tick: a soft click then a bright confirm tone
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(600, ctx.currentTime)
      osc.frequency.setValueAtTime(900, ctx.currentTime + 0.06)
      gain.gain.setValueAtTime(0.14, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.28)
    } else {
      // Short chime for badge/loot
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.18, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.35)
    }

    // Release AudioContext after sound ends
    osc.onended = () => ctx.close()
  } catch {
    // AudioContext may be blocked in certain environments; fail silently
  }
}

function FocusEarnedPopup({ reward }: { reward: PendingReward }) {
  const amount = reward.data.amount as number
  return (
    <motion.div
      className="fixed bottom-48 right-8 z-50 pointer-events-none"
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -60, scale: 1.1 }}
      transition={{ duration: 1.8, ease: 'easeOut' }}
    >
      <div className="bg-cyan-500/20 border border-cyan-500/40 rounded-sm px-4 py-2 font-bold text-cyan-400 text-sm backdrop-blur-sm shadow-lg">
        +{amount} Focus 💎
      </div>
    </motion.div>
  )
}
