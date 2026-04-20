import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Modal } from '../../components/ui/modal'
import { useSettingsStore } from '../../stores/settings.store'
import { cn } from '../../lib/utils'

function Toggle({
  checked,
  onChange,
  disabled,
  ariaLabel
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent disabled:opacity-40 disabled:pointer-events-none',
        checked ? 'bg-[color:var(--app-primary)] border-[color:var(--app-primary)]' : 'bg-surface-600 border-surface-500'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-3.5' : 'translate-x-0.5'
        )}
        style={{ marginTop: '1px' }}
      />
    </button>
  )
}

const THEME_OPTIONS = [
  { value: 'dark', label: '🌿 Ironveil' },
  { value: 'light', label: '🌸 Silverlight' },
  { value: 'ember', label: '🔥 Emberforge' },
  { value: 'ocean', label: '🌊 Abyssal Tide' },
  { value: 'void', label: '🌑 Voidweave' },
  { value: 'golden', label: '⚜️ Sunken Throne' }
] as const

const ACCENT_OPTIONS = [
  { value: 'default', label: 'Default Accent' },
  { value: 'bronze', label: '🥉 Bronze Accent' },
  { value: 'silver', label: '🥈 Silver Accent' },
  { value: 'gold', label: '🥇 Gold Accent' }
] as const

const SETTINGS_KEYS = {
  developerMode: 'developer_mode',
  unlockedThemes: 'unlocked_themes',
  unlockedAccents: 'unlocked_accents',
  developerModeThemesBackup: 'developer_mode_unlocked_themes_backup',
  developerModeAccentsBackup: 'developer_mode_unlocked_accents_backup'
} as const

const ALL_THEME_VALUES = THEME_OPTIONS.map((theme) => theme.value)
const ALL_ACCENT_VALUES = ACCENT_OPTIONS.map((accent) => accent.value)

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
  const [developerModeBusy, setDeveloperModeBusy] = useState(false)

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
  const developerModeEnabled = getSetting(SETTINGS_KEYS.developerMode, 'false') === 'true'
  const currentTheme = getSetting('theme', 'dark')
  const currentAccent = getSetting('active_accent', 'default')
  const unlockedThemesSetting = getSetting(SETTINGS_KEYS.unlockedThemes, '[]')
  const unlockedAccentsSetting = getSetting(SETTINGS_KEYS.unlockedAccents, '[]')

  const unlockedThemes = useMemo(
    () => (developerModeEnabled
      ? new Set(ALL_THEME_VALUES)
      : parseUnlocked(unlockedThemesSetting, ['dark', 'light', currentTheme])),
    [currentTheme, developerModeEnabled, unlockedThemesSetting]
  )

  const unlockedAccents = useMemo(
    () => (developerModeEnabled
      ? new Set(ALL_ACCENT_VALUES)
      : parseUnlocked(unlockedAccentsSetting, ['default', currentAccent])),
    [currentAccent, developerModeEnabled, unlockedAccentsSetting]
  )

  const handleDeveloperModeToggle = async (nextEnabled: boolean) => {
    setDeveloperModeBusy(true)
    try {
      if (nextEnabled) {
        const currentThemes = getSetting(SETTINGS_KEYS.unlockedThemes, '[]')
        const currentAccents = getSetting(SETTINGS_KEYS.unlockedAccents, '[]')

        await Promise.all([
          setSetting(SETTINGS_KEYS.developerModeThemesBackup, currentThemes),
          setSetting(SETTINGS_KEYS.developerModeAccentsBackup, currentAccents),
          setSetting(SETTINGS_KEYS.developerMode, 'true'),
          setSetting(SETTINGS_KEYS.unlockedThemes, JSON.stringify(ALL_THEME_VALUES)),
          setSetting(SETTINGS_KEYS.unlockedAccents, JSON.stringify(ALL_ACCENT_VALUES))
        ])
        return
      }

      const restoreThemesRaw = getSetting(
        SETTINGS_KEYS.developerModeThemesBackup,
        JSON.stringify(['dark', 'light'])
      )
      const restoreAccentsRaw = getSetting(
        SETTINGS_KEYS.developerModeAccentsBackup,
        JSON.stringify(['default'])
      )

      const restoreThemes = JSON.stringify(Array.from(parseUnlocked(restoreThemesRaw, ['dark', 'light'])))
      const restoreAccents = JSON.stringify(Array.from(parseUnlocked(restoreAccentsRaw, ['default'])))

      await Promise.all([
        setSetting(SETTINGS_KEYS.developerMode, 'false'),
        setSetting(SETTINGS_KEYS.unlockedThemes, restoreThemes),
        setSetting(SETTINGS_KEYS.unlockedAccents, restoreAccents)
      ])
    } finally {
      setDeveloperModeBusy(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Customize your productivity experience.</p>
      </div>

      {/* Identity group */}
      <div className="section-divider">Identity</div>

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

      {/* Rhythm group */}
      <div className="section-divider">Rhythm</div>

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
          <div className="flex items-center justify-between gap-4 rounded-sm border border-surface-500 bg-surface-800 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[color:var(--app-interactive-fg-default)]">Start when computer starts</p>
              <p className="text-xs text-surface-400 mt-1">
                Opens ProductivitApp automatically after login.
              </p>
            </div>
            <Toggle
              checked={startOnBootEnabled}
              onChange={(v) => setSetting('start_on_boot', v ? 'true' : 'false')}
              ariaLabel="Start when computer starts"
            />
          </div>
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

      {/* Data group */}
      <div className="section-divider">Data</div>

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
          {importStatus && (
            <p className={cn(
              'text-xs',
              importStatus.includes('complete') ? 'text-emerald-400' : importStatus.includes('failed') || importStatus.includes('error') ? 'text-red-400' : 'text-surface-300'
            )}>{importStatus}</p>
          )}
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
          {updateStatus && (
            <div className={cn(
              'rounded-sm px-3 py-2 text-xs border',
              updateStatus.includes('Update found') || updateStatus.includes('Update downloaded')
                ? 'bg-primary-600/10 border-primary-500/30 text-primary-300'
                : updateStatus.includes('failed') || updateStatus.includes('error')
                ? 'bg-red-900/20 border-red-500/30 text-red-300'
                : 'bg-surface-700/60 border-surface-600/50 text-surface-300'
            )}>
              {updateStatus}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced group */}
      <div className="section-divider">Advanced</div>

      {/* Developer Mode */}
      <Card>
        <CardHeader><CardTitle>Developer Mode</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-sm border border-surface-500 bg-surface-800 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[color:var(--app-interactive-fg-default)]">Unlock everything for testing</p>
              <p className="text-xs text-surface-400 mt-1">
                Bypasses cosmetic locks and catalog quest level requirements.
              </p>
            </div>
            <Toggle
              checked={developerModeEnabled}
              onChange={(v) => void handleDeveloperModeToggle(v)}
              disabled={developerModeBusy}
              ariaLabel="Unlock everything for testing"
            />
          </div>
          <p className="text-xs text-surface-400">
            {developerModeEnabled
              ? 'Developer mode is active. Locked cosmetics and catalog quests are now available.'
              : 'When disabled, your previous cosmetic unlock state is restored automatically.'}
          </p>
        </CardContent>
      </Card>

      {/* Reset */}
      <Card className="border-l-2 border-l-red-500/60">
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
