import { useCallback, useState } from 'react'
import { ScrollText, BookOpen, Compass } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useDailyQuests } from './useDailyQuests'
import { useCatalogQuests } from './useCatalogQuests'
import { useActiveQuests } from './useActiveQuests'
import { DailyQuestsTab } from './DailyQuestsTab'
import { CatalogTab } from './CatalogTab'
import { ActiveQuestsTab } from './ActiveQuestsTab'

export function QuestsPage() {
  const [activeTab, setActiveTab] = useState<'daily' | 'active' | 'catalog'>('daily')

  const dailyQuests = useDailyQuests()
  const catalogQuests = useCatalogQuests()
  const activeQuests = useActiveQuests()

  const reloadAll = useCallback(async () => {
    await Promise.all([dailyQuests.reload(), catalogQuests.reload(), activeQuests.reload()])
  }, [activeQuests, catalogQuests, dailyQuests])

  const handleDailyEnroll = useCallback(async (questId: string) => {
    await dailyQuests.enroll(questId)
    await reloadAll()
  }, [dailyQuests, reloadAll])

  const handleDailyAbandon = useCallback(async (questId: string) => {
    await dailyQuests.abandon(questId)
    await reloadAll()
  }, [dailyQuests, reloadAll])

  const handleCatalogEnroll = useCallback(async (definitionId: string) => {
    await catalogQuests.enroll(definitionId)
    await reloadAll()
  }, [catalogQuests, reloadAll])

  const handleCatalogAbandon = useCallback(async (enrollmentId: string) => {
    await catalogQuests.abandon(enrollmentId)
    await reloadAll()
  }, [catalogQuests, reloadAll])

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ScrollText size={22} className="text-amber-400" />
            Quest Log
          </h1>
          <p className="text-sm text-surface-400 mt-1">
            Complete quests to earn XP, eggs, and rare loot.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('daily')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'daily'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
            )}
          >
            <ScrollText size={14} />
            Daily
            {dailyQuests.activeCount > 0 && (
              <span className="ml-0.5 bg-amber-500 text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {dailyQuests.activeCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'active'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
            )}
          >
            <Compass size={14} />
            Active
            {activeQuests.activeCount > 0 && (
              <span className="ml-0.5 bg-emerald-500 text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {activeQuests.activeCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'catalog'
                ? 'bg-primary-600/20 text-primary-300 border border-primary-500/40'
                : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
            )}
          >
            <BookOpen size={14} />
            Catalog
          </button>
        </div>
      </div>

      {activeTab === 'daily' ? (
        <DailyQuestsTab
          quests={dailyQuests.quests}
          loading={dailyQuests.loading}
          activeCount={dailyQuests.activeCount}
          busyId={dailyQuests.busyId}
          onEnroll={handleDailyEnroll}
          onAbandon={handleDailyAbandon}
        />
      ) : activeTab === 'active' ? (
        <ActiveQuestsTab
          quests={activeQuests.quests}
          loading={activeQuests.loading}
          dailyBusyId={dailyQuests.busyId}
          catalogBusyId={catalogQuests.busyId}
          onAbandonDaily={handleDailyAbandon}
          onAbandonCatalog={handleCatalogAbandon}
        />
      ) : (
        <CatalogTab
          quests={catalogQuests.quests}
          loading={catalogQuests.loading}
          busyId={catalogQuests.busyId}
          onEnroll={handleCatalogEnroll}
          onAbandon={handleCatalogAbandon}
        />
      )}
    </div>
  )
}
