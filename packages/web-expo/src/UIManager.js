import { LayoutAnimation } from '@rootnative/web/internal/apis/LayoutAnimation/index.js'
import { withHostMethods } from '@rootnative/web/internal/render/hostMethods.js'

// A node is a DOM element, as `findNodeHandle` gives it. Anything else has no layout to measure.
const isElement = (node) => typeof node?.getBoundingClientRect === 'function'

// The methods of react-native-web's `UIManager`, on the host methods of `@rootnative/web`. So a
// measure calls back at once, and `updateView` writes only `style`, as `setNativeProps` does.
export const UIManager = {
  blur(node) {
    node?.blur?.()
  },
  focus(node) {
    node?.focus?.()
  },
  measure(node, callback) {
    if (isElement(node)) withHostMethods(node).measure(callback)
  },
  measureInWindow(node, callback) {
    if (isElement(node)) withHostMethods(node).measureInWindow(callback)
  },
  measureLayout(node, relativeToNativeNode, onFail, onSuccess) {
    if (isElement(node)) {
      withHostMethods(node).measureLayout(relativeToNativeNode, onSuccess, onFail)
    } else {
      onFail?.()
    }
  },
  updateView(node, props) {
    if (isElement(node)) withHostMethods(node).setNativeProps(props)
  },
  // react-native-web's `LayoutAnimation` calls this, so both run the one of `@rootnative/web`.
  configureNextLayoutAnimation(config, onAnimationDidEnd, onAnimationDidFail) {
    LayoutAnimation.configureNext(config, onAnimationDidEnd, onAnimationDidFail)
  },
  setLayoutAnimationEnabledExperimental() {},
}
