// React Native's native timing samples the easing at 60 Hz in JavaScript, and the native side
// plays the samples (`Libraries/Animated/animations/TimingAnimation.js`). The Web Animations driver
// samples each curve at the same rate.
export const FRAME_MS: number = 1000 / 60

// An animation as a function of time. `valueAt` gives the value `time` ms after the start, and the
// end value from `duration` on.
export type Curve = Readonly<{
  duration: number
  valueAt: (time: number) => number
}>

// One time for each 60 Hz frame from 0 to `duration`, spread so that the last one is `duration`, as
// React Native spreads the frames of its native timing.
export const sampleTimes = (duration: number): number[] => {
  const count = Math.max(1, Math.round(duration / FRAME_MS))
  return Array.from({ length: count + 1 }, (_, i) =>
    i === count ? duration : (i * duration) / count,
  )
}
