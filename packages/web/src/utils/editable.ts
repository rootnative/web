// The input types that take no text, so the browser shows no keyboard for them.
const noTextInputTypes = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
])

// A field that takes text, so the browser shows a keyboard for it.
export const isEditable = (element: Element | null): element is HTMLElement => {
  if (element instanceof HTMLTextAreaElement) return !element.readOnly && !element.disabled
  if (element instanceof HTMLInputElement) {
    return !element.readOnly && !element.disabled && !noTextInputTypes.has(element.type)
  }
  return element instanceof HTMLElement && element.isContentEditable
}
