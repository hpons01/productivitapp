import * as Slider from '@radix-ui/react-slider'
import { Volume2, VolumeX } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAmbientSound, AmbientMode } from '../../hooks/useAmbientSound'

const MODES: { id: AmbientMode; label: string; emoji: string }[] = [
  { id: 'rain', label: 'Rain', emoji: '🌧' },
  { id: 'cafe', label: 'Café', emoji: '☕' },
  { id: 'whitenoise', label: 'White Noise', emoji: '〰' }
]

export function AmbientSoundPlayer() {
  const { active, volume, play, stop, setVolume } = useAmbientSound()

  function handleModeClick(mode: AmbientMode) {
    if (active === mode) {
      stop()
    } else {
      play(mode)
    }
  }

  return (
    <div className="space-y-3">
      {/* Mode buttons */}
      <div className="flex gap-2">
        {MODES.map(({ id, label, emoji }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => handleModeClick(id)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-xs font-medium transition-all',
                isActive
                  ? 'bg-primary-600/30 border-primary-500/60 text-primary-300'
                  : 'bg-surface-800/40 border-surface-600/30 text-surface-400 hover:border-surface-400/50 hover:text-surface-200'
              )}
            >
              <span className="text-base">{emoji}</span>
              <span>{label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
              )}
            </button>
          )
        })}
      </div>

      {/* Volume slider */}
      <div className="flex items-center gap-3">
        {active ? (
          <Volume2 size={14} className="text-surface-400 shrink-0" />
        ) : (
          <VolumeX size={14} className="text-surface-500 shrink-0" />
        )}
        <Slider.Root
          className="relative flex items-center select-none touch-none w-full h-4"
          min={0}
          max={0.2}
          step={0.001}  
          value={[volume]}
          onValueChange={([v]) => setVolume(v)}
          aria-label="Volume"
        >
          <Slider.Track className="bg-surface-700 relative grow rounded-full h-1">
            <Slider.Range className="absolute bg-primary-500 rounded-full h-full" />
          </Slider.Track>
          <Slider.Thumb className="block w-3 h-3 rounded-full bg-[color:var(--app-interactive-fg-default)] shadow-md hover:bg-[color:var(--app-icon-hover)] focus:outline-none focus:ring-2 focus:ring-[color:var(--app-primary-glow)]" />
        </Slider.Root>
        <span className="text-[10px] text-surface-500 w-7 text-right shrink-0">
          {Math.round((volume * 100)/0.2)}%
        </span>
      </div>

      {active && (
        <p className="text-[10px] text-surface-500 text-center">
          Click the active sound again to stop
        </p>
      )}
    </div>
  )
}
