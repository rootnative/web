interface AstNode {
  type: string
  start: number
  end: number
  [key: string]: unknown
}

interface PlatformRead {
  start: number
  end: number
  name: string
  namespace: boolean
}

const SOURCES = new Set(['react-native', '@rootnative/web'])
const REPLACEMENT = '"web"'
const LINE_BREAK = /[\n\r\u2028\u2029]/

const isNode = (value: unknown): value is AstNode =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { type?: unknown }).type === 'string'

const identifierName = (node: unknown): string | undefined =>
  isNode(node) && node.type === 'Identifier' && typeof node.name === 'string'
    ? node.name
    : undefined

const nodes = (value: unknown): AstNode[] =>
  Array.isArray(value) ? value.filter(isNode) : isNode(value) ? [value] : []

const collectBindings = (pattern: unknown, names: Set<string>): void => {
  if (!isNode(pattern)) return
  switch (pattern.type) {
    case 'Identifier': {
      const name = identifierName(pattern)
      if (name !== undefined) names.add(name)
      return
    }
    case 'ObjectPattern':
      for (const property of nodes(pattern.properties)) {
        collectBindings(property.type === 'RestElement' ? property.argument : property.value, names)
      }
      return
    case 'ArrayPattern':
      for (const element of nodes(pattern.elements)) collectBindings(element, names)
      return
    case 'RestElement':
      collectBindings(pattern.argument, names)
      return
    case 'AssignmentPattern':
      collectBindings(pattern.left, names)
  }
}

const isWriteTarget = (parent: AstNode, key: string, grandparent: AstNode | undefined): boolean => {
  switch (parent.type) {
    case 'AssignmentExpression':
    case 'AssignmentPattern':
    case 'ForInStatement':
    case 'ForOfStatement':
      return key === 'left'
    case 'UpdateExpression':
    case 'ArrayPattern':
    case 'RestElement':
      return true
    case 'UnaryExpression':
      return parent.operator === 'delete'
    case 'Property':
      return key === 'value' && grandparent?.type === 'ObjectPattern'
    default:
      return false
  }
}

const platformRead = (node: AstNode): Omit<PlatformRead, 'start' | 'end'> | undefined => {
  if (node.computed === true || identifierName(node.property) !== 'OS') return undefined
  const name = identifierName(node.object)
  if (name !== undefined) return { name, namespace: false }
  const object = node.object
  if (
    isNode(object) &&
    object.type === 'MemberExpression' &&
    object.computed !== true &&
    identifierName(object.property) === 'Platform'
  ) {
    const namespace = identifierName(object.object)
    if (namespace !== undefined) return { name: namespace, namespace: true }
  }
  return undefined
}

/**
 * Replaces each read of `Platform.OS` with `"web"`, so a minifier can drop the branches of the
 * other platforms. Only a `Platform` imported from `react-native` or `@rootnative/web` counts.
 * Takes the ESTree program of `code`, with `start` and `end` offsets. Returns `null` when
 * nothing changes.
 */
export const inlinePlatformOS = (code: string, program: object): string | null => {
  if (!isNode(program)) return null

  const named = new Set<string>()
  const namespaces = new Set<string>()
  const declared = new Set<string>()
  const reads: PlatformRead[] = []

  const visit = (
    node: AstNode,
    parent: AstNode | undefined,
    key: string,
    grandparent: AstNode | undefined,
  ): void => {
    switch (node.type) {
      case 'ImportDeclaration': {
        const source = isNode(node.source) ? node.source.value : undefined
        if (typeof source !== 'string' || !SOURCES.has(source)) break
        for (const specifier of nodes(node.specifiers)) {
          const local = identifierName(specifier.local)
          if (local === undefined) continue
          if (specifier.type === 'ImportNamespaceSpecifier') namespaces.add(local)
          const imported = isNode(specifier.imported)
            ? (identifierName(specifier.imported) ?? specifier.imported.value)
            : undefined
          if (specifier.type === 'ImportSpecifier' && imported === 'Platform') named.add(local)
        }
        break
      }
      case 'VariableDeclarator':
        collectBindings(node.id, declared)
        break
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        collectBindings(node.id, declared)
        for (const param of nodes(node.params)) collectBindings(param, declared)
        break
      case 'ClassDeclaration':
      case 'ClassExpression':
        collectBindings(node.id, declared)
        break
      case 'CatchClause':
        collectBindings(node.param, declared)
        break
      case 'MemberExpression': {
        const read = platformRead(node)
        if (
          read !== undefined &&
          (parent === undefined || !isWriteTarget(parent, key, grandparent))
        ) {
          reads.push({ ...read, start: node.start, end: node.end })
        }
        break
      }
    }
    for (const childKey of Object.keys(node)) {
      for (const child of nodes(node[childKey])) visit(child, node, childKey, parent)
    }
  }
  visit(program, undefined, '', undefined)

  // A local binding with the same name may shadow the import in some scope. Without scope
  // analysis, skip that name in the whole module.
  const edits = reads.filter(
    (read) =>
      (read.namespace ? namespaces : named).has(read.name) &&
      !declared.has(read.name) &&
      // The replacement keeps the length and the lines of the original, so every later column
      // stays put and the source map stays exact. A shorter or a multi-line read keeps its code.
      read.end - read.start >= REPLACEMENT.length &&
      !LINE_BREAK.test(code.slice(read.start, read.end)),
  )
  if (edits.length === 0) return null

  // Each edit keeps its length, so the offsets of the others stay valid in any order.
  let output = code
  for (const { start, end } of edits) {
    output = output.slice(0, start) + REPLACEMENT.padEnd(end - start) + output.slice(end)
  }
  return output
}
