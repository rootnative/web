// React Native `autoComplete` values that differ from the HTML autocomplete
// tokens. Every other value is already an HTML token and passes through.
const reactNativeToHTML: Record<string, string> = {
  'address-line1': 'address-line1',
  'address-line2': 'address-line2',
  'birthdate-day': 'bday-day',
  'birthdate-full': 'bday',
  'birthdate-month': 'bday-month',
  'birthdate-year': 'bday-year',
  'cc-middle-name': 'cc-additional-name',
  gender: 'sex',
  'name-family': 'family-name',
  'name-given': 'given-name',
  'name-middle': 'additional-name',
  'name-middle-initial': 'additional-name',
  'name-prefix': 'honorific-prefix',
  'name-suffix': 'honorific-suffix',
  'postal-address': 'street-address',
  'postal-address-country': 'country',
  'postal-address-extended': 'address-line2',
  'postal-address-extended-postal-code': 'postal-code',
  'postal-address-locality': 'address-level2',
  'postal-address-region': 'address-level1',
  'sms-otp': 'one-time-code',
  'tel-device': 'tel',
  'username-new': 'username',
}

// iOS `textContentType` values, for an app that sets only that prop.
const textContentTypeToHTML: Record<string, string> = {
  none: 'off',
  URL: 'url',
  addressCity: 'address-level2',
  addressCityAndState: 'address-level1',
  addressState: 'address-level1',
  birthdate: 'bday',
  birthdateDay: 'bday-day',
  birthdateMonth: 'bday-month',
  birthdateYear: 'bday-year',
  countryName: 'country-name',
  creditCardExpiration: 'cc-exp',
  creditCardExpirationMonth: 'cc-exp-month',
  creditCardExpirationYear: 'cc-exp-year',
  creditCardFamilyName: 'cc-family-name',
  creditCardGivenName: 'cc-given-name',
  creditCardMiddleName: 'cc-additional-name',
  creditCardName: 'cc-name',
  creditCardNumber: 'cc-number',
  creditCardSecurityCode: 'cc-csc',
  creditCardType: 'cc-type',
  emailAddress: 'email',
  familyName: 'family-name',
  fullStreetAddress: 'street-address',
  givenName: 'given-name',
  jobTitle: 'organization-title',
  location: 'street-address',
  middleName: 'additional-name',
  name: 'name',
  namePrefix: 'honorific-prefix',
  nameSuffix: 'honorific-suffix',
  newPassword: 'new-password',
  nickname: 'nickname',
  oneTimeCode: 'one-time-code',
  organizationName: 'organization',
  password: 'current-password',
  postalCode: 'postal-code',
  streetAddressLine1: 'address-line1',
  streetAddressLine2: 'address-line2',
  sublocality: 'address-level3',
  telephoneNumber: 'tel',
  username: 'username',
}

export const toHTMLAutoComplete = (
  autoComplete: string | undefined,
  textContentType: string | undefined,
): string | undefined => {
  if (autoComplete !== undefined) return reactNativeToHTML[autoComplete] ?? autoComplete
  if (textContentType !== undefined) return textContentTypeToHTML[textContentType]
  return undefined
}

const keyboardTypeToInputMode: Record<string, string> = {
  'decimal-pad': 'decimal',
  'email-address': 'email',
  'number-pad': 'numeric',
  numeric: 'numeric',
  'numbers-and-punctuation': 'decimal',
  'phone-pad': 'tel',
  url: 'url',
  'web-search': 'search',
}

export const toInputMode = (
  inputMode: string | undefined,
  keyboardType: string | undefined,
  showSoftInputOnFocus: boolean | undefined,
): string | undefined => {
  if (showSoftInputOnFocus === false) return 'none'
  if (inputMode !== undefined) return inputMode
  if (keyboardType !== undefined) return keyboardTypeToInputMode[keyboardType]
  return undefined
}

const returnKeyTypeToEnterKeyHint: Record<string, string> = {
  done: 'done',
  go: 'go',
  next: 'next',
  search: 'search',
  send: 'send',
}

export const toEnterKeyHint = (
  enterKeyHint: string | undefined,
  returnKeyType: string | undefined,
): string | undefined => {
  if (enterKeyHint !== undefined) return enterKeyHint
  if (returnKeyType !== undefined) return returnKeyTypeToEnterKeyHint[returnKeyType]
  return undefined
}
