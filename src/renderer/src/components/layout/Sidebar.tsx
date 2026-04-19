import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
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

const navContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } }
}
const navItem = {
  hidden: { opacity: 0, x: -6 },
  show: { opacity: 1, x: 0, transition: { duration: 0.2 } }
}

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

const activeNavClass =
  'relative bg-primary-600/20 text-primary-400 border border-primary-600/35 ' +
  'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 ' +
  'before:h-5 before:w-0.5 before:bg-primary-400 before:rounded-r-full ' +
  'shadow-[inset_0_1px_0_var(--app-primary-dim),0_0_8px_var(--app-primary-dim)] ' +
  '[animation:runeGlow_2.5s_ease-in-out_infinite]'

const inactiveNavClass =
  'ui-fg-muted border border-transparent hover:text-[color:var(--app-text)] hover:bg-surface-600/50 hover:border-primary-600/12'

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
    <div className="app-sidebar flex flex-col w-[80px] py-4">
      {/* Core productivity nav */}
      <motion.nav
        variants={navContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center gap-1 flex-1 min-h-0 overflow-y-auto no-scrollbar"
      >
        {coreNavItems.map(({ to, icon: Icon, label, end }) => (
          <motion.div key={to} variants={navItem} className="w-full flex justify-center">
            <NavLink
              to={to}
              end={end}
              title={label}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 w-13 py-2.5 rounded-sm transition-all duration-200 group no-drag',
                  isActive ? activeNavClass : inactiveNavClass
                )
              }
            >
              <Icon size={18} strokeWidth={1.5} className="transition-transform duration-200 group-hover:scale-110" />
              <span className="text-[7.5px] font-[family:var(--font-display)] font-semibold uppercase tracking-[0.15em]">
                {label}
              </span>
            </NavLink>
          </motion.div>
        ))}

        {/* Ornamental RPG section divider */}
        <div className="w-full flex flex-col items-center my-2 py-1 gap-0.5" title="RPG Progression">
          <div className="w-10 h-px bg-gradient-to-r from-transparent via-primary-600/40 to-transparent" />
          <span
            className={cn(
              'text-[10px] font-[family:var(--font-display)] leading-none py-1 transition-colors duration-200',
              isRpgSectionActive ? 'text-amber-500/70' : 'text-amber-700/40'
            )}
          >
            ◆
          </span>
          <div className="w-10 h-px bg-gradient-to-r from-transparent via-primary-600/40 to-transparent" />
        </div>

        {/* RPG progression nav */}
        {rpgNavItems.map(({ to, icon: Icon, label }) => (
          <motion.div key={to} variants={navItem} className="w-full flex justify-center">
            <NavLink
              to={to}
              title={label}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 w-13 py-2.5 rounded-sm transition-all duration-200 group no-drag',
                  isActive ? activeNavClass : inactiveNavClass
                )
              }
            >
              <Icon size={18} strokeWidth={1.5} className="transition-transform duration-200 group-hover:scale-110" />
              <span className="text-[7.5px] font-[family:var(--font-display)] font-semibold uppercase tracking-[0.15em]">
                {label}
              </span>
            </NavLink>
          </motion.div>
        ))}
      </motion.nav>

      {/* Bottom: level frame + settings */}
      <div className="flex flex-col items-center gap-2 mt-auto pt-2">
        {/* Active timer indicator */}
        {status === 'running' && (
          <div className="w-14 rounded-sm border border-[color:var(--app-primary)]/30 bg-[color:var(--app-primary)]/10 flex items-center justify-center py-1.5 animate-pulse-glow">
            <span className="text-[10px] font-mono text-[color:var(--app-primary)] font-bold tabular-nums">
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Iron-frame portrait level badge */}
        <div
          className="relative w-14 rounded-sm border border-teal-800/40 bg-surface-800 overflow-hidden"
          title={`${Math.min(100, xpProgress).toFixed(0)}% to next level`}
          style={{ boxShadow: '0 0 10px var(--app-amber-glow)' }}
        >
          {/* Corner brackets */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-amber-600/50" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-amber-600/50" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-amber-600/30" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-amber-600/30" />

          <div className="flex flex-col items-center py-2 gap-1">
            <span className="text-[7px] font-[family:var(--font-display)] uppercase tracking-[0.2em] text-amber-600/70">
              Level
            </span>
            <span className="text-lg font-mono font-bold text-amber-400 leading-none tabular-nums">{level}</span>
            <div className="w-9 h-[4px] bg-surface-600 rounded-none overflow-hidden mt-0.5">
              <div
                className="h-full xp-bar transition-all duration-700"
                style={{ width: `${Math.min(100, xpProgress)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Settings */}
        <NavLink
          to="/settings"
          title="Forge (Settings)"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 w-13 py-2.5 rounded-sm transition-all duration-200 border no-drag',
              isActive
                ? activeNavClass
                : 'border-transparent ui-fg-muted hover:text-[color:var(--app-text)] hover:bg-surface-600/50 hover:border-primary-600/12'
            )
          }
        >
          <Settings size={16} strokeWidth={1.5} />
          <span className="text-[7.5px] font-[family:var(--font-display)] font-semibold uppercase tracking-[0.15em]">
            Forge
          </span>
        </NavLink>
      </div>
    </div>
  )
}
