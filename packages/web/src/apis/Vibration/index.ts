import { hasDOM } from '../../utils/env'

const DEFAULT_LENGTH = 400

let repeatTimer: ReturnType<typeof setTimeout> | undefined

// Safari, iOS, and most desktops have no `navigator.vibrate`. There it does nothing, as on a
// device with no motor.
const canVibrate = (): boolean => hasDOM() && typeof navigator.vibrate === 'function'

const stopRepeat = (): void => {
  if (repeatTimer === undefined) return
  clearTimeout(repeatTimer)
  repeatTimer = undefined
}

/**
 * Vibrates the device with `navigator.vibrate`, with Android's rules: the durations apply, and
 * an array starts with a wait.
 */
export const Vibration: {
  vibrate: (pattern?: number | Array<number>, repeat?: boolean) => void
  cancel: () => void
} = {
  vibrate(pattern = DEFAULT_LENGTH, repeat = false) {
    let steps: number[]
    if (typeof pattern === 'number') steps = [pattern]
    // Android's pattern starts with a wait, the web's with a vibration.
    else if (Array.isArray(pattern)) steps = [0, ...pattern]
    else throw new Error('Vibration pattern should be a number or array')

    stopRepeat()
    if (!canVibrate()) return
    navigator.vibrate(steps)

    if (!repeat || typeof pattern === 'number') return
    const total = steps.reduce((sum, step) => sum + step, 0)
    if (total <= 0) return
    const again = (): void => {
      navigator.vibrate(steps)
      repeatTimer = setTimeout(again, total)
    }
    repeatTimer = setTimeout(again, total)
  },

  cancel() {
    stopRepeat()
    if (canVibrate()) navigator.vibrate(0)
  },
}
