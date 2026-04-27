import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../../stores/auth.store'

type Mode = 'signin' | 'signup'

export function AuthPage() {
  const { status, error, signInWithEmail, signUpWithEmail } = useAuthStore()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    emailRef.current?.focus()
  }, [mode])

  const busy = status === 'authenticating'

  function switchMode(next: Mode) {
    setMode(next)
    setLocalError(null)
    setConfirmPassword('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError(null)

    if (!email.trim() || !password) {
      setLocalError('Please fill in all fields.')
      return
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters.')
        return
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.')
        return
      }
      const result = await signUpWithEmail(email.trim(), password)
      if (result.needsConfirmation) {
        setConfirmationSent(true)
      }
    } else {
      await signInWithEmail(email.trim(), password)
    }
  }

  const displayError = localError ?? error

  if (confirmationSent) {
    return (
      <div style={styles.root}>
        <Grain />
        <div style={styles.panel}>
          <div style={styles.iconRow}>
            <MailIcon />
          </div>
          <h1 style={styles.heading}>Check your inbox</h1>
          <p style={styles.sub}>
            We sent a confirmation link to <strong style={{ color: '#f5c842' }}>{email}</strong>.
            Click it to activate your account, then come back and sign in.
          </p>
          <button style={styles.linkBtn} onClick={() => { setConfirmationSent(false); switchMode('signin') }}>
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.root}>
      <Grain />
      <div style={styles.panel}>
        <div style={styles.logoMark}>
          <LogoMark />
        </div>

        <h1 style={styles.heading}>
          {mode === 'signin' ? 'Welcome back' : 'Create account'}
        </h1>
        <p style={styles.sub}>
          {mode === 'signin'
            ? 'Sign in to continue your productivity streak.'
            : 'Start your journey. No credit card required.'}
        </p>

        <form style={styles.form} onSubmit={(e) => void handleSubmit(e)}>
          <Field label="Email" type="email" value={email} onChange={setEmail} inputRef={emailRef} disabled={busy} />
          <Field label="Password" type="password" value={password} onChange={setPassword} disabled={busy} />
          {mode === 'signup' && (
            <Field label="Confirm password" type="password" value={confirmPassword} onChange={setConfirmPassword} disabled={busy} />
          )}

          {displayError && (
            <div style={styles.errorBox}>
              <span style={styles.errorDot}>●</span>
              {displayError}
            </div>
          )}

          <button type="submit" style={{ ...styles.submitBtn, opacity: busy ? 0.6 : 1 }} disabled={busy}>
            {busy ? <Spinner /> : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>{mode === 'signin' ? 'New here?' : 'Have an account?'}</span>
          <span style={styles.dividerLine} />
        </div>

        <button
          style={styles.switchBtn}
          onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
          disabled={busy}
        >
          {mode === 'signin' ? 'Create a free account' : 'Sign in instead'}
        </button>
      </div>
    </div>
  )
}

function Field({
  label, type, value, onChange, disabled, inputRef
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  inputRef?: React.RefObject<HTMLInputElement | null>
}) {
  const [focused, setFocused] = useState(false)

  return (
    <label style={styles.fieldWrap}>
      <span style={styles.fieldLabel}>{label}</span>
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        autoComplete={type === 'password' ? 'current-password' : 'email'}
        style={{
          ...styles.fieldInput,
          borderColor: focused ? '#f5c842' : 'rgba(255,255,255,0.08)',
          boxShadow: focused ? '0 0 0 2px rgba(245,200,66,0.15)' : 'none',
          opacity: disabled ? 0.55 : 1
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </label>
  )
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: 16,
      height: 16,
      border: '2px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite'
    }} />
  )
}

function Grain() {
  return (
    <svg style={styles.grain} xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noise)" opacity="0.045" />
    </svg>
  )
}

function LogoMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="rgba(245,200,66,0.12)" />
      <path d="M12 28V16l8-4 8 4v12l-8 4-8-4z" stroke="#f5c842" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      <path d="M20 12v16M12 16l8 4 8-4" stroke="#f5c842" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="14" fill="rgba(245,200,66,0.1)" />
      <rect x="10" y="15" width="28" height="20" rx="3" stroke="#f5c842" strokeWidth="1.5" />
      <path d="M10 18l14 9 14-9" stroke="#f5c842" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #1a1506 0%, #0c0c0c 55%, #080808 100%)',
    fontFamily: '"Sora", "Segoe UI", system-ui, sans-serif',
    position: 'relative',
    overflow: 'hidden'
  },
  grain: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 0
  },
  panel: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: 400,
    padding: '40px 36px',
    background: 'rgba(14,13,10,0.85)',
    border: '1px solid rgba(245,200,66,0.12)',
    borderRadius: 20,
    backdropFilter: 'blur(20px)',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,200,66,0.04) inset'
  },
  logoMark: {
    marginBottom: 24,
    display: 'flex'
  },
  iconRow: {
    marginBottom: 24,
    display: 'flex'
  },
  heading: {
    margin: '0 0 6px',
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: '#f0ede6'
  },
  sub: {
    margin: '0 0 28px',
    fontSize: 13.5,
    color: 'rgba(240,237,230,0.45)',
    lineHeight: 1.5
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14
  },
  fieldWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'rgba(240,237,230,0.4)'
  },
  fieldInput: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 14,
    color: '#f0ede6',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box'
  },
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '10px 14px',
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 10,
    fontSize: 13,
    color: '#fca5a5',
    lineHeight: 1.4
  },
  errorDot: {
    fontSize: 8,
    color: '#f87171',
    marginTop: 4,
    flexShrink: 0
  },
  submitBtn: {
    marginTop: 6,
    padding: '11px 0',
    background: '#f5c842',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    color: '#0c0b08',
    cursor: 'pointer',
    transition: 'opacity 0.15s, transform 0.1s',
    fontFamily: 'inherit',
    letterSpacing: '0.01em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 42
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    margin: '24px 0 16px'
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'rgba(255,255,255,0.07)'
  },
  dividerText: {
    fontSize: 12,
    color: 'rgba(240,237,230,0.3)',
    whiteSpace: 'nowrap'
  },
  switchBtn: {
    width: '100%',
    padding: '10px 0',
    background: 'rgba(245,200,66,0.06)',
    border: '1px solid rgba(245,200,66,0.15)',
    borderRadius: 10,
    fontSize: 13.5,
    fontWeight: 600,
    color: 'rgba(245,200,66,0.8)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s, color 0.15s'
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#f5c842',
    fontSize: 13.5,
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: 0,
    marginTop: 8
  }
}
