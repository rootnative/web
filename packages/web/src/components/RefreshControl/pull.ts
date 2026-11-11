// The numbers of Android's SwipeRefreshLayout, in CSS pixels.

// How far the indicator moves before a release refreshes.
export const PULL_TARGET = 64

// The indicator moves half the finger distance.
const DRAG_RATE = 0.5

/**
 * The distance of the indicator for a finger distance. It follows the finger at half the speed,
 * and slows down past the target, so it never goes past twice the target.
 */
export const pullOffset = (distance: number): number => {
  const travel = Math.max(0, distance) * DRAG_RATE
  if (travel <= PULL_TARGET) return travel
  const extra = travel - PULL_TARGET
  return PULL_TARGET + (PULL_TARGET * extra) / (extra + PULL_TARGET)
}

/** A release after this finger distance refreshes. */
export const releasesRefresh = (distance: number): boolean => distance * DRAG_RATE > PULL_TARGET
