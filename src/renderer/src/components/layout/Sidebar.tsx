import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Sunrise,
  CheckSquare,
  Timer,
  ListTodo,
  Zap,
  BarChart3,
  BookOpen,
  Settings,
  Trophy,
  Package
} from 'lucide-react'
import { useGamificationStore } from '../../stores/gamification.store'
import { usePomodoroStore } from '../../stores/pomodoro.store'
import { cn } from '../../lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/journal', icon: Sunrise, label: 'Ritual' },
  { to: '/habits', icon: CheckSquare, label: 'Habits' },
  { to: '/pomodoro', icon: Timer, label: 'Focus' },
  { to: '/tasks', icon: ListTodo, label: 'Tasks' },
  { to: '/energy', icon: Zap, label: 'Energy' },
  { to: '/analytics', icon: Trophy, label: 'Progress' },
  { to: '/inventory', icon: Package, label: 'Loot' }
]

export function Sidebar() {
  const { level, totalXP, xpToNextLevel } = useGamificationStore()
  const { status, timeLeft } = usePomodoroStore()
  const location = useLocation()

  const xpForCurrentLevel = Math.pow(level, 2) * 10
  const xpForNextLevel = Math.pow(level + 1, 2) * 10
  const xpProgress = ((totalXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100

  return (
    <div className="flex flex-col w-[72px] bg-surface-800 border-r border-surface-600 py-4">
      {/* Logo */}
      <div className="flex items-center justify-center mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center font-bold text-sm text-white shadow-lg">
          P
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {navItems.map(({ to, icon: Icon, label, end }) => (
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
      </nav>

      {/* Level badge + XP bar */}
      <div className="flex flex-col items-center gap-2 mt-auto px-2">
        {/* Active timer indicator */}
        {status === 'running' && (
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
            <span className="text-xs font-mono text-emerald-400 font-bold">
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Level */}
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
          <span className="text-xs font-bold text-amber-400">L{level}</span>
        </div>

        {/* Mini XP bar */}
        <div className="w-8 h-1 bg-surface-600 rounded-full overflow-hidden">
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
