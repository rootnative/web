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
const roleToTag: Record<string, string> = {
  article: 'article',
  banner: 'header',
  button: 'button',
  cell: 'td',
  columnheader: 'th',
  complementary: 'aside',
  contentinfo: 'footer',
  figure: 'figure',
  form: 'form',
  list: 'ul',
  listitem: 'li',
  main: 'main',
  navigation: 'nav',
  row: 'tr',
  rowgroup: 'tbody',
  rowheader: 'th',
  separator: 'hr',
  table: 'table',
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
