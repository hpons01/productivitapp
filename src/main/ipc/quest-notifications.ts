import { BrowserWindow } from 'electron'
import type { QuestProgressResult } from '../db/queries/quests.queries'

function toTitleCase(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Emits a quest:completed IPC event to all renderer windows for any results
 * that have status === 'completed'. Provide questType (e.g. 'pomodoros') as
 * a human-readable label for the toast when a resolved title isn't available.
 */
export function emitQuestCompleted(
  title: string,
  xpAwarded: number,
  focusAwarded: number
): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    win.webContents.send('quest:completed', { title, xpAwarded, focusAwarded })
  }
}

/**
 * Emits quest completion toasts from quest progress results.
 */
export function emitQuestCompletions(
  results: QuestProgressResult[],
  questType?: string
): void {
  const completed = results.filter((r) => r.status === 'completed')
  if (!completed.length) return

  const label = questType ? toTitleCase(questType) : 'Quest'
  for (const result of completed) {
    emitQuestCompleted(label, result.completionXpAwarded, result.focusAwarded)
  }
}
