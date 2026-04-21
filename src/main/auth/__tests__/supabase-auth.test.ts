import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetchJson, mockFetchText, withFakeTime } from './auth-test-utils'

vi.mock('electron', () => ({
  shell: {
    openExternal: vi.fn().mockResolvedValue(undefined)
  }
}))

vi.mock('../../db', () => ({
  getDb: vi.fn(() => ({}))
}))

vi.mock('../../db/queries/users.queries', () => ({
  upsertUser: vi.fn(),
  getUserById: vi.fn()
}))

vi.mock('../../db/queries/eventlog.queries', () => ({
  logEvent: vi.fn()
}))

vi.mock('../token-store', () => ({
  saveStoredSession: vi.fn().mockResolvedValue(undefined),
  loadStoredSession: vi.fn().mockResolvedValue(null),
  clearStoredSession: vi.fn().mockResolvedValue(undefined)
}))

import { shell } from 'electron'
import { logEvent } from '../../db/queries/eventlog.queries'
import { getUserById, upsertUser } from '../../db/queries/users.queries'
import { clearStoredSession, loadStoredSession, saveStoredSession } from '../token-store'
import { beginGoogleOAuth, completeOAuthFromCallback, restoreSession, _testResetAuthState } from '../supabase-auth'

function extractStateFromAuthorizeUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl)
  const state = parsed.searchParams.get('state')
  if (!state) {
    throw new Error('Expected state param in authorize url')
  }
  return state
}

beforeEach(() => {
  process.env.SUPABASE_URL = 'https://demo.supabase.co'
  process.env.SUPABASE_ANON_KEY = 'anon-key'
  process.env.AUTH_REDIRECT_URI = 'productivitapp://auth/callback'
  _testResetAuthState()
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('supabase-auth PKCE', () => {
  it('rejects callback when state is expired', async () => {
    withFakeTime(Date.UTC(2026, 0, 1, 0, 0, 0))

    await beginGoogleOAuth()
    const openExternal = vi.mocked(shell.openExternal)
    const authorizeUrl = openExternal.mock.calls[0]?.[0]
    expect(authorizeUrl).toBeTruthy()

    const state = extractStateFromAuthorizeUrl(String(authorizeUrl))

    vi.setSystemTime(Date.UTC(2026, 0, 1, 0, 11, 0))

    await expect(
      completeOAuthFromCallback(`productivitapp://auth/callback?code=fake-code&state=${state}`)
    ).rejects.toThrow('invalid or expired')

    expect(fetch).not.toHaveBeenCalled()
    expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'auth_login_failure', 'auth', null, expect.any(Object))
  })

  it('rejects callback when required params are missing', async () => {
    await expect(completeOAuthFromCallback('productivitapp://auth/callback?state=abc')).rejects.toThrow(
      'missing required code/state parameters'
    )

    expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'auth_login_failure', 'auth', null, expect.any(Object))
  })
})

describe('supabase-auth refresh behavior', () => {
  it('returns unauthenticated when there is no stored session', async () => {
    vi.mocked(loadStoredSession).mockResolvedValueOnce(null)

    const session = await restoreSession()

    expect(session.authenticated).toBe(false)
    expect(session.user).toBeNull()
    expect(session.profileCompleted).toBe(false)
  })

  it('skips refresh when token is still valid', async () => {
    vi.mocked(loadStoredSession).mockResolvedValue({
      userId: 'u_1',
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: Date.now() + 5 * 60 * 1000
    })

    vi.mocked(getUserById).mockReturnValue({
      id: 'u_1',
      provider: 'google',
      provider_user_id: 'u_1',
      email: 'test@example.com',
      display_name: 'Test User',
      avatar_url: null,
      created_at: Date.now(),
      updated_at: Date.now(),
      last_login_at: Date.now()
    })

    vi.stubGlobal('fetch', mockFetchJson([]))

    const session = await restoreSession()

    expect(session.authenticated).toBe(true)
    expect(session.profileCompleted).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toContain('/rest/v1/profiles')
  })

  it('refreshes and persists session when token is near expiry', async () => {
    vi.mocked(loadStoredSession).mockResolvedValueOnce({
      userId: 'u_2',
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: Date.now() + 30 * 1000
    })

    vi.stubGlobal(
      'fetch',
      mockFetchJson({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: 3600,
        user: {
          id: 'u_2',
          email: 'refresh@example.com',
          app_metadata: { provider: 'google' },
          user_metadata: { full_name: 'Refresh User' }
        }
      })
    )

    const session = await restoreSession()

    expect(session.authenticated).toBe(true)
    expect(session.profileCompleted).toBe(false)
    expect(vi.mocked(upsertUser)).toHaveBeenCalled()
    expect(vi.mocked(saveStoredSession)).toHaveBeenCalled()
    expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'auth_session_refreshed', 'auth', 'u_2', expect.any(Object))
  })

  it('clears session when refresh fails', async () => {
    vi.mocked(loadStoredSession).mockResolvedValueOnce({
      userId: 'u_3',
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: Date.now() + 30 * 1000
    })

    vi.stubGlobal('fetch', mockFetchText('refresh failed', 401))

    const session = await restoreSession()

    expect(session.authenticated).toBe(false)
    expect(session.profileCompleted).toBe(false)
    expect(vi.mocked(clearStoredSession)).toHaveBeenCalled()
    expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'auth_session_refresh_failed', 'auth', 'u_3', expect.any(Object))
  })
})
