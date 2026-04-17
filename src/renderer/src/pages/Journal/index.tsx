import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import * as Tabs from '@radix-ui/react-tabs'
import { Sunrise, Moon, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Textarea, Input } from '../../components/ui/input'
import { useJournalStore } from '../../stores/journal.store'
import { cn } from '../../lib/utils'
import { ENERGY_OPTIONS } from '../../lib/constants/energy-emojis'

const VISUALIZATION_PROMPTS = [
  'Describe your ideal productive day in vivid detail. Where are you? What have you accomplished?',
  'Imagine yourself 5 years from now. What does your most productive self look like?',
  'What would you do today if you knew you could not fail?',
  'Describe the feeling of completing your most important goal. What does that version of you look like?'
]

type IntentionInput = {
  action: string
  time: string
  location: string
}

function MorningRitual() {
  const { todayMorning, saveMorning } = useJournalStore()
  const [step, setStep] = useState(0)
  const [intentions, setIntentions] = useState<IntentionInput[]>([
    { action: '', time: '', location: '' },
    { action: '', time: '', location: '' },
    { action: '', time: '', location: '' }
  ])
  const [energyLevel, setEnergyLevel] = useState(3)
  const [mood, setMood] = useState(3)
  const [gratitude, setGratitude] = useState(['', '', ''])
  const [saved, setSaved] = useState(false)

  const moodOptions = [
    { value: 1, emoji: '😤' },
    { value: 2, emoji: '😕' },
    { value: 3, emoji: '😐' },
    { value: 4, emoji: '😊' },
    { value: 5, emoji: '🤩' }
  ]

  useEffect(() => {
    if (todayMorning) setSaved(true)
  }, [todayMorning])

  if (saved || todayMorning) {
    const entry = todayMorning
    const parsedIntentions = entry?.intentions ? JSON.parse(entry.intentions) : []
    return (
      <div className="space-y-4">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
          <p className="text-emerald-400 font-semibold">✅ Morning ritual complete!</p>
        </div>
        {parsedIntentions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-surface-400 font-medium uppercase tracking-wide">Today's Intentions</p>
            {parsedIntentions.map((i: string, idx: number) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-[color:var(--app-interactive-fg-default)]">
                <span className="text-primary-400 font-bold">{idx + 1}.</span>
                <span>{i}</span>
              </div>
            ))}
          </div>
        )}
        {entry?.mood_emoji && (
          <div className="text-xs text-surface-400">
            Morning energy: <span className="text-base align-middle">{entry.mood_emoji}</span>
          </div>
        )}
      </div>
    )
  }

  const steps = ['Energy', 'Intentions', 'Gratitude']

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className={cn(
            'flex items-center gap-2',
            i < steps.length - 1 && 'flex-1'
          )}>
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
              i < step ? 'bg-emerald-500 text-[color:var(--app-interactive-fg-default)]' : i === step ? 'bg-primary-600 text-[color:var(--app-on-primary)]' : 'bg-surface-700 text-surface-400'
            )}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={cn('text-xs', i === step ? 'text-[color:var(--app-interactive-fg-default)]' : 'text-surface-400')}>{s}</span>
            {i < steps.length - 1 && <div className={cn('flex-1 h-px', i < step ? 'bg-emerald-500' : 'bg-surface-600')} />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <div>
            <p className="text-xs text-surface-400 mb-3 font-medium uppercase tracking-wide">Energy Level</p>
            <div className="flex gap-3 justify-center flex-wrap">
              {ENERGY_OPTIONS.map(({ value, emoji, label }) => (
                <button
                  key={value}
                  onClick={() => setEnergyLevel(value)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl transition-all min-w-[72px] cursor-pointer',
                    energyLevel === value
                      ? 'bg-primary-600/30 ring-2 ring-primary-500 scale-105'
                      : 'bg-surface-800 ui-bg-hover'
                  )}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-[10px] text-surface-300">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-surface-400 mb-3 font-medium uppercase tracking-wide">Mood</p>
            <div className="flex gap-3 justify-center">
              {moodOptions.map(({ value, emoji }) => (
                <button
                  key={value}
                  onClick={() => setMood(value)}
                  className={cn(
                    'text-2xl p-2 rounded-xl transition-all cursor-pointer',
                    mood === value ? 'bg-primary-600/30 ring-2 ring-primary-500 scale-110' : 'ui-bg-hover'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <Button className="w-full" onClick={() => setStep(1)}>Next →</Button>
        </motion.div>
      )}

      {step === 1 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <p className="text-surface-300 text-sm">Set 3 implementation intentions for today:</p>
          {intentions.map((intent, i) => {
            const updateField = (field: keyof IntentionInput, value: string) => {
              setIntentions(intentions.map((v, idx) => idx === i ? { ...v, [field]: value } : v))
            }

            return (
              <div key={i} className="rounded-xl border border-surface-600/50 bg-surface-800/40 p-3">
                <p className="text-xs text-surface-400 mb-2">Intention {i + 1}</p>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-surface-300">I will</span>
                  <input
                    value={intent.action}
                    onChange={(e) => updateField('action', e.target.value)}
                    placeholder="[action]"
                    className="min-w-[140px] flex-1 bg-surface-700 border border-surface-600 rounded-md px-2 py-1.5 text-[color:var(--app-interactive-fg-default)] placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-[color:var(--app-primary-glow)]"
                  />
                  <span className="text-surface-300">at</span>
                  <input
                    value={intent.time}
                    onChange={(e) => updateField('time', e.target.value)}
                    type="time"
                    placeholder="[time]"
                    className="min-w-[100px] flex-1 bg-surface-700 border border-surface-600 rounded-md px-2 py-1.5 text-[color:var(--app-interactive-fg-default)] placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-[color:var(--app-primary-glow)]"
                  />
                  <span className="text-surface-300">in</span>
                  <input
                    value={intent.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    placeholder="[location]"
                    className="min-w-[120px] flex-1 bg-surface-700 border border-surface-600 rounded-md px-2 py-1.5 text-[color:var(--app-interactive-fg-default)] placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-[color:var(--app-primary-glow)]"
                  />
                </div>
              </div>
            )
          })}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setStep(0)}>← Back</Button>
            <Button className="flex-1" onClick={() => setStep(2)}>Next →</Button>
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <p className="text-surface-300 text-sm">What are you grateful for today?</p>
          {gratitude.map((g, i) => (
            <Input
              key={i}
              value={g}
              onChange={(e) => setGratitude(gratitude.map((v, idx) => idx === i ? e.target.value : v))}
              placeholder={`I'm grateful for...`}
            />
          ))}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setStep(1)}>← Back</Button>
            <Button
              className="flex-1"
              onClick={async () => {
                const formattedIntentions = intentions
                  .filter((i) => i.action.trim())
                  .map((i) => {
                    const action = i.action.trim()
                    const time = i.time.trim()
                    const location = i.location.trim()

                    let sentence = `I will ${action}`
                    if (time) sentence += ` at ${time}`
                    if (location) sentence += ` in ${location}`
                    return sentence
                  })

                await saveMorning({
                  intentions: JSON.stringify(formattedIntentions),
                  gratitude: JSON.stringify(gratitude.filter(Boolean)),
                  energy_level: energyLevel,
                  mood_emoji: moodOptions.find((m) => m.value === mood)?.emoji ?? '😐'
                }, intentions)
                setSaved(true)
              }}
            >
              Complete Ritual ✨
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

function EveningReflection() {
  const { todayEvening, saveEvening } = useJournalStore()
  const [wins, setWins] = useState('')
  const [reflection, setReflection] = useState('')
  const [tomorrowPrep, setTomorrowPrep] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (todayEvening) setSaved(true)
  }, [todayEvening])

  if (saved || todayEvening) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
        <p className="text-emerald-400 font-semibold">✅ Evening reflection complete! Well done.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-surface-400 text-sm">Take a moment to close the day with intention.</p>
      <Textarea label="Wins today 🏆" value={wins} onChange={(e) => setWins(e.target.value)} placeholder="What went well? Any small win counts." rows={3} />
      <Textarea label="Reflection 💭" value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="What could have gone better? What did you learn?" rows={3} />
      <Textarea label="Tomorrow's priority 🎯" value={tomorrowPrep} onChange={(e) => setTomorrowPrep(e.target.value)} placeholder="The ONE thing I need to do tomorrow is..." rows={2} />
      <Button
        className="w-full"
        onClick={async () => {
          await saveEvening({ wins: JSON.stringify([wins]), reflection, tomorrow_prep: tomorrowPrep })
          setSaved(true)
        }}
      >
        Complete Reflection 🌙
      </Button>
    </div>
  )
}

function VisualizationPrompt() {
  const prompt = VISUALIZATION_PROMPTS[Math.floor(Math.random() * VISUALIZATION_PROMPTS.length)]
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)

  if (saved) {
    return (
      <div className="bg-primary-600/10 border border-primary-500/20 rounded-2xl p-4">
        <p className="text-primary-300 font-semibold">✨ Visualization saved!</p>
        <p className="text-surface-400 text-xs mt-1">Your future self is proud of you.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-primary-600/10 border border-primary-500/20 rounded-2xl p-4">
        <p className="text-primary-300 text-sm italic">"{prompt}"</p>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write freely for 5 minutes..."
        rows={8}
      />
      <Button className="w-full" onClick={() => setSaved(true)} disabled={text.length < 20}>
        Save Visualization ✨
      </Button>
    </div>
  )
}

export function JournalPage() {
  const { loadToday } = useJournalStore()

  useEffect(() => { loadToday() }, [])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[color:var(--app-interactive-fg-default)]">Daily Journal</h1>
        <p className="text-surface-400 text-sm mt-1">Rituals and reflections power your growth.</p>
      </div>

      <Tabs.Root defaultValue="morning">
        <Tabs.List className="flex bg-surface-800 rounded-xl p-1 mb-6">
          {[
            { value: 'morning', icon: Sunrise, label: 'Morning Ritual' },
            { value: 'evening', icon: Moon, label: 'Evening Reflection' },
            { value: 'vision', icon: Eye, label: 'Visualization' }
          ].map(({ value, icon: Icon, label }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm transition-all data-[state=active]:bg-primary-600 data-[state=active]:text-[color:var(--app-on-primary)] ui-fg-muted ui-fg-hover"
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="morning">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Sunrise size={16} className="text-amber-400" /> Morning Ritual</CardTitle></CardHeader>
            <CardContent><MorningRitual /></CardContent>
          </Card>
        </Tabs.Content>

        <Tabs.Content value="evening">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Moon size={16} className="text-blue-400" /> Evening Reflection</CardTitle></CardHeader>
            <CardContent><EveningReflection /></CardContent>
          </Card>
        </Tabs.Content>

        <Tabs.Content value="vision">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Eye size={16} className="text-primary-400" /> Visualization</CardTitle></CardHeader>
            <CardContent><VisualizationPrompt /></CardContent>
          </Card>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
