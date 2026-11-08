import { isProductionEnv } from './env'

const warned = new Set<string>()

// A development warning that prints once per key.
export const warnOnce = (key: string, message: string): void => {
  if (isProductionEnv() || warned.has(key)) return
  warned.add(key)
  console.warn(`[@rootnative/web] ${message}`)
}

// For tests.
export const resetWarnings = (): void => warned.clear()
