export type FlatStyle = Readonly<Record<string, unknown>>

export type StyleProp<T> = T | ReadonlyArray<StyleProp<T>> | null | undefined | false | ''

// camelCase CSS property names, as react-dom accepts them in `style`.
export type CSSDeclarations = Record<string, string>
