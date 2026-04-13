import type { Api } from '../../../preload'

declare global {
  interface Window {
    api: Api
    electron: {
      ipcRenderer: {
        on: (channel: string, listener: (...args: unknown[]) => void) => void
        off: (channel: string, listener: (...args: unknown[]) => void) => void
        send: (channel: string, ...args: unknown[]) => void
        invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
      }
    }
  }
}
