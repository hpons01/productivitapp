import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { DashboardPage } from './pages/Dashboard'
import { HabitsPage } from './pages/Habits'
import { PomodoroPage } from './pages/Pomodoro'
import { TasksPage } from './pages/Tasks'
import { JournalPage } from './pages/Journal'
import { EnergyPage } from './pages/Energy'
import { AnalyticsPage } from './pages/Analytics'
import { SettingsPage } from './pages/Settings'
import { InventoryPage } from './pages/Inventory'
import { PetsPage } from './pages/Pets'
import { QuestsPage } from './pages/Quests'
import { OnboardingPage } from './pages/Onboarding'
import { GamificationOverlay } from './components/feedback/GamificationOverlay'
import { Button } from './components/ui/button'
import { useSettingsStore } from './stores/settings.store'
import { useGamificationStore } from './stores/gamification.store'

function playTaskReminderSound(): void {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return

  const context = new AudioContextClass()
  const now = context.currentTime
  const tones = [880, 1046.5, 1318.5]

  tones.forEach((freq, index) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(freq, now + index * 0.14)
    gain.gain.setValueAtTime(0.0001, now + index * 0.14)
    gain.gain.exponentialRampToValueAtTime(0.12, now + index * 0.14 + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.14 + 0.2)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now + index * 0.14)
    oscillator.stop(now + index * 0.14 + 0.22)
  })

  setTimeout(() => {
    void context.close()
  }, 600)
}

export default function App() {
  const { settings, initialized, loadSettings } = useSettingsStore()
  const { initialize } = useGamificationStore()
  const [taskReminder, setTaskReminder] = useState<{ taskId: string; title: string; dueDate: number } | null>(null)

  useEffect(() => {
    void loadSettings()
    void initialize()
  }, [])

  useEffect(() => {
    // Apply theme to html element
    const theme = settings['theme'] || 'dark'
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [settings])

  useEffect(() => {
    const unsubscribe = window.api.onTaskReminder((payload) => {
      setTaskReminder(payload)
      playTaskReminderSound()
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const isOnboarded = settings['onboarding_completed'] === 'true'

  if (!initialized) {
    return <div className="h-screen w-screen bg-surface-900" />
  }

  return (
    <HashRouter>
      <GamificationOverlay />
      {taskReminder && (
        <div className="fixed right-4 top-4 z-[70] w-[320px] rounded-2xl border border-amber-400/30 bg-surface-800/95 backdrop-blur p-4 shadow-2xl shadow-black/35">
          <p className="text-xs uppercase tracking-wide text-amber-300 font-semibold">Task reminder</p>
          <p className="text-sm text-white mt-1 font-medium line-clamp-2">{taskReminder.title}</p>
          <p className="text-xs text-surface-400 mt-1">
            Planned for {new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(taskReminder.dueDate))}
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="amber"
              className="flex-1"
              onClick={async () => {
                await window.api.tasks.snoozeReminder(taskReminder.taskId, 5)
                setTaskReminder(null)
              }}
            >
              Snooze 5m
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={() => setTaskReminder(null)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
      <Routes>
        <Route
          path="/onboarding"
          element={<OnboardingPage />}
        />
        <Route
          path="/"
          element={
            isOnboarded ? (
              <AppLayout />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="pomodoro" element={<PomodoroPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="energy" element={<EnergyPage />} />
          <Route path="quests" element={<QuestsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="pets" element={<PetsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
