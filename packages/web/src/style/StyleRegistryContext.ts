import { createContext, useContext, type Context } from 'react'

import { getStyleRegistry, type StyleRegistry } from './registry'

export const StyleRegistryContext: Context<StyleRegistry | null> =
  createContext<StyleRegistry | null>(null)

export const useStyleRegistry = (): StyleRegistry =>
  useContext(StyleRegistryContext) ?? getStyleRegistry()
