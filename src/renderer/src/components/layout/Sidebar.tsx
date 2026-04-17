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
    <div className="flex flex-col w-[72px] bg-surface-800 border-r border-surface-600 py-4">
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
                  ? 'bg-primary-600/20 text-primary-400'
                  : 'text-surface-400 hover:text-white hover:bg-surface-700'
              )
            }
          >
            <Icon size={18} strokeWidth={1.8} />
            <span className="text-[9px] font-medium uppercase tracking-wide">{label}</span>
          </NavLink>
        ))}

        {/* Section divider */}
        <div
          className={cn(
            'w-10 mt-2 mb-2 rounded-md border py-1 transition-all duration-200',
            isRpgSectionActive
              ? 'border-primary-500/40 bg-primary-500/10 shadow-sm shadow-primary-600/25'
              : 'border-surface-500/70 bg-surface-700/30'
          )}
        >
          <div className="relative h-px w-full bg-gradient-to-r from-transparent via-surface-300/70 to-transparent">
            <div
              className={cn(
                'absolute inset-0 bg-gradient-to-r from-transparent via-primary-400/70 to-transparent transition-opacity duration-200',
                isRpgSectionActive ? 'opacity-100' : 'opacity-0'
              )}
            />
          </div>
          <p
            className={cn(
              'text-[8px] uppercase tracking-[0.2em] text-center mt-1 font-semibold',
              isRpgSectionActive ? 'text-primary-300' : 'text-surface-400'
            )}
          >
            RPG
          </p>
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
                  ? 'bg-primary-600/20 text-primary-400'
                  : 'text-surface-400 hover:text-white hover:bg-surface-700'
              )
            }
          >
            <Icon size={18} strokeWidth={1.8} />
            <span className="text-[9px] font-medium uppercase tracking-wide">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Level badge + XP bar */}
      <div className="flex flex-col items-center gap-2 mt-auto">
        {/* Active timer indicator */}
        {status === 'running' && (
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
            <span className="text-xs font-mono text-emerald-400 font-bold">
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Level */}
        <div className="w-8 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
          <span className="text-[10px] font-bold text-amber-400">L{level}</span>
        </div>

        {/* Mini XP bar */}
        <div className="w-7 h-0.5 bg-surface-600 rounded-full overflow-hidden">
          <div
            className="h-full xp-bar rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, xpProgress)}%` }}
          />
        </div>

        {/* Settings */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 w-12 py-2.5 rounded-xl transition-all duration-200 mt-1',
              isActive
                ? 'bg-primary-600/20 text-primary-400'
                : 'text-surface-400 hover:text-white hover:bg-surface-700'
            )
          }
        >
          <Settings size={16} strokeWidth={1.8} />
        </NavLink>
      </div>
    </div>
  )
}
