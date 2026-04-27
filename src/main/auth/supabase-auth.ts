import { randomBytes, createHash, randomUUID } from 'crypto'
import { shell } from 'electron'
import { getDb } from '../db'
import { logEvent } from '../db/queries/eventlog.queries'
import { getUserById, markProfileCompleted, updateUserProfile, upsertUser } from '../db/queries/users.queries'
import { clearStoredSession, loadStoredSession, saveStoredSession } from './token-store'

interface RemoteProfileRecord {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  provider: string | null
  updated_at: string | null
}

interface SupabaseTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user?: {
    id: string
    email?: string
    app_metadata?: {
      provider?: string
      providers?: string[]
    }
    user_metadata?: {
      full_name?: string
      name?: string
      avatar_url?: string
    }
  }
}

interface PkceState {
  codeVerifier: string
  createdAt: number
}

export interface AuthUser {
  id: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
  provider: string
}

export interface PublicAuthSession {
  authenticated: boolean
  user: AuthUser | null
  expiresAt: number | null
  profileCompleted: boolean
}

const pendingPkce = new Map<string, PkceState>()
const PKCE_STATE_TTL_MS = 10 * 60 * 1000
const REFRESH_BUFFER_MS = 60 * 1000

let authSessionListener: ((session: PublicAuthSession) => void) | null = null

function logAuthEvent(eventType: string, sourceId: string | null, metadata: Record<string, unknown> | null = null): void {
  try {
    const db = getDb()
    logEvent(db, eventType, 'auth', sourceId, metadata)
  } catch {
    // Keep auth flow resilient even if analytics logging fails.
  }
}

function toBase64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function getSupabaseConfig(): { url: string; anonKey: string; redirectUri: string } {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
  const redirectUri = process.env.AUTH_REDIRECT_URI ?? 'productivitapp://auth/callback'

  if (!url || !anonKey) {
    throw new Error('Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_ANON_KEY.')
  }

  return { url, anonKey, redirectUri }
}

function parseRemoteUpdatedAt(raw: string | null): number | null {
  if (!raw) return null
  const parsed = Date.parse(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function buildPublicSession(
  user: AuthUser | null,
  expiresAt: number | null,
  profileCompleted: boolean
): PublicAuthSession {
  return {
    authenticated: Boolean(user),
    user,
    expiresAt,
    profileCompleted
  }
}

function toPublicUser(record: {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  provider: string
}): AuthUser {
  return {
    id: record.id,
    email: record.email,
    displayName: record.display_name,
    avatarUrl: record.avatar_url,
    provider: record.provider
  }
}

async function fetchRemoteProfile(accessToken: string, userId: string): Promise<RemoteProfileRecord | null> {
  const { url, anonKey } = getSupabaseConfig()
  const response = await fetch(
    `${url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,email,display_name,avatar_url,provider,updated_at&limit=1`,
    {
      method: 'GET',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`
      }
    }
  )

  if (!response.ok) {
    throw new Error(`Profile fetch failed: ${response.statusText}`)
  }

  const rows = (await response.json()) as RemoteProfileRecord[]
  return rows[0] ?? null
}

async function updateRemoteProfile(
  accessToken: string,
  userId: string,
  payload: { displayName?: string | null; avatarUrl?: string | null; email?: string | null }
): Promise<RemoteProfileRecord | null> {
  const { url, anonKey } = getSupabaseConfig()
  const response = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      display_name: payload.displayName,
      avatar_url: payload.avatarUrl,
      email: payload.email
    })
  })

  if (!response.ok) {
    throw new Error(`Profile update failed: ${response.statusText}`)
  }

  const rows = (await response.json()) as RemoteProfileRecord[]
  return rows[0] ?? null
}

async function revokeRemoteSessions(accessToken: string): Promise<void> {
  const { url, anonKey } = getSupabaseConfig()
  const response = await fetch(`${url}/auth/v1/logout?scope=global`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    throw new Error(`Remote sign-out failed: ${response.statusText}`)
  }
}

async function requestRemoteDeletion(accessToken: string): Promise<void> {
  const { url, anonKey } = getSupabaseConfig()
  const response = await fetch(`${url}/functions/v1/delete-user-account`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Account deletion failed: ${details || response.statusText}`)
  }
}

function createPkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = toBase64Url(randomBytes(64))
  const codeChallenge = toBase64Url(createHash('sha256').update(codeVerifier).digest())
  return { codeVerifier, codeChallenge }
}

function toAuthUser(tokenResponse: SupabaseTokenResponse): AuthUser {
  const provider =
    tokenResponse.user?.app_metadata?.provider ??
    tokenResponse.user?.app_metadata?.providers?.[0] ??
    'email'

  return {
    id: tokenResponse.user?.id ?? '',
    email: tokenResponse.user?.email ?? null,
    displayName: tokenResponse.user?.user_metadata?.full_name ?? tokenResponse.user?.user_metadata?.name ?? null,
    avatarUrl: tokenResponse.user?.user_metadata?.avatar_url ?? null,
    provider
  }
}

function prunePkceStates(): void {
  const now = Date.now()
  for (const [state, value] of pendingPkce.entries()) {
    if (now - value.createdAt > PKCE_STATE_TTL_MS) {
      pendingPkce.delete(state)
    }
  }
}

async function exchangeCodeForSession(code: string, codeVerifier: string): Promise<SupabaseTokenResponse> {
  const { url, anonKey, redirectUri } = getSupabaseConfig()
  const response = await fetch(`${url}/auth/v1/token?grant_type=pkce`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      auth_code: code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri
    })
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`OAuth exchange failed: ${details || response.statusText}`)
  }

  return (await response.json()) as SupabaseTokenResponse
}

async function refreshSession(refreshToken: string): Promise<SupabaseTokenResponse> {
  const { url, anonKey } = getSupabaseConfig()
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refresh_token: refreshToken })
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Session refresh failed: ${details || response.statusText}`)
  }

  return (await response.json()) as SupabaseTokenResponse
}

const SYNCED_TABLES = [
  'habits', 'habit_completions', 'habit_micro_checkins', 'habit_lapse_reflections',
  'tasks', 'pomodoro_sessions', 'pomodoro_presets', 'journal_entries', 'energy_logs',
  'xp_log', 'badges', 'boss_battles', 'daily_quests', 'quest_enrollments', 'quest_outcomes',
  'catalog_enrollments', 'pets', 'pet_eggs', 'pet_xp_log', 'focus_log',
  'shop_purchases', 'loot_inventory', 'settings'
] as const

function clearLocalDataForAccountSwitch(db: ReturnType<typeof getDb>): void {
  db.pragma('foreign_keys = OFF')
  db.transaction(() => {
    for (const table of SYNCED_TABLES) {
      db.prepare(`DELETE FROM ${table}`).run()
    }
  })()
  db.pragma('foreign_keys = ON')
}

async function persistSession(tokenResponse: SupabaseTokenResponse): Promise<PublicAuthSession> {
  const user = toAuthUser(tokenResponse)
  if (!user.id || !tokenResponse.access_token || !tokenResponse.refresh_token) {
    throw new Error('Supabase session response was incomplete.')
  }

  const now = Date.now()
  const expiresAt = now + tokenResponse.expires_in * 1000
  const db = getDb()

  const previousSession = await loadStoredSession()
  if (previousSession?.userId && previousSession.userId !== user.id) {
    clearLocalDataForAccountSwitch(db)
  }

  upsertUser(db, {
    id: user.id,
    provider: user.provider,
    providerUserId: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    timestamp: now
  })

  await saveStoredSession({
    userId: user.id,
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresAt
  })

  const userRecord = getUserById(db, user.id)
  const publicSession = buildPublicSession(user, expiresAt, Boolean(userRecord?.profile_completed_at))

  emitAuthSession(publicSession)
  return publicSession
}

async function bootstrapRemoteProfile(stored: { userId: string; accessToken: string; expiresAt: number }): Promise<PublicAuthSession | null> {
  const db = getDb()
  const localUser = getUserById(db, stored.userId)
  if (!localUser) return null

  try {
    const remoteProfile = await fetchRemoteProfile(stored.accessToken, stored.userId)
    if (!remoteProfile) {
      return buildPublicSession(toPublicUser(localUser), stored.expiresAt, Boolean(localUser.profile_completed_at))
    }

    const remoteUpdatedAt = parseRemoteUpdatedAt(remoteProfile.updated_at)
    const shouldApplyRemote = !localUser.remote_updated_at || (remoteUpdatedAt !== null && remoteUpdatedAt >= localUser.remote_updated_at)

    if (shouldApplyRemote) {
      updateUserProfile(db, stored.userId, {
        email: remoteProfile.email,
        displayName: remoteProfile.display_name,
        avatarUrl: remoteProfile.avatar_url,
        remoteUpdatedAt,
        profileLastSyncedAt: Date.now(),
        profileCompletedAt: localUser.profile_completed_at ?? (remoteProfile.display_name ? Date.now() : null)
      })
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Profile bootstrap failed')
    logAuthEvent('auth_profile_bootstrap_failed', stored.userId, { message: err.message })
  }

  const refreshedUser = getUserById(db, stored.userId)
  if (!refreshedUser) return null
  return buildPublicSession(toPublicUser(refreshedUser), stored.expiresAt, Boolean(refreshedUser.profile_completed_at))
}

function emitAuthSession(session: PublicAuthSession): void {
  authSessionListener?.(session)
}

export function setAuthSessionListener(listener: (session: PublicAuthSession) => void): void {
  authSessionListener = listener
}

export async function beginGoogleOAuth(): Promise<void> {
  prunePkceStates()
  const state = randomUUID()
  const { codeVerifier, codeChallenge } = createPkcePair()
  const { url, redirectUri } = getSupabaseConfig()

  pendingPkce.set(state, {
    codeVerifier,
    createdAt: Date.now()
  })

  const authorizeUrl = new URL(`${url}/auth/v1/authorize`)
  authorizeUrl.searchParams.set('provider', 'google')
  authorizeUrl.searchParams.set('redirect_to', redirectUri)
  authorizeUrl.searchParams.set('code_challenge', codeChallenge)
  authorizeUrl.searchParams.set('code_challenge_method', 'S256')
  authorizeUrl.searchParams.set('state', state)

  await shell.openExternal(authorizeUrl.toString())
}

export async function completeOAuthFromCallback(callbackUrl: string): Promise<PublicAuthSession> {
  try {
    const parsed = new URL(callbackUrl)
    const authCode = parsed.searchParams.get('code')
    const state = parsed.searchParams.get('state')
    const error = parsed.searchParams.get('error')

    if (error) {
      throw new Error(`OAuth provider returned an error: ${error}`)
    }
    if (!authCode || !state) {
      throw new Error('OAuth callback is missing required code/state parameters.')
    }

    prunePkceStates()
    const pending = pendingPkce.get(state)
    pendingPkce.delete(state)
    if (!pending) {
      throw new Error('OAuth callback state is invalid or expired.')
    }

    const tokenResponse = await exchangeCodeForSession(authCode, pending.codeVerifier)
    const session = await persistSession(tokenResponse)
    logAuthEvent('auth_login_success', session.user?.id ?? null, {
      provider: session.user?.provider ?? null,
      email: session.user?.email ?? null
    })
    return session
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown auth callback error')
    logAuthEvent('auth_login_failure', null, {
      message: err.message
    })
    throw err
  }
}

export async function getCurrentSession(): Promise<PublicAuthSession> {
  const stored = await loadStoredSession()
  if (!stored) {
    return {
      authenticated: false,
      user: null,
      expiresAt: null,
      profileCompleted: false
    }
  }

  const db = getDb()
  const userRecord = getUserById(db, stored.userId)

  if (!userRecord) {
    await clearStoredSession()
    return {
      authenticated: false,
      user: null,
      expiresAt: null,
      profileCompleted: false
    }
  }

  return buildPublicSession(toPublicUser(userRecord), stored.expiresAt, Boolean(userRecord.profile_completed_at))
}

export async function restoreSession(): Promise<PublicAuthSession> {
  const stored = await loadStoredSession()
  if (!stored) {
    const anonymousSession = buildPublicSession(null, null, false)
    emitAuthSession(anonymousSession)
    return anonymousSession
  }

  if (stored.expiresAt > Date.now() + REFRESH_BUFFER_MS) {
    const bootstrapped = await bootstrapRemoteProfile(stored)
    const current = bootstrapped ?? (await getCurrentSession())
    emitAuthSession(current)
    return current
  }

  try {
    const refreshed = await refreshSession(stored.refreshToken)
    const session = await persistSession(refreshed)
    const bootstrapped = await bootstrapRemoteProfile({
      userId: refreshed.user?.id ?? stored.userId,
      accessToken: refreshed.access_token,
      expiresAt: session.expiresAt ?? stored.expiresAt
    })
    const finalSession = bootstrapped ?? session
    logAuthEvent('auth_session_refreshed', session.user?.id ?? stored.userId, {
      provider: session.user?.provider ?? null,
      email: session.user?.email ?? null
    })
    emitAuthSession(finalSession)
    return finalSession
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown session refresh error')
    logAuthEvent('auth_session_refresh_failed', stored.userId, {
      message: err.message
    })
    await clearStoredSession()
    const anonymousSession = buildPublicSession(null, null, false)
    emitAuthSession(anonymousSession)
    return anonymousSession
  }
}

export async function signOut(): Promise<void> {
  const stored = await loadStoredSession()
  await clearStoredSession()
  logAuthEvent('auth_logout', stored?.userId ?? null)
  emitAuthSession(buildPublicSession(null, null, false))
}

export async function getProfile(): Promise<{ user: AuthUser | null; profileCompleted: boolean }> {
  const session = await getCurrentSession()
  return {
    user: session.user,
    profileCompleted: session.profileCompleted
  }
}

export async function completeProfile(displayName: string): Promise<PublicAuthSession> {
  const stored = await loadStoredSession()
  if (!stored) {
    throw new Error('Not authenticated.')
  }

  const db = getDb()
  const local = getUserById(db, stored.userId)
  if (!local) {
    throw new Error('User record not found.')
  }

  const remote = await updateRemoteProfile(stored.accessToken, stored.userId, {
    displayName,
    email: local.email,
    avatarUrl: local.avatar_url
  })

  updateUserProfile(db, stored.userId, {
    displayName,
    profileLastSyncedAt: Date.now(),
    remoteUpdatedAt: parseRemoteUpdatedAt(remote?.updated_at ?? null)
  })
  const updated = markProfileCompleted(db, stored.userId)
  const session = buildPublicSession(toPublicUser(updated), stored.expiresAt, true)
  emitAuthSession(session)
  return session
}

export async function updateProfile(input: {
  displayName?: string | null
  avatarUrl?: string | null
  email?: string | null
}): Promise<PublicAuthSession> {
  const stored = await loadStoredSession()
  if (!stored) {
    throw new Error('Not authenticated.')
  }

  const db = getDb()
  const local = getUserById(db, stored.userId)
  if (!local) {
    throw new Error('User record not found.')
  }

  const remote = await updateRemoteProfile(stored.accessToken, stored.userId, input)
  const updated = updateUserProfile(db, stored.userId, {
    email: input.email,
    displayName: input.displayName,
    avatarUrl: input.avatarUrl,
    profileLastSyncedAt: Date.now(),
    remoteUpdatedAt: parseRemoteUpdatedAt(remote?.updated_at ?? null),
    profileCompletedAt: local.profile_completed_at ?? (input.displayName ? Date.now() : null)
  })

  const session = buildPublicSession(
    toPublicUser(updated),
    stored.expiresAt,
    Boolean(updated.profile_completed_at)
  )
  emitAuthSession(session)
  return session
}

export async function signOutAllDevices(): Promise<void> {
  const stored = await loadStoredSession()
  if (stored) {
    await revokeRemoteSessions(stored.accessToken)
    logAuthEvent('auth_sign_out_all_devices', stored.userId)
  }
  await clearStoredSession()
  emitAuthSession(buildPublicSession(null, null, false))
}

export async function signInWithEmail(email: string, password: string): Promise<PublicAuthSession> {
  const { url, anonKey } = getSupabaseConfig()
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  })

  if (!response.ok) {
    const details = await response.json().catch(() => ({})) as { error_description?: string; message?: string }
    throw new Error(details.error_description ?? details.message ?? 'Sign in failed.')
  }

  const tokenResponse = (await response.json()) as SupabaseTokenResponse
  const session = await persistSession(tokenResponse)
  logAuthEvent('auth_login_success', session.user?.id ?? null, {
    provider: 'email',
    email: session.user?.email ?? null
  })
  return session
}

export async function signUpWithEmail(email: string, password: string): Promise<PublicAuthSession> {
  const { url, anonKey } = getSupabaseConfig()
  const response = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  })

  const rawText = await response.text()
  console.log('[Auth] signUpWithEmail response status:', response.status)

  let body: Record<string, unknown> = {}
  try { body = JSON.parse(rawText) } catch { /* not json */ }

  if (!response.ok || body['error'] || body['error_description'] || body['msg']) {
    const msg =
      (body['error_description'] as string | undefined) ??
      (body['message'] as string | undefined) ??
      (body['msg'] as string | undefined) ??
      (body['error'] as string | undefined) ??
      `Sign up failed (${response.status}).`
    throw new Error(msg)
  }

  const tokenResponse = body as unknown as SupabaseTokenResponse

  if (!tokenResponse.access_token) {
    // Email confirmation required — Supabase returned 200 with no token
    return {
      authenticated: false,
      user: null,
      expiresAt: null,
      profileCompleted: false
    }
  }

  const session = await persistSession(tokenResponse)
  logAuthEvent('auth_signup_success', session.user?.id ?? null, {
    provider: 'email',
    email: session.user?.email ?? null
  })
  return session
}

export async function deleteAccount(): Promise<void> {
  const stored = await loadStoredSession()
  if (!stored) {
    throw new Error('Not authenticated.')
  }

  await requestRemoteDeletion(stored.accessToken)
  const db = getDb()
  db.prepare('DELETE FROM users WHERE id = ?').run(stored.userId)
  await clearStoredSession()
  logAuthEvent('auth_account_deleted', stored.userId)
  emitAuthSession(buildPublicSession(null, null, false))
}

export function _testResetAuthState(): void {
  pendingPkce.clear()
  authSessionListener = null
}
