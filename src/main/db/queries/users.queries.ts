import Database from 'better-sqlite3'

export interface UserRecord {
  id: string
  provider: string
  provider_user_id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  profile_completed_at: number | null
  profile_last_synced_at: number | null
  remote_updated_at: number | null
  created_at: number
  updated_at: number
  last_login_at: number
}

export interface UpsertUserInput {
  id: string
  provider: string
  providerUserId: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
  timestamp: number
}

export function upsertUser(db: Database.Database, input: UpsertUserInput): UserRecord {
  db.prepare(`
    INSERT INTO users (
      id,
      provider,
      provider_user_id,
      email,
      display_name,
      avatar_url,
      created_at,
      updated_at,
      last_login_at
    )
    VALUES (
      @id,
      @provider,
      @provider_user_id,
      @email,
      @display_name,
      @avatar_url,
      @timestamp,
      @timestamp,
      @timestamp
    )
    ON CONFLICT(id) DO UPDATE SET
      provider = excluded.provider,
      provider_user_id = excluded.provider_user_id,
      email = excluded.email,
      display_name = excluded.display_name,
      avatar_url = excluded.avatar_url,
      updated_at = excluded.updated_at,
      last_login_at = excluded.last_login_at
  `).run({
    id: input.id,
    provider: input.provider,
    provider_user_id: input.providerUserId,
    email: input.email,
    display_name: input.displayName,
    avatar_url: input.avatarUrl,
    timestamp: input.timestamp
  })

  return db.prepare('SELECT * FROM users WHERE id = ?').get(input.id) as UserRecord
}

export function getUserById(db: Database.Database, userId: string): UserRecord | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRecord | undefined
}

export function updateUserProfile(
  db: Database.Database,
  userId: string,
  data: {
    email?: string | null
    displayName?: string | null
    avatarUrl?: string | null
    profileLastSyncedAt?: number | null
    remoteUpdatedAt?: number | null
    profileCompletedAt?: number | null
  }
): UserRecord {
  db.prepare(`
    UPDATE users
    SET
      email = COALESCE(@email, email),
      display_name = COALESCE(@display_name, display_name),
      avatar_url = COALESCE(@avatar_url, avatar_url),
      profile_last_synced_at = COALESCE(@profile_last_synced_at, profile_last_synced_at),
      remote_updated_at = COALESCE(@remote_updated_at, remote_updated_at),
      profile_completed_at = COALESCE(@profile_completed_at, profile_completed_at),
      updated_at = @updated_at
    WHERE id = @id
  `).run({
    id: userId,
    email: data.email,
    display_name: data.displayName,
    avatar_url: data.avatarUrl,
    profile_last_synced_at: data.profileLastSyncedAt,
    remote_updated_at: data.remoteUpdatedAt,
    profile_completed_at: data.profileCompletedAt,
    updated_at: Date.now()
  })

  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRecord
}

export function markProfileCompleted(db: Database.Database, userId: string, completedAt = Date.now()): UserRecord {
  db.prepare(`
    UPDATE users
    SET profile_completed_at = ?, updated_at = ?
    WHERE id = ?
  `).run(completedAt, completedAt, userId)

  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRecord
}
