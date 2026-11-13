/**
 * Compat export. A browser has no native modules, so `get` always returns `null`. A library
 * that reads its native module at import time then takes its JavaScript path.
 */
export const TurboModuleRegistry: {
  get<T = unknown>(name: string): T | null
  getEnforcing<T = unknown>(name: string): T
} = {
  get: () => null,
  getEnforcing: (name) => {
    throw new Error(
      `TurboModuleRegistry.getEnforcing(...): '${name}' could not be found. ` +
        'A browser has no native modules.',
    )
  },
}
