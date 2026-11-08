declare const process: { env: { NODE_ENV?: string } } | undefined

declare global {
  interface ImportMeta {
    env?: { MODE?: string }
  }
}

const nodeEnv = (): string | undefined =>
  typeof process !== 'undefined' ? process.env.NODE_ENV : import.meta.env?.MODE

export const isTestEnv = (): boolean => nodeEnv() === 'test'

export const isProductionEnv = (): boolean => nodeEnv() === 'production'

export const hasDOM = (): boolean =>
  typeof window !== 'undefined' && typeof document !== 'undefined'

export const matchesMedia = (query: string): boolean =>
  hasDOM() && typeof window.matchMedia === 'function' && window.matchMedia(query).matches
