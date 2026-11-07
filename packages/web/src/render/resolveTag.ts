export type ResolveTagInput = {
  role?: string | undefined
  accessibilityRole?: string | undefined
  'aria-level'?: number | undefined
  href?: string | undefined
}

export type ResolvedTag = {
  tag: string
  role: string | undefined
}

// Legacy accessibilityRole values that have an ARIA role with another name.
const legacyRoleToRole: Record<string, string> = {
  header: 'heading',
  image: 'img',
  imagebutton: 'button',
  summary: 'region',
  text: 'none',
  adjustable: 'slider',
  search: 'searchbox',
  keyboardkey: 'none',
}

// Roles whose HTML element carries the role on its own.
//
// The table roles are not here. The HTML parser moves any child of a <table> that is not a
// row group out of the table, and wraps a bare <tr> in a <tbody>. Server-rendered markup
// then does not match the React tree, and the flex reset breaks table layout. A div with
// the ARIA table roles has the same semantics.
const roleToTag: Record<string, string> = {
  article: 'article',
  banner: 'header',
  button: 'button',
  complementary: 'aside',
  contentinfo: 'footer',
  figure: 'figure',
  form: 'form',
  list: 'ul',
  listitem: 'li',
  main: 'main',
  navigation: 'nav',
  separator: 'hr',
}

const headingLevel = (level: number | undefined): number =>
  level !== undefined && Number.isInteger(level) && level >= 1 && level <= 6 ? level : 2

export const resolveTag = (props: ResolveTagInput, defaultTag: string): ResolvedTag => {
  const role = props.role ?? mapLegacyRole(props.accessibilityRole)

  if (role === 'heading') {
    return { tag: `h${headingLevel(props['aria-level'])}`, role: undefined }
  }

  if (role === 'link') {
    return props.href === undefined
      ? { tag: defaultTag, role: 'link' }
      : { tag: 'a', role: undefined }
  }

  if (role === undefined) {
    return { tag: props.href === undefined ? defaultTag : 'a', role: undefined }
  }

  const tag = roleToTag[role]
  return tag === undefined ? { tag: defaultTag, role } : { tag, role: undefined }
}

const mapLegacyRole = (legacy: string | undefined): string | undefined =>
  legacy === undefined ? undefined : (legacyRoleToRole[legacy] ?? legacy)
