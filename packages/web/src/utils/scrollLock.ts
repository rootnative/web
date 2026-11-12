// The page under a modal or an alert doesn't scroll, as on native. A counter, so the last one to
// close gives the page its scroll back.
let locks = 0
let pageOverflow = ''

export const lockScroll = (): void => {
  const root = document.documentElement
  if (locks++ === 0) {
    pageOverflow = root.style.overflow
    root.style.overflow = 'hidden'
  }
}

export const unlockScroll = (): void => {
  if (--locks === 0) document.documentElement.style.overflow = pageOverflow
}
