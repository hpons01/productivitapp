import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

const ALGO = 'aes-256-gcm'
const SALT = 'productivitapp-auth-v1'

export interface StoredAuthSession {
  userId: string
  accessToken: string
  refreshToken: string
  expiresAt: number
}

function getStorePath(): string {
  const dir = join(app.getPath('userData'), 'auth')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'session.enc')
}

function getDerivedKey(): Buffer {
  const machineId = app.getPath('userData')
  return scryptSync(machineId + SALT, SALT, 32)
}

function encrypt(plaintext: string): string {
  const key = getDerivedKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

function decrypt(data: string): string {
  const key = getDerivedKey()
  const buf = Buffer.from(data, 'base64')
  const iv = buf.subarray(0, 16)
  const tag = buf.subarray(16, 32)
  const encrypted = buf.subarray(32)
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}

export async function saveStoredSession(session: StoredAuthSession): Promise<void> {
  const encrypted = encrypt(JSON.stringify(session))
  writeFileSync(getStorePath(), encrypted, 'utf8')
}

export async function loadStoredSession(): Promise<StoredAuthSession | null> {
  const path = getStorePath()
  if (!existsSync(path)) return null

  try {
    const raw = readFileSync(path, 'utf8')
    const parsed = JSON.parse(decrypt(raw)) as Partial<StoredAuthSession>
    if (!parsed.userId || !parsed.accessToken || !parsed.refreshToken || !parsed.expiresAt) {
      return null
    }
    return {
      userId: parsed.userId,
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt
    }
  } catch {
    return null
  }
}

export async function clearStoredSession(): Promise<void> {
  const path = getStorePath()
  if (existsSync(path)) unlinkSync(path)
}
