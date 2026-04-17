import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Modal } from '../../components/ui/modal'
import { useSettingsStore } from '../../stores/settings.store'

const THEME_OPTIONS = [
  { value: 'dark', label: '🌙 Dark (default)' },
  { value: 'light', label: '☀️ Light' },
  { value: 'ember', label: '🔥 Ember' },
  { value: 'ocean', label: '🌊 Ocean' },
  { value: 'void', label: '🌑 Void' },
  { value: 'golden', label: '✨ Golden' }
] as const

const ACCENT_OPTIONS = [
  { value: 'default', label: 'Default Accent' },
  { value: 'bronze', label: '🥉 Bronze Accent' },
  { value: 'silver', label: '🥈 Silver Accent' },
  { value: 'gold', label: '🥇 Gold Accent' }
] as const

function parseUnlocked(raw: string, defaults: string[]): Set<string> {
  const unlocked = new Set(defaults)

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      for (const value of parsed) {
        if (typeof value === 'string') {
          unlocked.add(value)
        }
      }
    }
  } catch {
    // ignore malformed settings and fallback to defaults
  }

  return unlocked
}

export function SettingsPage() {
  const { getSetting, setSetting, loadSettings, resetOnboarding } = useSettingsStore()
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge')
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [checkingUpdates, setCheckingUpdates] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<string | null>(null)

  useEffect(() => { loadSettings() }, [])

  useEffect(() => {
    const unsubs = [
      window.api.onUpdateAvailable(() => {
        setUpdateStatus('Update found. Downloading in the background...')
      }),
      window.api.onUpdateReady(() => {
        setUpdateStatus('Update downloaded. Click Install update to restart and apply it.')
      })
    ]

    return () => {
      unsubs.forEach((unsubscribe) => unsubscribe())
    }
  }, [])

  const handleConfirmReset = async () => {
    setResetting(true)
    try {
      await resetOnboarding()
      setShowResetConfirm(false)
    } finally {
      setResetting(false)
    }
  }

  const handleImport = async () => {
    setImporting(true)
    setImportStatus(null)
    try {
      const result = await window.api.export.importData(importMode) as {
        success: boolean
        canceled?: boolean
        error?: string
        totalImported?: number
      }

      if (result.canceled) {
        setImportStatus('Import cancelled.')
      } else if (result.success) {
        setImportStatus(`Import complete. ${result.totalImported ?? 0} records processed.`)
      } else {
        setImportStatus(result.error ?? 'Import failed.')
      }
    } finally {
      setImporting(false)
      setShowImportConfirm(false)
      void loadSettings()
    }
  }

  const handleCheckUpdates = async () => {
    setCheckingUpdates(true)
    setUpdateStatus('Checking for updates...')
    try {
      await window.api.updater.check()
      setUpdateStatus((current) => current ?? 'No update was immediately reported. If one exists, it will appear shortly.')
    } catch {
      setUpdateStatus('Update check failed. Please try again while connected to the internet.')
    } finally {
      setCheckingUpdates(false)
    }
  }

  const startOnBootEnabled = getSetting('start_on_boot', 'false') === 'true'
  const currentTheme = getSetting('theme', 'dark')
  const currentAccent = getSetting('active_accent', 'default')
  const unlockedThemesSetting = getSetting('unlocked_themes', '[]')
  const unlockedAccentsSetting = getSetting('unlocked_accents', '[]')

  const unlockedThemes = useMemo(
    () => parseUnlocked(unlockedThemesSetting, ['dark', 'light', currentTheme]),
    [currentTheme, unlockedThemesSetting]
  )

  const unlockedAccents = useMemo(
    () => parseUnlocked(unlockedAccentsSetting, ['default', currentAccent]),
    [currentAccent, unlockedAccentsSetting]
  )

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
            value={currentTheme}
            onChange={(e) => {
              const nextTheme = e.target.value
              if (!unlockedThemes.has(nextTheme)) return
              setSetting('theme', nextTheme)
            }}
          >
            {THEME_OPTIONS.map((theme) => (
              <option
                key={theme.value}
                value={theme.value}
                disabled={!unlockedThemes.has(theme.value)}
              >
                {theme.label}{!unlockedThemes.has(theme.value) ? ' (locked)' : ''}
              </option>
            ))}
          </Select>

          <Select
            label="Accent"
            value={currentAccent}
            onChange={(e) => {
              const nextAccent = e.target.value
              if (!unlockedAccents.has(nextAccent)) return
              setSetting('active_accent', nextAccent)
            }}
          >
            {ACCENT_OPTIONS.map((accent) => (
              <option
                key={accent.value}
                value={accent.value}
                disabled={!unlockedAccents.has(accent.value)}
              >
                {accent.label}{!unlockedAccents.has(accent.value) ? ' (locked)' : ''}
              </option>
            ))}
          </Select>

          <p className="text-xs text-surface-400">
            Cosmetic themes and accents can be earned from loot drops or purchased in the shop.
          </p>
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

      {/* Launch behavior */}
      <Card>
        <CardHeader><CardTitle>App Launch</CardTitle></CardHeader>
        <CardContent>
          <label className="flex items-center justify-between gap-4 rounded-xl border border-surface-500 bg-surface-800 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">Start when computer starts</p>
              <p className="text-xs text-surface-400 mt-1">
                Opens ProductivitApp automatically after login.
              </p>
            </div>
            <input
              type="checkbox"
              checked={startOnBootEnabled}
              onChange={(e) => setSetting('start_on_boot', e.target.checked ? 'true' : 'false')}
              className="h-4 w-4 rounded border-surface-400 bg-surface-900"
            />
          </label>
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
          <p className="text-surface-400 text-sm">Export or import your complete productivity history.</p>
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
            <Button
              variant="secondary"
              onClick={() => setShowImportConfirm(true)}
            >
              Import JSON backup
            </Button>
          </div>
          {importStatus && <p className="text-xs text-surface-300">{importStatus}</p>}
        </CardContent>
      </Card>

      {/* Updates */}
      <Card>
        <CardHeader><CardTitle>App Updates</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-surface-400 text-sm">Keep the app up to date with the latest fixes and features.</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => void handleCheckUpdates()} loading={checkingUpdates}>
              Check for updates
            </Button>
            <Button
              variant="primary"
              onClick={() => void window.api.updater.install()}
            >
              Install update
            </Button>
          </div>
          {updateStatus && <p className="text-xs text-surface-300">{updateStatus}</p>}
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

      <Modal
        open={showImportConfirm}
        onClose={() => !importing && setShowImportConfirm(false)}
        title="Import JSON Backup"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-surface-300">
            Choose how imported records should be applied when local data already exists.
          </p>
          <Select
            label="Import mode"
            value={importMode}
            onChange={(e) => setImportMode(e.target.value as 'replace' | 'merge')}
          >
            <option value="merge">Merge (keep local records if IDs conflict)</option>
            <option value="replace">Replace (clear local tracked data first)</option>
          </Select>
          <p className="text-xs text-amber-300/90">
            Replace will remove existing habits, tasks, journal, pomodoros, energy logs, and XP logs before import.
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
              onClick={() => void handleImport()}
              loading={importing}
              disabled={importing}
            >
              Choose file and import
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
