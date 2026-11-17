/**
 * @license MIT
 * A port of `Libraries/Animated/bezier.js` of React Native, Copyright (c) Meta Platforms, Inc. and
 * affiliates. That file comes from bezier-easing (https://github.com/gre/bezier-easing), Copyright
 * (c) 2014-2015 Gaëtan Renaudeau. Both are MIT.
 */

// React Native's values, a trade-off between speed and precision.
const NEWTON_ITERATIONS = 4
const NEWTON_MIN_SLOPE = 0.001
const SUBDIVISION_PRECISION = 0.0000001
const SUBDIVISION_MAX_ITERATIONS = 10

const SPLINE_TABLE_SIZE = 11
const SAMPLE_STEP_SIZE = 1 / (SPLINE_TABLE_SIZE - 1)

const a = (a1: number, a2: number): number => 1 - 3 * a2 + 3 * a1
const b = (a1: number, a2: number): number => 3 * a2 - 6 * a1
const c = (a1: number): number => 3 * a1

// x(t) from x1 and x2, or y(t) from y1 and y2.
const calcBezier = (t: number, a1: number, a2: number): number =>
  ((a(a1, a2) * t + b(a1, a2)) * t + c(a1)) * t

// dx/dt from x1 and x2, or dy/dt from y1 and y2.
const getSlope = (t: number, a1: number, a2: number): number =>
  3 * a(a1, a2) * t * t + 2 * b(a1, a2) * t + c(a1)

const binarySubdivide = (x: number, start: number, end: number, x1: number, x2: number): number => {
  let low = start
  let high = end
  let t = 0
  let currentX = 0
  let i = 0
  do {
    t = low + (high - low) / 2
    currentX = calcBezier(t, x1, x2) - x
    if (currentX > 0) high = t
    else low = t
  } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS)
  return t
}

const newtonRaphsonIterate = (x: number, guess: number, x1: number, x2: number): number => {
  let t = guess
  for (let i = 0; i < NEWTON_ITERATIONS; i++) {
    const slope = getSlope(t, x1, x2)
    if (slope === 0) return t
    t -= (calcBezier(t, x1, x2) - x) / slope
  }
  return t
}

export const bezier = (x1: number, y1: number, x2: number, y2: number): ((x: number) => number) => {
  if (!(x1 >= 0 && x1 <= 1 && x2 >= 0 && x2 <= 1)) {
    throw new Error('bezier x values must be in [0, 1] range')
  }
  if (x1 === y1 && x2 === y2) return (x) => x

  const samples = new Float32Array(SPLINE_TABLE_SIZE)
  for (let i = 0; i < SPLINE_TABLE_SIZE; i++) samples[i] = calcBezier(i * SAMPLE_STEP_SIZE, x1, x2)
  const sample = (i: number): number => samples[i] ?? 0

  const getTForX = (x: number): number => {
    let intervalStart = 0
    let current = 1
    const last = SPLINE_TABLE_SIZE - 1
    for (; current !== last && sample(current) <= x; current++) intervalStart += SAMPLE_STEP_SIZE
    current--

    const dist = (x - sample(current)) / (sample(current + 1) - sample(current))
    const guess = intervalStart + dist * SAMPLE_STEP_SIZE
    const slope = getSlope(guess, x1, x2)
    if (slope >= NEWTON_MIN_SLOPE) return newtonRaphsonIterate(x, guess, x1, x2)
    if (slope === 0) return guess
    return binarySubdivide(x, intervalStart, intervalStart + SAMPLE_STEP_SIZE, x1, x2)
  }

  return (x) => {
    // The solver isn't exact, so the two ends come back as they are.
    if (x === 0) return 0
    if (x === 1) return 1
    return calcBezier(getTForX(x), y1, y2)
  }
}
