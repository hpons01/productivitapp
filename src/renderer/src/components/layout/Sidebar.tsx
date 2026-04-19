import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Sunrise,
  CheckSquare,
  Timer,
  ListTodo,
  ScrollText,
  Zap,
  Settings,
  Trophy,
  Package,
  Heart,
  ShoppingBag
} from 'lucide-react'
import { useGamificationStore } from '../../stores/gamification.store'
import { usePomodoroStore } from '../../stores/pomodoro.store'
import { cn } from '../../lib/utils'

const coreNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/journal', icon: Sunrise, label: 'Ritual' },
  { to: '/habits', icon: CheckSquare, label: 'Habits' },
  { to: '/pomodoro', icon: Timer, label: 'Focus' },
  { to: '/tasks', icon: ListTodo, label: 'Tasks' },
  { to: '/energy', icon: Zap, label: 'Energy' }
]

const rpgNavItems = [
  { to: '/quests', icon: ScrollText, label: 'Quests' },
  { to: '/shop', icon: ShoppingBag, label: 'Shop' },
  { to: '/analytics', icon: Trophy, label: 'Profile' },
  { to: '/inventory', icon: Package, label: 'Loot' },
  { to: '/pets', icon: Heart, label: 'Pets' }
]

export function Sidebar() {
  const { level, totalXP } = useGamificationStore()
  const { status, timeLeft } = usePomodoroStore()
  const location = useLocation()

  const xpForCurrentLevel = Math.pow(level, 2) * 10
  const xpForNextLevel = Math.pow(level + 1, 2) * 10
  const xpProgress = ((totalXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100
  const isRpgSectionActive = rpgNavItems.some(
    ({ to }) => location.pathname === to || location.pathname.startsWith(`${to}/`)
  )

  return (
    <div className="app-sidebar flex flex-col w-[72px] py-4">
      {/* Core productivity nav */}
      <nav className="flex flex-col items-center gap-1 flex-1 min-h-0 overflow-y-auto no-scrollbar">
        {coreNavItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 w-12 py-2.5 rounded-xl transition-all duration-200 group no-drag',
                isActive
                  ? 'bg-primary-600/15 text-primary-400 shadow-[inset_0_0_0_1px_var(--app-primary-glow)] ui-glow-inset'
                  : 'ui-fg-muted hover:text-[color:var(--app-text)] hover:bg-surface-700/60'
              )
            }
          >
            <Icon size={16} strokeWidth={1.8} className="transition-transform duration-200 group-hover:scale-110" />
            <span className="text-[8.5px] font-semibold uppercase tracking-[0.12em] font-ui">{label}</span>
          </NavLink>
        ))}

        {/* Section divider */}
        <div className="w-full flex flex-col items-center my-1 py-2 gap-1.5">
          <div
            className={cn(
              'w-8 h-px transition-all duration-300',
              isRpgSectionActive
                ? 'bg-gradient-to-r from-transparent via-primary-400/60 to-transparent'
                : 'bg-gradient-to-r from-transparent via-surface-500/50 to-transparent'
            )}
          />
          <span
            className={cn(
              'text-[7.5px] font-ui font-semibold uppercase tracking-[0.18em] transition-colors duration-200',
              isRpgSectionActive ? 'text-primary-400/80' : 'text-surface-500'
            )}
          >
            RPG
          </span>
          <div
            className={cn(
              'w-8 h-px transition-all duration-300',
              isRpgSectionActive
                ? 'bg-gradient-to-r from-transparent via-primary-400/60 to-transparent'
                : 'bg-gradient-to-r from-transparent via-surface-500/50 to-transparent'
            )}
          />
        </div>

        {/* RPG progression nav */}
        {rpgNavItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 w-12 py-2.5 rounded-xl transition-all duration-200 group no-drag',
                isActive
                  ? 'bg-primary-600/15 text-primary-400 shadow-[inset_0_0_0_1px_var(--app-primary-glow)] ui-glow-inset'
                  : 'ui-fg-muted hover:text-[color:var(--app-text)] hover:bg-surface-700/60'
              )
            }
          >
            <Icon size={16} strokeWidth={1.8} className="transition-transform duration-200 group-hover:scale-110" />
            <span className="text-[8.5px] font-semibold uppercase tracking-[0.12em] font-ui">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Level badge + XP bar + Settings */}
      <div className="flex flex-col items-center gap-2 mt-auto pt-2">
        {/* Active timer indicator */}
        {status === 'running' && (
          <div className="w-11 rounded-xl bg-emerald-600/15 border border-emerald-500/25 flex items-center justify-center py-1.5">
            <span className="text-[10px] font-ui text-emerald-400 font-bold tabular-nums">
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Level glass mini-card */}
        <div className="w-11 rounded-xl ui-glass flex flex-col items-center gap-1 py-2">
          <span className="text-[9px] font-ui font-semibold text-amber-400/80 uppercase tracking-widest">LVL</span>
          <span className="text-sm font-bold font-ui text-amber-400 leading-none tabular-nums">{level}</span>
          <div className="w-7 h-0.5 bg-surface-600 rounded-full overflow-hidden mt-0.5">
            <div
              className="h-full xp-bar rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, xpProgress)}%` }}
            />
          </div>
        </div>

        {/* Settings */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 w-12 py-2.5 rounded-xl transition-all duration-200 mt-1',
              isActive
                ? 'bg-primary-600/15 text-primary-400'
                : 'ui-fg-muted hover:text-[color:var(--app-text)] hover:bg-surface-700/60'
            )
          }
        >
          <Settings size={15} strokeWidth={1.8} />
        </NavLink>
      </div>
    </div>
  )
}
