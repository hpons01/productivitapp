import { useRef, useState, useCallback, useEffect } from 'react'

export type AmbientMode = 'rain' | 'cafe' | 'whitenoise'

interface AmbientSoundHook {
  active: AmbientMode | null
  volume: number
  play: (mode: AmbientMode) => void
  stop: () => void
  setVolume: (v: number) => void
}

const FADE_IN_MS = 1500
const FADE_OUT_MS = 1000

function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

function buildRainGraph(
  ctx: AudioContext,
  masterGain: GainNode
): AudioBufferSourceNode[] {
  const noiseBuffer = createNoiseBuffer(ctx)

  // Primary rain layer — bandpass filtered white noise
  const source1 = ctx.createBufferSource()
  source1.buffer = noiseBuffer
  source1.loop = true

  const filter1 = ctx.createBiquadFilter()
  filter1.type = 'bandpass'
  filter1.frequency.value = 400
  filter1.Q.value = 0.5

  const gain1 = ctx.createGain()
  gain1.gain.value = 0.8

  source1.connect(filter1)
  filter1.connect(gain1)
  gain1.connect(masterGain)

  // Second layer — lighter high-frequency spray
  const source2 = ctx.createBufferSource()
  source2.buffer = createNoiseBuffer(ctx)
  source2.loop = true

  const filter2 = ctx.createBiquadFilter()
  filter2.type = 'highpass'
  filter2.frequency.value = 2000
  filter2.Q.value = 0.3

  const gain2 = ctx.createGain()
  gain2.gain.value = 0.2

  source2.connect(filter2)
  filter2.connect(gain2)
  gain2.connect(masterGain)

  source1.start()
  source2.start()
  return [source1, source2]
}

function buildCafeGraph(
  ctx: AudioContext,
  masterGain: GainNode
): AudioBufferSourceNode[] {
  const sources: AudioBufferSourceNode[] = []

  // Low rumble of crowd (brown-ish noise via low-pass)
  const s1 = ctx.createBufferSource()
  s1.buffer = createNoiseBuffer(ctx)
  s1.loop = true

  const f1 = ctx.createBiquadFilter()
  f1.type = 'lowpass'
  f1.frequency.value = 600
  f1.Q.value = 0.7

  const g1 = ctx.createGain()
  g1.gain.value = 0.5

  s1.connect(f1)
  f1.connect(g1)
  g1.connect(masterGain)
  s1.start()
  sources.push(s1)

  // Mid-range chatter layer
  const s2 = ctx.createBufferSource()
  s2.buffer = createNoiseBuffer(ctx)
  s2.loop = true

  const f2 = ctx.createBiquadFilter()
  f2.type = 'bandpass'
  f2.frequency.value = 1200
  f2.Q.value = 1.0

  const g2 = ctx.createGain()
  g2.gain.value = 0.3

  s2.connect(f2)
  f2.connect(g2)
  g2.connect(masterGain)
  s2.start()
  sources.push(s2)

  // Occasional cutlery/cup clatter — a subtle high-frequency shimmer
  const s3 = ctx.createBufferSource()
  s3.buffer = createNoiseBuffer(ctx)
  s3.loop = true

  const f3 = ctx.createBiquadFilter()
  f3.type = 'highpass'
  f3.frequency.value = 3500
  f3.Q.value = 0.4

  const g3 = ctx.createGain()
  g3.gain.value = 0.1

  s3.connect(f3)
  f3.connect(g3)
  g3.connect(masterGain)
  s3.start()
  sources.push(s3)

  return sources
}

function buildWhiteNoiseGraph(
  ctx: AudioContext,
  masterGain: GainNode
): AudioBufferSourceNode[] {
  const source = ctx.createBufferSource()
  source.buffer = createNoiseBuffer(ctx)
  source.loop = true
  source.connect(masterGain)
  source.start()
  return [source]
}

export function useAmbientSound(): AmbientSoundHook {
  const [active, setActive] = useState<AmbientMode | null>(
    () => (localStorage.getItem('ambientSound') as AmbientMode | null) || null
  )
  const [volume, setVolumeState] = useState<number>(() => {
    const stored = localStorage.getItem('ambientVolume')
    return stored ? parseFloat(stored) : 0.4
  })

  const audioCtxRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const sourcesRef = useRef<AudioBufferSourceNode[]>([])
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTransitioningRef = useRef(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current)
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {})
      }
    }
  }, [])

  const stopInternal = useCallback((onDone?: () => void) => {
    const ctx = audioCtxRef.current
    const gain = masterGainRef.current

    if (!ctx || !gain) {
      onDone?.()
      return
    }

    const now = ctx.currentTime
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(0, now + FADE_OUT_MS / 1000)

    stopTimeoutRef.current = setTimeout(() => {
      sourcesRef.current.forEach((s) => {
        try { s.stop() } catch { /* already stopped */ }
      })
      sourcesRef.current = []
      ctx.close().catch(() => {})
      audioCtxRef.current = null
      masterGainRef.current = null
      isTransitioningRef.current = false
      onDone?.()
    }, FADE_OUT_MS + 100)
  }, [])

  const play = useCallback(
    (mode: AmbientMode) => {
      // Respect global sound setting
      if (localStorage.getItem('soundEnabled') === 'false') return

      if (isTransitioningRef.current) return
      isTransitioningRef.current = true

      const startNew = () => {
        try {
          const ctx = new AudioContext()
          audioCtxRef.current = ctx

          const masterGain = ctx.createGain()
          masterGain.gain.setValueAtTime(0, ctx.currentTime)
          masterGain.gain.linearRampToValueAtTime(
            volume,
            ctx.currentTime + FADE_IN_MS / 1000
          )
          masterGain.connect(ctx.destination)
          masterGainRef.current = masterGain

          if (mode === 'rain') {
            sourcesRef.current = buildRainGraph(ctx, masterGain)
          } else if (mode === 'cafe') {
            sourcesRef.current = buildCafeGraph(ctx, masterGain)
          } else {
            sourcesRef.current = buildWhiteNoiseGraph(ctx, masterGain)
          }

          setActive(mode)
          localStorage.setItem('ambientSound', mode)
          isTransitioningRef.current = false
        } catch {
          isTransitioningRef.current = false
        }
      }

      if (audioCtxRef.current) {
        stopInternal(startNew)
      } else {
        startNew()
      }
    },
    [volume, stopInternal]
  )

  const stop = useCallback(() => {
    if (isTransitioningRef.current) return
    isTransitioningRef.current = true
    stopInternal(() => {
      setActive(null)
      localStorage.removeItem('ambientSound')
    })
  }, [stopInternal])

  const setVolume = useCallback((v: number) => {
    setVolumeState(v)
    localStorage.setItem('ambientVolume', String(v))
    if (masterGainRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime
      masterGainRef.current.gain.cancelScheduledValues(now)
      masterGainRef.current.gain.setValueAtTime(v, now)
    }
  }, [])

  return { active, volume, play, stop, setVolume }
}
