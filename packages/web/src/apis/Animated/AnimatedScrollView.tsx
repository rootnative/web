/**
 * @license MIT
 * A port of `Libraries/Animated/components/AnimatedScrollView.js` of React Native, Copyright (c)
 * Meta Platforms, Inc. and affiliates.
 */

import { cloneElement, type ReactElement, type ReactNode } from 'react'

import { ScrollView } from '../../components/ScrollView'
import type { ScrollViewInstance, ScrollViewProps } from '../../components/ScrollView'
import { splitLayoutProps } from '../../style/splitLayoutProps'
import { StyleSheet } from '../StyleSheet'
import { createAnimatedComponent, useInnerRef } from './createAnimatedComponent'
import type { AnimatedComponentType } from './createAnimatedComponent'
import { useAnimatedProps } from './useAnimatedProps'

const AnimatedScrollViewWithoutInvertedRefreshControl: AnimatedComponentType<
  ScrollViewProps,
  ScrollViewInstance
> = /* @__PURE__ */ createAnimatedComponent(ScrollView)

type InvertedProps = Readonly<Record<string, unknown>> & { refreshControl: ReactElement }

// `ScrollView` with a `refreshControl` puts the refresh control around the scroller, as on
// Android, and splits the style: the layout props go to the refresh control. A frame that wrote
// the whole style to the scroller would put them in the wrong place. So the refresh control and
// the scroller each get their own animated props, as in React Native's Android branch.
function AnimatedScrollViewWithInvertedRefreshControl(props: InvertedProps): ReactNode {
  const { ref: forwardedRef, ...rest } = props
  const { outer, inner } = splitLayoutProps(StyleSheet.flatten(rest['style'] as object))

  const [refreshControlAnimatedProps, refreshControlRef] = useAnimatedProps<unknown>({
    style: outer,
  })
  // The style and the ref of `refreshControl` are replaced, as in React Native.
  const refreshControl = cloneElement(
    props.refreshControl as ReactElement<Record<string, unknown>>,
    {
      ...refreshControlAnimatedProps,
      ref: refreshControlRef,
    },
  )

  const [scrollViewAnimatedProps, scrollViewRef] = useAnimatedProps<unknown>({
    ...rest,
    style: inner,
  })
  const ref = useInnerRef(forwardedRef, scrollViewRef)

  return (
    <ScrollView
      {...(scrollViewAnimatedProps as ScrollViewProps)}
      ref={ref}
      refreshControl={refreshControl}
      // `ScrollView` splits the style again, so it needs both parts.
      style={StyleSheet.compose(
        scrollViewAnimatedProps['style'] as ScrollViewProps['style'],
        refreshControlAnimatedProps['style'] as ScrollViewProps['style'],
      )}
    />
  )
}

// React Native gives `onScroll` a `scrollEventThrottle` of almost 0, so iOS sends each frame. The
// web sends each `scroll` event of the browser and has no throttle, so this port leaves it out.
export const AnimatedScrollView: AnimatedComponentType<ScrollViewProps, ScrollViewInstance> = (
  props,
) => {
  const { refreshControl, style } = props as ScrollViewProps
  return refreshControl != null && style != null ? (
    <AnimatedScrollViewWithInvertedRefreshControl
      {...(props as Readonly<Record<string, unknown>>)}
      refreshControl={refreshControl as ReactElement}
    />
  ) : (
    <AnimatedScrollViewWithoutInvertedRefreshControl {...props} />
  )
}
