import { createContext, type Context } from 'react'

// React Native's `ScrollView.Context`: the direction of the ScrollView around a component, so a
// list can warn when it sits in a plain ScrollView of the same direction.
export type ScrollViewContextValue = Readonly<{ horizontal: boolean }>

export const ScrollViewContext: Context<ScrollViewContextValue | null> =
  createContext<ScrollViewContextValue | null>(null)

export const HORIZONTAL: ScrollViewContextValue = Object.freeze({ horizontal: true })
export const VERTICAL: ScrollViewContextValue = Object.freeze({ horizontal: false })
