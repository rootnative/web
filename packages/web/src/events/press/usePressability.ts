import { useInsertionEffect, useState } from 'react'

import { Pressability } from './Pressability'
import type { PressabilityConfig, PressabilityEventHandlers } from './types'

// Memoize the config. A null config defers the setup. Once set up, the handlers stay until
// unmount, and their identity never changes.
export function usePressability(config: PressabilityConfig): PressabilityEventHandlers
export function usePressability(
  config: PressabilityConfig | null | undefined,
): PressabilityEventHandlers | null
export function usePressability(
  config: PressabilityConfig | null | undefined,
): PressabilityEventHandlers | null {
  const [pressability, setPressability] = useState(() =>
    config == null ? null : new Pressability(config),
  )
  // A config that comes later. React renders again before it commits.
  if (pressability === null && config != null) setPressability(new Pressability(config))

  useInsertionEffect(() => {
    if (config != null && pressability !== null) pressability.configure(config)
  }, [config, pressability])

  // A separate effect, so a config change does not reset a press in progress.
  useInsertionEffect(() => {
    if (pressability === null) return undefined
    return () => pressability.reset()
  }, [pressability])

  return pressability === null ? null : pressability.getEventHandlers()
}
