import { useEffect } from 'react'
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
import { OnboardingPage } from './pages/Onboarding'
import { GamificationOverlay } from './components/feedback/GamificationOverlay'
import { useSettingsStore } from './stores/settings.store'
import { useGamificationStore } from './stores/gamification.store'

export default function App() {
  const { settings, loadSettings } = useSettingsStore()
  const { initialize } = useGamificationStore()

  useEffect(() => {
    loadSettings()
    initialize()
  }, [])

  useEffect(() => {
    // Apply theme to html element
    const theme = settings['theme'] || 'dark'
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [settings])

  const isOnboarded = settings['onboarding_completed'] === 'true'

  return (
    <HashRouter>
      <GamificationOverlay />
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
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
