/**
 * @license MIT
 * A port of `Libraries/Animated/SpringConfig.js` of React Native, Copyright (c) Meta Platforms,
 * Inc. and affiliates.
 */

export type SpringConfigType = { stiffness: number; damping: number }

// The Origami (Facebook's prototyping tool) units of tension and friction.
const stiffnessFromOrigamiValue = (value: number): number => (value - 30) * 3.62 + 194

const dampingFromOrigamiValue = (value: number): number => (value - 8) * 3 + 25

export const fromOrigamiTensionAndFriction = (
  tension: number,
  friction: number,
): SpringConfigType => ({
  stiffness: stiffnessFromOrigamiValue(tension),
  damping: dampingFromOrigamiValue(friction),
})

const normalize = (value: number, start: number, end: number): number =>
  (value - start) / (end - start)

const projectNormal = (n: number, start: number, end: number): number => start + n * (end - start)

const linearInterpolation = (t: number, start: number, end: number): number =>
  t * end + (1 - t) * start

const quadraticOutInterpolation = (t: number, start: number, end: number): number =>
  linearInterpolation(2 * t - t * t, start, end)

const b3Friction1 = (x: number): number =>
  0.0007 * Math.pow(x, 3) - 0.031 * Math.pow(x, 2) + 0.64 * x + 1.28

const b3Friction2 = (x: number): number =>
  0.000044 * Math.pow(x, 3) - 0.006 * Math.pow(x, 2) + 0.36 * x + 2

const b3Friction3 = (x: number): number =>
  0.00000045 * Math.pow(x, 3) - 0.000332 * Math.pow(x, 2) + 0.1078 * x + 5.84

const b3Nobounce = (tension: number): number => {
  if (tension <= 18) return b3Friction1(tension)
  if (tension <= 44) return b3Friction2(tension)
  return b3Friction3(tension)
}

export const fromBouncinessAndSpeed = (bounciness: number, speed: number): SpringConfigType => {
  const b = projectNormal(normalize(bounciness / 1.7, 0, 20), 0, 0.8)
  const s = normalize(speed / 1.7, 0, 20)
  const bouncyTension = projectNormal(s, 0.5, 200)
  const bouncyFriction = quadraticOutInterpolation(b, b3Nobounce(bouncyTension), 0.01)
  return {
    stiffness: stiffnessFromOrigamiValue(bouncyTension),
    damping: dampingFromOrigamiValue(bouncyFriction),
  }
}
