import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettingsStore } from '../../stores/settings.store'
import { useHabitsStore } from '../../stores/habits.store'
import { Button } from '../../components/ui/button'
import { Input, Textarea } from '../../components/ui/input'
import { cn } from '../../lib/utils'
import { generateId } from '../../lib/utils'

const PRESET_HABITS = [
  { name: 'Morning walk', icon: '🚶', cue: 'I wake up', color: '#10b981', category: 'fitness' },
  { name: 'Drink 8 glasses of water', icon: '💧', cue: 'I eat breakfast', color: '#3b82f6', category: 'health' },
  { name: 'Read 10 pages', icon: '📚', cue: 'I sit down after dinner', color: '#7c3aed', category: 'learning' },
  { name: 'Meditate 5 minutes', icon: '🧘', cue: 'I get ready for bed', color: '#f59e0b', category: 'mindfulness' },
  { name: 'Review daily intentions', icon: '🎯', cue: 'I start my workday', color: '#ec4899', category: 'productivity' }
]

const SCIENCE_FACTS = [
  { icon: '🔥', fact: 'Habits take an average of 66 days to form — but the first week is the hardest.' },
  { icon: '⚡', fact: 'The Two-Minute Rule: if it takes less than 2 minutes, do it now.' },
  { icon: '🎯', fact: 'Implementation Intentions ("I will X at Y in Z") make you 2-3× more likely to follow through.' },
  { icon: '🧪', fact: 'Variable rewards (like XP and loot) create the strongest habit loops — just like games.' }
]

export function OnboardingPage() {
  const { setSetting } = useSettingsStore()
  const { create: createHabit } = useHabitsStore()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [selectedHabits, setSelectedHabits] = useState<number[]>([])
  const [commitment, setCommitment] = useState('')
  const [loading, setLoading] = useState(false)

  const steps = ['Welcome', 'Science', 'Habits', 'Commitment']

  const handleFinish = async () => {
    setLoading(true)
    await setSetting('user_name', name || 'Hero')
    await setSetting('commitment_statement', commitment || 'I commit to growing 1% every day.')

    // Create selected habits
    for (const idx of selectedHabits) {
      const h = PRESET_HABITS[idx]
      await createHabit({
        name: h.name,
        description: null,
        cue: h.cue,
        category: h.category,
        frequency: 'daily',
        color: h.color,
        icon: h.icon
      })
    }

    await setSetting('onboarding_completed', 'true')
    setLoading(false)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-8 justify-center">
          {steps.map((s, i) => (
            <div
              key={s}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i <= step ? 'bg-primary-500 w-16' : 'bg-surface-600 w-8'
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 text-center">
              <div>
                <div className="text-6xl mb-4">⚔️</div>
                <h1 className="text-3xl font-bold text-white mb-2">Welcome to ProductivitApp</h1>
                <p className="text-surface-300 text-sm leading-relaxed">
                  A science-backed productivity app designed for the kind of person who grinds hard,<br />
                  leveling up their real life like a role-playing game.
                </p>
              </div>
              <Input
                label="What's your name, Hero?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="text-center"
              />
              <Button size="lg" className="w-full" onClick={() => setStep(1)}>
                Begin Your Journey →
              </Button>
            </motion.div>
          )}

          {/* Step 1: Science */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="text-center">
                <div className="text-4xl mb-3">🧪</div>
                <h2 className="text-2xl font-bold text-white mb-2">Science-Powered Growth</h2>
                <p className="text-surface-400 text-sm">This app is built on proven behavioral science — not just motivation hype.</p>
              </div>
              <div className="space-y-3">
                {SCIENCE_FACTS.map((f) => (
                  <div key={f.fact} className="flex items-start gap-3 p-4 bg-primary-600/10 border border-primary-500/20 rounded-xl">
                    <span className="text-xl shrink-0">{f.icon}</span>
                    <p className="text-sm text-surface-200">{f.fact}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setStep(0)}>← Back</Button>
                <Button className="flex-1" onClick={() => setStep(2)}>Continue →</Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Habits */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="text-center">
                <div className="text-4xl mb-3">🌱</div>
                <h2 className="text-2xl font-bold text-white mb-2">Seed Your Habits</h2>
                <p className="text-surface-400 text-sm">Pick 2-3 habits to start. You can add more later.</p>
              </div>
              <div className="space-y-2">
                {PRESET_HABITS.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedHabits(
                      selectedHabits.includes(i)
                        ? selectedHabits.filter((x) => x !== i)
                        : [...selectedHabits, i]
                    )}
                    className={cn(
                      'w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left',
                      selectedHabits.includes(i)
                        ? 'bg-primary-600/20 border-primary-500/40 text-white'
                        : 'bg-surface-800 border-surface-600 text-surface-300 hover:border-surface-400'
                    )}
                  >
                    <span className="text-2xl">{h.icon}</span>
                    <div>
                      <div className="font-medium text-sm">{h.name}</div>
                      <div className="text-xs text-surface-400">After I {h.cue}</div>
                    </div>
                    {selectedHabits.includes(i) && <span className="ml-auto text-primary-400">✓</span>}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setStep(1)}>← Back</Button>
                <Button className="flex-1" onClick={() => setStep(3)}>Continue →</Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Commitment */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="text-center">
                <div className="text-4xl mb-3">🤝</div>
                <h2 className="text-2xl font-bold text-white mb-2">Make a Commitment</h2>
                <p className="text-surface-400 text-sm">
                  Research shows written commitments dramatically increase follow-through (Ariely, 2008).
                </p>
              </div>
              <Textarea
                label="I commit to using ProductivitApp every day because..."
                value={commitment}
                onChange={(e) => setCommitment(e.target.value)}
                placeholder="I want to build the discipline to reach my goals, one day at a time..."
                rows={4}
              />
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setStep(2)}>← Back</Button>
                <Button
                  className="flex-1"
                  loading={loading}
                  onClick={handleFinish}
                  disabled={loading}
                >
                  {loading ? 'Setting up...' : 'Start My Journey ⚔️'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
