/**
 * @license MIT
 * A port of `src/private/animated/createAnimatedPropsHook.js` and
 * `createAnimatedPropsMemoHook.js` of React Native, Copyright (c) Meta Platforms, Inc. and
 * affiliates.
 */

import {
  useCallback,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type RefCallback,
} from 'react'

import { flattenStyle } from '../../style/compile'
import { resolveStyle } from '../../style/resolveStyle'
import type { FlatStyle, StyleProp } from '../../style/types'
import { AnimatedEvent } from './AnimatedEvent'
import { AnimatedNode } from './nodes/AnimatedNode'
import { animatedNodesIn } from './nodes/AnimatedObject'
import { AnimatedProps } from './nodes/AnimatedProps'

type Props = Readonly<Record<string, unknown>>

const ids = new WeakMap<object, number>()
let nextId = 1

const idOf = (value: object): number => {
  let id = ids.get(value)
  if (id === undefined) {
    id = nextId++
    ids.set(value, id)
  }
  return id
}

// The parts of `props` that decide the nodes of an `AnimatedProps`, as a string: each node and
// event, with its place. Two renders with the same string share one `AnimatedProps`, so a render
// doesn't detach and attach the graph. React Native compares the same parts.
const animatedKeyOf = (props: Props): string => {
  const parts: string[] = []
  for (const [name, value] of Object.entries(props)) {
    if (name === 'style') {
      const flat = flattenStyle(value as StyleProp<FlatStyle>)
      if (flat === undefined) continue
      for (const [styleName, styleValue] of Object.entries(flat)) {
        const nodes = animatedNodesIn(styleValue)
        if (nodes.length > 0) parts.push(`style.${styleName}:${nodes.map(idOf).join(',')}`)
      }
    } else if (value instanceof AnimatedNode || value instanceof AnimatedEvent) {
      parts.push(`${name}:${idOf(value)}`)
    } else if (animatedNodesIn(value).length > 0) {
      // The node of such a prop keeps the object that it came from, so a new object needs a new
      // node, as in React Native.
      parts.push(`${name}#${idOf(value as object)}`)
    }
  }
  return parts.join('|')
}

// Writes the resolved style to the inline style of the element, and only what changed since the
// last write. The whole style resolves each time, because some keys give one CSS property
// together: the `shadow*` keys give `boxShadow`, for example.
const writeStyle = (
  element: HTMLElement,
  style: FlatStyle | undefined,
  written: Map<string, string>,
): void => {
  const next = style === undefined ? {} : resolveStyle(style)
  const inline = element.style as unknown as Record<string, string>
  for (const name of written.keys()) {
    if (next[name] === undefined) {
      inline[name] = ''
      written.delete(name)
    }
  }
  for (const [name, value] of Object.entries(next)) {
    if (written.get(name) !== value) {
      inline[name] = value
      written.set(name, value)
    }
  }
}

// A frame that changes only the style writes it to the element, with no render. A change of any
// other prop renders the component again, as React Native does for a component with no
// `setNativeProps`.
export const useAnimatedProps = <TInstance>(
  props: Props,
): [Record<string, unknown>, RefCallback<TInstance>] => {
  const [, scheduleUpdate] = useReducer((count: number) => count + 1, 0)
  const propsRef = useRef(props)
  const elementRef = useRef<HTMLElement | null>(null)
  const [written] = useState(() => new Map<string, string>())

  const key = animatedKeyOf(props)
  // The node depends only on the animated parts of `props`, and `key` names each of them. With
  // `props` as a dependency, each render would make a new node.
  // oxlint-disable-next-line react/memo-dependencies, react-hooks/exhaustive-deps
  const node = useMemo(() => new AnimatedProps(props), [key])

  useInsertionEffect(() => {
    propsRef.current = props
  })

  // The detach waits for a microtask. A new node of the next render attaches first, so a value
  // that both nodes read keeps its animation. It also keeps the end callbacks of animations out
  // of the commit phase.
  useInsertionEffect(() => {
    node.__attach()
    return () => queueMicrotask(() => node.__detach())
  }, [node])

  // A render can bring a new static style, and `resetAnimation` changes a value with no update.
  // So an element that a frame wrote to gets the current style again after each render.
  useLayoutEffect(() => {
    const element = elementRef.current
    if (element !== null && written.size > 0) {
      writeStyle(element, node.styleWithStaticStyle(propsRef.current['style']), written)
    }
  })

  // React Native sets the callback when the ref attaches, so a component that ignores its `ref`
  // never updates. Here it updates with a render.
  useLayoutEffect(() => {
    node.setUpdateCallback(() => {
      const element = elementRef.current
      if (element !== null && node.animatesOnlyStyle()) {
        writeStyle(element, node.styleWithStaticStyle(propsRef.current['style']), written)
      } else {
        scheduleUpdate()
      }
    })
    return () => node.setUpdateCallback(null)
  }, [node, written, scheduleUpdate])

  const ref = useCallback((instance: TInstance | null) => {
    elementRef.current = instance instanceof HTMLElement ? instance : null
    return () => {
      elementRef.current = null
    }
  }, [])

  return [{ ...node.__getValueWithStaticProps(props), collapsable: false }, ref]
}
