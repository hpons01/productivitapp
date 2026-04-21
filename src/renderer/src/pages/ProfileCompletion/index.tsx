import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { useAuthStore } from '../../stores/auth.store'

export function ProfileCompletionPage() {
  const { status, user, profileCompleted, completeProfile } = useAuthStore()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const suggestedName = useMemo(() => {
    if (user?.displayName) return user.displayName
    if (!user?.email) return ''
    return user.email.split('@')[0]
  }, [user])

  if (status !== 'authenticated') {
    return <Navigate to="/auth" replace />
  }

  if (profileCompleted) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="h-screen w-screen bg-surface-900 flex items-center justify-center px-4">
      <Card className="w-full max-w-lg border border-primary-600/25 bg-surface-800/95">
        <CardHeader>
          <CardTitle>Complete your profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-surface-300">
            Set your display name to unlock the rest of your onboarding flow.
          </p>

          <Input
            label="Display name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder={suggestedName || 'Hero'}
          />

          {error && <p className="text-xs text-red-300">{error}</p>}

          <Button
            className="w-full"
            loading={submitting}
            disabled={submitting || !(displayName.trim() || suggestedName.trim())}
            onClick={async () => {
              setSubmitting(true)
              setError(null)
              try {
                await completeProfile((displayName.trim() || suggestedName).trim())
              } catch {
                setError('Unable to save your profile right now. Please try again.')
              } finally {
                setSubmitting(false)
              }
            }}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
