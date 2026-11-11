import { type CSSProperties, type ReactElement, useEffect, useLayoutEffect, useRef } from 'react'

import { StyleSheet } from '../../apis/StyleSheet'
import { toCSSColor } from '../../style/color'
import { useStyleRegistry } from '../../style/StyleRegistryContext'
import { View } from '../View'
import { PULL_TARGET, pullOffset, releasesRefresh } from './pull'
import type { RefreshControlProps } from './types'

export type { RefreshControlProps } from './types'

// Android's defaults: a black arc on a white disc.
const ARC = '#000000'
const DISC = '#FFFFFF'

const ARC_LENGTH = 2 * Math.PI * 8.75

const INDICATOR_CLASS = 'rn-refresh'
// React sets only `data-refreshing`, `data-size`, and `--rn-refresh-top`. The rules place the
// indicator, and a pull writes its own inline values over them.
const RULES = [
  '@keyframes rn-refresh-spin{to{transform:rotate(360deg)}}',
  `.${INDICATOR_CLASS}{position:absolute;top:0;left:50%;z-index:1;display:flex;width:40px;height:40px;margin-left:-20px;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.3);pointer-events:none;opacity:0;transform:translateY(calc(var(--rn-refresh-top) - 100%));transition:transform .2s ease-out,opacity .2s}`,
  `.${INDICATOR_CLASS}[data-size=large]{width:56px;height:56px;margin-left:-28px}`,
  `.${INDICATOR_CLASS}[data-refreshing]{opacity:1;transform:translateY(calc(var(--rn-refresh-top) + ${PULL_TARGET}px - 100%))}`,
  `.${INDICATOR_CLASS}>svg{width:100%;height:100%}`,
  `.${INDICATOR_CLASS}[data-refreshing]>svg{animation:rn-refresh-spin .75s linear infinite}`,
  `.${INDICATOR_CLASS} circle{stroke-dasharray:0 ${ARC_LENGTH}}`,
  `.${INDICATOR_CLASS}[data-refreshing] circle{stroke-dasharray:${ARC_LENGTH * 0.75} ${ARC_LENGTH}}`,
  `@media (prefers-reduced-motion:reduce){.${INDICATOR_CLASS}{transition:none}}`,
]

type Gesture = { id: number; x: number; y: number; pulling: boolean; distance: number }

export function RefreshControl(props: RefreshControlProps): ReactElement {
  const {
    children,
    colors,
    enabled = true,
    onRefresh,
    progressBackgroundColor,
    progressViewOffset = 0,
    refreshing,
    size = 'default',
    style,
    tintColor,
    title,
    titleColor: _titleColor,
    ...rest
  } = props

  const registry = useStyleRegistry()
  const indicatorClass = registry.staticClass(INDICATOR_CLASS, RULES)
  const indicator = useRef<HTMLDivElement>(null)
  const latest = useRef({ enabled, refreshing, onRefresh })

  useLayoutEffect(() => {
    latest.current = { enabled, refreshing, onRefresh }
  })

  useEffect(() => {
    const element = indicator.current
    const area = element?.parentElement
    if (!element || !area) return
    const svg = element.firstElementChild as SVGElement
    const arc = svg.firstElementChild as SVGElement
    let gesture: Gesture | null = null
    let releaseTimer: ReturnType<typeof setTimeout> | undefined

    const scrollTop = (): number => {
      const scroller = area.firstElementChild
      return scroller instanceof HTMLElement && scroller !== element ? scroller.scrollTop : 0
    }

    const draw = (distance: number): void => {
      const offset = pullOffset(distance)
      const progress = Math.min(1, offset / PULL_TARGET)
      element.style.transition = 'none'
      element.style.opacity = String(Math.min(1, offset / element.offsetHeight))
      element.style.transform = `translateY(calc(var(--rn-refresh-top) + ${offset}px - 100%))`
      svg.style.transform = `rotate(${progress * 270}deg)`
      arc.style.strokeDasharray = `${progress * 0.8 * ARC_LENGTH} ${ARC_LENGTH}`
    }

    const clear = (): void => {
      element.style.transition = ''
      element.style.opacity = ''
      element.style.transform = ''
      svg.style.transform = ''
      arc.style.strokeDasharray = ''
    }

    const touchOf = (event: TouchEvent): Touch | undefined =>
      Array.from(event.changedTouches).find((touch) => touch.identifier === gesture?.id)

    const onStart = (event: TouchEvent): void => {
      const touch = event.touches[0]
      const { enabled: on, refreshing: busy } = latest.current
      gesture =
        event.touches.length === 1 && touch !== undefined && on && !busy && scrollTop() <= 0
          ? {
              id: touch.identifier,
              x: touch.clientX,
              y: touch.clientY,
              pulling: false,
              distance: 0,
            }
          : null
    }

    const onMove = (event: TouchEvent): void => {
      const touch = touchOf(event)
      if (gesture === null || touch === undefined) return
      const dx = touch.clientX - gesture.x
      const dy = touch.clientY - gesture.y
      if (!gesture.pulling) {
        if (dx === 0 && dy === 0) return
        // The first move decides: once the browser scrolls, it makes the later moves uncancelable.
        if (dy <= 0 || Math.abs(dx) > dy || scrollTop() > 0 || !event.cancelable) {
          gesture = null
          return
        }
        gesture.pulling = true
      }
      event.preventDefault()
      gesture.distance = Math.max(0, dy)
      draw(gesture.distance)
    }

    const onEnd = (event: TouchEvent): void => {
      if (gesture === null || touchOf(event) === undefined) return
      const { pulling, distance } = gesture
      gesture = null
      if (!pulling) return
      const refresh = event.type === 'touchend' && releasesRefresh(distance)
      // The indicator moves from the finger to its rest at once. React renders an update from a
      // touchend before a timer runs, so `refreshing` from `onRefresh` arrives first. When the app
      // doesn't set it, the indicator goes back, as on native.
      if (refresh) element.setAttribute('data-refreshing', '')
      clear()
      if (!refresh) return
      void latest.current.onRefresh?.()
      releaseTimer = setTimeout(() => {
        if (!latest.current.refreshing) element.removeAttribute('data-refreshing')
      }, 0)
    }

    area.addEventListener('touchstart', onStart, { passive: true })
    area.addEventListener('touchmove', onMove, { passive: false })
    area.addEventListener('touchend', onEnd)
    area.addEventListener('touchcancel', onEnd)
    return () => {
      area.removeEventListener('touchstart', onStart)
      area.removeEventListener('touchmove', onMove)
      area.removeEventListener('touchend', onEnd)
      area.removeEventListener('touchcancel', onEnd)
      clearTimeout(releaseTimer)
      clear()
    }
  }, [])

  const indicatorStyle = {
    '--rn-refresh-top': `${progressViewOffset}px`,
    backgroundColor: toCSSColor(progressBackgroundColor) ?? DISC,
  } as CSSProperties
  const arcColor = toCSSColor(colors?.[0]) ?? toCSSColor(tintColor) ?? ARC

  return (
    <View {...rest} aria-busy={refreshing} style={[styles.area, style]}>
      {children}
      <div
        ref={indicator}
        aria-hidden={!refreshing}
        aria-label={title}
        className={indicatorClass}
        data-refreshing={refreshing ? '' : undefined}
        data-size={size === 'large' ? 'large' : undefined}
        role="progressbar"
        style={indicatorStyle}
      >
        <svg aria-hidden viewBox="0 0 40 40">
          <circle
            cx="20"
            cy="20"
            fill="none"
            r="8.75"
            stroke={arcColor}
            strokeLinecap="round"
            strokeWidth="2.5"
          />
        </svg>
      </div>
    </View>
  )
}

const styles = StyleSheet.create({
  area: { position: 'relative', overflow: 'hidden' },
})
