import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PendingReward } from '../../stores/gamification.store'
import { TIER_COLORS, type LootTier } from '../../lib/science/rewards'
import { getPetBonusDescription } from '../../lib/science/pets'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'

type HatchStage = 'idle' | 'shake' | 'crack' | 'shatter' | 'reveal'

const EGG_GLOW: Record<string, string> = {
  common: 'shadow-gray-400/40',
  uncommon: 'shadow-emerald-400/50',
  rare: 'shadow-blue-400/60',
  epic: 'shadow-purple-500/70',
  legendary: 'shadow-amber-400/80'
}

function playHatchSound(): void {
  if (localStorage.getItem('soundEnabled') === 'false') return
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    // C5 → G5 → E6 arpeggio
    const notes = [523.25, 783.99, 1318.51]
    notes.forEach((freq, i) => {
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.18)
    })
    gain.gain.setValueAtTime(0.22, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.7)
    osc.onended = () => ctx.close()
  } catch {
    // AudioContext may be blocked; fail silently
  }
}

export function EggHatchScreen({
  reward,
  onDismiss
}: {
  reward: PendingReward
  onDismiss: () => void
}) {
  const [stage, setStage] = useState<HatchStage>('idle')
  const [showButton, setShowButton] = useState(false)

  const rarity = reward.data.rarity as string
  const petName = reward.data.petName as string
  const petIcon = reward.data.petIcon as string
  const flavorText = reward.data.flavorText as string
  const bonusSource = reward.data.bonusSource as string | null
  const bonusRate = reward.data.bonusRate as number
  const colors = TIER_COLORS[rarity as LootTier] ?? TIER_COLORS.common

  useEffect(() => {
    const t1 = setTimeout(() => setStage('shake'), 600)
    const t2 = setTimeout(() => setStage('crack'), 1300)
    const t3 = setTimeout(() => setStage('shatter'), 2200)
    const t4 = setTimeout(() => {
      setStage('reveal')
      playHatchSound()
    }, 2700)
    const t5 = setTimeout(() => setShowButton(true), 3300)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5) }
  }, [])

  // Bonus description at level 1
  const bonusDesc = getPetBonusDescription(
    rarity as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary',
    1,
    bonusSource
  )

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at center, rgba(10,10,20,0.97) 0%, rgba(5,5,15,0.99) 100%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Background particles — only show during reveal */}
      <AnimatePresence>
        {stage === 'reveal' && <HatchParticles rarity={rarity} />}
      </AnimatePresence>

      <div className="relative flex flex-col items-center gap-6 z-10">

        {/* Egg / Pet display area */}
        <AnimatePresence mode="wait">
          {stage !== 'reveal' && (
            <motion.div
              key="egg"
              className="relative flex items-center justify-center"
              exit={{ scale: [1, 1.4, 0], opacity: [1, 1, 0], transition: { duration: 0.4 } }}
            >
              {/* Glow ring */}
              <motion.div
                className={cn(
                  'absolute w-36 h-36 rounded-full blur-2xl opacity-60',
                  rarity === 'legendary' ? 'bg-amber-400/30' :
                  rarity === 'epic' ? 'bg-purple-500/30' :
                  rarity === 'rare' ? 'bg-blue-400/30' :
                  rarity === 'uncommon' ? 'bg-emerald-400/20' : 'bg-gray-400/10'
                )}
                animate={stage === 'idle' ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.2 }}
              />

              {/* Egg emoji */}
              <motion.div
                className={cn(
                  'text-8xl select-none relative z-10 drop-shadow-2xl',
                  EGG_GLOW[rarity]
                )}
                style={{ filter: `drop-shadow(0 0 24px ${rarity === 'legendary' ? '#f59e0b' : rarity === 'epic' ? '#a855f7' : rarity === 'rare' ? '#3b82f6' : '#10b981'})` }}
                animate={
                  stage === 'shake' ? {
                    x: [-6, 6, -8, 8, -5, 5, -3, 3, 0],
                    rotate: [-3, 3, -4, 4, -2, 2, -1, 1, 0]
                  } : stage === 'crack' ? {
                    x: [-4, 4, -3, 3, 0],
                    rotate: [-2, 2, -3, 3, 0]
                  } : {}
                }
                transition={{ duration: 0.6, ease: 'easeInOut' }}
              >
                🥚
              </motion.div>

              {/* Crack lines — appear in crack stage */}
              <AnimatePresence>
                {(stage === 'crack' || stage === 'shatter') && (
                  <>
                    {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                      <motion.div
                        key={`crack-${i}`}
                        className="absolute w-0.5 rounded-full origin-bottom"
                        style={{
                          height: `${28 + i * 4}px`,
                          background: 'white',
                          bottom: '50%',
                          left: '50%',
                          transformOrigin: 'bottom center',
                          rotate: `${angle}deg`,
                          opacity: 0.6
                        }}
                        initial={{ scaleY: 0, opacity: 0 }}
                        animate={{ scaleY: 1, opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.04 }}
                      />
                    ))}
                  </>
                )}
              </AnimatePresence>

              {/* Shell fragments — shatter stage */}
              <AnimatePresence>
                {stage === 'shatter' && (
                  <>
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                      <motion.div
                        key={`shell-${i}`}
                        className="absolute w-3 h-4 rounded bg-white/40 text-xs"
                        style={{ fontSize: '20px' }}
                        initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                        animate={{
                          x: Math.cos((angle * Math.PI) / 180) * (50 + i * 8),
                          y: Math.sin((angle * Math.PI) / 180) * (50 + i * 8),
                          opacity: 0,
                          rotate: angle * 2
                        }}
                        transition={{ type: 'spring', damping: 8, stiffness: 120, duration: 0.5 }}
                      >
                        🥚
                      </motion.div>
                    ))}
                  </>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Reveal — Pet appears */}
          {stage === 'reveal' && (
            <motion.div
              key="pet"
              className="flex flex-col items-center gap-3"
              initial={{ scale: 0.2, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 12, stiffness: 160 }}
            >
              <div
                className="text-8xl select-none"
                style={{
                  filter: `drop-shadow(0 0 32px ${
                    rarity === 'legendary' ? '#f59e0b' :
                    rarity === 'epic' ? '#a855f7' :
                    rarity === 'rare' ? '#3b82f6' : '#10b981'
                  })`
                }}
              >
                {petIcon}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status text */}
        <AnimatePresence mode="wait">
          {stage === 'idle' && (
            <motion.p
              key="idle-text"
              className="text-surface-400 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              An egg is ready to hatch...
            </motion.p>
          )}
          {stage === 'shake' && (
            <motion.p
              key="shake-text"
              className="text-surface-300 text-sm font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              The egg is trembling...
            </motion.p>
          )}
          {stage === 'crack' && (
            <motion.p
              key="crack-text"
              className="text-[color:var(--app-interactive-fg-default)] text-sm font-semibold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              It's cracking! Something is breaking free...
            </motion.p>
          )}
          {stage === 'shatter' && (
            <motion.p
              key="shatter-text"
              className="text-[color:var(--app-interactive-fg-default)] text-base font-bold"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.5 }}
            >
              ✨
            </motion.p>
          )}

          {/* Reveal info block */}
          {stage === 'reveal' && (
            <motion.div
              key="reveal-info"
              className="flex flex-col items-center gap-2 text-center max-w-xs"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <p className="text-surface-400 uppercase tracking-widest text-[10px] font-bold">
                A new companion appears!
              </p>
              <h2 className={cn('text-2xl font-black', colors.text)}>{petName}</h2>
              <span
                className={cn(
                  'text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border',
                  colors.text, colors.border, colors.bg
                )}
              >
                {rarity}
              </span>
              <p className="text-surface-400 text-xs mt-1 italic">{flavorText}</p>
              <p className={cn('text-sm font-bold mt-1', colors.text)}>{bonusDesc} at Lv.1</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Adopt button */}
        <AnimatePresence>
          {showButton && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <Button onClick={onDismiss} size="lg" className="px-8">
                Adopt {petName}! {petIcon}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function HatchParticles({ rarity }: { rarity: string }) {
  const colors: Record<string, string[]> = {
    legendary: ['#f59e0b', '#fbbf24', '#fcd34d', '#fff', '#f59e0b'],
    epic: ['#a855f7', '#c084fc', '#7c3aed', '#e879f9', '#fff'],
    rare: ['#3b82f6', '#60a5fa', '#2563eb', '#93c5fd', '#fff'],
    uncommon: ['#10b981', '#34d399', '#059669', '#6ee7b7', '#fff'],
    common: ['#9ca3af', '#d1d5db', '#6b7280', '#e5e7eb', '#fff']
  }
  const palette = colors[rarity] ?? colors.common

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 28 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            background: palette[i % palette.length],
            width: `${3 + (i % 3) * 2}px`,
            height: `${3 + (i % 3) * 2}px`,
            left: `${20 + Math.random() * 60}%`,
            top: `${20 + Math.random() * 60}%`
          }}
          initial={{ opacity: 1, scale: 1 }}
          animate={{
            y: [0, -(Math.random() * 200 + 80)],
            x: [(Math.random() - 0.5) * 160],
            opacity: [1, 0],
            scale: [1, 0]
          }}
          transition={{ duration: Math.random() * 1.2 + 0.8, delay: Math.random() * 0.4, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}
