import { vi } from 'vitest'

export function mockFetchJson(payload: unknown, ok = true, status = 200): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Bad Request',
    json: async () => payload,
    text: async () => JSON.stringify(payload)
  })
}

export function mockFetchText(message: string, status = 400): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText: 'Bad Request',
    json: async () => ({ error: message }),
    text: async () => message
  })
}

export function withFakeTime(epochMs: number): void {
  vi.useFakeTimers()
  vi.setSystemTime(epochMs)
}
