import { createContext, type Context } from 'react'

// True inside a Text, so a nested Text renders inline and inherits.
export const TextAncestorContext: Context<boolean> = createContext(false)
