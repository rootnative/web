// The page under a modal or an alert doesn't scroll, as on native. A counter, so the last one to
// close gives the page its scroll back.
let locks = 0
let pageOverflow = ''
let pageX = 0
let pageY = 0

// Safari on iOS moves the visual viewport down a locked page to show a focused field above the
// keyboard, so the top of a modal leaves the screen. A scroll to the place of the page at the
// lock brings the viewport back. A pinch zoom moves the viewport too, and keeps its place.
const keepPlace = (): void => {
  const viewport = window.visualViewport
  if (viewport !== null && viewport.scale === 1 && viewport.offsetTop > 0) {
    window.scrollTo(pageX, pageY)
  }
}

export const lockScroll = (): void => {
  const root = document.documentElement
  if (locks++ === 0) {
    pageOverflow = root.style.overflow
    pageX = window.scrollX
    pageY = window.scrollY
    root.style.overflow = 'hidden'
    window.visualViewport?.addEventListener('scroll', keepPlace)
  }
}

export const unlockScroll = (): void => {
  if (--locks === 0) {
    document.documentElement.style.overflow = pageOverflow
    window.visualViewport?.removeEventListener('scroll', keepPlace)
  }
}
