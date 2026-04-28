import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettingsStore } from '../../stores/settings.store'
import { useHabitsStore } from '../../stores/habits.store'
import { useGamificationStore } from '../../stores/gamification.store'
import { Button } from '../../components/ui/button'
import { Input, Textarea } from '../../components/ui/input'
import { Modal } from '../../components/ui/modal'
import { cn } from '../../lib/utils'

const PRESET_HABITS = [
  { name: 'Morning walk', icon: '🚶', cue: 'wake up', color: '#10b981', category: 'fitness' },
  { name: 'Drink 8 glasses of water', icon: '💧', cue: 'eat breakfast', color: '#3b82f6', category: 'health' },
  { name: 'Read 10 pages', icon: '📚', cue: 'sit down after dinner', color: '#7c3aed', category: 'learning' },
  { name: 'Meditate 5 minutes', icon: '🧘', cue: 'get ready for bed', color: '#f59e0b', category: 'mindfulness' },
  { name: 'Review daily intentions', icon: '🎯', cue: 'start my workday', color: '#ec4899', category: 'productivity' },
  { name: 'Write in my journal', icon: '✍️', cue: 'finish my morning coffee', color: '#8b5cf6', category: 'reflection' },
  { name: 'Cold shower', icon: '🚿', cue: 'finish my workout', color: '#06b6d4', category: 'health' },
  { name: 'No social media before noon', icon: '📵', cue: 'wake up', color: '#f97316', category: 'discipline' },
  { name: '30 min deep work block', icon: '🧠', cue: 'open my laptop', color: '#3b82f6', category: 'productivity' },
  { name: 'Evening walk', icon: '🌇', cue: 'finish dinner', color: '#10b981', category: 'fitness' }
]

const SCIENCE_FACTS = [
  { icon: '🔥', fact: 'Habits take an average of 66 days to form — but the first week is the hardest.' },
  { icon: '⚡', fact: 'The Two-Minute Rule: if it takes less than 2 minutes, do it now.' },
  { icon: '🎯', fact: 'Implementation Intentions ("I will X at Y in Z") make you 2-3× more likely to follow through.' },
  { icon: '🧪', fact: 'Variable rewards (like XP and loot) create the strongest habit loops — just like games.' }
]

const CORE_VALUES = [
  { id: 'health', icon: '🫀', label: 'Health', description: 'Protect your body and energy.' },
  { id: 'growth', icon: '🌱', label: 'Growth', description: 'Keep leveling every week.' },
  { id: 'discipline', icon: '🛡️', label: 'Discipline', description: 'Do what matters even when hard.' },
  { id: 'freedom', icon: '🕊️', label: 'Freedom', description: 'Build control over your time.' },
  { id: 'family', icon: '🏠', label: 'Family', description: 'Show up for your people.' },
  { id: 'mastery', icon: '🎯', label: 'Mastery', description: 'Train a meaningful craft.' },
  { id: 'impact', icon: '🌍', label: 'Impact', description: 'Create value beyond yourself.' },
  { id: 'calm', icon: '🧘', label: 'Calm', description: 'Stay grounded under pressure.' }
]

const CHARACTER_CLASSES = [
  {
    id: 'apprentice',
    name: 'Apprentice',
    icon: '🌱',
    description: 'Jack of all trades. Balanced growth across all disciplines.',
    bonus: 'No class bonus — pure versatility.',
    flavor: 'The road to mastery begins with breadth.'
  },
  {
    id: 'time_mage',
    name: 'Time Mage',
    icon: '⚡',
    description: 'Masters focus cycles and earns more from Pomodoros.',
    bonus: '+25% XP from Pomodoro sessions',
    flavor: 'Time is the only resource you can never refill.'
  },
  {
    id: 'iron_warrior',
    name: 'Iron Warrior',
    icon: '⚔️',
    description: 'Thrives on execution pressure and earns more from tasks.',
    bonus: '+25% XP from completed tasks',
    flavor: 'Discipline is doing what needs to be done, not what feels good.'
  },
  {
    id: 'zen_master',
    name: 'Zen Master',
    icon: '🌿',
    description: 'Builds consistency through rituals and earns more from habits.',
    bonus: '+25% XP from habit completions',
    flavor: 'The chains of habit are too light to feel until too heavy to break.'
  },
  {
    id: 'arcane_scholar',
    name: 'Arcane Scholar',
    icon: '🧙',
    description: 'Reflects deeply and earns more from journaling.',
    bonus: '+25% XP from journal entries',
    flavor: 'The unexamined life is not worth living.'
  },
  {
    id: 'grand_tactician',
    name: 'Grand Tactician',
    icon: '🎯',
    description: 'Reads momentum and earns more from energy logs.',
    bonus: '+25% XP from energy tracking',
    flavor: 'He who knows others is wise. He who knows himself is enlightened.'
  }
]

export function OnboardingPage() {
  const { setSetting, loadSettings } = useSettingsStore()
  const { create: createHabit } = useHabitsStore()
  const { refreshFromDB, loadCharacterClassConfig } = useGamificationStore()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [selectedHabits, setSelectedHabits] = useState<number[]>([])
  const [selectedValues, setSelectedValues] = useState<string[]>([])
  const [selectedClass, setSelectedClass] = useState('apprentice')
  const [commitment, setCommitment] = useState('')
  const [loading, setLoading] = useState(false)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Steps: 0=Welcome, 1=Science, 2=Habits, 3=Values, 4=Class, 5=Commitment
  const steps = ['Welcome', 'Science', 'Habits', 'Values', 'Class', 'Commitment']

  const toggleValue = (valueId: string) => {
    setSelectedValues((current) => {
      if (current.includes(valueId)) {
        return current.filter((id) => id !== valueId)
      }
      if (current.length >= 3) return current
      return [...current, valueId]
    })
  }

  const handleFinish = async () => {
    setLoading(true)
    setError('')
    try {
      const valuesToSave = selectedValues.length > 0 ? selectedValues : ['growth']

      await setSetting('user_name', name || 'Hero')
      await setSetting('commitment_statement', commitment || 'I commit to growing 1% every day.')
      await setSetting('core_values', JSON.stringify(valuesToSave))
      await setSetting('primary_value', valuesToSave[0])
      await setSetting('selected_character_class', selectedClass)

      for (const idx of selectedHabits) {
        const h = PRESET_HABITS[idx]
        await createHabit({
          name: h.name,
          description: null,
          cue: `After I ${h.cue}`,
          obstacle_plan: null,
          tiny_mode: 0,
          tiny_started_at: null,
          tiny_graduated_at: null,
          category: h.category,
          frequency: 'daily',
          custom_days: null,
          color: h.color,
          icon: h.icon
        })
      }

      await setSetting('onboarding_completed', 'true')
      await loadSettings()
      navigate('/')
    } catch (e) {
      console.error('Failed to finish onboarding', e)
      setError('Setup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleImportAndSkip = async () => {
    setImporting(true)
    setImportStatus(null)

    try {
      const result = await window.api.export.importData('replace') as {
        success: boolean
        canceled?: boolean
        error?: string
      }

      if (result.canceled) {
        setImportStatus('Import cancelled.')
        return
      }

      if (!result.success) {
        setImportStatus(result.error ?? 'Import failed.')
        return
      }

      await setSetting('onboarding_completed', 'true')
      await Promise.all([loadSettings(), refreshFromDB(), loadCharacterClassConfig()])
      navigate('/')
    } catch (e) {
      console.error('Failed to import onboarding backup', e)
      setImportStatus('Import failed. Please try again.')
    } finally {
      setImporting(false)
      setShowImportConfirm(false)
    }
  }

  return (
    <div className="h-screen overflow-y-auto bg-surface-900">
      <div className="min-h-full flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-8 justify-center">
          {steps.map((s, i) => (
            <div
              key={s}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i <= step ? 'bg-primary-500 w-12' : 'bg-surface-600 w-6'
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
                <h1 className="text-3xl font-bold text-[color:var(--app-interactive-fg-default)] mb-2">Welcome to ProductivitApp</h1>
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
              <Button
                size="lg"
                variant="secondary"
                className="w-full"
                onClick={() => setShowImportConfirm(true)}
              >
                Restore from JSON backup
              </Button>
              <p className="text-xs text-surface-400">
                Returning user? Restore your backup and skip onboarding.
              </p>
              {importStatus && <p className="text-xs text-surface-300">{importStatus}</p>}
            </motion.div>
          )}

          {/* Step 1: Science */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="text-center">
                <div className="text-4xl mb-3">🧪</div>
                <h2 className="text-2xl font-bold text-[color:var(--app-interactive-fg-default)] mb-2">Science-Powered Growth</h2>
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
                <h2 className="text-2xl font-bold text-[color:var(--app-interactive-fg-default)] mb-2">Seed Your Habits</h2>
                <p className="text-surface-400 text-sm">Pick 2–3 habits to start. You can add more later.</p>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
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
                        ? 'bg-primary-600/20 border-primary-500/40 text-[color:var(--app-interactive-fg-default)]'
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

          {/* Step 3: Values */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="text-center">
                <div className="text-4xl mb-3">🧭</div>
                <h2 className="text-2xl font-bold text-[color:var(--app-interactive-fg-default)] mb-2">Choose Your Core Values</h2>
                <p className="text-surface-400 text-sm">Pick up to 3 values. Your dashboard will keep your goals tied to these.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CORE_VALUES.map((value) => {
                  const selected = selectedValues.includes(value.id)
                  const reachedLimit = selectedValues.length >= 3 && !selected

                  return (
                    <button
                      key={value.id}
                      type="button"
                      disabled={reachedLimit}
                      onClick={() => toggleValue(value.id)}
                      className={cn(
                        'w-full text-left p-3 rounded-xl border transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                        selected
                            ? 'bg-primary-600/20 border-primary-500/40 text-[color:var(--app-interactive-fg-default)]'
                          : 'bg-surface-800 border-surface-600 text-surface-200 hover:border-surface-400'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{value.icon} {value.label}</span>
                        {selected && <span className="text-primary-400 text-sm">✓</span>}
                      </div>
                      <p className="text-xs text-surface-400 mt-1">{value.description}</p>
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-surface-400 text-center">
                {selectedValues.length === 0
                  ? 'Select at least 1 value to continue'
                  : `${selectedValues.length}/3 selected`}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setStep(2)}>← Back</Button>
                <Button className="flex-1" onClick={() => setStep(4)} disabled={selectedValues.length === 0}>
                  Continue →
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Class Selection */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="text-center">
                <div className="text-4xl mb-3">🏛️</div>
                <h2 className="text-2xl font-bold text-[color:var(--app-interactive-fg-default)] mb-2">Choose Your Path</h2>
                <p className="text-surface-400 text-sm">Your class gives a permanent +25% XP bonus to your focus area. You can switch later.</p>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {CHARACTER_CLASSES.map((cls) => {
                  const selected = selectedClass === cls.id
                  return (
                    <button
                      key={cls.id}
                      onClick={() => setSelectedClass(cls.id)}
                      className={cn(
                        'w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left',
                        selected
                          ? 'bg-primary-600/20 border-primary-500/50 shadow-md shadow-primary-900/30'
                          : 'bg-surface-800 border-surface-600 hover:border-surface-400'
                      )}
                    >
                      <span className="text-3xl mt-0.5 shrink-0">{cls.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className={cn('font-semibold text-sm', selected ? 'text-[color:var(--app-interactive-fg-default)]' : 'text-surface-200')}>
                          {cls.name}
                        </div>
                        <div className="text-xs text-surface-400 mt-0.5">{cls.description}</div>
                        <div className={cn(
                          'text-xs font-medium mt-1.5 px-2 py-0.5 rounded-full w-fit',
                          selected
                            ? 'bg-primary-500/20 text-primary-300'
                            : 'bg-surface-700 text-surface-400'
                        )}>
                          {cls.bonus}
                        </div>
                      </div>
                      {selected && <span className="text-primary-400 shrink-0 mt-1">✓</span>}
                    </button>
                  )
                })}
              </div>
              {selectedClass && (() => {
                const cls = CHARACTER_CLASSES.find((c) => c.id === selectedClass)
                return cls ? (
                  <p className="text-xs text-surface-400 text-center italic">"{cls.flavor}"</p>
                ) : null
              })()}
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setStep(3)}>← Back</Button>
                <Button className="flex-1" onClick={() => setStep(5)}>Continue →</Button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Commitment */}
          {step === 5 && (
            <motion.div key="step5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="text-center">
                <div className="text-4xl mb-3">🤝</div>
                <h2 className="text-2xl font-bold text-[color:var(--app-interactive-fg-default)] mb-2">Make a Commitment</h2>
                <p className="text-surface-400 text-sm">
                  Research shows written commitments dramatically increase follow-through (Ariely, 2008).
                </p>
              </div>

              {/* Class recap */}
              {(() => {
                const cls = CHARACTER_CLASSES.find((c) => c.id === selectedClass)
                return cls ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-600/10 border border-primary-500/20">
                    <span className="text-2xl">{cls.icon}</span>
                    <div>
                      <div className="text-sm font-semibold text-[color:var(--app-interactive-fg-default)]">{cls.name}</div>
                      <div className="text-xs text-primary-400">{cls.bonus}</div>
                    </div>
                  </div>
                ) : null
              })()}

              <Textarea
                label="I commit to using ProductivitApp every day because..."
                value={commitment}
                onChange={(e) => setCommitment(e.target.value)}
                placeholder="I want to build the discipline to reach my goals, one day at a time..."
                rows={4}
              />
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setStep(4)}>← Back</Button>
                <Button
                  className="flex-1"
                  loading={loading}
                  onClick={handleFinish}
                  disabled={loading}
                >
                  {loading ? 'Setting up...' : 'Start My Journey ⚔️'}
                </Button>
              </div>
              {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            </motion.div>
          )}
        </AnimatePresence>

        <Modal
          open={showImportConfirm}
          onClose={() => !importing && setShowImportConfirm(false)}
          title="Restore from JSON Backup"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-surface-300">
              Restore data from a previous ProductivitApp backup file and skip onboarding.
            </p>
            <p className="text-xs text-amber-300/90">
              This uses replace mode and will overwrite existing tracked data in this app profile.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowImportConfirm(false)}
                disabled={importing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleImportAndSkip()}
                loading={importing}
                disabled={importing}
              >
                Choose file and restore
              </Button>
            </div>
          </div>
        </Modal>
      </div>
      </div>
    </div>
  )
}
