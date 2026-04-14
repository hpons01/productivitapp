import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Modal } from '../../components/ui/modal'
import { useSettingsStore } from '../../stores/settings.store'

export function SettingsPage() {
  const { settings, getSetting, setSetting, loadSettings, resetOnboarding } = useSettingsStore()
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => { loadSettings() }, [])

  const handleConfirmReset = async () => {
    setResetting(true)
    try {
      await resetOnboarding()
      setShowResetConfirm(false)
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-surface-400 text-sm mt-1">Customize your productivity experience.</p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Select
            label="Theme"
            value={getSetting('theme', 'dark')}
            onChange={(e) => setSetting('theme', e.target.value)}
          >
            <option value="dark">🌙 Dark (default)</option>
            <option value="light">☀️ Light</option>
          </Select>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Morning Ritual Reminder"
            type="time"
            value={getSetting('notification_morning_time', '07:00')}
            onChange={(e) => setSetting('notification_morning_time', e.target.value)}
          />
          <Input
            label="Evening Reflection Reminder"
            type="time"
            value={getSetting('notification_evening_time', '21:00')}
            onChange={(e) => setSetting('notification_evening_time', e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Pomodoro defaults */}
      <Card>
        <CardHeader><CardTitle>Pomodoro Defaults</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Select
            label="Work Duration"
            value={getSetting('pomodoro_duration', '25')}
            onChange={(e) => setSetting('pomodoro_duration', e.target.value)}
          >
            {[15, 25, 30, 45, 50, 60, 90].map((m) => (
              <option key={m} value={String(m)}>{m} minutes</option>
            ))}
          </Select>
          <Select
            label="Break Duration"
            value={getSetting('pomodoro_break', '5')}
            onChange={(e) => setSetting('pomodoro_break', e.target.value)}
          >
            {[3, 5, 10, 15].map((m) => (
              <option key={m} value={String(m)}>{m} minutes</option>
            ))}
          </Select>
        </CardContent>
      </Card>

      {/* User */}
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Your Name"
            value={getSetting('user_name', '')}
            onChange={(e) => setSetting('user_name', e.target.value)}
            placeholder="Hero"
          />
          <div className="pt-2 border-t border-surface-600">
            <p className="text-xs text-surface-400 mb-3">Your commitment statement:</p>
            <p className="text-sm text-primary-300 italic">
              "{getSetting('commitment_statement', 'I commit to growing 1% every day.')}"
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <CardHeader><CardTitle>Data &amp; Privacy</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-surface-400 text-sm">Export a complete backup of all your productivity data.</p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => window.api.export.exportData('json')}
            >
              Export JSON (complete)
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.api.export.exportData('csv')}
            >
              Export CSV (habits &amp; tasks)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reset */}
      <Card>
        <CardHeader><CardTitle className="text-red-400">Danger Zone</CardTitle></CardHeader>
        <CardContent>
          <p className="text-surface-400 text-sm mb-4">This will clear your journey data, mark onboarding as incomplete, and restart the setup flow.</p>
          <Button variant="danger" onClick={() => setShowResetConfirm(true)}>
            Reset Onboarding
          </Button>
        </CardContent>
      </Card>

      <Modal
        open={showResetConfirm}
        onClose={() => !resetting && setShowResetConfirm(false)}
        title="Reset Onboarding?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-surface-300">
            This action will delete your journey progress and restart onboarding from the beginning.
          </p>
          <p className="text-xs text-red-300/90">
            This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowResetConfirm(false)}
              disabled={resetting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleConfirmReset()}
              loading={resetting}
              disabled={resetting}
            >
              Yes, Reset
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
