import { AnimatePresence, motion } from 'framer-motion'
import { useGamificationStore, PendingReward } from '../../stores/gamification.store'
import { TIER_COLORS, LootTier, LootItem } from '../../lib/science/rewards'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { useEffect, useRef } from 'react'

/** Master overlay that renders all queued gamification events */
export function GamificationOverlay() {
  const { pendingRewards, dismissReward } = useGamificationStore()

  // Take highest priority reward to show full-screen
  const fullScreenReward = pendingRewards.find(
    (r) => r.type === 'level_up' || r.type === 'badge_unlock' || r.type === 'loot_box' || r.type === 'boss_defeated'
  )

  // XP popups can stack
  const xpPopups = pendingRewards.filter((r) => r.type === 'xp_popup')

  return (
    <>
      {/* XP floating popups */}
      {xpPopups.map((r) => (
        <XPPopup key={r.id} reward={r} />
      ))}

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

function XPPopup({ reward }: { reward: PendingReward }) {
  const amount = reward.data.amount as number

  return (
    <motion.div
      className="fixed bottom-24 right-8 z-50 pointer-events-none"
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -60, scale: 1.2 }}
      transition={{ duration: 1.8, ease: 'easeOut' }}
    >
      <div className="bg-amber-500/20 border border-amber-500/40 rounded-xl px-4 py-2 font-bold text-amber-400 text-sm backdrop-blur-sm">
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
  return null
}

function LevelUpScreen({ reward, onDismiss }: { reward: PendingReward; onDismiss: () => void }) {
  const { newLevel, characterClass } = reward.data as { newLevel: number; characterClass: string }
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
          style={{ background: 'conic-gradient(from 0deg, #f59e0b, #7c3aed, #f59e0b)' }}
        >
          <div className="w-28 h-28 rounded-full bg-surface-800 flex items-center justify-center text-5xl">
            {CLASS_ICONS[characterClass] || '⚔️'}
          </div>
        </motion.div>

        <motion.h1
          className="text-4xl font-black text-white mb-2"
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
          className={cn('w-24 h-24 mx-auto mb-4 rounded-2xl border-2 flex items-center justify-center text-5xl', colors.bg, colors.border)}
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
        <p className="text-surface-400 uppercase tracking-widest text-xs mb-4 font-bold">Surprise Reward!</p>

        {/* Loot chest */}
        <motion.div
          className={cn('w-24 h-24 mx-auto mb-4 rounded-2xl border-2 flex items-center justify-center text-5xl', colors.bg, colors.border)}
          initial={{ rotate: 0 }}
          animate={{ rotate: [0, -5, 5, -3, 3, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 0.6 }}
          style={{ boxShadow: `0 0 40px ${loot.tier === 'legendary' ? '#f59e0b' : loot.tier === 'epic' ? '#a855f7' : '#3b82f6'}44` }}
        >
          📦
        </motion.div>

        <div className={cn('text-xs uppercase tracking-widest font-bold mb-1', colors.text)}>
          {loot.tier} drop
        </div>
        <h2 className="text-xl font-black text-white mb-1">{loot.name}</h2>
        <p className="text-surface-400 text-sm mb-6">{loot.description}</p>
        <Button onClick={onDismiss} className="w-full">Claim! 🎁</Button>
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
      style={{ background: 'radial-gradient(ellipse at center, rgba(15,15,26,0.95) 0%, rgba(15,15,26,0.98) 100%)' }}
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
            background: ['#7c3aed', '#f59e0b', '#10b981', '#ec4899', '#3b82f6'][i % 5],
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

function playSound(type: 'levelup' | 'badge'): void {
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
